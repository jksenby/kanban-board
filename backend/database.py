import sqlite3
import os
from typing import List, Dict, Any

DB_FILE = "kanban.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL
        )
    ''')
    
    # Boards table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users (id)
        )
    ''')

    # Tasks table (Added position)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            boardId TEXT NOT NULL,
            position INTEGER DEFAULT 0,
            FOREIGN KEY (boardId) REFERENCES boards (id)
        )
    ''')
    
    # Messages table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            boardId TEXT NOT NULL,
            userId TEXT NOT NULL,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (boardId) REFERENCES boards (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# User Methods
def create_user(user_id: str, username: str, hashed_password: str) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO users (id, username, hashed_password) 
        VALUES (?, ?, ?)
    ''', (user_id, username, hashed_password))
    conn.commit()
    conn.close()

def get_user_by_username(username: str) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

# Board Methods
def create_board(board_id: str, title: str, owner_id: str) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO boards (id, title, owner_id) 
        VALUES (?, ?, ?)
    ''', (board_id, title, owner_id))
    conn.commit()
    conn.close()

def get_boards_for_user(owner_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM boards WHERE owner_id = ?', (owner_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_board(board_id: str) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM boards WHERE id = ?', (board_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_board(board_id: str, owner_id: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Ensure owner matches
    cursor.execute('DELETE FROM boards WHERE id = ? AND owner_id = ?', (board_id, owner_id))
    if cursor.rowcount > 0:
        cursor.execute('DELETE FROM tasks WHERE boardId = ?', (board_id,))
        conn.commit()
        success = True
    else:
        success = False
    conn.close()
    return success

# Task Methods
def get_task(task_id: str) -> Dict[str, Any]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_tasks_for_board(board_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Sort by position
    cursor.execute('SELECT * FROM tasks WHERE boardId = ? ORDER BY position ASC', (board_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_task(task: Dict[str, Any]) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tasks (id, title, status, boardId, position) 
        VALUES (?, ?, ?, ?, ?)
    ''', (task['id'], task['title'], task['status'], task['boardId'], task.get('position', 0)))
    conn.commit()
    conn.close()

def update_task(task_id: str, title: str = None, status: str = None, position: int = None) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    updates = []
    params = []
    if title is not None:
        updates.append("title = ?")
        params.append(title)
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if position is not None:
        updates.append("position = ?")
        params.append(position)
    
    if updates:
        params.append(task_id)
        query = f"UPDATE tasks SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
    conn.close()

def delete_task(task_id: str) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM tasks WHERE id = ?', (task_id,))
    conn.commit()
    conn.close()

def update_all_tasks(tasks: List[Dict[str, Any]]) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    for task in tasks:
        cursor.execute('''
            INSERT OR REPLACE INTO tasks (id, title, status, boardId, position) 
            VALUES (?, ?, ?, ?, ?)
        ''', (task['id'], task['title'], task['status'], task['boardId'], task.get('position', 0)))
    conn.commit()
    conn.close()

# Message Methods
def add_message(message: Dict[str, Any]) -> None:
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO messages (id, boardId, userId, username, content, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (message['id'], message['boardId'], message['userId'], message['username'], message['content'], message['timestamp']))
    conn.commit()
    conn.close()

def get_messages_for_board(board_id: str) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Limit to last 50 messages
    cursor.execute('SELECT * FROM messages WHERE boardId = ? ORDER BY timestamp ASC LIMIT 100', (board_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

init_db()
