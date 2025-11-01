import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

const AUTH_BYPASS = [/\/auth\/login/i, /\/auth\/register/i, /\/auth\/refresh/i];

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // 1) No tocar preflight, endpoints de auth, solicitudes que ya traen Authorization
  //    o cuando se pida explícitamente saltar auth (X-Skip-Auth: true)
  if (
    req.method === 'OPTIONS' ||
    req.headers.has('Authorization') ||
    AUTH_BYPASS.some(rx => rx.test(req.url)) ||
    req.headers.get('X-Skip-Auth') === 'true'
  ) {
    return next(req);
  }

  // 2) Agregar Bearer si hay token (normalizando si ya guardaste "Bearer <token>")
  const raw = localStorage.getItem('token') || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // status 0 => red/CORS: no limpies sesión
      if (err.status === 0) {
        return throwError(() => err);
      }

      // 401/403: limpiar sesión y mandar a login (evita bucles)
      const isAuthUrl = AUTH_BYPASS.some(rx => rx.test(authReq.url));
      const alreadyOnLogin = router.url.startsWith('/login');

      if ((err.status === 401 || err.status === 403) && !isAuthUrl && !alreadyOnLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('correo');
        localStorage.removeItem('roles');
        router.navigate(['/login']);
      }

      return throwError(() => err);
    })
  );
};
