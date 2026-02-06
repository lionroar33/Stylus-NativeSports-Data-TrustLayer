/**
 * E-Commerce Module - DTOs
 * Phase 5: Sports Gear Marketplace
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';

export enum ProductCategory {
  EQUIPMENT = 'equipment',
  APPAREL = 'apparel',
  FOOTWEAR = 'footwear',
  ACCESSORIES = 'accessories',
  PROTECTION = 'protection',
  NUTRITION = 'nutrition',
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsOptional()
  @IsUUID()
  sportId?: string;

  @IsString()
  @MaxLength(100)
  brand: string;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}

export class CreateOrderDto {
  @IsArray()
  items: OrderItemDto[];

  @IsString()
  shippingAddress: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateReviewDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ProductResponseDto {
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
  createdAt: Date;
}

export class OrderResponseDto {
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
  createdAt: Date;
  updatedAt: Date;
}
