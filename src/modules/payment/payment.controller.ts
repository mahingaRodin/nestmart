import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  Res,
  Headers,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import Stripe from "stripe";

@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  @Post('intent/:orderId')
  async createPaymentIntent(@Req() req, @Param('orderId') orderId: string) {
    return this.paymentService.createPaymentIntent(orderId, req.user);
  }

  // No @UseGuards here!
  @Post('webhook')
  async handleStripeWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    const stripe = this.paymentService.getStripeInstance();
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    )!;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    //handling the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await this.paymentService.markOrderPaid(orderId);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        // Optionally handle failed payments
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await this.paymentService.markOrderFailed(orderId);
        }
        break;
      }
      // Add more cases for other event types if needed
      default:
        // Unexpected event type
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  }
}
