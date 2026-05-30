import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateStoryDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsString()
  @MaxLength(4)
  coverEmoji: string;

  @IsString()
  coverGradient: string;

  @IsBoolean()
  isPremium: boolean;

  @IsArray()
  @IsString({ each: true })
  categories: string[];

  @IsInt()
  @Min(1)
  durationMinutes: number;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
