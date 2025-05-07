import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../../database/entities/address.entity';
import { User } from '../../database/entities/user.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from "./dto/update-address.dto";

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(Address) private addressRepo: Repository<Address>,
  ) {}

  async addAddress(user: User, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.addressRepo.update(
        { user: { id: user.id }, isDefault: true },
        { isDefault: false },
      );
    }
    const address = this.addressRepo.create({ ...dto, user });
    return this.addressRepo.save(address);
  }

  async updateAddress(
    user: User,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, user: { id: user.id } },
    });
    if (!address) throw new NotFoundException('Address not found');
    if (dto.isDefault) {
      await this.addressRepo.update(
        { user: { id: user.id }, isDefault: true },
        { isDefault: false },
      );
    }
    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async deleteAddress(user: User, addressId: string): Promise<void> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId },
    });
    if (!address) throw new NotFoundException('Address not found');
    await this.addressRepo.remove(address);
  }

  async getAddresses(user: User): Promise<Address[]> {
    return this.addressRepo.find({ where: { user: { id: user.id } } });
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, user: {id: userId} },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }
}