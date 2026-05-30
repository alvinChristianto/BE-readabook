import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class StoriesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ── Public endpoints (isActive: true only) ───────────────────────────────

  findAll(category?: string, isPremium?: boolean) {
    return this.prisma.story.findMany({
      where: {
        isActive: true,
        ...(category ? { categories: { has: category } } : {}),
        ...(isPremium !== undefined ? { isPremium } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.story.findFirst({
      where: { slug, isActive: true },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });
  }

  // ── Admin — Story CRUD ───────────────────────────────────────────────────

  findAllAdmin() {
    return this.prisma.story.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { pages: true } } },
    });
  }

  createStory(dto: CreateStoryDto) {
    return this.prisma.story.create({ data: dto });
  }

  async updateStory(id: string, dto: UpdateStoryDto) {
    await this.requireStory(id);
    return this.prisma.story.update({ where: { id }, data: dto });
  }

  async deleteStory(id: string): Promise<void> {
    await this.requireStory(id);
    await this.prisma.story.delete({ where: { id } });
  }

  async toggleActive(id: string) {
    const story = await this.requireStory(id);
    return this.prisma.story.update({
      where: { id },
      data: { isActive: !story.isActive },
    });
  }

  // ── Admin — Page CRUD ────────────────────────────────────────────────────

  async getPages(storyId: string) {
    await this.requireStory(storyId);
    return this.prisma.storyPage.findMany({
      where: { storyId },
      orderBy: { pageNumber: 'asc' },
    });
  }

  async createPage(storyId: string, dto: CreatePageDto) {
    await this.requireStory(storyId);
    const last = await this.prisma.storyPage.findFirst({
      where: { storyId },
      orderBy: { pageNumber: 'desc' },
      select: { pageNumber: true },
    });
    const pageNumber = (last?.pageNumber ?? 0) + 1;
    return this.prisma.storyPage.create({ data: { storyId, ...dto, pageNumber } });
  }

  async updatePage(storyId: string, pageId: string, dto: UpdatePageDto) {
    await this.requirePage(storyId, pageId);
    return this.prisma.storyPage.update({ where: { id: pageId }, data: dto });
  }

  async deletePage(storyId: string, pageId: string): Promise<void> {
    await this.requirePage(storyId, pageId);
    await this.prisma.storyPage.delete({ where: { id: pageId } });
  }

  async reorderPages(storyId: string, orderedIds: string[]): Promise<void> {
    await this.requireStory(storyId);
    await this.prisma.$transaction(
      orderedIds.map((pageId, idx) =>
        this.prisma.storyPage.update({
          where: { id: pageId },
          data: { pageNumber: idx + 1 },
        }),
      ),
    );
  }

  // ── Admin — Media upload ─────────────────────────────────────────────────

  async uploadAnimation(
    storyId: string,
    pageId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const page = await this.requirePage(storyId, pageId);
    const ext = mimeType === 'video/mp4' ? 'mp4' : 'webm';
    const path = `animations/${storyId}/${pageId}.${ext}`;

    if (page.animationUrl) {
      const oldPath = this.extractPath(page.animationUrl);
      if (oldPath) {
        await this.storage.delete(oldPath).catch(() => {
          // Non-fatal: old file may not exist
        });
      }
    }

    const url = await this.storage.upload(path, buffer, mimeType);
    await this.prisma.storyPage.update({
      where: { id: pageId },
      data: { animationUrl: url },
    });
    return url;
  }

  async uploadAudio(
    storyId: string,
    pageId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const page = await this.requirePage(storyId, pageId);
    const path = `audio/${storyId}/${pageId}.mp3`;

    if (page.audioUrl) {
      const oldPath = this.extractPath(page.audioUrl);
      if (oldPath) {
        await this.storage.delete(oldPath).catch(() => {
          // Non-fatal: old file may not exist
        });
      }
    }

    const url = await this.storage.upload(path, buffer, mimeType);
    await this.prisma.storyPage.update({
      where: { id: pageId },
      data: { audioUrl: url },
    });
    return url;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async requireStory(id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException(`Story ${id} not found`);
    return story;
  }

  private async requirePage(storyId: string, pageId: string) {
    const page = await this.prisma.storyPage.findFirst({
      where: { id: pageId, storyId },
    });
    if (!page) throw new NotFoundException(`Page ${pageId} not found`);
    return page;
  }

  /**
   * Extract the storage path from a full Supabase public URL.
   * e.g. https://<project>.supabase.co/storage/v1/object/public/story-assets/animations/... → animations/...
   */
  private extractPath(url: string): string | null {
    try {
      const marker = '/story-assets/';
      const idx = url.indexOf(marker);
      if (idx === -1) return null;
      return url.slice(idx + marker.length);
    } catch {
      return null;
    }
  }
}
