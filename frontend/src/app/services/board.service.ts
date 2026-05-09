import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private apiUrl = 'http://localhost:8000/api';
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  
  private currentBoardId: string | null = null;

  constructor(private http: HttpClient) {}

  loadBoard(boardId: string): void {
    this.currentBoardId = boardId;
    
    // Fetch from backend
    this.http.get<Task[]>(`${this.apiUrl}/boards/${boardId}/tasks`).subscribe({
      next: (tasks) => {
        this.tasksSubject.next(tasks);
      },
      error: (err) => {
        console.error('Failed to load board tasks', err);
        this.tasksSubject.next([]);
      }
    });
  }

  fetchUserBoards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/boards`);
  }

  getBoard(boardId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/boards/${boardId}`);
  }

  createBoard(title: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/boards`, { title });
  }

  deleteBoard(boardId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/boards/${boardId}`);
  }

  addTask(title: string): void {
    if (!this.currentBoardId) return;
    
    const newTask: Task = {
      id: uuidv4(),
      title,
      status: 'TODO',
      boardId: this.currentBoardId,
      position: this.tasksSubject.getValue().filter(t => t.status === 'TODO').length
    };

    // Optimistic UI update
    const currentTasks = this.tasksSubject.getValue();
    const updatedTasks = [...currentTasks, newTask];
    this.tasksSubject.next(updatedTasks);
    
    // API Call
    this.http.post<Task>(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, newTask).subscribe({
      error: (err) => {
        console.error('Failed to add task', err);
        // Rollback on error
        this.tasksSubject.next(currentTasks);
      }
    });
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const currentTasks = this.tasksSubject.getValue();
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      // Optimistic update
      const updatedTasks = [...currentTasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };
      this.tasksSubject.next(updatedTasks);
      
      // API Call
      this.http.patch(`${this.apiUrl}/tasks/${taskId}`, updates).subscribe({
        error: (err) => {
          console.error('Failed to update task', err);
          // Rollback
          this.tasksSubject.next(currentTasks);
        }
      });
    }
  }

  // Update tasks for reordering or full sync
  updateTasks(tasks: Task[]): void {
    if (!this.currentBoardId) return;
    
    const currentTasks = this.tasksSubject.getValue();
    
    // Optimistic update
    this.tasksSubject.next(tasks);
    
    // API Call
    this.http.put(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, tasks).subscribe({
      error: (err) => {
        console.error('Failed to update tasks', err);
        // Rollback
        this.tasksSubject.next(currentTasks);
      }
    });
  }

  deleteTask(taskId: string): void {
    if (!this.currentBoardId) return;

    const currentTasks = this.tasksSubject.getValue();
    
    // Optimistic update
    const updatedTasks = currentTasks.filter(t => t.id !== taskId);
    this.tasksSubject.next(updatedTasks);
    
    // API Call
    this.http.delete(`${this.apiUrl}/tasks/${taskId}`).subscribe({
      error: (err) => {
        console.error('Failed to delete task', err);
        // Rollback
        this.tasksSubject.next(currentTasks);
      }
    });
  }
}
