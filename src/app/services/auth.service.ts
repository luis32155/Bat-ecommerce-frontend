import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

type Role = string;

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token?: string;           // variante común
  jwtToken?: string;        // otra variante
  accessToken?: string;     // otra variante
  jwt?: string;             // otra variante
  id?: number;
  userId?: number;
  usuarioId?: number;
  username?: string;
  correo?: string;
  roles?: Role[] | string;
  user?: {
    id?: number;
    username?: string;
    correo?: string;
    roles?: Role[] | string;
  };
}

export interface SignupRequest {
  nombre: string;
  celular: string;
  correo: string;
  direccion: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authBase = environment.AUTH_BASE; // ej: http://localhost:8080/auth-service or .../auth-service/auth

  // Notificador para que el header/otros se enteren de login/logout
  private _authChanged = new Subject<void>();
  authChanged$ = this._authChanged.asObservable();

  constructor(private http: HttpClient) {}

  // ------------------ LOGIN ------------------
  login(data: LoginRequest): Observable<LoginResponse> {
    // 1er intento: {AUTH_BASE}/login
    // fallback:   {AUTH_BASE}/auth/login
    const url1 = this.join(this.authBase, 'login');
    const url2 = this.join(this.authBase, 'auth/login');

    return this.http.post<LoginResponse>(url1, data, { observe: 'response' as const }).pipe(
      tap((res) => this.persistFromResponse(res)),
      map((res) => res.body as LoginResponse),
      catchError((err1) => {
        if (err1?.status === 404 || err1?.status === 405) {
          return this.http.post<LoginResponse>(url2, data, { observe: 'response' as const }).pipe(
            tap((res) => this.persistFromResponse(res)),
            map((res) => res.body as LoginResponse),
          );
        }
        return throwError(() => err1);
      })
    );
  }

  // ------------------ SIGNUP ------------------
  signup(data: SignupRequest): Observable<any> {
    const url1 = this.join(this.authBase, 'register');
    const url2 = this.join(this.authBase, 'auth/register');
    return this.http.post(url1, data).pipe(
      catchError((err1) => {
        if (err1?.status === 404 || err1?.status === 405) {
          return this.http.post(url2, data);
        }
        return throwError(() => err1);
      })
    );
  }

  // ------------------ PROFILE ------------------
  getCurrentUser(): Observable<any> {
    const url1 = this.join(this.authBase, 'profile');
    const url2 = this.join(this.authBase, 'auth/profile');
    return this.http.get(url1).pipe(
      catchError((err1) => {
        if (err1?.status === 404 || err1?.status === 405) {
          return this.http.get(url2);
        }
        return throwError(() => err1);
      })
    );
  }

  // ------------------ LOGOUT ------------------
  logout(): Observable<void> {
    const url1 = this.join(this.authBase, 'logout');
    const url2 = this.join(this.authBase, 'auth/logout');

    // siempre limpia local, no bloquees por error del server
    // dentro de AuthService.logout()
    const clear = () => {
      [
        'token','jwtToken','accessToken','jwt', // todas las variantes de token
        'roles','username','correo','userId',
        'cartLocal' // carrito local si lo usas
      ].forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      this._authChanged.next(); // avisa a la app
    };


    return this.http.post(url1, {}).pipe(
      map(() => void 0),
      tap(clear),
      catchError(() => {
        // reintenta en ruta alternativa; si también falla, igual limpia
        return this.http.post(url2, {}).pipe(
          map(() => void 0),
          tap(clear),
          catchError(() => {
            clear();
            return of(void 0);
          })
        );
      })
    );
  }

  // ------------------ HELPERS DE ESTADO ------------------
  isLoggedIn(): boolean {
    const t = this.getToken();
    if (!t) return false;
    return !this.isTokenExpired(t);
  }

  getToken(): string | null {
    // guardes “token” o “Bearer x”, el interceptor ya normaliza
    return localStorage.getItem('token');
  }

  getUserId(): number | null {
    const v = localStorage.getItem('userId');
    return v ? Number(v) : null;
    }

  getUsername(): string {
    return localStorage.getItem('username') || localStorage.getItem('correo') || '';
  }

  getRoles(): string[] {
    const raw = localStorage.getItem('roles');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[];
      if (typeof parsed === 'string') return [parsed];
    } catch {
      // si era un string plano
      return [raw];
    }
    return [];
  }

  // ------------------ PRIVADOS ------------------
  private persistFromResponse(res: HttpResponse<LoginResponse>) {
    const body = res?.body || {};

    // token: body o header Authorization
    const headerAuth = res.headers?.get('Authorization') || '';
    const tokenFromHeader = headerAuth?.toLowerCase().startsWith('bearer ')
      ? headerAuth.slice(7)
      : '';

    const token =
      body.token ||
      body.jwtToken ||
      body.accessToken ||
      body.jwt ||
      tokenFromHeader ||
      '';

    if (token) localStorage.setItem('token', token);

    const id =
      body.id ??
      body.userId ??
      body.usuarioId ??
      body.user?.id ??
      null;

    const username =
      body.username ??
      body.user?.username ??
      body.correo ??
      body.user?.correo ??
      '';

    const correo =
      body.correo ??
      body.user?.correo ??
      '';

    const rolesRaw: any =
      body.roles ??
      body.user?.roles ??
      [];

    if (id != null) localStorage.setItem('userId', String(id));
    if (correo) localStorage.setItem('correo', correo);
    if (username) localStorage.setItem('username', username);

    // normaliza roles a JSON string de array
    let rolesToStore: string[] = [];
    try {
      if (Array.isArray(rolesRaw)) {
        rolesToStore = rolesRaw as string[];
      } else if (typeof rolesRaw === 'string') {
        // si vino como '["ROLE_USER"]' parsea, si no, envuélvelo
        rolesToStore = rolesRaw.trim().startsWith('[')
          ? (JSON.parse(rolesRaw) as string[])
          : [rolesRaw];
      }
    } catch {
      rolesToStore = [];
    }
    localStorage.setItem('roles', JSON.stringify(rolesToStore));

    // notifica a la app que cambió el estado de auth
    this._authChanged.next();
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false; // si no es JWT, no invalides
      const payload = JSON.parse(this.safeAtob(parts[1]));
      const exp = payload?.exp;
      if (!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch {
      return false;
    }
  }

  private safeAtob(b64: string): string {
    // corrige padding base64url
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    return atob(b64);
  }

  private join(base: string, path: string): string {
    if (!base) return path;
    const b = base.endsWith('/') ? base.slice(0, -1) : base;
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${b}/${p}`;
  }
}
