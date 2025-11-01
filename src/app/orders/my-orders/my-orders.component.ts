import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { OrderService } from '../../services/order.service';

type Estado = 'PENDIENTE' | 'PAGADO' | 'ENVIADO' | 'ENTREGADO' | 'CANCELADO' | string;

interface Detalle {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  productImage?: string; // opcional si luego lo tienes
}

interface Pedido {
  idPedido: number;
  idUsuario: number;
  total: number;
  fecha: string;      // o Date
  estado: Estado;
  detalles: Detalle[];
}

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './my-orders.component.html',
  styleUrls: ['./my-orders.component.css']
})
export class MyOrdersComponent implements OnInit {
  orders: Pedido[] = [];
  loading = true;
  error = '';

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    this.getMyOrders();
  }

  getMyOrders() {
    this.orderService.getMyOrders().subscribe({
      next: (res: Pedido[]) => {
        console.log('Orders fetched:', JSON.stringify(res));
        this.orders = res ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load orders.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  badgeClass(estado: string) {
    switch (estado) {
      case 'PAGADO': return 'bg-success';
      case 'ENVIADO': return 'bg-info';
      case 'ENTREGADO': return 'bg-primary';
      case 'CANCELADO': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
}
