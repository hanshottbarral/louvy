import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

@Injectable()
export class StorageService {
  private readonly bucket: string | undefined;
  private readonly publicUrl: string | undefined;
  private readonly s3Client: S3Client | null;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET') || undefined;
    this.publicUrl = this.configService.get<string>('S3_PUBLIC_URL') || undefined;
    this.s3Client =
      this.bucket && this.configService.get<string>('S3_ACCESS_KEY_ID')
        ? new S3Client({
            region: this.configService.get<string>('S3_REGION'),
            endpoint: this.configService.get<string>('S3_ENDPOINT') || undefined,
            forcePathStyle: Boolean(this.configService.get<string>('S3_ENDPOINT')),
            credentials: {
              accessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID') ?? '',
              secretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY') ?? '',
            },
          })
        : null;
  }

  async uploadAudio(file: Express.Multer.File) {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extname(file.originalname) || '.webm'}`;

    if (this.s3Client && this.bucket) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `audio/${fileName}`,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return {
        url: this.publicUrl
          ? `${this.publicUrl}/audio/${fileName}`
          : `https://${this.bucket}.s3.amazonaws.com/audio/${fileName}`,
      };
    }

    const uploadsDirectory = join(process.cwd(), 'uploads', 'audio');
    await mkdir(uploadsDirectory, { recursive: true });
    await writeFile(join(uploadsDirectory, fileName), file.buffer);

    const backendUrl = this.configService.get<string>('BACKEND_URL') ?? 'http://localhost:4000';
    return {
      url: `${backendUrl}/uploads/audio/${fileName}`,
    };
  }
}
