import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Task } from '../models/task.model';

export interface ChatMessage {
  id: string;
  boardId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private taskSubject = new Subject<Task[]>();
  private chatSubject = new Subject<ChatMessage>();
  private historySubject = new Subject<ChatMessage[]>();
  private statusSubject = new Subject<WsStatus>();

  private currentBoardId: string | null = null;
  private reconnectTimer: any = null;
  private reconnectDelay = 1000;
  private destroyed = false;

  get tasks$(): Observable<Task[]> {
    return this.taskSubject.asObservable();
  }

  get chatMessage$(): Observable<ChatMessage> {
    return this.chatSubject.asObservable();
  }

  get chatHistory$(): Observable<ChatMessage[]> {
    return this.historySubject.asObservable();
  }

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

  sendMessage(payload: { userId: string, username: string, content: string }): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        payload
      }));
    }
  }

  private openSocket(): void {
    if (!this.currentBoardId || this.destroyed) return;

    this.statusSubject.next('connecting');
    const url = `ws://localhost:8000/ws/boards/${this.currentBoardId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.statusSubject.next('connected');
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'tasks_updated':
            this.taskSubject.next(data.tasks);
            break;
          case 'chat_message':
            this.chatSubject.next(data.message);
            break;
          case 'chat_history':
            this.historySubject.next(data.messages);
            break;
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.destroyed) {
        this.statusSubject.next('disconnected');
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
