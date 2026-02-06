/**
 * E-Commerce Service
 * Phase 5: Sports Gear Marketplace
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateOrderDto,
  CreateReviewDto,
  ProductCategory,
  OrderStatus,
} from './dto/product.dto';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  sportId?: string;
  brand: string;
  stock: number;
  imageUrl?: string;
  ratingAvg: number;
  reviewCount: number;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  trackingNumber?: string;
  notes?: string;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

@Injectable()
export class EcommerceService {
  private products: Map<string, Product> = new Map();
  private orders: Map<string, Order> = new Map();
  private reviews: Map<string, Review> = new Map();
  private carts: Map<string, CartItem[]> = new Map(); // userId -> cart

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const sampleProducts: Partial<Product>[] = [
      {
        name: 'Premium Cricket Bat - English Willow',
        description: 'Professional grade English willow cricket bat with excellent balance and pickup',
        price: 299.99,
        category: ProductCategory.EQUIPMENT,
        brand: 'CricketPro',
        stock: 50,
        tags: ['cricket', 'bat', 'professional'],
      },
      {
        name: 'Tennis Racket Pro Series',
        description: 'Lightweight carbon fiber tennis racket for advanced players',
        price: 189.99,
        category: ProductCategory.EQUIPMENT,
        brand: 'TennisMaster',
        stock: 30,
        tags: ['tennis', 'racket', 'carbon'],
      },
      {
        name: 'Sports Running Shoes',
        description: 'High-performance running shoes with advanced cushioning',
        price: 129.99,
        category: ProductCategory.FOOTWEAR,
        brand: 'SpeedRun',
        stock: 100,
        tags: ['running', 'shoes', 'fitness'],
      },
      {
        name: 'Cricket Batting Gloves',
        description: 'Premium batting gloves with extra padding and grip',
        price: 49.99,
        category: ProductCategory.PROTECTION,
        brand: 'CricketPro',
        stock: 75,
        tags: ['cricket', 'gloves', 'protection'],
      },
      {
        name: 'Football Jersey - Team Edition',
        description: 'Breathable football jersey with moisture-wicking technology',
        price: 79.99,
        category: ProductCategory.APPAREL,
        brand: 'SportWear',
        stock: 200,
        tags: ['football', 'jersey', 'team'],
      },
    ];

    sampleProducts.forEach(p => {
      const product: Product = {
        id: uuidv4(),
        name: p.name!,
        description: p.description!,
        price: p.price!,
        category: p.category!,
        brand: p.brand!,
        stock: p.stock!,
        tags: p.tags || [],
        ratingAvg: Math.random() * 2 + 3, // Random 3-5 rating
        reviewCount: Math.floor(Math.random() * 50),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.products.set(product.id, product);
    });
  }

  // ============================================
  // Product CRUD
  // ============================================

  createProduct(dto: CreateProductDto): Product {
    const product: Product = {
      id: uuidv4(),
      name: dto.name,
      description: dto.description,
      price: dto.price,
      category: dto.category,
      sportId: dto.sportId,
      brand: dto.brand,
      stock: dto.stock,
      imageUrl: dto.imageUrl,
      tags: dto.tags || [],
      ratingAvg: 0,
      reviewCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.products.set(product.id, product);
    this.eventEmitter.emit('product.created', { product });
    return product;
  }

  getProduct(productId: string): Product {
    const product = this.products.get(productId);
    if (!product || !product.isActive) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  getAllProducts(filters?: {
    category?: ProductCategory;
    sportId?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }): Product[] {
    let products = Array.from(this.products.values()).filter(p => p.isActive);

    if (filters?.category) {
      products = products.filter(p => p.category === filters.category);
    }
    if (filters?.sportId) {
      products = products.filter(p => p.sportId === filters.sportId);
    }
    if (filters?.brand) {
      products = products.filter(p => p.brand.toLowerCase() === filters.brand!.toLowerCase());
    }
    if (filters?.minPrice !== undefined) {
      products = products.filter(p => p.price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== undefined) {
      products = products.filter(p => p.price <= filters.maxPrice!);
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    return products.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateProduct(productId: string, dto: UpdateProductDto): Product {
    const product = this.getProduct(productId);

    if (dto.name) product.name = dto.name;
    if (dto.description) product.description = dto.description;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.imageUrl) product.imageUrl = dto.imageUrl;

    product.updatedAt = new Date();
    return product;
  }

  deleteProduct(productId: string): void {
    const product = this.getProduct(productId);
    product.isActive = false;
    product.updatedAt = new Date();
  }

  // ============================================
  // Shopping Cart
  // ============================================

  getCart(userId: string): { items: (CartItem & { product: Product })[]; total: number } {
    const cart = this.carts.get(userId) || [];
    const items = cart.map(item => {
      const product = this.products.get(item.productId);
      return { ...item, product: product! };
    }).filter(item => item.product);

    const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    return { items, total };
  }

  addToCart(userId: string, productId: string, quantity: number): void {
    const product = this.getProduct(productId);

    if (product.stock < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    let cart = this.carts.get(userId);
    if (!cart) {
      cart = [];
      this.carts.set(userId, cart);
    }

    const existingItem = cart.find(i => i.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }
  }

  updateCartItem(userId: string, productId: string, quantity: number): void {
    const cart = this.carts.get(userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = cart.find(i => i.productId === productId);
    if (!item) {
      throw new NotFoundException('Item not in cart');
    }

    if (quantity <= 0) {
      this.removeFromCart(userId, productId);
    } else {
      const product = this.getProduct(productId);
      if (product.stock < quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      item.quantity = quantity;
    }
  }

  removeFromCart(userId: string, productId: string): void {
    const cart = this.carts.get(userId);
    if (!cart) return;

    const index = cart.findIndex(i => i.productId === productId);
    if (index !== -1) {
      cart.splice(index, 1);
    }
  }

  clearCart(userId: string): void {
    this.carts.delete(userId);
  }

  // ============================================
  // Orders
  // ============================================

  createOrder(dto: CreateOrderDto, userId: string): Order {
    // Validate and prepare items
    const orderItems = dto.items.map(item => {
      const product = this.getProduct(item.productId);

      if (product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
      };
    });

    // Calculate total
    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order
    const order: Order = {
      id: uuidv4(),
      userId,
      items: orderItems,
      totalAmount,
      status: OrderStatus.PENDING,
      shippingAddress: dto.shippingAddress,
      notes: dto.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reduce stock
    dto.items.forEach(item => {
      const product = this.products.get(item.productId)!;
      product.stock -= item.quantity;
    });

    this.orders.set(order.id, order);
    this.clearCart(userId);

    this.eventEmitter.emit('order.created', { order });
    return order;
  }

  getOrder(orderId: string, userId: string): Order {
    const order = this.orders.get(orderId);
    if (!order || order.userId !== userId) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return order;
  }

  getUserOrders(userId: string): Order[] {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateOrderStatus(orderId: string, status: OrderStatus, trackingNumber?: string): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    order.status = status;
    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }
    order.updatedAt = new Date();

    this.eventEmitter.emit('order.updated', { order });
    return order;
  }

  cancelOrder(orderId: string, userId: string): Order {
    const order = this.getOrder(orderId, userId);

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Cannot cancel order in current status');
    }

    // Restore stock
    order.items.forEach(item => {
      const product = this.products.get(item.productId);
      if (product) {
        product.stock += item.quantity;
      }
    });

    order.status = OrderStatus.CANCELLED;
    order.updatedAt = new Date();

    return order;
  }

  // ============================================
  // Reviews
  // ============================================

  createReview(dto: CreateReviewDto, userId: string): Review {
    const product = this.getProduct(dto.productId);

    // Check if user already reviewed
    const existingReview = Array.from(this.reviews.values())
      .find(r => r.productId === dto.productId && r.userId === userId);

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review: Review = {
      id: uuidv4(),
      productId: dto.productId,
      userId,
      rating: dto.rating,
      comment: dto.comment,
      createdAt: new Date(),
    };

    this.reviews.set(review.id, review);

    // Update product rating
    this.updateProductRating(dto.productId);

    return review;
  }

  getProductReviews(productId: string): Review[] {
    return Array.from(this.reviews.values())
      .filter(r => r.productId === productId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private updateProductRating(productId: string): void {
    const reviews = this.getProductReviews(productId);
    const product = this.products.get(productId);

    if (product && reviews.length > 0) {
      product.ratingAvg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      product.reviewCount = reviews.length;
    }
  }

  // ============================================
  // Brands
  // ============================================

  getAllBrands(): string[] {
    const brands = new Set<string>();
    this.products.forEach(p => {
      if (p.isActive) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }
}
