import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-place-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-place-success.component.html',
  styleUrls: ['./order-place-success.component.css'] // <-- FIX
})
export class OrderPlaceSuccessComponent {

  constructor(private router: Router, private orderService: OrderService) {}

  ngOnInit() {
    // Ya NO usamos payment ni payload: el backend crea el pedido desde el carrito del usuario (X-User-Id)
    this.orderService.placeOrder().subscribe({
      next: () => {
        // redirige a mis pedidos
        setTimeout(() => this.router.navigate(['/my-orders']), 1200);
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'No se pudo crear el pedido.';
        alert(msg);
        this.router.navigate(['/']);
      }
    });
  }
}
