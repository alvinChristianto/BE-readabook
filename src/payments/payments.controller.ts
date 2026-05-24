import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IsEnum, IsString } from 'class-validator';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

class CreateQrisDto {
  @IsEnum(['ksatria_cerita', 'penjaga_keajaiban'])
  plan: string;

  @IsEnum(['monthly', 'yearly'])
  billingPeriod: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('qris')
  createQris(
    @Body() dto: CreateQrisDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.payments.createQris(req.user.id, dto.plan, dto.billingPeriod);
  }

  @Post('webhook')
  webhook(@Body() body: Record<string, string>) {
    return this.payments.handleWebhook(body);
  }
}
