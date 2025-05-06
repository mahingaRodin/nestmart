import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Cart } from '../../database/entities/cart.entity';
import { CartItem } from '../../database/entities/cart-item.entity';
import { Product } from '../../database/entities/product.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async getCart(user: User): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!cart) {
      cart = this.cartRepo.create({ user, items: [] });
      await this.cartRepo.save(cart);
    }
    return cart;
  }

  async addToCart(user: User, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getCart(user);
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    let item = cart.items.find((i) => i.product.id === product.id);
    if (item) {
      item.quantity += dto.quantity;
      await this.cartRepo.save(item);
    } else {
      item = this.cartItemRepo.create({
        cart,
        product,
        quantity: dto.quantity,
      });
      await this.cartItemRepo.save(item);
      cart.items.push(item);
    }
    await this.cartRepo.save(cart);
    return cart;
  }

  async updateItem(
    user: User,
    productId: string,
    quantity: number,
  ): Promise<Cart> {
    const cart = await this.getCart(user);
    const item = cart.items.find((i) => i.product.id === productId);
    if (!item) throw new NotFoundException('Item not found in cart');
    item.quantity = quantity;
    await this.cartItemRepo.save(item);
    return this.getCart(user);
  }

  async removeItem(user: User, productId: string): Promise<Cart> {
    const cart = await this.getCart(user);
    const item = cart.items.find((i) => i.product.id === productId);
    if (!item) throw new NotFoundException('Item not found in cart');
    await this.cartItemRepo.remove(item);
    return this.getCart(user);
    }
    
    async clearCart(user: User): Promise<Cart> {
        const cart = await this.getCart(user);
        await this.cartItemRepo.remove(cart.items);
        cart.items = [];
        await this.cartRepo.save(cart);
        return cart;
    }
}
