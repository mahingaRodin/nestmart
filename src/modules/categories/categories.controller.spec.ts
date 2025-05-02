import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '../../database/entities/category.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategory: Category = {
    id: 'test-id',
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test description',
    imageUrl: 'http://example.com/image.jpg',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    children: [],
    parent: null,
    products: [],
  };

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getTree: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Test Category',
        description: 'Test description',
        imageUrl: 'http://example.com/image.jpg',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockCategory);

      const result = await controller.create(createCategoryDto);
      expect(result).toBe(mockCategory);
      expect(service.create).toHaveBeenCalledWith(createCategoryDto);
    });

    it('should throw ConflictException if category name already exists', async () => {
      const createCategoryDto: CreateCategoryDto = {
        name: 'Existing Category',
      };

      jest
        .spyOn(service, 'create')
        .mockRejectedValue(
          new ConflictException('Category with this name already exists'),
        );

      await expect(controller.create(createCategoryDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      const categories = [mockCategory];
      jest.spyOn(service, 'findAll').mockResolvedValue(categories);

      const result = await controller.findAll();
      expect(result).toBe(categories);
    });
  });

  describe('getTree', () => {
    it('should return category tree', async () => {
      const categoryTree = [{ ...mockCategory, children: [] }];
      jest.spyOn(service, 'getTree').mockResolvedValue(categoryTree);

      const result = await controller.getTree();
      expect(result).toBe(categoryTree);
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockCategory);

      const result = await controller.findOne('test-id');
      expect(result).toBe(mockCategory);
      expect(service.findOne).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if category not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return a category by slug', async () => {
      jest.spyOn(service, 'findBySlug').mockResolvedValue(mockCategory);

      const result = await controller.findBySlug('test-category');
      expect(result).toBe(mockCategory);
      expect(service.findBySlug).toHaveBeenCalledWith('test-category');
    });

    it('should throw NotFoundException if category not found', async () => {
      jest
        .spyOn(service, 'findBySlug')
        .mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.findBySlug('nonexistent-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        description: 'Updated description',
      };

      const updatedCategory = {
        ...mockCategory,
        description: 'Updated description',
      };

      jest.spyOn(service, 'update').mockResolvedValue(updatedCategory);

      const result = await controller.update('test-id', updateCategoryDto);
      expect(result).toBe(updatedCategory);
      expect(service.update).toHaveBeenCalledWith('test-id', updateCategoryDto);
    });

    it('should throw NotFoundException if category not found', async () => {
      const updateCategoryDto: UpdateCategoryDto = {
        description: 'Updated description',
      };

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new NotFoundException('Category not found'));

      await expect(
        controller.update('nonexistent-id', updateCategoryDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      await controller.remove('test-id');
      expect(service.remove).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if category not found', async () => {
      jest
        .spyOn(service, 'remove')
        .mockRejectedValue(new NotFoundException('Category not found'));

      await expect(controller.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
