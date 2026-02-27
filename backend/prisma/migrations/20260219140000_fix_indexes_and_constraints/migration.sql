-- AlterTable
ALTER TABLE "posts" ADD COLUMN "comments_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "category_id" TEXT;

-- CreateIndex
CREATE INDEX "tontine_members_user_id_idx" ON "tontine_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");
