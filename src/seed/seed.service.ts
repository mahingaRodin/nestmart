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
      where: { email: 'mahingarodin@gmail.com' },
    });

    if (adminExists) {
      return { message: 'Admin user already exists' };
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 12);

    const admin = this.userRepository.create({
      email: 'mahingarodin@gmail.com',
      password: hashedPassword,
      firstName: 'Mahinga',
      lastName: 'Rodin',
      role: UserRole.ADMIN,
      isActive: true,
    });

    await this.userRepository.save(admin);

    return { message: 'Admin user created successfully' };
  }
}
