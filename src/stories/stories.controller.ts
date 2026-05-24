import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { StoriesService } from './stories.service';
import { PremiumGuard } from '../guards/premium.guard';

@Controller('stories')
export class StoriesController {
  constructor(private stories: StoriesService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('is_premium') isPremiumStr?: string,
  ) {
    const isPremium =
      isPremiumStr !== undefined ? isPremiumStr === 'true' : undefined;
    return this.stories.findAll(category, isPremium);
  }

  @UseGuards(PremiumGuard)
  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const story = await this.stories.findBySlug(slug);
    if (!story) throw new NotFoundException('Story not found');
    return story;
  }
}
