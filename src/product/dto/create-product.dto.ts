import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: '나이키 에어맥스' })
  @IsString()
  name: string;

  @ApiProperty({ example: '편안한 운동화' })
  @IsString()
  description: string;

  @ApiProperty({ example: 150000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock: number;
}
