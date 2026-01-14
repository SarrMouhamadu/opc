import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

// Update with your actual API URL
const API_URL = 'http://51.255.60.133:8000';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    // Check for existing token on load
    const token = localStorage.getItem('access_token');
    if (token) {
      this.isAuthenticated.set(true);
      // Ideally, decode token to get user info here
      this.currentUser.set('Admin'); 
    }
  }

  login(username: string, password: string): Observable<any> {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    return this.http.post<any>(`${API_URL}/token`, formData).pipe(
      tap((res) => {
        localStorage.setItem('access_token', res.access_token);
        this.isAuthenticated.set(true);
        this.currentUser.set(username); // Or decode from token
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    // Reload or redirect handled by app state
  }
}
