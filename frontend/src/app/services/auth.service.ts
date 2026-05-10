import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, switchMap } from 'rxjs';

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

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  init(): Observable<any> {
    const token = this.getToken();
    if (!token) {
      return of(null);
    }
    
    return this.http.get<User>(`${this.apiUrl}/users/me`).pipe(
      tap(user => {
        this.currentUserSignal.set(user);
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }


  signup(username: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/signup`, { username, password });
  }

  login(username: string, password: string): Observable<any> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return this.http.post<any>(`${this.apiUrl}/login`, formData).pipe(
      switchMap(response => {
        localStorage.setItem('token', response.access_token);
        return this.init();
      })
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUserSignal.set(null);
  }
}
