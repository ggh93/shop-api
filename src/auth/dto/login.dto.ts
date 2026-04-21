import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ggh93@naver.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'qwer1234', description: 'User password' })
  @IsString()
  password: string;
}
