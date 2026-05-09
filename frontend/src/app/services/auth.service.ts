import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';

export interface User {
  id: string;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
  
  // Signals for state
  private currentUserSignal = signal<User | null>(null);
  public currentUser = this.currentUserSignal.asReadonly();
  public isLoggedIn = computed(() => !!this.currentUserSignal());

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private loadUserFromToken() {
    const token = this.getToken();
    if (token) {
      this.http.get<User>(`${this.apiUrl}/users/me`).subscribe({
        next: (user) => {
          this.currentUserSignal.set(user);
        },
        error: () => {
          this.logout();
        }
      });
    }
  }

  signup(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/signup`, { username, password });
  }

  login(username: string, password: string): Observable<any> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return this.http.post<any>(`${this.apiUrl}/login`, formData).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        this.loadUserFromToken();
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSignal.set(null);
  }
}
