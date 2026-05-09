import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { NotificationService } from './services/notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) {}

  handleError(error: any): void {
    const notificationService = this.injector.get(NotificationService);
    
    console.error('Global Error:', error);

    let message = 'An unexpected error occurred.';
    
    if (error.error?.detail) {
      message = error.error.detail;
    } else if (error.message) {
      message = error.message;
    }

    // Don't show technical errors like "ExpressionChangedAfterItHasBeenCheckedError" in production-like UI
    if (!message.includes('ExpressionChangedAfterItHasBeenCheckedError')) {
      notificationService.error(message);
    }
  }
}
