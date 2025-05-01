import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindManyOptions, ILike } from 'typeorm';
import { Product } from '../../database/entities/product.entity';
import { Category } from '../../database/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CategoriesService } from '../categories/categories.service';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private categoriesService: CategoriesService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { name, categoryIds, ...rest } = createProductDto;
    // Check if product with the same name exists
    const existingProduct = await this.productRepository.findOne({
      where: { name },
    });
    if (existingProduct) {
      throw new ConflictException(`Product with name "${name}" already exists`);
    }

    // Create new product
    const newProduct = this.productRepository.create({
      name,
      slug: slugify(name, { lower: true }),
      ...rest,
    });

    // Assign categories
    if (categoryIds && categoryIds.length > 0) {
      const categories = await this.categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }
      newProduct.categories = categories;
    }

    return this.productRepository.save(newProduct);
  }
  async findAll(
    query: ProductQueryDto,
  ): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      isFeatured,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'category');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('category.id = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    // Only show active products by default
    queryBuilder.andWhere('product.isActive = :isActive', { isActive: true });

    // Apply sorting
    queryBuilder.orderBy(`product.${sortBy}`, sortOrder);

    // Apply pagination
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException(`Product with id "${id} not found"`);
    }
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { slug },
      relations: ['categories'],
    });

    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const { name, categoryIds, ...rest } = updateProductDto;

    const product = await this.findOne(id);

    if (name && name !== product.name) {
      product.name = name;
      product.slug = slugify(name, { lower: true });
    }

    //update other fields
    Object.assign(product, rest);

    if (categoryIds) {
      const categories = await this.categoryRepository.findByIds(categoryIds);
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }
      product.categories = categories;
    }

    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return this.productRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ['categories'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getProductsByCategory(
    categoryId: string,
    limit: number = 10,
  ): Promise<Product[]> {
    // Get the category and all its descendants
    const category = await this.categoriesService.findOne(categoryId);
    const descendants =
      await this.categoriesService.findDescendants(categoryId);
    const categoryIds = [category.id, ...descendants.map((c) => c.id)];

    // Find products in any of these categories
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.isActive = :isActive', { isActive: true })
      .orderBy('product.createdAt', 'DESC')
      .take(limit)
      .leftJoinAndSelect('product.categories', 'allCategories');

    return queryBuilder.getMany();
  }
}
