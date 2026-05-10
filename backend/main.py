from fastapi import FastAPI, HTTPException, Depends, status, WebSocket, WebSocketDisconnect
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
import asyncio
import json
import database
import auth
from datetime import timedelta

app = FastAPI(title="StudentSync API")

# Allow requests from the Angular frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# ─── WebSocket Connection Manager ────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # board_id → list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, board_id: str, websocket: WebSocket):
        await websocket.accept()
        if board_id not in self.active_connections:
            self.active_connections[board_id] = []
        self.active_connections[board_id].append(websocket)

    def disconnect(self, board_id: str, websocket: WebSocket):
        if board_id in self.active_connections:
            self.active_connections[board_id] = [
                ws for ws in self.active_connections[board_id] if ws != websocket
            ]
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, board_id: str, tasks: list):
        """Broadcast updated task list to all clients watching this board."""
        if board_id not in self.active_connections:
            return
        message = json.dumps({"type": "tasks_updated", "tasks": tasks})
        dead = []
        for ws in self.active_connections[board_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        for ws in dead:
            self.disconnect(board_id, ws)


manager = ConnectionManager()

# ─── Models ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str

class Token(BaseModel):
    access_token: str
    token_type: str

class BoardCreate(BaseModel):
    title: str

class BoardResponse(BaseModel):
    id: str
    title: str
    owner_id: str

class Task(BaseModel):
    id: str
    title: str
    status: str
    boardId: str
    position: Optional[int] = 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    position: Optional[int] = None

# ─── Auth Dependency ──────────────────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = auth.decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    username = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = database.get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# ─── WebSocket Endpoint ───────────────────────────────────────────────────────

@app.websocket("/ws/boards/{board_id}")
async def websocket_endpoint(websocket: WebSocket, board_id: str):
    await manager.connect(board_id, websocket)
    try:
        # Send current tasks immediately on connect so the client is in sync
        tasks = database.get_tasks_for_board(board_id)
        await websocket.send_text(json.dumps({"type": "tasks_updated", "tasks": tasks}))
        # Keep connection alive — we only broadcast from REST mutations
        while True:
            await websocket.receive_text()  # awaits any ping/close from client
    except WebSocketDisconnect:
        manager.disconnect(board_id, websocket)

# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@app.post("/api/signup", response_model=UserResponse)
def signup(user: UserCreate):
    existing_user = database.get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    user_id = str(uuid.uuid4())
    hashed_password = auth.get_password_hash(user.password)
    database.create_user(user_id, user.username, hashed_password)
    return {"id": user_id, "username": user.username}

@app.post("/api/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = database.get_user_by_username(form_data.username)
    if not user or not auth.verify_password(form_data.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user['username']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: dict = Depends(get_current_user)):
    return {"id": current_user['id'], "username": current_user['username']}

# ─── Board Endpoints ──────────────────────────────────────────────────────────

@app.post("/api/boards", response_model=BoardResponse)
def create_board(board: BoardCreate, current_user: dict = Depends(get_current_user)):
    board_id = f"b-{str(uuid.uuid4())[:8]}"
    database.create_board(board_id, board.title, current_user['id'])
    return {"id": board_id, "title": board.title, "owner_id": current_user['id']}

@app.get("/api/boards", response_model=List[BoardResponse])
def get_user_boards(current_user: dict = Depends(get_current_user)):
    return database.get_boards_for_user(current_user['id'])

@app.get("/api/boards/{board_id}", response_model=BoardResponse)
def get_board(board_id: str):
    board = database.get_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board

@app.delete("/api/boards/{board_id}")
def delete_board(board_id: str, current_user: dict = Depends(get_current_user)):
    success = database.delete_board(board_id, current_user['id'])
    if not success:
        raise HTTPException(status_code=403, detail="Not authorized or board not found")
    return {"message": "Board deleted"}

# ─── Task Endpoints ───────────────────────────────────────────────────────────

@app.get("/api/boards/{board_id}/tasks", response_model=List[Task])
def get_tasks(board_id: str):
    return database.get_tasks_for_board(board_id)

@app.post("/api/boards/{board_id}/tasks", response_model=Task)
async def create_task(board_id: str, task: Task):
    if task.boardId != board_id:
        raise HTTPException(status_code=400, detail="board_id mismatch")
    database.add_task(task.dict())
    # Broadcast to all connected clients
    tasks = database.get_tasks_for_board(board_id)
    asyncio.create_task(manager.broadcast(board_id, tasks))
    return task

@app.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, update: TaskUpdate):
    database.update_task(task_id, update.title, update.status, update.position)
    # Find the board this task belongs to and broadcast
    task_row = database.get_task(task_id)
    if task_row:
        board_id = task_row['boardId']
        tasks = database.get_tasks_for_board(board_id)
        asyncio.create_task(manager.broadcast(board_id, tasks))
    return {"message": "Task updated"}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    task_row = database.get_task(task_id)
    database.delete_task(task_id)
    if task_row:
        board_id = task_row['boardId']
        tasks = database.get_tasks_for_board(board_id)
        asyncio.create_task(manager.broadcast(board_id, tasks))
    return {"message": "Task deleted"}

@app.put("/api/boards/{board_id}/tasks")
async def update_all_tasks(board_id: str, tasks: List[Task]):
    for task in tasks:
        if task.boardId != board_id:
            raise HTTPException(status_code=400, detail="board_id mismatch in payload")
    database.update_all_tasks([task.dict() for task in tasks])
    # Broadcast the saved state to all connected clients
    updated = database.get_tasks_for_board(board_id)
    asyncio.create_task(manager.broadcast(board_id, updated))
    return {"message": "Tasks updated"}
