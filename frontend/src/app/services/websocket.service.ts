import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Task } from '../models/task.model';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private taskSubject = new Subject<Task[]>();
  private statusSubject = new Subject<WsStatus>();

  private currentBoardId: string | null = null;
  private reconnectTimer: any = null;
  private reconnectDelay = 1000; // ms, doubles on each failure
  private destroyed = false;

  /** Emits whenever the server pushes an updated task list. */
  get tasks$(): Observable<Task[]> {
    return this.taskSubject.asObservable();
  }

  /** Emits the current connection status. */
  get status$(): Observable<WsStatus> {
    return this.statusSubject.asObservable();
  }

  connect(boardId: string): void {
    this.currentBoardId = boardId;
    this.destroyed = false;
    this.reconnectDelay = 1000;
    this.openSocket();
  }

  disconnect(): void {
    this.destroyed = true;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.statusSubject.next('disconnected');
  }

  private openSocket(): void {
    if (!this.currentBoardId || this.destroyed) return;

    this.statusSubject.next('connecting');
    const url = `ws://localhost:8000/ws/boards/${this.currentBoardId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // reset backoff on success
      this.statusSubject.next('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'tasks_updated' && Array.isArray(data.tasks)) {
          this.taskSubject.next(data.tasks as Task[]);
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.destroyed) {
        this.statusSubject.next('disconnected');
        // Exponential backoff reconnect (max 30s)
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
          this.openSocket();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
