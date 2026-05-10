import { Injectable, signal } from '@angular/core';

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  public notifications = this.notificationsSignal.asReadonly();
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = this.nextId++;
    const notification: Notification = { message, type, id };
    
    this.notificationsSignal.update(n => [...n, notification]);
    setTimeout(() => {
      this.remove(id);
    }, 5000);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  remove(id: number) {
    this.notificationsSignal.update(n => n.filter(x => x.id !== id));
  }
}
