import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../database/entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Req() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(req.user, dto);
  }

  @Get()
  getUserOrders(@Req() req) {
    return this.ordersService.getUserOrders(req.user);
  }

  @Get(':id')
  getOrderById(@Req() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user, id);
  }

  //admin : get all orders
    @Get('/admin/all')
    @UseGuards(RolesGuard)
    @Roles(UserRole.ADMIN)
    getAllOrders() {
        return this.ordersService.getAllOrders();
    }
}