import { IsArray, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateSongDto {
  @IsString()
  scheduleId!: string;

  @IsString()
  name!: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  bpm?: number;

  @IsOptional()
  @IsUrl()
  youtubeUrl?: string;
}

export class ReorderSongsDto {
  @IsArray()
  @IsString({ each: true })
  songIds!: string[];
}

