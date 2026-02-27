/*
  Warnings:

  - A unique constraint covering the columns `[tontine_id,tour_order]` on the table `tontine_members` will be added. If there are existing duplicate values, this will fail.
  - Made the column `role` on table `tontine_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `tontine_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `taux_penalite` on table `tontines` required. This step will fail if there are existing NULL values in that column.
  - Made the column `invitation_active` on table `tontines` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- DropIndex
DROP INDEX IF EXISTS "post_views_post_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "post_views_user_id_idx";

-- AlterTable
ALTER TABLE "product_purchases" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "seller_note" TEXT,
ADD COLUMN IF NOT EXISTS "shipped_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "shipping_address" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "tontine_members" ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'INVITED';

-- AlterTable
ALTER TABLE "tontines" ALTER COLUMN "current_cycle" SET DEFAULT 0,
ALTER COLUMN "taux_penalite" SET NOT NULL,
ALTER COLUMN "invitation_active" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "whatsapp" TEXT;

-- CreateTable (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '',
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "products_country_idx" ON "products"("country");

-- AddForeignKey (si elle n'existe pas déjà)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex contrainte unique tour_order (si elle n'existe pas déjà)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tontine_members_tontine_id_tour_order_key'
  ) THEN
    ALTER TABLE "tontine_members"
    ADD CONSTRAINT "tontine_members_tontine_id_tour_order_key"
    UNIQUE ("tontine_id", "tour_order");
  END IF;
END $$;