import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService, Producto } from '../../services/product.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-product-manage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-manage.component.html',
  styleUrls: ['./product-manage.component.css']
})
export class ProductManageComponent implements OnInit {
  private productService = inject(ProductService);
  private http = inject(HttpClient);

  // fuente completa y vista paginada
  allProducts: Producto[] = [];
  products: Producto[] = [];

  loading = true;
  error = '';

  page = 0;
  size = 2;
  totalPages = 1;
  pageSizeOptions = [2, 4, 6, 12];

  ngOnInit(): void {
    this.loading = true;
    this.fetchMyProducts();
  }

  fetchMyProducts(): void {
    // Enviamos params para no romper firmas, pero el service los ignora (backend no pagina)
    const params = {
      pageNumber: this.page,
      pageSize: this.size,
      sortBy: 'productName',
      sortOrder: 'asc'
    };

    this.productService.getAll(params).subscribe({
      next: (res: any) => {
        // tu API devuelve array simple
        this.allProducts = Array.isArray(res) ? res : (res?.content ?? []);
        this.applyPaging();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load products';
        this.loading = false;
      }
    });
  }

  // -------- paginación en cliente --------
  private applyPaging(): void {
    this.totalPages = Math.max(1, Math.ceil(this.allProducts.length / this.size));
    if (this.page >= this.totalPages) this.page = this.totalPages - 1;

    const start = this.page * this.size;
    const end = start + this.size;
    this.products = this.allProducts.slice(start, end);
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.applyPaging();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.applyPaging();
    }
  }

  goToPage(index: number): void {
    if (index >= 0 && index < this.totalPages) {
      this.page = index;
      this.applyPaging();
    }
  }

  onPageSizeChange(): void {
    this.page = 0;
    this.applyPaging();
  }

  // -------- acciones --------
  deleteProduct(productId: number): void {
    if (!confirm('Are you sure you want to delete this product?')) return;

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        alert('Product deleted');
        // tus items vienen con campo "id"
        this.allProducts = this.allProducts.filter(p => p.id !== productId);
        this.applyPaging();
      },
      error: () => {
        alert('Failed to delete product');
      }
    });
  }

  editProduct(productId: number): void {
    // Navegación pendiente (según tu routing)
    // this.router.navigate(['/products', productId, 'edit']);
  }
}
