import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }
    
    @Post('intent/:orderId')
    async createPaymentIntent(@Req() req, @Param('orderId') orderId: string) {
        return this.paymentService.createPaymentIntent(orderId, req.user)
    }
}