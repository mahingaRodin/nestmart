import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { AuthModule } from "./modules/auth/auth.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ProductsModule } from "./modules/products/products.modules";
import { SeedModule } from "./seed/seed.module";
import { CartModule } from "./modules/carts/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { UsersModule } from "./modules/users/users.module";
import { AddressModule } from "./modules/addresses/address.module";
import { ReviewModule } from "./modules/reviews/reviews.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: configService.get('database.entities'),
        synchronize: configService.get('database.synchronize'),
      }),
    }),
    AuthModule,
    CategoriesModule,
    ProductsModule,
    SeedModule,
    CartModule,
    OrdersModule,
    PaymentModule,
    UsersModule,
    AddressModule,
    ReviewModule
  ],
})
export class AppModule {}
