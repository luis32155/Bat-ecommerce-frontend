import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterLink } from '@angular/router';
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

  // Inicializado para que nunca sea undefined
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

    this.cartService.getCart().subscribe({
      next: (res: any) => {
        const items = this.normalize(res);
        if (items.length > 0) {
          this.cart.items = items;
          this.calculateTotal();
          this.loading = false;
        } else {
          this.hydrateFromLocal();
        }
      },
      error: () => this.hydrateFromLocal()
    });
  }

  private hydrateFromLocal() {
    try {
      const local: Array<{ productId: number; cantidad: number }> =
        JSON.parse(localStorage.getItem('cartLocal') || '[]');

      if (!local || local.length === 0) {
        this.cart.items = [];
        this.totalPrice = 0;
        this.loading = false;
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
        this.loading = false;
      });
    } catch {
      this.cart.items = [];
      this.totalPrice = 0;
      this.loading = false;
    }
  }

  private normalize(resp: any): CartViewItem[] {
    if (!resp) return [];
    const arr = Array.isArray(resp)
      ? resp
      : (resp.items ?? resp.detalle ?? resp.detalleCarrito ?? resp.data ?? []);
    if (!Array.isArray(arr)) return [];

    return arr.map((it: any) => {
      const productId = it?.productId ?? it?.idProducto ?? it?.id_producto ?? it?.id ?? it?.product?.id ?? 0;
      const cantidad  = it?.cantidad ?? it?.qty ?? it?.quantity ?? it?.cant ?? 1;
      const precio    = Number(it?.precioEspecial ?? it?.specialPrice ?? it?.precio ?? it?.price ?? it?.product?.precioEspecial ?? it?.product?.precio ?? 0);
      const nombre    = it?.nombre ?? it?.productName ?? it?.product?.nombre ?? '';
      const imagen    = it?.urlImagen ?? it?.imagen ?? it?.product?.urlImagen ?? '';
      return { productId, nombre, precio, cantidad, imagen };
    });
  }

  calculateTotal(): void {
    this.totalPrice = this.cart.items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  }

  // ✅ trackBy como función (no uses "trackBy: item.productId" en el template)
  trackById(_i: number, it: CartViewItem) { return it.productId; }

  updateQuantity(productId: number, action: 'add' | 'delete') {
    this.cartService.updateQuantity(productId, action).subscribe({
      next: () => this.fetchCart(),
      error: () => alert('Failed to update quantity.')
    });
  }

  removeFromCart(productId: number) {
    this.cartService.removeItem(productId).subscribe({
      next: () => this.fetchCart(),
      error: () => alert('No se pudo eliminar el producto del carrito.')
    });
  }
}
