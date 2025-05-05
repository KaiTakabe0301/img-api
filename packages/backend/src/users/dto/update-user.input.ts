import { CreateUserInput } from './create-user.input';
import { InputType, Field, ID, PartialType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => ID)
  @IsNotEmpty()
  id: string;
}
