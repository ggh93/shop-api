import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('orders')
@Controller('order')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(user.id, createOrderDto);
  }

  @Get('my')
  findMyOrders(@CurrentUser() user: User) {
    return this.orderService.findMyOrders(user.id);
  }
}
