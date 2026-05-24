import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, StrategyOptions } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'DISABLED',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'DISABLED',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    } as StrategyOptions);
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const { id, displayName, emails } = profile;
    return {
      googleId: id,
      name: displayName,
      email: emails?.[0]?.value ?? '',
    };
  }
}
