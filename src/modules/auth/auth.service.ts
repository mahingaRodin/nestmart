import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { access } from "fs";
import { LoginResponseDto } from "./dto/login-response.dto";


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepsository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { email } = registerDto;
    const userExists = await this.userRepsository.findOne({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('User with this email already exists!');
    }

    const user = this.userRepsository.create(registerDto);
    await this.userRepsository.save(user);

    // //remove sensitive info
    // delete user.password;

    return user;
  }

  async validateUser(email: string, password: string) {
    const user = await this.userRepsository.findOne({ where: { email } });

    if (user && (await user.validatePassword(password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepsository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // // Remove sensitive information
    // delete user.password;

    return user;
  }
}
