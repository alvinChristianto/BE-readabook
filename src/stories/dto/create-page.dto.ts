import { IsString, IsOptional } from 'class-validator';

export class CreatePageDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsString()
  @IsOptional()
  animationUrl?: string;

  @IsString()
  @IsOptional()
  audioUrl?: string;
}
