import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private apiUrl = 'http://localhost:8000/api';
  
  // Tasks state as a signal
  private tasksSignal = signal<Task[]>([]);
  public tasks = this.tasksSignal.asReadonly();
  
  private currentBoardId: string | null = null;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {}

  loadBoard(boardId: string): void {
    this.currentBoardId = boardId;
    this.http.get<Task[]>(`${this.apiUrl}/boards/${boardId}/tasks`).subscribe({
      next: (tasks) => {
        this.tasksSignal.set(tasks);
      },
      error: (err) => {
        this.notificationService.error('Failed to load tasks');
        this.tasksSignal.set([]);
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
      position: this.tasks().filter(t => t.status === 'TODO').length
    };

    // Positive UI Update
    this.tasksSignal.update(tasks => [...tasks, newTask]);
    
    // API Call (Background)
    this.http.post<Task>(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, newTask).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to save task. Sync failed.');
        // Rollback
        this.tasksSignal.update(tasks => tasks.filter(t => t.id !== newTask.id));
      }
    });
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const previousTasks = this.tasks();
    
    // Positive UI Update
    this.tasksSignal.update(tasks => tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
    
    // API Call
    this.http.patch(`${this.apiUrl}/tasks/${taskId}`, updates).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to update task.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }

  updateTasks(tasks: Task[]): void {
    const previousTasks = this.tasks();
    
    // Positive UI Update
    this.tasksSignal.set(tasks);
    
    if (!this.currentBoardId) return;

    // API Call
    this.http.put(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, tasks).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to sync task order.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }

  deleteTask(taskId: string): void {
    if (!this.currentBoardId) return;
    const previousTasks = this.tasks();
    
    // Positive UI Update
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== taskId));
    
    // API Call
    this.http.delete(`${this.apiUrl}/tasks/${taskId}`).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to delete task.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }
}
