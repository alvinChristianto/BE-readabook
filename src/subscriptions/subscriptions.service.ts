import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!sub) {
      return { status: 'free_tier', plan: null, billing_period: null, end_date: null };
    }
    return {
      status: sub.status,
      plan: sub.plan,
      billing_period: sub.billingPeriod,
      end_date: sub.endDate,
    };
  }

  async upsertAfterPayment(
    userId: string,
    plan: string,
    billingPeriod: string,
  ) {
    const days = billingPeriod === 'yearly' ? 365 : 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.prisma.subscription.upsert({
      where: { userId },
      update: { status: 'active', plan: plan as any, billingPeriod: billingPeriod as any, startDate: now, endDate },
      create: { userId, status: 'active', plan: plan as any, billingPeriod: billingPeriod as any, startDate: now, endDate },
    });
  }
}
