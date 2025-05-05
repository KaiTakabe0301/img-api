import { Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  // In-memory users array for demo purposes
  // In a real application, this would be replaced with a database
  private users: User[] = [];

  create(createUserInput: CreateUserInput): User {
    const user: User = {
      id: uuidv4(),
      ...createUserInput,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: string): User | undefined {
    return this.users.find(user => user.id === id);
  }

  update(id: string, updateUserInput: UpdateUserInput): User | null {
    const userIndex = this.users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      return null;
    }

    const updatedUser = {
      ...this.users[userIndex],
      ...updateUserInput,
      updatedAt: new Date(),
    };

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  remove(id: string): boolean {
    const userIndex = this.users.findIndex(user => user.id === id);

    if (userIndex === -1) {
      return false;
    }

    this.users.splice(userIndex, 1);
    return true;
  }
}
