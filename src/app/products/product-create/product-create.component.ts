import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductService, NewProductForm, Category } from '../../services/product.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-create.component.html',
})
export class ProductCreateComponent implements OnInit {
  private productService = inject(ProductService);
  private router = inject(Router);

  product: NewProductForm = {
    productName: '',
    price: null,
    specialPrice: null,
    description: '',
    productImage: '',
    categoryId: '',
    discount: null,
  };

  categories: Category[] = [];

  ngOnInit(): void {
    this.productService.getAllCategories().subscribe({
      next: (res) => (this.categories = res),
      error: (err) => {
        console.error('Failed to load categories:', err);
        alert('No se pudieron cargar las categorías');
      },
    });
  }

  createProduct(): void {
    if (!this.product.productName?.trim()) {
      alert('Ingresa el nombre del producto.');
      return;
    }
    if (!this.product.price || Number(this.product.price) <= 0) {
      alert('Ingresa un precio válido.');
      return;
    }
    if (!this.product.categoryId) {
      alert('Selecciona una categoría.');
      return;
    }

    this.productService.createProduct(this.product).subscribe({
      next: () => {
        alert('Producto creado ✅');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        console.error('Create product failed', err);
        const msg = err?.error?.message ?? 'No se pudo crear el producto.';
        alert(msg);
      },
    });
  }
}
