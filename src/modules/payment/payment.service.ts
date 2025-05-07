import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../../database/entities/order.entity';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );
  }

  async createPaymentIntent(orderId: string, user: any) {
    const order = await this.ordersService.getOrderById(user, orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING)
      throw new BadRequestException('Order already paid or processed');

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(Number(order.total) * 100), // Stripe expects amount in cents
      currency: 'usd',
      metadata: { orderId: order.id, userId: user.id },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  getStripeInstance() {
    return this.stripe;
  }

  async markOrderPaid(orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);
    if (order) {
      order.status = OrderStatus.PAID;
      await this.ordersService.saveOrder(order);
    }
  }

  async markOrderFailed(orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);
    if (order) {
      order.status = OrderStatus.CANCELLED;
      await this.ordersService.saveOrder(order);
    }
  }
}