import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface LoginRequest {
  correo: string;
  password: string;
}

interface LoginResponse {
  token?: string;       // tu backend devuelve 'token'
  jwtToken?: string;    // por si acaso
  correo?: string;
  roles?: string[] | string;
  id?: number | string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  correo = '';
  password = '';
  loginErrorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/products']);
    }
  }

  login() {
    const body: LoginRequest = { correo: this.correo, password: this.password };

    // limpia credenciales viejas
    localStorage.removeItem('token');
    localStorage.removeItem('correo');
    localStorage.removeItem('roles');
    localStorage.removeItem('userId');

    this.auth.login(body).subscribe({
      next: (res: LoginResponse) => {
        const token = res.jwtToken ?? res.token;
        if (token) localStorage.setItem('token', token);

        // Guardar CORREO (en vez de username)
        const correoResp = res.correo ?? this.correo;
        if (correoResp) localStorage.setItem('correo', correoResp);

        // Normaliza roles si vienen como string
        const roles = Array.isArray(res.roles)
          ? res.roles
          : (res.roles ? String(res.roles).split(',') : []);
        if (roles.length) localStorage.setItem('roles', JSON.stringify(roles));

        if (res.id != null) localStorage.setItem('userId', String(res.id));

        this.router.navigate(['/products']); // sin reload
      },
      error: (err) => {
        const badCreds =
          err?.status === 401 ||
          err?.status === 403 ||
          err?.status === 404 ||
          err?.error?.message === 'Bad credentials';

        this.loginErrorMessage = badCreds
          ? 'Usuario o contraseña inválidos.'
          : err?.status === 0
            ? 'No se pudo conectar con el servidor (CORS o red).'
            : 'Ocurrió un problema. Intenta de nuevo.';
      },
    });
  }
}
