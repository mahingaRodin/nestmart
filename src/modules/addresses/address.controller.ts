// src/modules/address/address.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  createAddress(@Req() req, @Body() dto: CreateAddressDto) {
    return this.addressService.addAddress(req.user.id, dto);
  }

  @Get()
  getAddresses(@Req() req) {
    return this.addressService.getAddresses(req.user.id);
  }

  @Get(':id')
  getAddressById(@Req() req, @Param('id') id: string) {
    return this.addressService.getAddressById(req.user.id, id);
  }

  @Patch(':id')
  updateAddress(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(req.user.id, id, dto);
  }

  @Delete(':id')
  deleteAddress(@Req() req, @Param('id') id: string) {
    return this.addressService.deleteAddress(req.user.id, id);
  }
}
