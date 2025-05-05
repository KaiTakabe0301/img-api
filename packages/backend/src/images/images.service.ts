import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { FileUpload } from 'graphql-upload-minimal';
import { Image } from './entities/image.entity';

@Injectable()
export class ImagesService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async uploadImage(file: FileUpload, userId: string): Promise<Image> {
    const { originalUrl, thumbnailUrl, filename, mimeType, size } = await this.s3Service.uploadImage(file, userId);

    // Save image metadata to database
    const image = await this.prisma.image.create({
      data: {
        filename,
        originalUrl,
        thumbnailUrl,
        mimeType,
        size,
        userId,
      },
    });

    return image;
  }

  async findAll(userId: string): Promise<Image[]> {
    return this.prisma.image.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string): Promise<Image> {
    const image = await this.prisma.image.findUnique({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Check if the image belongs to the user
    if (image.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this image');
    }

    return image;
  }
}
