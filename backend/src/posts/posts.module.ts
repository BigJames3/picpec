import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService, CloudinaryService],
  exports: [CloudinaryService],
})
export class PostsModule {}
