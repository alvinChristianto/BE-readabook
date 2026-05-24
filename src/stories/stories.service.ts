import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(category?: string, isPremium?: boolean) {
    return this.prisma.story.findMany({
      where: {
        ...(category ? { categories: { has: category } } : {}),
        ...(isPremium !== undefined ? { isPremium } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.story.findUnique({
      where: { slug },
      include: { pages: { orderBy: { pageNumber: 'asc' } } },
    });
  }
}
