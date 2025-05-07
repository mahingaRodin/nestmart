import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    
    @Get('profile')
    getProfile(@Req() req) {
        return this.usersService.getProfile(req.user.id);
    }
    
    @Patch('profile')
    updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
        return this.usersService.updateProfile(req.user.id, dto);
    }
}