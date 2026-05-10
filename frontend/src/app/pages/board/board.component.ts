import { Component, OnInit, OnDestroy, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  CdkDragDrop, 
  moveItemInArray, 
  transferArrayItem, 
  CdkDrag, 
  CdkDropList,
  CdkDropListGroup
} from '@angular/cdk/drag-drop';
import { BoardService } from '../../services/board.service';
import { Task, TaskStatus } from '../../models/task.model';
import { ChatComponent } from '../../components/chat/chat.component';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDrag, CdkDropList, CdkDropListGroup, RouterModule, ChatComponent],
  template: `
    <div class="min-h-screen bg-[#f8fafc] flex font-sans text-slate-900 overflow-hidden">
      
      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <!-- Header -->
        <header class="glass sticky top-0 z-40 border-b border-slate-200/60 px-6 lg:px-12 py-4 flex justify-between items-center h-20 shrink-0">
          <div class="flex items-center space-x-4">
            <div routerLink="/dashboard" class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 cursor-pointer">
              <div class="w-5 h-5 border-2 border-white rounded-sm"></div>
            </div>
            <div>
              <h1 class="text-xl font-extrabold font-['Outfit'] tracking-tight truncate max-w-[200px] lg:max-w-md">{{ boardTitle || 'Loading Project...' }}</h1>
              <p class="text-xs font-mono text-slate-400">BOARD ID: {{ boardId }}</p>
            </div>
          </div>
          
          <!-- Right side: Live indicator + Chat Toggle + Share button -->
          <div class="flex items-center space-x-3">
            <!-- Live connection indicator -->
            <div class="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-500"
                 [ngClass]="{
                   'bg-emerald-50 border-emerald-200 text-emerald-700': wsStatus() === 'connected',
                   'bg-amber-50 border-amber-200 text-amber-700': wsStatus() === 'connecting',
                   'bg-slate-100 border-slate-200 text-slate-500': wsStatus() === 'disconnected'
                 }">
              <span class="w-2 h-2 rounded-full transition-colors duration-500"
                    [ngClass]="{
                      'bg-emerald-500 animate-pulse': wsStatus() === 'connected',
                      'bg-amber-400 animate-pulse': wsStatus() === 'connecting',
                      'bg-slate-400': wsStatus() === 'disconnected'
                    }"></span>
              <span>{{ wsStatus() === 'connected' ? 'Live' : wsStatus() === 'connecting' ? 'Connecting…' : 'Offline' }}</span>
            </div>

            <!-- Chat Toggle Button -->
            <button (click)="isChatOpen.set(!isChatOpen())" 
                    [ngClass]="{'bg-indigo-600 text-white shadow-indigo-500/20': isChatOpen(), 'btn-secondary': !isChatOpen()}"
                    class="p-2.5 rounded-xl transition-all relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <span *ngIf="!isChatOpen()" class="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full"></span>
            </button>

            <button (click)="copyInviteLink()" class="btn-secondary !py-2.5 !px-5 text-sm hidden lg:flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{{ copied ? 'Link Copied' : 'Share' }}</span>
            </button>
          </div>
        </header>

        <!-- Board Grid -->
        <main class="flex-1 p-6 lg:p-12 space-y-10 max-w-[1600px] mx-auto w-full">
          
          <!-- Task Input -->
          <div class="max-w-3xl mx-auto">
            <div class="relative group">
              <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <input 
                type="text" 
                [(ngModel)]="newTaskTitle" 
                (keyup.enter)="addTask()"
                placeholder="What's the next goal?" 
                class="w-full pl-14 pr-6 py-5 text-xl bg-white border border-slate-200 rounded-3xl shadow-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-medium"
              >
            </div>
          </div>

          <!-- Kanban Board -->
          <div class="flex flex-col lg:flex-row gap-8 min-h-[600px]" cdkDropListGroup>
            <!-- To Do Column -->
            <div class="flex-1 flex flex-col bg-slate-50 border border-slate-200/60 rounded-[32px] overflow-hidden">
              <div class="px-6 py-5 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                <div class="flex items-center space-x-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                  <h3 class="font-bold text-slate-900 tracking-tight font-['Outfit']">To Do</h3>
                </div>
                <span class="bg-slate-200/50 text-slate-500 py-1 px-3 rounded-full text-xs font-bold tracking-wider">
                  {{ todoTasks().length }}
                </span>
              </div>
              <div 
                id="TODO"
                cdkDropList
                [cdkDropListData]="todoTasks()"
                (cdkDropListDropped)="drop($event)"
                class="flex-1 p-4 space-y-4 overflow-y-auto"
              >
                <div *ngFor="let task of todoTasks(); trackBy: trackById" cdkDrag class="task-card group">
                  <ng-container *ngTemplateOutlet="taskTemplate; context: { $implicit: task }"></ng-container>
                </div>
                <div *ngIf="todoTasks().length === 0" class="empty-state">Empty</div>
              </div>
            </div>

            <!-- In Progress Column -->
            <div class="flex-1 flex flex-col bg-slate-50 border border-slate-200/60 rounded-[32px] overflow-hidden">
              <div class="px-6 py-5 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                <div class="flex items-center space-x-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                  <h3 class="font-bold text-slate-900 tracking-tight font-['Outfit']">In Progress</h3>
                </div>
                <span class="bg-slate-200/50 text-slate-500 py-1 px-3 rounded-full text-xs font-bold tracking-wider">
                  {{ inProgressTasks().length }}
                </span>
              </div>
              <div 
                id="IN_PROGRESS"
                cdkDropList
                [cdkDropListData]="inProgressTasks()"
                (cdkDropListDropped)="drop($event)"
                class="flex-1 p-4 space-y-4 overflow-y-auto"
              >
                <div *ngFor="let task of inProgressTasks(); trackBy: trackById" cdkDrag class="task-card group">
                  <ng-container *ngTemplateOutlet="taskTemplate; context: { $implicit: task }"></ng-container>
                </div>
                <div *ngIf="inProgressTasks().length === 0" class="empty-state">Empty</div>
              </div>
            </div>

            <!-- Done Column -->
            <div class="flex-1 flex flex-col bg-slate-50 border border-slate-200/60 rounded-[32px] overflow-hidden">
              <div class="px-6 py-5 border-b border-slate-200/60 flex items-center justify-between bg-white/50">
                <div class="flex items-center space-x-3">
                  <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <h3 class="font-bold text-slate-900 tracking-tight font-['Outfit']">Done</h3>
                </div>
                <span class="bg-slate-200/50 text-slate-500 py-1 px-3 rounded-full text-xs font-bold tracking-wider">
                  {{ doneTasks().length }}
                </span>
              </div>
              <div 
                id="DONE"
                cdkDropList
                [cdkDropListData]="doneTasks()"
                (cdkDropListDropped)="drop($event)"
                class="flex-1 p-4 space-y-4 overflow-y-auto"
              >
                <div *ngFor="let task of doneTasks(); trackBy: trackById" cdkDrag class="task-card group">
                  <ng-container *ngTemplateOutlet="taskTemplate; context: { $implicit: task }"></ng-container>
                </div>
                <div *ngIf="doneTasks().length === 0" class="empty-state">Empty</div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <!-- Chat Sidebar -->
      <aside [ngClass]="{'w-[400px] border-l border-slate-200/60': isChatOpen(), 'w-0 overflow-hidden border-none': !isChatOpen()}"
             class="h-screen sticky top-0 transition-all duration-300 ease-out shrink-0 z-50">
        <app-chat *ngIf="isChatOpen()" [boardId]="boardId" (onClose)="isChatOpen.set(false)"></app-chat>
      </aside>

    </div>

    <!-- Task Template -->
    <ng-template #taskTemplate let-task>
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div *ngIf="editingTaskId !== task.id; else editTask" (click)="startEditing(task)">
            <p class="text-[15px] font-semibold text-slate-800 leading-relaxed" [ngClass]="{'line-through text-slate-400': task.status === 'DONE'}">
              {{ task.title }}
            </p>
          </div>
          <ng-template #editTask>
            <input [(ngModel)]="editingTitle" (keyup.enter)="saveEdit()" (blur)="saveEdit()" autofocus
              class="w-full p-0 border-none focus:ring-0 text-[15px] font-semibold text-indigo-600 bg-transparent">
          </ng-template>
        </div>
        
        <button (click)="deleteTask(task.id)" class="ml-4 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </ng-template>
  `,
  styles: [`
    .task-card {
      @apply bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative cursor-grab active:cursor-grabbing;
    }
    .empty-state {
      @apply flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold uppercase tracking-widest;
    }
    .cdk-drag-preview {
      @apply shadow-2xl rounded-2xl !bg-white/90 backdrop-blur-md border border-indigo-100 p-5;
    }
    .cdk-drag-placeholder {
      @apply opacity-20 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200;
    }
    .cdk-drag-animating {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 300ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drag {
      touch-action: none;
    }
  `]
})
export class BoardComponent implements OnInit, OnDestroy {
  boardId: string = '';
  boardTitle: string = '';
  newTaskTitle: string = '';
  copied: boolean = false;
  
  editingTaskId: string | null = null;
  editingTitle: string = '';

  // Chat state
  isChatOpen = signal<boolean>(false);

  // Expose ws status to template — assigned in constructor after DI
  wsStatus!: typeof this.boardService.wsStatus;
  
  // Computed signals for columns
  todoTasks = computed(() => 
    this.boardService.tasks()
      .filter(t => t.status === 'TODO')
      .sort((a,b) => (a.position || 0) - (b.position || 0))
  );
  
  inProgressTasks = computed(() => 
    this.boardService.tasks()
      .filter(t => t.status === 'IN_PROGRESS')
      .sort((a,b) => (a.position || 0) - (b.position || 0))
  );
  
  doneTasks = computed(() => 
    this.boardService.tasks()
      .filter(t => t.status === 'DONE')
      .sort((a,b) => (a.position || 0) - (b.position || 0))
  );

  constructor(
    private route: ActivatedRoute,
    private boardService: BoardService
  ) {
    this.wsStatus = this.boardService.wsStatus;
  }

  ngOnInit(): void {
    this.boardId = this.route.snapshot.paramMap.get('id') || '';
    
    if (this.boardId) {
      this.boardService.loadBoard(this.boardId);
      this.boardService.getBoard(this.boardId).subscribe(board => {
        this.boardTitle = board.title;
      });
    }
  }

  ngOnDestroy(): void {
    this.boardService.disconnectWebSocket();
  }

  addTask(): void {
    if (this.newTaskTitle.trim()) {
      this.boardService.addTask(this.newTaskTitle.trim());
      this.newTaskTitle = '';
    }
  }

  deleteTask(taskId: string): void {
    this.boardService.deleteTask(taskId);
  }

  copyInviteLink(): void {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  startEditing(task: Task): void {
    this.editingTaskId = task.id;
    this.editingTitle = task.title;
  }

  saveEdit(): void {
    if (this.editingTaskId && this.editingTitle.trim()) {
      this.boardService.updateTask(this.editingTaskId, { title: this.editingTitle.trim() });
    }
    this.editingTaskId = null;
    this.editingTitle = '';
  }

  drop(event: CdkDragDrop<Task[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
    this.saveOrder();
  }

  trackById(index: number, item: Task): string {
    return item.id;
  }

  private saveOrder(): void {
    const updatedTasks: Task[] = [
      ...this.todoTasks().map((t, i) => ({ ...t, status: 'TODO' as TaskStatus, position: i })),
      ...this.inProgressTasks().map((t, i) => ({ ...t, status: 'IN_PROGRESS' as TaskStatus, position: i })),
      ...this.doneTasks().map((t, i) => ({ ...t, status: 'DONE' as TaskStatus, position: i }))
    ];
    
    this.boardService.updateTasks(updatedTasks);
  }
}
