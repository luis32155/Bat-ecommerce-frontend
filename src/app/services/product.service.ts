import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

// === Modelo que usa el FRONT ===
export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string; // nombreCategoria del backend
  marca: string;     // nombreMarca del backend
  imagen: string;    // urlImagen del backend
  // opcional, por si algún template viejo aún lo usa:
  urlImagen?: string;
}

// === Tipo de la RESPUESTA del BACKEND (no lo exportes si no quieres) ===
type ApiProducto = {
  id_producto: number;
  nombre: string;
  precio: number;
  descripcion: string;
  nombreCategoria: string;
  nombreMarca: string;
  urlImagen: string;
};

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseApi = 'http://localhost:8080/catalog-service';
  private productBase = `${this.baseApi}/productos`;

  // Usa el endpoint que SÍ te devuelve el array que mostraste
  // (si tu listar real es /listarProductos, cámbialo aquí)
  private listUrl = `${this.productBase}/detalles`;

  constructor(private http: HttpClient) {}

  // Param opcional para no romper firmas previas
  getAll(_params?: any): Observable<Producto[]> {
    return this.http.get<ApiProducto[]>(this.listUrl).pipe(
      map(arr => Array.isArray(arr) ? arr : []),
      map(arr => arr.map(p => ({
        id: p.id_producto,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.descripcion,
        categoria: p.nombreCategoria,
        marca: p.nombreMarca,
        imagen: p.urlImagen,
        urlImagen: p.urlImagen
      })))
    );
  }

  create(product: any, categoryId: number) {
    return this.http.post(`${this.baseApi}/categorias/${categoryId}`, product);
  }

  delete(productId: number) {
    return this.http.delete(`${this.productBase}/${productId}`);
  }

  update(productId: number, product: any) {
    return this.http.put(`${this.productBase}/${productId}`, product);
  }

  search(keyword: string, _params?: any): Observable<Producto[]> {
    // Si no tienes endpoint de búsqueda, devuelvo todo y filtras en el componente
    return this.getAll().pipe(
      map(items => {
        const t = (keyword || '').toLowerCase();
        return items.filter(p =>
          p.nombre.toLowerCase().includes(t) ||
          p.descripcion.toLowerCase().includes(t) ||
          p.marca.toLowerCase().includes(t) ||
          p.categoria.toLowerCase().includes(t)
        );
      })
    );
  }

  getAllCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseApi}/categorias/listarCategorias`);
  }

  getProductsByCategory(categoryId: number, _params?: any): Observable<Producto[]> {
    // Si tu backend real es /categorias/{id}/productos, ajusta la URL
    return this.http.get<ApiProducto[]>(`${this.baseApi}/categorias/${categoryId}`).pipe(
      map(arr => Array.isArray(arr) ? arr : []),
      map(arr => arr.map(p => ({
        id: p.id_producto,
        nombre: p.nombre,
        precio: p.precio,
        descripcion: p.descripcion,
        categoria: p.nombreCategoria,
        marca: p.nombreMarca,
        imagen: p.urlImagen,
        urlImagen: p.urlImagen
      })))
    );
  }

  createProduct(categoryId: number, data: any) {
    return this.http.post(`${this.baseApi}/categorias/${categoryId}`, data);
  }

  getMyProducts(_params?: any): Observable<Producto[]> {
    return this.getAll();
  }

  deleteProduct(productId: number) {
    return this.http.delete(`${this.productBase}/${productId}`);
  }
}
