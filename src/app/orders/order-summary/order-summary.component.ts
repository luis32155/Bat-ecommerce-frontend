import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.css'],
})
export class OrderSummaryComponent implements OnInit {
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  // Carrito y estado
  cart: any = { items: [], total: 0 };
  loading = true;
  error = '';

  // Direcciones (para mostrar/seleccionar en la vista; el backend de orders no las usa)
  addresses: any[] = [];
  selectedAddressId: number | null = null;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;

  // Form de nueva dirección (opcional)
  showAddAddressForm = false;
  newAddress: any = {
    buildingName: '',
    street: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
  };

  ngOnInit(): void {
    this.loadAddresses();
    this.fetchCart();
  }

  // ============== CARRITO ==============
  private fetchCart(): void {
    this.loading = true;
    this.error = '';

    this.cartService.getCart().subscribe({
      next: (res: any) => {
        // Normaliza por si el backend cambia claves
        const items = Array.isArray(res)
          ? res
          : (res?.items ?? res?.detalle ?? res?.detalleCarrito ?? res?.data ?? []);

        const total =
          Number(res?.total ?? res?.totalPrice ?? res?.montoTotal ?? 0);

        this.cart = {
          items: Array.isArray(items) ? items : [],
          total: isNaN(total)
            ? (Array.isArray(items)
                ? items.reduce(
                    (s: number, it: any) =>
                      s +
                      Number(
                        it?.precioEspecial ??
                          it?.specialPrice ??
                          it?.precio ??
                          it?.price ??
                          0
                      ) *
                        Number(it?.cantidad ?? it?.qty ?? it?.quantity ?? 1),
                    0
                  )
                : 0)
            : total,
        };

        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load cart', err);
        this.error = 'Failed to load cart.';
        this.loading = false;
      },
    });
  }

  // ============== PEDIDO ==============
  placeOrder(): void {
    // Validación mínima: que haya items
    if (!this.cart?.items?.length) {
      alert('Tu carrito está vacío.');
      return;
    }

    // Tu backend crea el pedido desde el carrito del usuario (X-User-Id). No requiere body.
    this.orderService.placeOrder().subscribe({
      next: () => {
        alert('¡Pedido creado con éxito!');
        // Opcional: limpiar snapshot local del carrito si lo usas
        this.cartService.clearLocal?.();
        this.router.navigate(['/my-orders']);
      },
      error: (err) => {
        console.error('Order failed', err);
        const msg = err?.error?.message || err?.message || 'No se pudo crear el pedido.';
        alert(msg);
      },
    });
  }

  // ============== DIRECCIONES (UI opcional) ==============
  loadAddresses(page = 0): void {
    this.orderService.getCurrentUserAddresses(page, this.pageSize).subscribe({
      next: (res: any) => {
        this.addresses = res?.content ?? [];
        this.totalPages = res?.totalPages ?? 0;
        this.currentPage = res?.pageNumber ?? 0;

        if (this.addresses.length > 0) {
          this.selectedAddressId = this.addresses[0]?.addressId ?? null;
        }
      },
      error: (err) => {
        console.error('Failed to load addresses', err);
      },
    });
  }

  saveAddress(): void {
    this.orderService.saveAddress(this.newAddress).subscribe({
      next: () => {
        alert('¡Dirección agregada!');
        this.showAddAddressForm = false;
        this.loadAddresses(); // recargar
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'No se pudo guardar la dirección.';
        alert(msg);
      },
    });
  }
}
