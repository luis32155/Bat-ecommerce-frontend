import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter, distinctUntilChanged } from 'rxjs/operators';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private auth = inject(AuthService);

  cartCount = signal(0);
  orderCountValue = 0;
  username = signal<string>(localStorage.getItem('username') || localStorage.getItem('correo') || '');
  searchQuery = '';

  ngOnInit(): void {
    // inicializa con snapshot local para que el badge aparezca al toque
    this.cartCount.set(this.cartService.getLocalCount());

    // refrescos
    this.refreshAll();

    // cambios de auth => refrescar
    this.auth.authChanged$.subscribe(() => this.refreshAll());

    // cambios de carrito (añadir/quitar/actualizar) => refrescar
    this.cartService.onCartChange()
      .pipe(distinctUntilChanged())
      .subscribe(() => this.loadCartCount());

    // cambio de ruta => refrescar (por si vienes de login/checkout)
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.refreshAll());

    // si otro tab cambia storage
    window.addEventListener('storage', (e) => {
      if (['token','username','correo','roles','userId','cartLocal'].includes(e.key || '')) {
        this.username.set(localStorage.getItem('username') || localStorage.getItem('correo') || '');
        this.refreshAll();
      }
    });
  }

  private refreshAll() {
    this.username.set(localStorage.getItem('username') || localStorage.getItem('correo') || '');
    this.loadCartCount();
    this.loadOrderCount();
  }

  onSearch(e: Event) {
    e.preventDefault();
    const q = this.searchQuery.trim();
    if (q) this.router.navigate(['/products'], { queryParams: { search: q } });
    else this.router.navigate(['/products']);
  }

  // cuenta desde la respuesta del backend (soporta varias formas)
  private extractCount(resp: any): number {
    if (!resp) return 0;
    const arr = Array.isArray(resp)
      ? resp
      : (resp.products ?? resp.items ?? resp.detalle ?? resp.detalleCarrito ?? resp.data ?? []);
    if (!Array.isArray(arr)) return 0;

    let total = 0;
    for (const it of arr) total += Number(it?.cantidad ?? it?.quantity ?? it?.qty ?? 1) || 0;
    return total || arr.length || 0;
  }

  private countFromLocal(): number {
    return this.cartService.getLocalCount();
  }

  loadCartCount() {
    const localCount = this.countFromLocal();

    if (!this.auth.isLoggedIn()) {
      this.cartCount.set(localCount);
      return;
    }

    this.cartService.getCart().subscribe({
      next: (res) => {
        const backendCount = this.extractCount(res);
        // preferimos el MAYOR para no “aplanar” a 0 si el back no expone GET
        this.cartCount.set(Math.max(backendCount, localCount));
      },
      error: () => this.cartCount.set(localCount),
    });
  }

  loadOrderCount() {
    if (!this.auth.isLoggedIn()) { this.orderCountValue = 0; return; }
    this.orderService.getMyOrders().subscribe({
      next: (res: any[]) => this.orderCountValue = Array.isArray(res) ? res.length : 0,
      error: () => this.orderCountValue = 0
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  login() {
    this.router.navigate(['/login']);
  }

  hasAdminOrSellerRole(): boolean {
    const stored = localStorage.getItem('roles');
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed)
        ? parsed.includes('ROLE_ADMIN') || parsed.includes('ROLE_SELLER')
        : (parsed === 'ROLE_ADMIN' || parsed === 'ROLE_SELLER');
    } catch {
      return stored === 'ROLE_ADMIN' || stored === 'ROLE_SELLER';
    }
  }
}
