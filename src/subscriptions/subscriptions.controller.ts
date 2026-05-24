import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subs: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Req() req: Request & { user: { id: string } }) {
    return this.subs.getStatus(req.user.id);
  }
}
