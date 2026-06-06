import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const mockPrisma = {
  payment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockConfig = { get: jest.fn() };
const mockSubs = { upsertAfterPayment: jest.fn() };

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SubscriptionsService, useValue: mockSubs },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  // -------------------------------------------------------------------------
  // getHistory
  // -------------------------------------------------------------------------

  describe('getHistory', () => {
    it('returns mapped payment list ordered by createdAt desc', async () => {
      const dbRows = [
        {
          id: 'p1',
          orderId: 'dongeng-u1-111',
          amount: 29000,
          paymentMethod: 'qris',
          status: 'success',
          plan: 'ksatria_cerita',
          billingPeriod: 'monthly',
          createdAt: new Date('2025-06-01T00:00:00Z'),
        },
        {
          id: 'p2',
          orderId: 'dongeng-u1-222',
          amount: 49000,
          paymentMethod: 'qris',
          status: 'pending',
          plan: 'penjaga_keajaiban',
          billingPeriod: 'monthly',
          createdAt: new Date('2025-05-01T00:00:00Z'),
        },
      ];
      mockPrisma.payment.findMany.mockResolvedValue(dbRows);

      const result = await service.getHistory('u1');

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderId: true,
          amount: true,
          paymentMethod: true,
          status: true,
          plan: true,
          billingPeriod: true,
          createdAt: true,
        },
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'p1',
        order_id: 'dongeng-u1-111',
        amount: 29000,
        payment_method: 'qris',
        status: 'success',
        plan: 'ksatria_cerita',
        billing_period: 'monthly',
        created_at: dbRows[0].createdAt,
      });
    });

    it('returns an empty array when the user has no payments', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      const result = await service.getHistory('u1');
      expect(result).toEqual([]);
    });
  });
});
