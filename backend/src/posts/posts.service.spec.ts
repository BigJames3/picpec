import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('PostsService', () => {
  let postsService: PostsService;

  const mockPrisma = {
    post: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    postLike: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPost = {
    id: 'post-1',
    userId: 'user-1',
    videoUrl: 'https://example.com/video.mp4',
    description: 'Test post',
    likesCount: 0,
    commentsCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    postsService = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  describe('like()', () => {
    it('devrait créer le like et incrémenter likesCount atomiquement', async () => {
      mockPrisma.postLike.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'like-1', postId: 'post-1', userId: 'user-1' },
        { ...mockPost, likesCount: 1 },
      ]);

      const result = await postsService.like('post-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.likesCount).toBe(1);
    });

    it('devrait lever ConflictException si déjà liké', async () => {
      mockPrisma.postLike.findUnique.mockResolvedValue({
        id: 'like-1',
        postId: 'post-1',
        userId: 'user-1',
      });

      await expect(
        postsService.like('post-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlike()', () => {
    it('devrait supprimer le like et décrémenter likesCount atomiquement', async () => {
      mockPrisma.postLike.findUnique.mockResolvedValue({
        id: 'like-1',
        postId: 'post-1',
        userId: 'user-1',
      });
      mockPrisma.$transaction.mockResolvedValue([
        {},
        { ...mockPost, likesCount: 0 },
      ]);

      const result = await postsService.unlike('post-1', 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.likesCount).toBe(0);
    });

    it('devrait lever NotFoundException si like inexistant', async () => {
      mockPrisma.postLike.findUnique.mockResolvedValue(null);

      await expect(
        postsService.unlike('post-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('comment()', () => {
    it('devrait créer le commentaire et incrémenter commentsCount', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.$transaction.mockResolvedValue([
        {
          id: 'comment-1',
          postId: 'post-1',
          userId: 'user-1',
          content: 'Super !',
          user: { id: 'user-1', fullname: 'User', avatarUrl: null },
        },
        {},
      ]);

      const result = await postsService.comment('post-1', 'user-1', {
        content: 'Super !',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('Super !');
    });

    it('devrait lever NotFoundException si post inexistant', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        postsService.comment('ghost-id', 'user-1', { content: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getComments()', () => {
    it('devrait retourner les commentaires paginés', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [
          {
            id: 'comment-1',
            content: 'Test',
            user: { id: 'user-1', fullname: 'User', avatarUrl: null },
          },
        ],
        1,
      ]);

      const result = await postsService.getComments('post-1', {
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('remove()', () => {
    it('devrait supprimer le post si auteur', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.post.delete.mockResolvedValue(mockPost);

      const result = await postsService.remove('post-1', 'user-1', 'USER');

      expect(result).toHaveProperty('message');
      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
    });

    it('devrait supprimer le post si ADMIN', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);
      mockPrisma.post.delete.mockResolvedValue(mockPost);

      const result = await postsService.remove('post-1', 'admin-id', 'ADMIN');

      expect(result).toHaveProperty('message');
    });

    it('devrait lever ForbiddenException si non auteur et non ADMIN', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      await expect(
        postsService.remove('post-1', 'intruder', 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si post inexistant', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(
        postsService.remove('ghost-id', 'user-1', 'USER'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
