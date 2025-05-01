import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Category } from '../../database/entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import  slugify from 'slugify';

@Injectable()
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const { name, parentId, ...rest } = createCategoryDto;

    // Check if category with the same name exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${name}" already exists`,
      );
    }

    // Create new category
    const newCategory = new Category(); // Use this approach instead
    newCategory.name = name;
    newCategory.slug = slugify(name, { lower: true });

    // Assign other properties
    if (rest.description) newCategory.description = rest.description;
    if (rest.imageUrl) newCategory.imageUrl = rest.imageUrl;
    if (rest.isActive !== undefined) newCategory.isActive = rest.isActive;

    // Set parent if parentId is provided
    if (parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${parentId} not found`,
        );
      }
      newCategory.parent = parent;
    }

    return this.categoryRepository.save(newCategory);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { slug } });
    if (!category) {
      throw new NotFoundException(`Category with slug ${slug} not found`);
    }
    return category;
  }

  async getTree(): Promise<Category[]> {
    return this.categoryRepository.findTrees();
  }

  async findDescendants(id: string): Promise<Category[]> {
    const category = await this.findOne(id);
    return this.categoryRepository.findDescendants(category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const { name, parentId, ...rest } = updateCategoryDto;

    // Find the category
    const category = await this.findOne(id);

    // Update slug if name is provided
    if (name) {
      category.name = name;
      category.slug = slugify(name, { lower: true });
    }

    // Update other fields
    Object.assign(category, rest);

    // Update parent if parentId is provided
    if (parentId) {
      // Prevent assigning category as its own parent or descendant
      if (parentId === id) {
        throw new ConflictException('Cannot assign category as its own parent');
      }

      const parent = await this.categoryRepository.findOne({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent category with id ${parentId} not found`,
        );
      }

      // Check if parent is a descendant of this category
      const descendants = await this.findDescendants(id);
      if (descendants.some((desc) => desc.id === parentId)) {
        throw new ConflictException('Cannot assign a descendant as parent');
      }

      category.parent = parent;
    } else if (parentId === null) {
      // If parentId is explicitly null, remove parent
      category.parent;
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
  }
}