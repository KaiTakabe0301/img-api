import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { NotFoundException } from '@nestjs/common';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => User)
  createUser(@Args('createUserInput') createUserInput: CreateUserInput): User {
    return this.usersService.create(createUserInput);
  }

  @Query(() => [User], { name: 'users' })
  findAll(): User[] {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('id', { type: () => ID }) id: string): User {
    const user = this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  @Mutation(() => User)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput): User {
    const user = this.usersService.update(updateUserInput.id, updateUserInput);
    if (!user) {
      throw new NotFoundException(`User with ID ${updateUserInput.id} not found`);
    }
    return user;
  }

  @Mutation(() => Boolean)
  removeUser(@Args('id', { type: () => ID }) id: string): boolean {
    const result = this.usersService.remove(id);
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return true;
  }
}
