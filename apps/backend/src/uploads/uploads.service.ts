import { Injectable } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class UploadsService {
  constructor(private readonly storageService: StorageService) {}

  uploadAudio(file: Express.Multer.File) {
    return this.storageService.uploadAudio(file);
  }
}

