import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../database/entities/product.entity';
import { Category } from '../../../database/entities/category.entity';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../../database/entities/user.entity';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let productRepository: Repository<Product>;
  let categoryRepository: Repository<Category>;
  let jwtService: JwtService;
  let adminToken: string;
  let category: Category;

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

    productRepository = moduleFixture.get(getRepositoryToken(Product));
    categoryRepository = moduleFixture.get(getRepositoryToken(Category));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create an admin token for authorized endpoints
    adminToken = jwtService.sign({
      sub: '06753d4f-254e-4b61-a7fc-12aa9969601f',
      email: 'mahingarodin@gmail.com',
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the products table before each test
    await productRepository.clear();
    await categoryRepository.clear();

    // Create a test category
    category = await categoryRepository.save({
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices',
      isActive: true,
    });
  });

  describe('POST /products', () => {
    it('should create a new product', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Smartphone',
          description: 'Latest smartphone model',
          price: 799.99,
          stock: 50,
          categoryIds: [category.id],
        })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.name).toBe('Smartphone');
          expect(response.body.slug).toBe('smartphone');
          expect(response.body.description).toBe('Latest smartphone model');
          expect(response.body.price).toBe('799.99');
          expect(response.body.stock).toBe(50);
          expect(response.body.isActive).toBe(true);
          expect(response.body.categories).toBeInstanceOf(Array);
          expect(response.body.categories.length).toBe(1);
          expect(response.body.categories[0].id).toBe(category.id);
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Smartphone',
          price: 799.99,
          categoryIds: [category.id],
        })
        .expect(401);
    });

    it('should return 400 if required fields are missing', () => {
      return request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Missing name and price',
          categoryIds: [category.id],
        })
        .expect(400);
    });
  });

  describe('GET /products', () => {
    beforeEach(async () => {
      // Create sample products for testing
      await productRepository.save([
        {
          name: 'Smartphone',
          slug: 'smartphone',
          description: 'Latest smartphone model',
          price: 799.99,
          stock: 50,
          isActive: true,
          categories: [category],
        },
        {
          name: 'Laptop',
          slug: 'laptop',
          description: 'Powerful laptop',
          price: 1299.99,
          stock: 30,
          isActive: true,
          isFeatured: true,
          categories: [category],
        },
      ]);
    });

    it('should return all products with pagination', () => {
      return request(app.getHttpServer())
        .get('/products')
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('items');
          expect(response.body).toHaveProperty('total');
          expect(response.body).toHaveProperty('page');
          expect(response.body).toHaveProperty('limit');
          expect(response.body.items).toBeInstanceOf(Array);
          expect(response.body.items.length).toBe(2);
          expect(response.body.total).toBe(2);
          expect(response.body.items[0]).toHaveProperty('id');
          expect(response.body.items[0]).toHaveProperty('name');
          expect(
            response.body.items.some((prod) => prod.name === 'Smartphone'),
          ).toBe(true);
          expect(
            response.body.items.some((prod) => prod.name === 'Laptop'),
          ).toBe(true);
        });
    });

    it('should filter products by search term', () => {
      return request(app.getHttpServer())
        .get('/products?search=laptop')
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(1);
          expect(response.body.items[0].name).toBe('Laptop');
        });
    });

    it('should filter products by category', () => {
      return request(app.getHttpServer())
        .get(`/products?categoryId=${category.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(2);
        });
    });

    it('should filter products by price range', () => {
      return request(app.getHttpServer())
        .get('/products?minPrice=1000&maxPrice=1500')
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(1);
          expect(response.body.items[0].name).toBe('Laptop');
        });
    });

    it('should filter featured products', () => {
      return request(app.getHttpServer())
        .get('/products?isFeatured=true')
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(1);
          expect(response.body.items[0].name).toBe('Laptop');
        });
    });

    it('should apply pagination', () => {
      return request(app.getHttpServer())
        .get('/products?page=1&limit=1')
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(1);
          expect(response.body.total).toBe(2);
          expect(response.body.page).toBe(1);
          expect(response.body.limit).toBe(1);
        });
    });

    it('should sort products', () => {
      return request(app.getHttpServer())
        .get('/products?sortBy=price&sortOrder=ASC')
        .expect(200)
        .then((response) => {
          expect(response.body.items.length).toBe(2);
          expect(response.body.items[0].name).toBe('Smartphone');
          expect(response.body.items[1].name).toBe('Laptop');
        });
    });
  });

  describe('GET /products/featured', () => {
    beforeEach(async () => {
      // Create sample products for testing
      await productRepository.save([
        {
          name: 'Smartphone',
          slug: 'smartphone',
          description: 'Latest smartphone model',
          price: 799.99,
          stock: 50,
          isActive: true,
          categories: [category],
        },
        {
          name: 'Laptop',
          slug: 'laptop',
          description: 'Powerful laptop',
          price: 1299.99,
          stock: 30,
          isActive: true,
          isFeatured: true,
          categories: [category],
        },
        {
          name: 'Tablet',
          slug: 'tablet',
          description: 'Portable tablet',
          price: 499.99,
          stock: 40,
          isActive: true,
          isFeatured: true,
          categories: [category],
        },
      ]);
    });

    it('should return featured products', () => {
      return request(app.getHttpServer())
        .get('/products/featured')
        .expect(200)
        .then((response) => {
          expect(response.body).toBeInstanceOf(Array);
          expect(response.body.length).toBe(2);
          expect(response.body.every((prod) => prod.isFeatured)).toBe(true);
          expect(response.body.some((prod) => prod.name === 'Laptop')).toBe(
            true,
          );
          expect(response.body.some((prod) => prod.name === 'Tablet')).toBe(
            true,
          );
          expect(response.body.some((prod) => prod.name === 'Smartphone')).toBe(
            false,
          );
        });
    });

    it('should limit featured products', () => {
      return request(app.getHttpServer())
        .get('/products/featured?limit=1')
        .expect(200)
        .then((response) => {
          expect(response.body).toBeInstanceOf(Array);
          expect(response.body.length).toBe(1);
          expect(response.body[0].isFeatured).toBe(true);
        });
    });
  });

  describe('GET /products/category/:categoryId', () => {
    let secondCategory: Category;

    beforeEach(async () => {
      // Create another category
      secondCategory = await categoryRepository.save({
        name: 'Clothing',
        slug: 'clothing',
        description: 'Apparel',
        isActive: true,
      });

      // Create sample products for testing
      await productRepository.save([
        {
          name: 'Smartphone',
          slug: 'smartphone',
          description: 'Latest smartphone model',
          price: 799.99,
          stock: 50,
          isActive: true,
          categories: [category],
        },
        {
          name: 'Laptop',
          slug: 'laptop',
          description: 'Powerful laptop',
          price: 1299.99,
          stock: 30,
          isActive: true,
          categories: [category],
        },
        {
          name: 'T-Shirt',
          slug: 't-shirt',
          description: 'Cotton t-shirt',
          price: 19.99,
          stock: 100,
          isActive: true,
          categories: [secondCategory],
        },
      ]);
    });

    it('should return products by category', () => {
      return request(app.getHttpServer())
        .get(`/products/category/${category.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeInstanceOf(Array);
          expect(response.body.length).toBe(2);
          expect(response.body.some((prod) => prod.name === 'Smartphone')).toBe(
            true,
          );
          expect(response.body.some((prod) => prod.name === 'Laptop')).toBe(
            true,
          );
          expect(response.body.some((prod) => prod.name === 'T-Shirt')).toBe(
            false,
          );
        });
    });

    it('should limit products by category', () => {
      return request(app.getHttpServer())
        .get(`/products/category/${category.id}?limit=1`)
        .expect(200)
        .then((response) => {
          expect(response.body).toBeInstanceOf(Array);
          expect(response.body.length).toBe(1);
          expect(
            response.body[0].categories.some((cat) => cat.id === category.id),
          ).toBe(true);
        });
    });

    it('should return 404 if category not found', () => {
      return request(app.getHttpServer())
        .get('/products/category/nonexistent-id')
        .expect(404);
    });
  });

  describe('GET /products/:id', () => {
    let product: Product;

    beforeEach(async () => {
      // Create a product for testing
      product = await productRepository.save({
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'Latest smartphone model',
        price: 799.99,
        stock: 50,
        isActive: true,
        categories: [category],
      });
    });

    it('should return a product by id', () => {
      return request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', product.id);
          expect(response.body).toHaveProperty('name', 'Smartphone');
          expect(response.body).toHaveProperty('slug', 'smartphone');
          expect(response.body).toHaveProperty('categories');
          expect(response.body.categories).toBeInstanceOf(Array);
          expect(response.body.categories.length).toBe(1);
          expect(response.body.categories[0].id).toBe(category.id);
        });
    });

    it('should return 404 if product not found', () => {
      return request(app.getHttpServer())
        .get('/products/nonexistent-id')
        .expect(404);
    });
  });

  describe('GET /products/slug/:slug', () => {
    let product: Product;

    beforeEach(async () => {
      // Create a product for testing
      product = await productRepository.save({
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'Latest smartphone model',
        price: 799.99,
        stock: 50,
        isActive: true,
        categories: [category],
      });
    });

    it('should return a product by slug', () => {
      return request(app.getHttpServer())
        .get('/products/slug/smartphone')
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', product.id);
          expect(response.body).toHaveProperty('name', 'Smartphone');
          expect(response.body).toHaveProperty('slug', 'smartphone');
        });
    });

    it('should return 404 if product not found', () => {
      return request(app.getHttpServer())
        .get('/products/slug/nonexistent-slug')
        .expect(404);
    });
  });

  describe('PATCH /products/:id', () => {
    let product: Product;

    beforeEach(async () => {
      // Create a product for testing
      product = await productRepository.save({
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'Latest smartphone model',
        price: 799.99,
        stock: 50,
        isActive: true,
        categories: [category],
      });
    });

    it('should update a product', () => {
      return request(app.getHttpServer())
        .patch(`/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Smartphone',
          description: 'Updated description',
          price: 699.99,
        })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('id', product.id);
          expect(response.body).toHaveProperty('name', 'Updated Smartphone');
          expect(response.body).toHaveProperty('slug', 'updated-smartphone');
          expect(response.body).toHaveProperty(
            'description',
            'Updated description',
          );
          expect(response.body).toHaveProperty('price', '699.99');
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .patch(`/products/${product.id}`)
        .send({
          name: 'Updated Smartphone',
        })
        .expect(401);
    });

    it('should return 404 if product not found', () => {
      return request(app.getHttpServer())
        .patch('/products/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Product',
        })
        .expect(404);
    });
  });

  describe('DELETE /products/:id', () => {
    let product: Product;

    beforeEach(async () => {
      // Create a product for testing
      product = await productRepository.save({
        name: 'Smartphone',
        slug: 'smartphone',
        description: 'Latest smartphone model',
        price: 799.99,
        stock: 50,
        isActive: true,
        categories: [category],
      });
    });

    it('should delete a product', () => {
      return request(app.getHttpServer())
        .delete(`/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then(async () => {
          // Verify the product was deleted
          const found = await productRepository.findOne({
            where: { id: product.id },
          });
          expect(found).toBeNull();
        });
    });

    it('should return 401 if not authenticated', () => {
      return request(app.getHttpServer())
        .delete(`/products/${product.id}`)
        .expect(401);
    });

    it('should return 404 if product not found', () => {
      return request(app.getHttpServer())
        .delete('/products/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
