// src/seed/seed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seedAdmin(): Promise<{ message: string }> {
    // Check if admin already exists
    const adminExists = await this.userRepository.findOne({
      where: { email: 'rodinmahinga@gmail.com' },
    });

    if (adminExists) {
      return { message: 'Admin user already exists' };
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const admin = this.userRepository.create({
      email: 'rodinmahinga@gmail.com',
      password: hashedPassword,
      firstName: 'Rodin',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    await this.userRepository.save(admin);

    return { message: 'Admin user created successfully' };
  }
}
