import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminGuard } from '../auth/guards/admin.guard';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const WEBM_MIME = 'video/webm';
const MP3_MIMES = ['audio/mpeg', 'audio/mp3'];

@UseGuards(AdminGuard)
@Controller('admin/stories')
export class AdminStoriesController {
  constructor(private stories: StoriesService) {}

  // ── Story endpoints ──────────────────────────────────────────────────────

  @Post()
  createStory(@Body() dto: CreateStoryDto) {
    return this.stories.createStory(dto);
  }

  @Get()
  listAll() {
    return this.stories.findAllAdmin();
  }

  @Patch(':id')
  updateStory(@Param('id') id: string, @Body() dto: UpdateStoryDto) {
    return this.stories.updateStory(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string) {
    await this.stories.deleteStory(id);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.stories.toggleActive(id);
  }

  // ── Page endpoints ───────────────────────────────────────────────────────

  @Post(':storyId/pages')
  createPage(
    @Param('storyId') storyId: string,
    @Body() dto: CreatePageDto,
  ) {
    return this.stories.createPage(storyId, dto);
  }

  @Patch(':storyId/pages/:pageId')
  updatePage(
    @Param('storyId') storyId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
  ) {
    return this.stories.updatePage(storyId, pageId, dto);
  }

  @Delete(':storyId/pages/:pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePage(
    @Param('storyId') storyId: string,
    @Param('pageId') pageId: string,
  ) {
    await this.stories.deletePage(storyId, pageId);
  }

  @Post(':storyId/pages/reorder')
  reorderPages(
    @Param('storyId') storyId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.stories.reorderPages(storyId, body.orderedIds);
  }

  // ── File upload endpoints ────────────────────────────────────────────────

  @Post(':storyId/pages/:pageId/animation')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async uploadAnimation(
    @Param('storyId') storyId: string,
    @Param('pageId') pageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_FILE_SIZE)
      throw new BadRequestException('File exceeds 50 MB limit');
    if (file.mimetype !== WEBM_MIME)
      throw new BadRequestException('Only .webm files are accepted');

    const animationUrl = await this.stories.uploadAnimation(
      storyId,
      pageId,
      file.buffer,
      file.mimetype,
    );
    return { animationUrl };
  }

  @Post(':storyId/pages/:pageId/audio')
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage() }),
  )
  async uploadAudio(
    @Param('storyId') storyId: string,
    @Param('pageId') pageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.size > MAX_FILE_SIZE)
      throw new BadRequestException('File exceeds 50 MB limit');
    if (!MP3_MIMES.includes(file.mimetype))
      throw new BadRequestException('Only .mp3 files are accepted');

    const audioUrl = await this.stories.uploadAudio(
      storyId,
      pageId,
      file.buffer,
      file.mimetype,
    );
    return { audioUrl };
  }
}
