import { Injectable } from '@nestjs/common';
import { CreateCategory } from './categories.dto';

@Injectable()
export class CategoriesService {
  private readonly categories: CreateCategory[] = [];

  findAll() {
    return this.categories;
  }

  create(cat: CreateCategory) {
    this.categories.push(cat);
  }
}
