import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'imp_123456789' })
  @IsString()
  impUid: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  orderId: number;
}
