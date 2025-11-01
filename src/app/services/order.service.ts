// order.service.ts
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// si tienes environments, mejor usa environment.ORDER_BASE
// import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrderService {
  // Ajusta si usas environment:  environment.ORDER_BASE ?? 'http://localhost:8080/order-service'
  private baseUrl = 'http://localhost:8080/order-service';

  constructor(private http: HttpClient) {}

  // ------- helpers -------
  private headers(includeUserId = true): HttpHeaders {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || '';
    const userId = localStorage.getItem('userId') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(includeUserId && userId ? { 'X-User-Id': userId } : {}),
    });
  }

  // ===================== ORDERS (según tu PedidoController) =====================

  /** Crea pedido del usuario autenticado.
   *  Backend: POST /orders  (header X-User-Id) -> PedidoResponse
   *  No envía body (el controller no lo espera). Angular requiere un body → usamos {}.
   */
  placeOrder(): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/orders`,
      {}, // sin payload; tu controller no recibe @RequestBody
      { headers: this.headers(true) }
    );
  }

  /** Lista pedidos del usuario.
   *  Backend: GET /orders  (header X-User-Id)
   */
  getMyOrders(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/orders`,
      { headers: this.headers(true) }
    );
  }

  /** Lista TODOS los pedidos (solo admin).
   *  Backend: GET /orders/all  (header X-User-Id == 1)
   */
  listAllOrdersAdmin(): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/orders/all`,
      { headers: this.headers(true) }
    );
  }

  /** Actualiza estado (admin).
   *  Backend: PUT /orders/{idPedido}/status  (header X-User-Id == 1)  body: { estado }
   */
  updateOrderStatusAdmin(idPedido: number, estado: string): Observable<any> {
    const body = { estado };
    return this.http.put(
      `${this.baseUrl}/orders/${idPedido}/status`,
      body,
      { headers: this.headers(true) }
    );
  }

  /** Actualiza estado (interno, sin validación de admin por header).
   *  Backend: PUT /orders/internal/{idPedido}/status  body: { estado }
   *  (Tu controller no exige X-User-Id aquí.)
   */
  updateOrderStatusInternal(idPedido: number, estado: string): Observable<void> {
    const body = { estado };
    return this.http.put<void>(
      `${this.baseUrl}/orders/internal/${idPedido}/status`,
      body,
      { headers: this.headers(false) } // sin X-User-Id
    );
  }

  // ===================== (APIs antiguas/ajenas al módulo orders) =====================
  // Si aún usas direcciones/usuario actuales, conviene moverlas a AddressService/AuthService.
  // Las dejo intactas por compatibilidad, pero idealmente separarlas.

  getAddressesByUserId(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8080/api/addresses/${userId}`);
  }

  getCurrentUser(): Observable<any> {
    return this.http.get('http://localhost:8080/api/auth/current-user');
  }

  getCurrentUserAddresses(pageNumber: number, pageSize: number): Observable<any> {
    return this.http.get(
      `http://localhost:8080/api/addresses/users/current?pageNumber=${pageNumber}&pageSize=${pageSize}&sortBy=addressId&sortOrder=des`
    );
  }

  saveAddress(address: any): Observable<any> {
    return this.http.post(`http://localhost:8080/api/addresses`, address);
  }
}
