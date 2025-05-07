import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../database/entities/review.entity';
import { Product } from '../../database/entities/product.entity';
import { User } from '../../database/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewRepo: Repository<Review>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  async addReview(user: User, dto: CreateReviewDto): Promise<Review> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    //prevent duplicate reviews for the same user on the same product
    const existing = await this.reviewRepo.findOne({
      where: { user: { id: user.id }, product: { id: product.id } },
    });
    if (existing)
      throw new BadRequestException('You have already reviewed this product');

    const review = this.reviewRepo.create({
      user,
      product,
      rating: dto.rating,
      comment: dto.comment,
    });
    return this.reviewRepo.save(review);
  }

  async getProductReviews(productId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { product: { id: productId } },
      order: { createdAt: 'DESC' },
    });
  }

    async getAverageRating(productId: string): Promise<number> {
        const reviews = await this.getProductReviews(productId);
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return sum / reviews.length;
  }
}