import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './product.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Product } from '../../database/entities/product.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockProduct: Product = {
    id: 'test-id',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test description',
    price: 99.99,
    salePrice: 79.99,
    stock: 100,
    isActive: true,
    isFeatured: false,
    imageUrls: ['http://example.com/image.jpg'],
    attributes: { color: 'red', size: 'medium' },
    sku: 'TEST123',
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedProducts = {
    items: [mockProduct],
    total: 1,
    page: 1,
    limit: 10,
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getFeaturedProducts: jest.fn(),
    getProductsByCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Test Product',
        description: 'Test description',
        price: 99.99,
        categoryIds: ['category-id'],
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockProduct);

      const result = await controller.create(createProductDto);
      expect(result).toBe(mockProduct);
      expect(service.create).toHaveBeenCalledWith(createProductDto);
    });

    it('should throw ConflictException if product name already exists', async () => {
      const createProductDto: CreateProductDto = {
        name: 'Existing Product',
        price: 99.99,
        categoryIds: ['category-id'],
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new ConflictException('Product with this name already exists'),
        );

      await expect(controller.create(createProductDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const query: ProductQueryDto = {
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedProducts);

      const result = await controller.findAll(query);
      expect(result).toBe(mockPaginatedProducts);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('getFeatured', () => {
    it('should return featured products', async () => {
      const featuredProducts = [mockProduct];
      jest
        .spyOn(service, 'getFeaturedProducts')
        .mockResolvedValue(featuredProducts);

      const result = await controller.getFeatured(10);
      expect(result).toBe(featuredProducts);
      expect(service.getFeaturedProducts).toHaveBeenCalledWith(10);
    });
  });

  describe('getByCategory', () => {
    it('should return products by category', async () => {
      const categoryProducts = [mockProduct];
      jest
        .spyOn(service, 'getProductsByCategory')
        .mockResolvedValue(categoryProducts);

      const result = await controller.getByCategory('category-id', 10);
      expect(result).toBe(categoryProducts);
      expect(service.getProductsByCategory).toHaveBeenCalledWith(
        'category-id',
        10,
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      jest
        .spyOn(service, 'getProductsByCategory')
        .mockRejectedValue(new NotFoundException('Category not found'));

      await expect(
        controller.getByCategory('nonexistent-id', 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a product by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct);

      const result = await controller.findOne('test-id');
      expect(result).toBe(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if product not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a product by slug', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(mockProduct);

      const result = await controller.findBySlug('test-product');
      expect(result).toBe(mockProduct);
      expect(service.findBySlug).toHaveBeenCalledWith('test-product');
    });

    it('should throw NotFoundException if product not found', async () => {
      jest
        .spyOn(service, 'findBySlug')
        .mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.findBySlug('nonexistent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const updateProductDto: UpdateProductDto = {
        description: 'Updated description',
        price: 89.99,
      };

      const updatedProduct = {
        ...mockProduct,
        description: 'Updated description',
        price: 89.99,
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedProduct);

      const result = await controller.update('test-id', updateProductDto);
      expect(result).toBe(updatedProduct);
      expect(service.update).toHaveBeenCalledWith('test-id', updateProductDto);
    });

    it('should throw NotFoundException if product not found', async () => {
      const updateProductDto: UpdateProductDto = {
        description: 'Updated description',
      };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new NotFoundException('Product not found'));

      await expect(
        controller.update('nonexistent-id', updateProductDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a product', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove('test-id');
      expect(service.remove).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if product not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new NotFoundException('Product not found'));

      await expect(controller.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
