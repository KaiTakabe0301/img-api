import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Image } from '../../images/entities/image.entity';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => [Image], { nullable: true })
  images?: Image[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
