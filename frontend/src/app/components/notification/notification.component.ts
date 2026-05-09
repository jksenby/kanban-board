import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div 
        *ngFor="let n of notificationService.notifications()" 
        class="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-in"
        [ngClass]="{
          'bg-white/90 border-slate-200 text-slate-800': n.type === 'info',
          'bg-emerald-500/90 border-emerald-400 text-white': n.type === 'success',
          'bg-red-500/90 border-red-400 text-white': n.type === 'error'
        }"
      >
        <div class="flex-1 font-semibold text-sm">
          {{ n.message }}
        </div>
        <button (click)="notificationService.remove(n.id)" class="opacity-50 hover:opacity-100 transition-opacity">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
      animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class NotificationComponent {
  constructor(public notificationService: NotificationService) {}
}
