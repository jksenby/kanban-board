import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface User {
  id: string;
  username: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.get<User>(`${this.apiUrl}/users/me`).subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => this.logout() // Invalid token
      });
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  signup(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/signup`, { username, password });
  }

  login(username: string, password: string): Observable<AuthResponse> {
    const formData = new URLSearchParams();
    formData.set('username', username);
    formData.set('password', password);

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        localStorage.setItem('token', response.access_token);
        this.loadUserFromToken();
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
  }
}
