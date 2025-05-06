import { ObjectType, Field, ID } from "@nestjs/graphql";
import { Expose } from "class-transformer";

@ObjectType()
export class User {
  @Field(() => ID)
  @Expose()
  id: string;

  @Field()
  @Expose()
  email: string;

  @Field({ nullable: true })
  @Expose()
  name?: string;

  @Field()
  @Expose()
  createdAt: Date;

  @Field()
  @Expose()
  updatedAt: Date;
}
