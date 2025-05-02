import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('admin')
  @ApiOperation({ summary: 'Create admin' })
  @ApiResponse({
    status: 200,
    description: 'Admin user created or already exists',
  })
  seedAdmin() {
    return this.seedService.seedAdmin();
  }
}
