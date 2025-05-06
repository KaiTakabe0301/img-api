import { ObjectType, Field, ID } from "@nestjs/graphql";
import { User } from "../../users/entities/user.entity";
import { Expose } from "class-transformer";

@ObjectType()
export class Image {
  @Field(() => ID)
  @Expose()
  id: string;

  @Field()
  @Expose()
  filename: string;

  @Field()
  @Expose()
  originalUrl: string;

  @Field({ nullable: true })
  @Expose()
  thumbnailUrl?: string;

  @Field()
  @Expose()
  mimeType: string;

  @Field()
  @Expose()
  size: number;

  @Field()
  @Expose()
  createdAt: Date;

  @Field()
  @Expose()
  updatedAt: Date;
}
