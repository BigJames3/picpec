import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [NotificationsModule, PostsModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
