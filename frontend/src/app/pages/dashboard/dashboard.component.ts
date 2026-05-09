import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BoardService } from '../../services/board.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <!-- Top Nav -->
      <nav class="glass sticky top-0 z-50 border-b border-slate-200/60">
        <div class="max-w-7xl mx-auto px-6 lg:px-8">
          <div class="flex justify-between h-20">
            <div class="flex items-center space-x-3 cursor-pointer" routerLink="/">
              <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <div class="w-4 h-4 border-2 border-white rounded-sm"></div>
              </div>
              <span class="text-xl font-bold font-['Outfit'] tracking-tight">StudentSync</span>
            </div>
            
            <div class="flex items-center space-x-6">
              <div class="hidden sm:flex flex-col items-end">
                <span class="text-sm font-bold text-slate-900">{{ authService.currentUser()?.username }}</span>
                <span class="text-xs text-slate-500">Student Account</span>
              </div>
              <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
                {{ authService.currentUser()?.username?.charAt(0)?.toUpperCase() }}
              </div>
              <button (click)="logout()" class="text-sm font-semibold text-slate-400 hover:text-red-500 transition-colors">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main class="max-w-7xl mx-auto py-12 px-6 lg:px-8 space-y-12">
        <!-- Header & Action -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div class="space-y-2">
            <h2 class="text-4xl font-[800] text-slate-900 tracking-tight font-['Outfit']">Your Workspace</h2>
            <p class="text-slate-500 font-medium">Organize and manage your project boards.</p>
          </div>
          
          <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div class="relative w-full sm:w-64">
              <input #newBoardInput type="text" [(ngModel)]="newBoardTitle" placeholder="New Project Name..." 
                class="input-field !py-3.5 !pr-4 focus:ring-indigo-500">
            </div>
            <button (click)="createNewBoard()" [disabled]="!newBoardTitle.trim() || creating" class="btn-primary !py-3.5 w-full sm:w-auto">
              Create Board
            </button>
          </div>
        </div>

        <!-- Board Grid -->
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <!-- Create Card -->
          <div (click)="newBoardInput.focus()" class="group border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-slate-900">New Project</p>
              <p class="text-sm text-slate-500">Start a new board</p>
            </div>
          </div>

          <!-- Board Cards -->
          <div *ngFor="let board of boards" class="group bg-white rounded-3xl p-8 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all cursor-pointer relative" [routerLink]="['/board', board.id]">
            <div class="flex flex-col h-full justify-between space-y-6">
              <div>
                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate pr-8">{{ board.title }}</h3>
                <p class="text-sm text-slate-400 font-mono mt-1">#{{ board.id }}</p>
              </div>

              <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                <span class="text-sm font-bold text-indigo-600">Open Board</span>
                <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>

            <!-- Delete Button -->
            <button (click)="confirmDelete($event, board.id)" class="absolute top-8 right-8 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="boards.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-6">
           <div class="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
             </svg>
           </div>
           <div class="space-y-2">
             <h3 class="text-2xl font-bold text-slate-900 font-['Outfit']">No Projects Yet</h3>
             <p class="text-slate-500 font-medium">Create your first board to start tracking tasks.</p>
           </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  boards: any[] = [];
  newBoardTitle = '';
  creating = false;

  constructor(
    public authService: AuthService,
    private boardService: BoardService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadBoards();
  }

  loadBoards() {
    this.boardService.fetchUserBoards().subscribe(boards => {
      this.boards = boards;
    });
  }

  createNewBoard() {
    if (!this.newBoardTitle.trim()) return;
    this.creating = true;
    
    this.boardService.createBoard(this.newBoardTitle.trim()).subscribe({
      next: (board) => {
        this.boards.unshift(board);
        this.newBoardTitle = '';
        this.creating = false;
      },
      error: (err) => {
        console.error('Failed to create board', err);
        this.creating = false;
      }
    });
  }

  confirmDelete(event: Event, boardId: string) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this board? All tasks will be lost.')) {
      this.boardService.deleteBoard(boardId).subscribe({
        next: () => {
          this.boards = this.boards.filter(b => b.id !== boardId);
        },
        error: (err) => {
          console.error('Failed to delete board', err);
        }
      });
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
