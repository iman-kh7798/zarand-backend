import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  constructor() {}

  create(file: Express.Multer.File) {
    const uploadPath = join(process.cwd(), 'uploads');

    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const filePath = join(uploadPath, filename);

    writeFileSync(filePath, file.buffer);

    return {
      filename,
      path: `/uploads/${filename}`,
    };
  }
}
