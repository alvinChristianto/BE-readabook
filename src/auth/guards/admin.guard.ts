import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context
      .switchToHttp()
      .getRequest<Request & { cookies: Record<string, string> }>();

    const token = req.cookies?.access_token ?? this.extractBearer(req);
    if (!token) throw new ForbiddenException();

    try {
      const payload = this.jwt.verify<{ sub: string; role: string }>(token);
      if (payload.role !== 'admin') throw new ForbiddenException();
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
