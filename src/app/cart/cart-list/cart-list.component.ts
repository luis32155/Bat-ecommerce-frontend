import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { CartService } from '../../services/cart.service';
import { ProductService, Producto } from '../../services/product.service';

type CartViewItem = {
  productId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
};

@Component({
  selector: 'app-cart-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterLink],
  templateUrl: './cart-list.component.html',
  styleUrls: ['./cart-list.component.css']
})
export class CartListComponent implements OnInit {
  private cartService = inject(CartService);
  private productService = inject(ProductService);

  cart: { items: CartViewItem[] } = { items: [] };

  loading = true;
  error = '';
  totalPrice = 0;
  fallbackUrl = 'https://via.placeholder.com/60?text=No+Img';

  ngOnInit(): void {
    this.fetchCart();
  }

  fetchCart(): void {
    this.loading = true;
    this.error = '';

    this.cartService.getCart()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res: any) => {
          const items = this.normalize(res);
          if (items.length > 0) {
            this.cart.items = items;
            this.calculateTotal();
          } else {
            this.hydrateFromLocal();
          }
        },
        error: () => this.hydrateFromLocal()
      });
  }

  /** Normaliza la respuesta del backend a CartViewItem[] */
  private normalize(resp: any): CartViewItem[] {
    if (!resp) return [];
    // Tu backend devuelve: { idCart, idUsuario, items: [{ idProducto, nombreProducto, precio, cantidad, ... }], total }
    const arr = Array.isArray(resp)
      ? resp
      : (resp.items ?? resp.detalle ?? resp.detalleCarrito ?? resp.data ?? []);

    if (!Array.isArray(arr)) return [];

    return arr.map((it: any) => {
      const productId = it?.productId ?? it?.idProducto ?? it?.id ?? it?.product?.id ?? 0;
      const cantidad  = it?.cantidad ?? it?.qty ?? it?.quantity ?? 1;
      const precio    = Number(
        it?.precioEspecial ??
        it?.specialPrice ??
        it?.precio ??
        it?.price ??
        it?.product?.precioEspecial ??
        it?.product?.precio ??
        0
      );
      const nombre    = it?.nombre ?? it?.nombreProducto ?? it?.productName ?? it?.product?.nombre ?? '';
      const imagen    = it?.urlImagen ?? it?.imagen ?? it?.product?.urlImagen ?? '';
      return { productId, nombre, precio, cantidad, imagen };
    });
  }

  /** Fallback local si la API falla o viene vacía */
  private hydrateFromLocal(): void {
    try {
      const local: Array<{ productId: number; cantidad: number }> =
        JSON.parse(localStorage.getItem('cartLocal') || '[]');

      if (!local || local.length === 0) {
        this.cart.items = [];
        this.totalPrice = 0;
        return;
      }

      this.productService.getAll().subscribe((prods: Producto[]) => {
        this.cart.items = local.map(e => {
          const p = prods.find(pp => pp.id === e.productId);
          return {
            productId: e.productId,
            nombre: p?.nombre ?? `Producto ${e.productId}`,
            precio: Number(p?.precio ?? 0),
            cantidad: e.cantidad,
            imagen: p?.imagen
          };
        });
        this.calculateTotal();
      });
    } catch {
      this.cart.items = [];
      this.totalPrice = 0;
    }
  }

  calculateTotal(): void {
    this.totalPrice = this.cart.items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }

  trackById(_i: number, it: CartViewItem) { return it.productId; }

  // -------- Acciones ----------
  increase(productId: number) {
    this.updateQuantity(productId, 'add');
  }

  decrease(productId: number) {
    this.updateQuantity(productId, 'delete');
  }

  updateQuantity(productId: number, action: 'add' | 'delete') {
    this.cartService.updateQuantity(productId, action).subscribe({
      next: () => this.fetchCart(),
      error: (err) => {
        console.error('updateQuantity error', err);
        alert('Failed to update quantity.');
      }
    });
  }

  removeFromCart(productId: number) {
    this.cartService.removeItem(productId).subscribe({
      next: () => this.fetchCart(),
      error: (err) => {
        console.error('removeItem error', err);
        const msg = err?.error?.message || err?.message || 'No se pudo eliminar.';
        alert(msg);
      }
    });
  }

  // Fallback de imagen
  onImgError(e: Event) {
    const img = e.target as HTMLImageElement | null;
    if (!img) return;
    img.onerror = null;
    img.src = this.fallbackUrl;
  }
}
