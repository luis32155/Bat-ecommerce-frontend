import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** Modelo usado en los componentes */
export interface Producto {
  id: number;
  nombre: string;
  precio: number;
  descripcion: string;
  categoria: string;
  marca: string;
  imagen: string;
}

export interface Category {
  id: number;
  nombre: string;
}

export interface NewProductForm {
  productName: string;
  price: number | null;
  specialPrice: number | null;
  description: string;
  productImage: string;
  categoryId: number | string;
  discount: number | null;
}

type ApiProducto = any;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private baseApi = environment.CATALOG_BASE; // http://localhost:8080/catalog-service

  constructor(private http: HttpClient) {}

  /** Mapea la respuesta del backend al modelo Producto del front */
  private mapApiToProducto = (p: ApiProducto): Producto => ({
    id:          p.id_producto ?? p.id ?? p.idProducto ?? p.productId,
    nombre:      p.nombre ?? p.nombreProducto ?? p.name ?? '',
    precio:      Number(p.precio ?? p.price ?? 0),
    descripcion: p.descripcion ?? p.description ?? '',
    categoria:   p.nombreCategoria ?? p.categoria ?? p.category ?? '',
    marca:       p.nombreMarca ?? p.marca ?? p.brand ?? '',
    imagen:      p.urlImagen ?? p.imagen ?? p.imageUrl ?? ''
  });

  /** 👉 Lista de productos desde /productos/detalles */
  getAll() {
    return this.http
      .get<ApiProducto[]>(`${this.baseApi}/productos/detalles`)
      .pipe(
        map(arr => Array.isArray(arr) ? arr.map(this.mapApiToProducto) : []),
        catchError(() => of([] as Producto[]))
      );
  }

  /** Categorías (si no existe el endpoint, tu componente ya tiene fallback) */
  getAllCategories() {
    return this.http
      .get<any[]>(`${this.baseApi}/categorias/listarCategorias`)
      .pipe(
        map(arr => Array.isArray(arr) ? arr : []),
        map(arr => arr.map(c => ({
          id: c.id ?? c.idCategoria ?? c.categoriaId,
          nombre: c.nombre ?? c.nombreCategoria ?? c.name
        }) as Category)),
        catchError(() => of([] as Category[]))
      );
  }

  /** Crear producto: intenta /productos/crear y si 404/405, usa /productos */
  createProduct(form: NewProductForm) {
    const payload = {
      nombre:         form.productName,
      precio:         form.price,
      precioEspecial: form.specialPrice,
      descripcion:    form.description,
      urlImagen:      form.productImage,
      idCategoria:    Number(form.categoryId),
      descuento:      form.discount
    };

    return this.http.post(`${this.baseApi}/productos/crear`, payload).pipe(
      catchError(err => {
        if (err?.status === 404 || err?.status === 405) {
          return this.http.post(`${this.baseApi}/productos`, payload);
        }
        return throwError(() => err);
      })
    );
  }
}
