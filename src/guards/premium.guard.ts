import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { cookies: Record<string, string> }>();
    const slug = req.params?.slug as string | undefined;

    if (slug) {
      const story = await this.prisma.story.findUnique({
        where: { slug },
        select: { isPremium: true },
      });
      if (!story?.isPremium) return true;
    }

    const token = req.cookies?.access_token ?? this.extractBearer(req);
    if (!token) throw new ForbiddenException();

    try {
      const payload = this.jwt.verify<{ sub: string }>(token);
      const sub = await this.prisma.subscription.findUnique({
        where: { userId: payload.sub },
      });
      if (!sub || sub.status !== 'active' || sub.endDate < new Date()) {
        throw new ForbiddenException();
      }
      return true;
    } catch {
      throw new ForbiddenException();
    }
  }

  private extractBearer(req: Request): string | null {
    const auth = req.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }
}
