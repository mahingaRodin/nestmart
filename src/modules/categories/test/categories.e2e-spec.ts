// test/categories.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../../database/entities/category.entity';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '../../../database/entities/user.entity';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  let categoryRepository: Repository<Category>;
  let jwtService: JwtService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    categoryRepository = moduleFixture.get(getRepositoryToken(Category));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create an admin token for authorized endpoints
    adminToken = jwtService.sign({
      sub: 'admin-id',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the categories table before each test
    await categoryRepository.clear();
  });

  describe('POST /categories', () => {
    it('should create a new category', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          imageUrl: 'http://example.com/electronics.jpg',
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe('Electronics');
          expect(response.body.slug).toBe('electronics');
          expect(response.body.description).toBe(
            'Electronic devices and accessories',
          );
          expect(response.body.imageUrl).toBe(
            'http://example.com/electronics.jpg',
          );
          expect(response.body.isActive).toBe(true);
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .send({
          name: 'Electronics',
        })
        .expect(401);
    });

    it('should return 400 if name is missing', () => {
      return request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Invalid category without name',
        })
        .expect(400);
    });
  });

  describe('GET /categories', () => {
    beforeEach(async () => {
      // Create sample categories for testing
      await categoryRepository.save([
        {
          name: 'Electronics',
          slug: 'electronics',
          description: 'Electronic devices',
          isActive: true,
        },
        {
          name: 'Clothing',
          slug: 'clothing',
          description: 'Apparel',
          isActive: true,
        },
      ]);
    });

    it('should return all categories', () => {
      return request(app.getHttpServer())
        .get('/categories')
        .expect(200)
        .then((response) => {
          expect(response.body).toBeInstanceOf(Array);
          expect(response.body.length).toBe(2);
          expect(response.body[0]).toHaveProperty('id');
          expect(response.body[0]).toHaveProperty('name');
          expect(response.body[0]).toHaveProperty('slug');
          expect(response.body.some((cat) => cat.name === 'Electronics')).toBe(
            true,
          );
          expect(response.body.some((cat) => cat.name === 'Clothing')).toBe(
            true,
          );
        });
    });
  });

  describe('GET /categories/:id', () => {
    let category: Category;

    beforeEach(async () => {
      // Create a category for testing
      category = await categoryRepository.save({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
        isActive: true,
      });
    });

    it('should return a category by id', () => {
      return request(app.getHttpServer())
        .get(`/categories/${category.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', category.id);
          expect(response.body).toHaveProperty('name', 'Electronics');
          expect(response.body).toHaveProperty('slug', 'electronics');
        });
    });

    it('should return 404 if category not found', () => {
      return request(app.getHttpServer())
        .get('/categories/nonexistent-id')
        .expect(404);
    });
  });

  describe('PATCH /categories/:id', () => {
    let category: Category;

    beforeEach(async () => {
      // Create a category for testing
      category = await categoryRepository.save({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
        isActive: true,
      });
    });

    it('should update a category', () => {
      return request(app.getHttpServer())
        .patch(`/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Electronics',
          description: 'Updated description',
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', category.id);
          expect(response.body).toHaveProperty('name', 'Updated Electronics');
          expect(response.body).toHaveProperty('slug', 'updated-electronics');
          expect(response.body).toHaveProperty(
            'description',
            'Updated description',
          );
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .patch(`/categories/${category.id}`)
        .send({
          name: 'Updated Electronics',
        })
        .expect(401);
    });

    it('should return 404 if category not found', () => {
      return request(app.getHttpServer())
        .patch('/categories/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Electronics',
        })
        .expect(404);
    });
  });

  describe('DELETE /categories/:id', () => {
    let category: Category;

    beforeEach(async () => {
      // Create a category for testing
      category = await categoryRepository.save({
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices',
        isActive: true,
      });
    });

    it('should delete a category', () => {
      return request(app.getHttpServer())
        .delete(`/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then(async () => {
          // Verify the category was deleted
          const found = await categoryRepository.findOne({
            where: { id: category.id },
          });
          expect(found).toBeNull();
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .delete(`/categories/${category.id}`)
        .expect(401);
    });

    it('should return 404 if category not found', () => {
      return request(app.getHttpServer())
        .delete('/categories/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
