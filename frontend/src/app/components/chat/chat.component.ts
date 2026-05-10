import { Component, Input, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked, signal, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebsocketService, ChatMessage } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-container flex flex-col h-full bg-white/70 backdrop-blur-xl border-l border-slate-200/60 shadow-2xl overflow-hidden">
      <!-- Chat Header -->
      <div class="px-6 py-5 border-b border-slate-200/60 bg-white/40 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 class="font-bold text-slate-900 tracking-tight font-['Outfit']">Board Discussion</h2>
        </div>
        <button (click)="onClose.emit()" class="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Messages Area -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        <div *ngFor="let msg of messages(); trackBy: trackById" 
             [ngClass]="{'flex-row-reverse space-x-reverse': isMe(msg.userId)}"
             class="flex items-start space-x-3 group">
          
          <!-- Avatar -->
          <div [ngClass]="isMe(msg.userId) ? 'bg-indigo-600' : 'bg-slate-200'"
               class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-sm">
            {{ msg.username.substring(0, 2).toUpperCase() }}
          </div>

          <div [ngClass]="isMe(msg.userId) ? 'items-end' : 'items-start'" class="flex flex-col max-w-[80%]">
            <div class="flex items-baseline space-x-2 mb-1 px-1">
              <span class="text-[11px] font-bold text-slate-900 tracking-wide">{{ msg.username }}</span>
              <span class="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{{ formatTime(msg.timestamp) }}</span>
            </div>
            
            <div [ngClass]="isMe(msg.userId) ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-2xl rounded-tl-none shadow-sm'"
                 class="px-4 py-2.5 text-sm leading-relaxed shadow-indigo-500/5">
              {{ msg.content }}
            </div>
          </div>
        </div>

        <div *ngIf="messages().length === 0" class="flex flex-col items-center justify-center h-full text-slate-300 space-y-4 opacity-60 py-20">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
             </svg>
          </div>
          <p class="text-xs font-bold uppercase tracking-widest">No messages yet</p>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-6 bg-white/40 border-t border-slate-200/60">
        <form (submit)="sendMessage($event)" class="relative">
          <input 
            type="text" 
            [(ngModel)]="newMessage" 
            name="newMessage"
            placeholder="Write a message..." 
            class="w-full pl-5 pr-14 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm font-medium"
          >
          <button 
            type="submit"
            [disabled]="!newMessage.trim()"
            class="absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .scroll-smooth {
      scrollbar-width: thin;
      scrollbar-color: rgba(79, 70, 229, 0.2) transparent;
    }
    .scroll-smooth::-webkit-scrollbar {
      width: 4px;
    }
    .scroll-smooth::-webkit-scrollbar-track {
      background: transparent;
    }
    .scroll-smooth::-webkit-scrollbar-thumb {
      @apply bg-slate-200 rounded-full;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @Input() boardId: string = '';
  
  @Output() onClose = new EventEmitter<void>();
  
  messages = signal<ChatMessage[]>([]);
  newMessage: string = '';
  private subs = new Subscription();
  currentUser: any = null;

  constructor(
    private wsService: WebsocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser();

    // Listen for history
    this.subs.add(this.wsService.chatHistory$.subscribe(history => {
      this.messages.set(history);
      this.scrollToBottom();
    }));

    // Listen for new messages
    this.subs.add(this.wsService.chatMessage$.subscribe(msg => {
      this.messages.update(msgs => [...msgs, msg]);
      this.scrollToBottom();
    }));
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  isMe(userId: string): boolean {
    return this.currentUser?.id === userId;
  }

  sendMessage(event: Event): void {
    event.preventDefault();
    if (!this.newMessage.trim() || !this.currentUser) return;

    this.wsService.sendMessage({
      userId: this.currentUser.id,
      username: this.currentUser.username,
      content: this.newMessage.trim()
    });

    this.newMessage = '';
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackById(index: number, item: ChatMessage): string {
    return item.id;
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
