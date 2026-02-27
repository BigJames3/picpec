-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "thumbnail_url" TEXT,
ALTER COLUMN "video_url" DROP NOT NULL;
