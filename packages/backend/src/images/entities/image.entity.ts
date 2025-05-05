import { ObjectType, Field, ID } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

@ObjectType()
export class Image {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field()
  originalUrl: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  mimeType: string;

  @Field()
  size: number;

  @Field()
  userId: string;

  @Field(() => User)
  user: User;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
