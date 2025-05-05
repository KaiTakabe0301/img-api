import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ImagesService } from './images.service';
import { Image } from './entities/image.entity';
import { UploadImageInput } from './dto/upload-image.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

interface User {
  id: string;
  email: string;
  name?: string;
}

@Resolver(() => Image)
export class ImagesResolver {
  constructor(private readonly imagesService: ImagesService) {}

  @Mutation(() => Image)
  @UseGuards(GqlAuthGuard)
  async uploadImage(
    @Args('uploadImageInput') { file }: UploadImageInput,
    @CurrentUser() user: User,
  ): Promise<Image> {
    return this.imagesService.uploadImage(await file, user.id);
  }

  @Query(() => [Image], { name: 'images' })
  @UseGuards(GqlAuthGuard)
  async findAll(@CurrentUser() user: User): Promise<Image[]> {
    return this.imagesService.findAll(user.id);
  }

  @Query(() => Image, { name: 'image' })
  @UseGuards(GqlAuthGuard)
  async findOne(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<Image> {
    return this.imagesService.findOne(id, user.id);
  }
}
