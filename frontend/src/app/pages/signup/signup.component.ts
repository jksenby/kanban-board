import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      <!-- Background Decor -->
      <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
      <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>

      <div class="max-w-md w-full glass p-10 rounded-[40px] shadow-2xl shadow-indigo-500/5 space-y-10 relative z-10">
        <div class="text-center space-y-2">
          <div class="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-6 cursor-pointer" routerLink="/">
            <div class="w-7 h-7 border-4 border-white rounded-md"></div>
          </div>
          <h2 class="text-3xl font-[800] text-slate-900 font-['Outfit'] tracking-tight">Create Account</h2>
          <p class="text-slate-500 font-medium">Join StudentSync to start tracking.</p>
        </div>

        <form class="space-y-6" (ngSubmit)="onSubmit()">
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 ml-1">Username</label>
            <input type="text" [(ngModel)]="username" name="username" placeholder="choose_username"
              class="input-field !bg-slate-50/50">
          </div>
          <div class="space-y-2">
            <label class="text-sm font-bold text-slate-700 ml-1">Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="••••••••"
              class="input-field !bg-slate-50/50">
          </div>
          
          <div *ngIf="errorMessage" class="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100">
            {{ errorMessage }}
          </div>

          <button type="submit" [disabled]="loading" class="btn-primary w-full !py-4 text-lg">
            {{ loading ? 'Creating Account...' : 'Sign Up' }}
          </button>
        </form>

        <p class="text-center text-slate-500 font-medium">
          Already have an account? 
          <a routerLink="/login" class="text-indigo-600 font-bold hover:underline">Log in</a>
        </p>
      </div>
    </div>
  `
})
export class SignupComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.username || !this.password) return;
    
    this.loading = true;
    this.errorMessage = '';
    
    this.authService.signup(this.username, this.password).subscribe({
      next: () => {
        this.authService.login(this.username, this.password).subscribe({
          next: () => {
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.loading = false;
            this.errorMessage = 'Account created, but failed to log in. Please try manually.';
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Failed to sign up';
      }
    });
  }
}
