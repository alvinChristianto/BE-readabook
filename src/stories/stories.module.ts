import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StoriesController } from './stories.controller';
import { AdminStoriesController } from './admin-stories.controller';
import { StoriesService } from './stories.service';
import { PremiumGuard } from '../guards/premium.guard';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    AuthModule,
    StorageModule,
    MulterModule.register({}),
  ],
  controllers: [StoriesController, AdminStoriesController],
  providers: [StoriesService, PremiumGuard],
})
export class StoriesModule {}
