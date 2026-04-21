import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Product } from '../product/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    let totalPrice = 0;
    const orderItems: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `상품을 찾을 수 없습니다. (id: ${item.productId})`,
        );
      }

      const orderItem = this.orderItemRepository.create({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
      });
      orderItems.push(orderItem);
      totalPrice += product.price * item.quantity;
    }

    const order = this.orderRepository.create({
      userId,
      totalPrice,
      orderItems,
    });

    return this.orderRepository.save(order);
  }

  findMyOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['orderItems', 'orderItems.product'],
      order: { createdAt: 'DESC' },
    });
  }
}
