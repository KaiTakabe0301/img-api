import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { FileUpload } from 'graphql-upload-minimal';
import { Image } from './entities/image.entity';
import { toImageDto } from './mappers/image.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class ImagesService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async uploadImage(file: FileUpload, userId: string): Promise<Image> {
    const { originalUrl, thumbnailUrl, filename, mimeType, size } = await this.s3Service.uploadImage(file, userId);

    // Save image metadata to database
    const dbImage = await this.prisma.image.create({
      data: {
        filename,
        originalUrl,
        thumbnailUrl,
        mimeType,
        size,
        userId,
      },
      include: {
        user: true, // Include the user relation
      },
    });

    return toImageDto(dbImage);
  }

  async findAll(userId: string): Promise<Image[]> {
    const dbImages = await this.prisma.image.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true, // Include the user relation
      },
    });

    return dbImages.map(toImageDto);
  }

  async findOne(id: string, userId: string): Promise<Image> {
    const dbImage = await this.prisma.image.findUnique({
      where: { id },
      include: {
        user: true, // Include the user relation
      },
    });

    if (!dbImage) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Check if the image belongs to the user
    if (dbImage.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this image');
    }

    return toImageDto(dbImage);
  }
}
