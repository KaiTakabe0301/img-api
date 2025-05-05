import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { GraphQLUpload, FileUpload } from 'graphql-upload-minimal';

@InputType()
export class UploadImageInput {
  @Field(() => GraphQLUpload)
  @IsNotEmpty()
  file: Promise<FileUpload>;
}
