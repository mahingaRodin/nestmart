import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { Product } from '../../database/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../../database/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async createOrder(user: User, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must have atleast one item');
    }

    let total = 0;
    const orderItems: OrderItem[] = [];

    for (const item of dto.items) {
      const product = await this.productRepo.findOne({
        where: { id: item.productId },
      });
      if (!product) throw new NotFoundException('Product not found');
      if (product.stock < item.quantity)
        throw new BadRequestException('Not enough stock');

      //decrement stock
      product.stock -= item.quantity;
      await this.productRepo.save(product);

      const orderItem = this.orderItemRepo.create({
        product,
        quantity: item.quantity,
        price: product.price, 
      });
      orderItems.push(orderItem);
      total += product.price * item.quantity;
    }
    const order = this.orderRepo.create({
      user,
      items: orderItems,
      total,
      status: OrderStatus.PENDING,
    });

    return this.orderRepo.save(order);
  }

  async getUserOrders(user: User): Promise<Order[]> {
    return this.orderRepo.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(user: User, orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, user: { id: user.id } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // Admin: get all orders
  async getAllOrders(): Promise<Order[]> {
    return this.orderRepo.find({ order: { createdAt: 'DESC' } });
    }
    
    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
        const order = await this.orderRepo.findOne({ where: { id: orderId } })
        if (!order) throw new NotFoundException('Order not found');
        order.status = status;
        return this.orderRepo.save(order);
    }
}