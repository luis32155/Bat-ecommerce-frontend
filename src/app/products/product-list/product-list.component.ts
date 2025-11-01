import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ProductService, Producto } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { WishlistService } from '../../services/wishlist.service';

// 👇 importante: finalize desde rxjs/operators
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, RouterLink],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  private wishlistService = inject(WishlistService);

  /** Fuente completa y vista paginada */
  allProducts: Producto[] = [];
  products:     Producto[] = [];

  loading = true;
  error   = '';

  page = 0;
  size = 2;
  totalPages = 1;
  pageSizeOptions = [2, 4, 6, 12];

  // Trabajamos por NOMBRE de categoría
  categories: string[] = [];
  selectedCategoryName: string | null = null;

  private currentSearchTerm = '';

  // Fallback para imágenes rotas (usado en el template)
  fallbackUrl = 'https://via.placeholder.com/600x600?text=No+Image';

  ngOnInit(): void {
    const savedSize = localStorage.getItem('pageSize');
    if (savedSize) this.size = Math.max(1, +savedSize || 2);

    this.loadAllAndCategories();

    this.route.queryParams.subscribe(params => {
      this.currentSearchTerm = params['search'] || '';
      this.applyFiltersAndPaging();
    });
  }

  /** Carga catálogo una sola vez (array) y arma categorías. */
  private loadAllAndCategories() {
    this.loading = true;
    this.productService.getAll()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (arr) => {
          this.allProducts = arr ?? [];

          // Intentar API de categorías; si falla, derivar de la data
          this.productService.getAllCategories().subscribe({
            next: (cats) => {
              this.categories = (cats ?? [])
                .map(c => c.nombre)
                .filter(Boolean)
                .sort();

              if (this.categories.length === 0) {
                const set = new Set(this.allProducts.map(p => p.categoria).filter(Boolean));
                this.categories = Array.from(set).sort();
              }
              this.applyFiltersAndPaging();
            },
            error: () => {
              const set = new Set(this.allProducts.map(p => p.categoria).filter(Boolean));
              this.categories = Array.from(set).sort();
              this.applyFiltersAndPaging();
            }
          });
        },
        error: () => {
          this.error = 'Failed to load products';
        }
      });
  }

  filterByCategory(categoryName: string | null) {
    this.selectedCategoryName = categoryName;
    this.page = 0;
    this.applyFiltersAndPaging();
  }

  searchProducts(term: string) {
    this.currentSearchTerm = term ?? '';
    this.page = 0;
    this.applyFiltersAndPaging();
  }

  /** Aplica búsqueda, filtro por categoría y paginación en cliente. */
  private applyFiltersAndPaging() {
    let data = [...this.allProducts];

    if (this.selectedCategoryName) {
      data = data.filter(p => (p.categoria ?? '') === this.selectedCategoryName);
    }

    if (this.currentSearchTerm) {
      const t = (this.currentSearchTerm ?? '').toLowerCase();
      data = data.filter(p => {
        const nombre      = (p.nombre ?? '').toLowerCase();
        const descripcion = (p.descripcion ?? '').toLowerCase();
        const marca       = (p.marca ?? '').toLowerCase();
        const categoria   = (p.categoria ?? '').toLowerCase();
        return nombre.includes(t) || descripcion.includes(t) || marca.includes(t) || categoria.includes(t);
      });
    }

    // paginación client-side
    const pageSize = Math.max(1, this.size || 1);
    this.totalPages = Math.max(1, Math.ceil(data.length / pageSize));
    if (this.page >= this.totalPages) this.page = this.totalPages - 1;

    const start = this.page * pageSize;
    const end   = start + pageSize;
    this.products = data.slice(start, end);

    // persistir tamaño de página
    localStorage.setItem('pageSize', String(pageSize));
  }

  nextPage()      { if (this.page < this.totalPages - 1) { this.page++; this.applyFiltersAndPaging(); } }
  prevPage()      { if (this.page > 0) { this.page--; this.applyFiltersAndPaging(); } }
  goToPage(i: number) { if (i >= 0 && i < this.totalPages) { this.page = i; this.applyFiltersAndPaging(); } }
  onPageSizeChange()  { this.page = 0; this.applyFiltersAndPaging(); }

  // trackBy para *ngFor
  trackById(_i: number, p: Producto) { return p.id; }

  // --- acciones ---
  addToCart(productId: number) {
    this.cartService.addToCart(productId, 1).subscribe({
      next: () => {
        this.cartService.getCart().subscribe({
          next: () => {
            alert('Product added to cart!');
            this.cartService.notifyCartChange();
          },
          error: () => alert('Failed to fetch cart.')
        });
      },
      error: (err) => {
        const backendMessage = err?.error?.message || 'Something went wrong.';
        alert('Failed to add to cart: ' + backendMessage);
      }
    });
  }

  addToWishlist(productId: number) {
    const userId = Number(localStorage.getItem('userId'));
    if (!userId) { alert('User ID is invalid or not found.'); return; }
    this.wishlistService.addProductToWishlist(userId, productId).subscribe({
      next: () => alert('Product added to wishlist!'),
      error: (err) => {
        const backendMessage = err?.error?.message || 'Something went wrong.';
        alert('Failed to add to wishlist: ' + backendMessage);
      }
    });
  }

  buyNow(productId: number) {
    this.cartService.addToCart(productId, 1).subscribe({
      next: () => {
        this.cartService.getCart().subscribe({
          next: () => {
            alert('Product added to cart! Redirecting to checkout...');
            this.cartService.notifyCartChange();
            // si prefieres Router, reemplaza por this.router.navigate(['/cart']);
            window.location.href = '/cart';
          },
          error: () => alert('Failed to fetch cart.')
        });
      },
      error: (err) => {
        const backendMessage = err?.error?.message || 'Something went wrong.';
        alert('Failed to add to cart: ' + backendMessage);
      }
    });
  }

  // Handler para fallback de imagen
  onImgError(e: Event) {
    const img = e.target as HTMLImageElement | null;
    if (!img) return;
    img.onerror = null; // evita loop si el placeholder también falla
    img.src = this.fallbackUrl;
  }
}
