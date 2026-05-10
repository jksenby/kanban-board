import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <!-- Background Decorative Elements -->
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>

      <!-- Top Nav -->
      <nav class="w-full flex justify-between items-center p-6 lg:px-12 relative z-10">
        <div class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <div class="w-5 h-5 border-2 border-white rounded-sm"></div>
          </div>
          <span class="text-2xl font-extrabold text-slate-900 tracking-tight font-['Outfit']">StudentSync</span>
        </div>
        
        <div class="flex items-center space-x-6">
          <ng-container *ngIf="authService.isLoggedIn()">
            <button routerLink="/dashboard" class="btn-primary">Dashboard</button>
          </ng-container>
        </div>
      </nav>

      <!-- Hero Section -->
      <main class="flex-1 flex flex-col items-center justify-center p-6 text-center relative z-10 -mt-20">
        <div class="max-w-4xl w-full space-y-10">
          <div class="space-y-6">
            <h1 class="text-6xl md:text-8xl font-[800] text-slate-900 tracking-tight leading-[0.9] font-['Outfit']">
              Project tracking <br> 
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                without the friction.
              </span>
            </h1>
            <p class="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              The minimalist Kanban board for student teams. <br>
              Zero setup, zero clutter, just focus.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <ng-container *ngIf="authService.isLoggedIn(); else loggedOutCta">
              <button routerLink="/dashboard" class="btn-primary !px-10 !py-5 text-xl">
                Go to Your Dashboard
              </button>
            </ng-container>
            <ng-template #loggedOutCta>
              <button routerLink="/signup" class="btn-primary !px-10 !py-5 text-xl">
                Create Your Account
              </button>
              <button routerLink="/login" class="btn-secondary !px-10 !py-5 text-xl">
                Sign In
              </button>
            </ng-template>
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="p-8 text-center text-slate-400 text-sm">
        Built for university projects. No tracking. No ads.
      </footer>
    </div>
  `
})
export class LandingComponent {
  constructor(public authService: AuthService) {}
}
