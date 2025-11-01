// cart.service.ts
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CartItem {
  productId: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private baseUrl = environment.CART_BASE; // p.ej. http://localhost:8080/cart-service
  private readonly LOCAL_KEY = 'cartLocal';

  constructor(private http: HttpClient) {}

  // ---- eventos para header/badges ----
  private cartUpdated = new Subject<void>();
  onCartChange(): Observable<void> { return this.cartUpdated.asObservable(); }
  notifyCartChange() { this.cartUpdated.next(); }

  // ---- helpers auth/headers ----
  private authHeaders(extra?: Record<string, string>): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const userId = localStorage.getItem('userId') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { 'X-User-Id': String(userId) } : {}),
      ...(extra ?? {})
    });
  }

  // ---- snapshot local (fallback UI, opcional) ----
  private readLocal(): CartItem[] {
    try { return JSON.parse(localStorage.getItem(this.LOCAL_KEY) || '[]'); }
    catch { return []; }
  }
  private writeLocal(items: CartItem[]) {
    localStorage.setItem(this.LOCAL_KEY, JSON.stringify(items));
  }
  getLocalCount(): number {
    try {
      const items = this.readLocal();
      return items.reduce((s, it) => s + (Number(it.cantidad) || 0), 0);
    } catch { return 0; }
  }
  clearLocal() { localStorage.removeItem(this.LOCAL_KEY); }

  // ===================== ACCIONES =====================

  /** Sumar/restar usando DELTA (tu backend lo acepta en /carrito/agregar). */
  addToCart(productId: number, quantity: number = 1) {
    const body = {
      idUsuario: Number(localStorage.getItem('userId')), // redundante pero válido
      idProducto: productId,
      cantidad: quantity
    };

    return this.http.post(
      `${this.baseUrl}/carrito/agregar`,
      body,
      { headers: this.authHeaders() }
    ).pipe(
      tap(() => {
        // snapshot local solo si OK
        const items = this.readLocal();
        const idx = items.findIndex(i => i.productId === productId);
        if (idx >= 0) items[idx].cantidad += quantity;
        else items.push({ productId, cantidad: quantity });
        this.writeLocal(items);
      }),
      finalize(() => this.notifyCartChange())
    );
  }

  /** Fijar cantidad ABSOLUTA usando PUT /carrito/actualizar */
  setQuantity(productId: number, newQty: number) {
    const qty = Math.max(1, Number(newQty) || 1);
    const body = {
      idUsuario: Number(localStorage.getItem('userId')),
      idProducto: productId,
      cantidad: qty
    };
    return this.http.put(
      `${this.baseUrl}/carrito/actualizar`,
      body,
      { headers: this.authHeaders() }
    ).pipe(finalize(() => this.notifyCartChange()));
  }

  /** Atajo tipo “+ / −” calculando delta y reutilizando /agregar */
  updateQuantity(productId: number, action: 'add' | 'delete') {
    const delta = action === 'add' ? 1 : -1;
    return this.addToCart(productId, delta);
  }

  /** Eliminar ítem usando DELETE /carrito/producto/{productId} */
  removeItem(productId: number) {
    return this.http.delete(
      `${this.baseUrl}/carrito/producto/${productId}`,
      { headers: this.authHeaders() }
    ).pipe(
      tap(() => {
        const items = this.readLocal().filter(i => i.productId !== productId);
        this.writeLocal(items);
      }),
      finalize(() => this.notifyCartChange())
    );
  }

  /** Vaciar carrito */
  clearCart() {
    return this.http.delete(
      `${this.baseUrl}/carrito/limpiar`,
      { headers: this.authHeaders() }
    ).pipe(
      tap(() => this.clearLocal()),
      finalize(() => this.notifyCartChange())
    );
  }

  /** Obtener carrito (preferencia: por header X-User-Id) */
  getCart(): Observable<any> {
    // 1) GET /carrito/usuario (usa X-User-Id)
    return this.http.get(
      `${this.baseUrl}/carrito/usuario`,
      { headers: this.authHeaders() }
    ).pipe(
      catchError(err1 => {
        // 2) Fallback: /carrito/usuario/{id} por si configuraste el otro mapping
        const userId = localStorage.getItem('userId');
        if ((err1?.status === 404 || err1?.status === 405) && userId) {
          return this.http.get(
            `${this.baseUrl}/carrito/usuario/${userId}`,
            { headers: this.authHeaders() }
          );
        }
        return of([]); // no tires la app si falla
      })
    );
  }
}
