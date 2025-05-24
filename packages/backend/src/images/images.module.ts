import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ImagesService } from './images.service';
import { ImagesResolver } from './images.resolver';
import { S3Service } from './services/s3.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule, HttpModule],
  providers: [ImagesResolver, ImagesService, S3Service],
})
export class ImagesModule {}
