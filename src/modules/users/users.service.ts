import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    async getProfile(userId: string): Promise<User> {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User Not found');
        return user;
    }

    async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
        const user = await this.getProfile(userId);
        Object.assign(user, dto);
        return this.userRepo.save(user);
    }
}