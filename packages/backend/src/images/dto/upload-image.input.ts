import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";
import GraphQLUpload, { FileUpload } from "graphql-upload/GraphQLUpload.mjs";

@InputType()
export class UploadImageInput {
  @Field(() => GraphQLUpload)
  @IsNotEmpty()
  file: Promise<FileUpload>;
}
