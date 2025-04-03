import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { tap, map, catchError, finalize } from 'rxjs/operators';

export interface User {
  fullname: string;
  email: string;
  profileImageUrl: string;
}

interface AuthResponse {
  message: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUser: User | null = null;
  
  // Use ReplaySubject to cache the last emitted value for late subscribers
  private currentUserSubject = new ReplaySubject<User | null>(1);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Add a flag to track if auth state loading is complete
  private authStateInitialized = new BehaviorSubject<boolean>(false);
  public authStateInitialized$ = this.authStateInitialized.asObservable();

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  private loadUserFromToken() {
    this.authStateInitialized.next(false);
  
    if (typeof window !== 'undefined' && localStorage.getItem('currentUser')) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        this.currentUserSubject.next(this.currentUser);
      }
    }
  
    console.log('Fetching user from API...');
  
    this.http.get<AuthResponse>(`${this.apiUrl}/auth-status`, { withCredentials: true })
      .pipe(
        catchError(error => {
          console.error('Error loading user from /auth-status:', error);
          return of(null); // Ensure observable emits null instead of breaking
        }),
        finalize(() => {
          this.authStateInitialized.next(true);
          console.log('Auth state initialization complete');
        })
      )
      .subscribe(response => {
        if (response && response.user) {
          this.currentUser = response.user;
          if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser)); 
          }
          this.currentUserSubject.next(this.currentUser);
          console.log('User loaded from API:', this.currentUser);
        } else {
          this.currentUser = null;
          if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser'); 
          }
          this.currentUserSubject.next(null);
          console.log('No authenticated user found');
        }
      });
  }

  register(fullname: string, email: string, password: string): Observable<AuthResponse> {
    const url = `${this.apiUrl}/register?fullname=${encodeURIComponent(fullname)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    return this.http.get<AuthResponse>(url, { withCredentials: true }).pipe(
      tap(response => {
        this.currentUser = response.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.currentUserSubject.next(this.currentUser);
        console.log('User set after login/register:', this.currentUser);
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const url = `${this.apiUrl}/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    return this.http.get<AuthResponse>(url, { withCredentials: true }).pipe(
      tap(response => {
        this.currentUser = response.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.currentUserSubject.next(this.currentUser);
        console.log('User set after login/register:', this.currentUser);
      })
    );
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser;
  }

  isLoggedIn$(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user)
    );
  }

  logout(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logout`, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        console.log('User logged out');
      }),
      catchError(error => {
        console.error('Error during logout:', error);
        // Still clear user state even if the logout request fails
        this.currentUser = null;
        this.currentUserSubject.next(null);
        throw error;
      })
    );
  }
}