import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, res: Response) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      if (existing.authMethod === 'google') {
        throw new ConflictException({ conflict: 'google_account' });
      }
      throw new ConflictException({ conflict: 'email_already_registered' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, authMethod: 'email' },
    });

    return this.issueToken(user, res);
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.users.findByEmail(dto.email);
    if (user?.authMethod === 'google') {
      throw new ConflictException({ conflict: 'google_account' });
    }
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException();
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException();

    return this.issueToken(user, res);
  }

  async googleCallback(
    profile: { googleId: string; name: string; email: string },
    res: Response,
  ) {
    const existing = await this.users.findByEmail(profile.email);
    if (existing && existing.authMethod === 'email') {
      throw new ConflictException({ conflict: 'email_account' });
    }

    const user = await this.prisma.user.upsert({
      where: { email: profile.email },
      update: { googleId: profile.googleId, name: profile.name },
      create: {
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        authMethod: 'google',
      },
    });

    return this.issueToken(user, res);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw new UnauthorizedException();

    const sub = user.subscription;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      subscription: sub
        ? {
            status: sub.status,
            plan: sub.plan,
            billing_period: sub.billingPeriod,
            end_date: sub.endDate,
          }
        : { status: 'free_tier', plan: null, billing_period: null, end_date: null },
    };
  }

  private issueToken(
    user: { id: string; role: string; name: string; email: string },
    res: Response,
  ) {
    const token = this.jwt.sign({ sub: user.id, role: user.role });
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
