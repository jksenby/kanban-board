import { Injectable, OnDestroy, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { Task, TaskStatus } from '../models/task.model';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from './notification.service';
import { WebsocketService, WsStatus } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class BoardService implements OnDestroy {
  private apiUrl = 'http://localhost:8000/api';
  
  // Tasks state as a signal
  private tasksSignal = signal<Task[]>([]);
  public tasks = this.tasksSignal.asReadonly();

  // Connection status signal (exposed to UI)
  private wsStatusSignal = signal<WsStatus>('disconnected');
  public wsStatus = this.wsStatusSignal.asReadonly();
  
  private currentBoardId: string | null = null;
  private wsSub: Subscription | null = null;
  private wsStatusSub: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private wsService: WebsocketService
  ) {}

  loadBoard(boardId: string): void {
    this.currentBoardId = boardId;

    // Initial HTTP fetch for immediate data
    this.http.get<Task[]>(`${this.apiUrl}/boards/${boardId}/tasks`).subscribe({
      next: (tasks) => {
        this.tasksSignal.set(tasks);
      },
      error: () => {
        this.notificationService.error('Failed to load tasks');
        this.tasksSignal.set([]);
      }
    });

    // Open WebSocket — all subsequent updates come through here
    this.wsService.connect(boardId);

    // Sync tasks from WS pushes
    this.wsSub?.unsubscribe();
    this.wsSub = this.wsService.tasks$.subscribe(tasks => {
      this.tasksSignal.set(tasks);
    });

    // Track connection status
    this.wsStatusSub?.unsubscribe();
    this.wsStatusSub = this.wsService.status$.subscribe(status => {
      this.wsStatusSignal.set(status);
    });
  }

  disconnectWebSocket(): void {
    this.wsService.disconnect();
    this.wsSub?.unsubscribe();
    this.wsStatusSub?.unsubscribe();
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

    // Optimistic UI update
    this.tasksSignal.update(tasks => [...tasks, newTask]);
    
    // API call — backend will broadcast to all WebSocket clients
    this.http.post<Task>(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, newTask).subscribe({
      error: () => {
        this.notificationService.error('Failed to save task. Sync failed.');
        // Rollback
        this.tasksSignal.update(tasks => tasks.filter(t => t.id !== newTask.id));
      }
    });
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const previousTasks = this.tasks();
    
    // Optimistic UI update
    this.tasksSignal.update(tasks => tasks.map(t => 
      t.id === taskId ? { ...t, ...updates } : t
    ));
    
    // API call — backend broadcasts to all WS clients
    this.http.patch(`${this.apiUrl}/tasks/${taskId}`, updates).subscribe({
      error: () => {
        this.notificationService.error('Failed to update task.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }

  updateTasks(tasks: Task[]): void {
    const previousTasks = this.tasks();
    
    // Optimistic UI update
    this.tasksSignal.set(tasks);
    
    if (!this.currentBoardId) return;

    // API call — backend broadcasts to all WS clients
    this.http.put(`${this.apiUrl}/boards/${this.currentBoardId}/tasks`, tasks).subscribe({
      error: () => {
        this.notificationService.error('Failed to sync task order.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }

  deleteTask(taskId: string): void {
    if (!this.currentBoardId) return;
    const previousTasks = this.tasks();
    
    // Optimistic UI update
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== taskId));
    
    // API call — backend broadcasts to all WS clients
    this.http.delete(`${this.apiUrl}/tasks/${taskId}`).subscribe({
      error: () => {
        this.notificationService.error('Failed to delete task.');
        this.tasksSignal.set(previousTasks);
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }
}
