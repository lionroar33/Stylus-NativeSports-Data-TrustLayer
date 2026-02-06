/**
 * E-Commerce Controller
 * Phase 5: Sports Gear Marketplace
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Render } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateOrderDto,
  CreateReviewDto,
  ProductCategory,
  OrderStatus,
} from './dto/product.dto';

@Controller('shop')
export class EcommerceController {
  constructor(private readonly ecommerceService: EcommerceService) {}

  // ============================================
  // UI Routes
  // ============================================

  @Get()
  @Render('shop/index')
  shopIndex() {
    const products = this.ecommerceService.getAllProducts();
    const brands = this.ecommerceService.getAllBrands();
    return {
      title: 'Sports Shop',
      layout: 'layouts/main',
      pageTitle: 'Sports Gear Shop',
      user: { name: 'John Doe', initials: 'JD' },
      products,
      brands,
      categories: Object.values(ProductCategory),
    };
  }

  // ============================================
  // API Routes - Products
  // ============================================

  @Get('api/products')
  getAllProducts(
    @Query('category') category?: ProductCategory,
    @Query('sportId') sportId?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('search') search?: string
  ) {
    const products = this.ecommerceService.getAllProducts({
      category,
      sportId,
      brand,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      search,
    });
    return { success: true, data: products };
  }

  @Post('api/products')
  createProduct(@Body() dto: CreateProductDto) {
    const product = this.ecommerceService.createProduct(dto);
    return { success: true, data: product };
  }

  @Get('api/products/:id')
  getProduct(@Param('id') productId: string) {
    const product = this.ecommerceService.getProduct(productId);
    const reviews = this.ecommerceService.getProductReviews(productId);
    return { success: true, data: { ...product, reviews } };
  }

  @Put('api/products/:id')
  updateProduct(@Param('id') productId: string, @Body() dto: UpdateProductDto) {
    const product = this.ecommerceService.updateProduct(productId, dto);
    return { success: true, data: product };
  }

  @Delete('api/products/:id')
  deleteProduct(@Param('id') productId: string) {
    this.ecommerceService.deleteProduct(productId);
    return { success: true, message: 'Product deleted' };
  }

  @Get('api/brands')
  getAllBrands() {
    const brands = this.ecommerceService.getAllBrands();
    return { success: true, data: brands };
  }

  // ============================================
  // API Routes - Cart
  // ============================================

  @Get('api/cart')
  getCart() {
    const userId = 'current-user'; // Should come from auth
    const cart = this.ecommerceService.getCart(userId);
    return { success: true, data: cart };
  }

  @Post('api/cart')
  addToCart(@Body() dto: { productId: string; quantity: number }) {
    const userId = 'current-user'; // Should come from auth
    this.ecommerceService.addToCart(userId, dto.productId, dto.quantity);
    return { success: true, message: 'Added to cart' };
  }

  @Put('api/cart/:productId')
  updateCartItem(@Param('productId') productId: string, @Body() dto: { quantity: number }) {
    const userId = 'current-user'; // Should come from auth
    this.ecommerceService.updateCartItem(userId, productId, dto.quantity);
    return { success: true, message: 'Cart updated' };
  }

  @Delete('api/cart/:productId')
  removeFromCart(@Param('productId') productId: string) {
    const userId = 'current-user'; // Should come from auth
    this.ecommerceService.removeFromCart(userId, productId);
    return { success: true, message: 'Removed from cart' };
  }

  @Delete('api/cart')
  clearCart() {
    const userId = 'current-user'; // Should come from auth
    this.ecommerceService.clearCart(userId);
    return { success: true, message: 'Cart cleared' };
  }

  // ============================================
  // API Routes - Orders
  // ============================================

  @Post('api/orders')
  createOrder(@Body() dto: CreateOrderDto) {
    const userId = 'current-user'; // Should come from auth
    const order = this.ecommerceService.createOrder(dto, userId);
    return { success: true, data: order };
  }

  @Get('api/orders')
  getUserOrders() {
    const userId = 'current-user'; // Should come from auth
    const orders = this.ecommerceService.getUserOrders(userId);
    return { success: true, data: orders };
  }

  @Get('api/orders/:id')
  getOrder(@Param('id') orderId: string) {
    const userId = 'current-user'; // Should come from auth
    const order = this.ecommerceService.getOrder(orderId, userId);
    return { success: true, data: order };
  }

  @Put('api/orders/:id/status')
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body() dto: { status: OrderStatus; trackingNumber?: string }
  ) {
    const order = this.ecommerceService.updateOrderStatus(orderId, dto.status, dto.trackingNumber);
    return { success: true, data: order };
  }

  @Post('api/orders/:id/cancel')
  cancelOrder(@Param('id') orderId: string) {
    const userId = 'current-user'; // Should come from auth
    const order = this.ecommerceService.cancelOrder(orderId, userId);
    return { success: true, data: order };
  }

  // ============================================
  // API Routes - Reviews
  // ============================================

  @Get('api/products/:productId/reviews')
  getProductReviews(@Param('productId') productId: string) {
    const reviews = this.ecommerceService.getProductReviews(productId);
    return { success: true, data: reviews };
  }

  @Post('api/products/:productId/reviews')
  createReview(@Param('productId') productId: string, @Body() dto: Omit<CreateReviewDto, 'productId'>) {
    const userId = 'current-user'; // Should come from auth
    const review = this.ecommerceService.createReview({ ...dto, productId }, userId);
    return { success: true, data: review };
  }
}
