import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

type Role = string;

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  jwtToken?: string;
  correo?: string;
  roles?: Role[] | string;
  id?: number | string;
}

export interface SignupRequest {
  correo: string;
  password: string;
  // agrega otros campos si aplica (p.ej. nombre, roles, etc.)
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // sin slash final para evitar '//'
  private readonly baseUrl = 'http://localhost:8080';
  private readonly authBase = `${this.baseUrl}/auth-service/auth`;

  constructor(private http: HttpClient) {}

  // ---- Token helpers ----
  storeToken(token: string) {
    localStorage.setItem('token', token);
  }
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ---- API calls ----
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authBase}/login`, credentials);
  }

  signup(data: SignupRequest): Observable<any> {
    return this.http.post(`${this.authBase}/register`, data);
  }

  getCurrentUser(): Observable<any> {
    return this.http.get(`${this.authBase}/profile`);
  }

  logout(): Observable<any> {
    // ajusta si tu backend expone otro endpoint
    return this.http.post(`${this.authBase}/logout`, {});
  }
}
