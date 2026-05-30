import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  name: string;
}

class UpdatePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.users.updateProfile(req.user.id, dto.name);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  updatePassword(
    @Body() dto: UpdatePasswordDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.users.updatePassword(req.user.id, dto.currentPassword, dto.newPassword);
  }
}
