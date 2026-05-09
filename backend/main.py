from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
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

# Models
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

# Auth Dependency
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

# --- Auth Endpoints ---

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

# --- Board Endpoints ---

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

# --- Task Endpoints ---

@app.get("/api/boards/{board_id}/tasks", response_model=List[Task])
def get_tasks(board_id: str):
    return database.get_tasks_for_board(board_id)

@app.post("/api/boards/{board_id}/tasks", response_model=Task)
def create_task(board_id: str, task: Task):
    if task.boardId != board_id:
        raise HTTPException(status_code=400, detail="board_id mismatch")
    database.add_task(task.dict())
    return task

@app.patch("/api/tasks/{task_id}")
def update_task(task_id: str, update: TaskUpdate):
    database.update_task(task_id, update.title, update.status, update.position)
    return {"message": "Task updated"}

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: str):
    database.delete_task(task_id)
    return {"message": "Task deleted"}

@app.put("/api/boards/{board_id}/tasks")
def update_all_tasks(board_id: str, tasks: List[Task]):
    for task in tasks:
        if task.boardId != board_id:
            raise HTTPException(status_code=400, detail="board_id mismatch in payload")
    database.update_all_tasks([task.dict() for task in tasks])
    return {"message": "Tasks updated"}
