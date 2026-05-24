import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const PRICES: Record<string, Record<string, number>> = {
  ksatria_cerita:    { monthly: 29000,  yearly: 290000 },
  penjaga_keajaiban: { monthly: 49000,  yearly: 490000 },
};

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private subs: SubscriptionsService,
    private config: ConfigService,
  ) {}

  async createQris(userId: string, plan: string, billingPeriod: string) {
    const amount = PRICES[plan]?.[billingPeriod];
    if (!amount) throw new BadRequestException('Invalid plan or billing period');

    const orderId = `dongeng-${userId}-${Date.now()}`;
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY') ?? '';
    const baseUrl = this.config.get<string>('MIDTRANS_BASE_URL') ?? 'https://api.sandbox.midtrans.com';

    const { data } = await axios.post(
      `${baseUrl}/v2/charge`,
      {
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: amount },
        qris: { acquirer: 'gopay' },
      },
      {
        auth: { username: serverKey, password: '' },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    await this.prisma.payment.create({
      data: {
        orderId,
        userId,
        amount,
        paymentMethod: 'qris',
        status: 'pending',
        plan: plan as any,
        billingPeriod: billingPeriod as any,
      },
    });

    return {
      order_id: orderId,
      qr_image_url: data.qr_string
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.qr_string)}`
        : data.actions?.find((a: any) => a.name === 'generate-qr-code')?.url,
      amount,
      expiry_time: data.expiry_time,
    };
  }

  async handleWebhook(body: Record<string, string>) {
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY') ?? '';

    const expected = createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (expected !== signature_key) throw new UnauthorizedException();

    if (transaction_status !== 'settlement' && transaction_status !== 'capture') return { ok: true };

    const payment = await this.prisma.payment.findUnique({ where: { orderId: order_id } });
    if (!payment || payment.status === 'success') return { ok: true };

    await this.prisma.payment.update({ where: { orderId: order_id }, data: { status: 'success' } });
    await this.subs.upsertAfterPayment(payment.userId, payment.plan, payment.billingPeriod);

    return { ok: true };
  }
}
