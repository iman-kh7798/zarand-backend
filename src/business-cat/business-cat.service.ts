import { Injectable } from '@nestjs/common';
import { CreateCategory } from './business-cat.dto';

@Injectable()
export class BusinessCatService {
  private readonly categories: CreateCategory[] = [];

  findAll() {
    return this.categories;
  }

  create(cat: CreateCategory) {
    this.categories.push(cat);
  }
}
