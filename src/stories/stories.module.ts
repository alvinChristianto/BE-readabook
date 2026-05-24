import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { PremiumGuard } from '../guards/premium.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StoriesController],
  providers: [StoriesService, PremiumGuard],
})
export class StoriesModule {}
