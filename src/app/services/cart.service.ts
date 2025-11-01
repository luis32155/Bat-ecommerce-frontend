import { HttpClient, HttpParams } from '@angular/common/http';
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

  // ---- snapshot local ----
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

  // ---- acciones ----
  addToCart(productId: number, quantity: number = 1, userId?: number) {
    const idUsuario = userId ?? Number(localStorage.getItem('userId') ?? 9999);
    const body = { idUsuario, idProducto: productId, cantidad: quantity };

    return this.http.post(`${this.baseUrl}/carrito/agregar`, body).pipe(
      tap(() => {
        const items = this.readLocal();
        const idx = items.findIndex(i => i.productId === productId);
        if (idx >= 0) items[idx].cantidad += quantity;
        else items.push({ productId, cantidad: quantity });
        this.writeLocal(items);
      }),
      finalize(() => this.notifyCartChange())
    );
  }

  getCart(userId?: number): Observable<any> {
    const idUsuario = userId ?? Number(localStorage.getItem('userId') ?? 9999);

    // 1) /carrito/{idUsuario}
    const try1$ = this.http.get(`${this.baseUrl}/carrito/${idUsuario}`);

    return try1$.pipe(
      catchError(err1 => {
        if (err1?.status === 404 || err1?.status === 405) {
          // 2) /carrito/usuario/{idUsuario}
          const try2$ = this.http.get(`${this.baseUrl}/carrito/usuario/${idUsuario}`);
          return try2$.pipe(
            catchError(err2 => {
              if (err2?.status === 404 || err2?.status === 405) {
                // 3) /carrito?userId=...
                const params = new HttpParams().set('userId', String(idUsuario));
                const try3$ = this.http.get(`${this.baseUrl}/carrito`, { params });
                return try3$.pipe(catchError(() => of([])));
              }
              throw err2;
            })
          );
        }
        throw err1;
      })
    );
  }

  updateQuantity(productId: number, action: 'add' | 'delete', userId?: number) {
    const idUsuario = userId ?? Number(localStorage.getItem('userId') ?? 9999);
    const body = { idUsuario, idProducto: productId, action };

    return this.http.put(`${this.baseUrl}/carrito/actualizar`, body).pipe(
      tap(() => {
        const items = this.readLocal();
        const idx = items.findIndex(i => i.productId === productId);
        if (action === 'add') {
          if (idx >= 0) items[idx].cantidad += 1; else items.push({ productId, cantidad: 1 });
        } else {
          if (idx >= 0) {
            items[idx].cantidad -= 1;
            if (items[idx].cantidad <= 0) items.splice(idx, 1);
          }
        }
        this.writeLocal(items);
      }),
      finalize(() => this.notifyCartChange())
    );
  }

  removeItem(productId: number, userId?: number) {
    const idUsuario = userId ?? Number(localStorage.getItem('userId') ?? 9999);

    const try1$ = this.http.delete(`${this.baseUrl}/carrito/${idUsuario}/producto/${productId}`);

    return try1$.pipe(
      catchError(err1 => {
        if (err1?.status === 404 || err1?.status === 405) {
          const try2$ = this.http.delete(`${this.baseUrl}/carrito/producto/${productId}`, {
            params: new HttpParams().set('userId', String(idUsuario)),
          });
          return try2$.pipe(
            catchError(err2 => {
              if (err2?.status === 404 || err2?.status === 405) {
                return this.http.post(`${this.baseUrl}/carrito/eliminar`, { idUsuario, idProducto: productId });
              }
              throw err2;
            })
          );
        }
        throw err1;
      }),
      tap(() => {
        const items = this.readLocal().filter(i => i.productId !== productId);
        this.writeLocal(items);
      }),
      finalize(() => this.notifyCartChange())
    );
  }
}
