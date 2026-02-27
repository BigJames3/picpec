-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TONTINE_PAYMENT_DUE', 'TONTINE_PAYMENT_RECEIVED', 'TONTINE_TURN_WON', 'TONTINE_CYCLE_COMPLETE', 'WALLET_CREDIT', 'WALLET_DEBIT', 'MARKETPLACE_PURCHASE', 'MARKETPLACE_SALE', 'SYSTEM');

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "tontine_members" ADD COLUMN     "paid_cycles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "turn_order" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "tontines" ADD COLUMN     "alert_sent_at" TIMESTAMP(3),
ADD COLUMN     "current_cycle" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "current_turn" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "next_payment_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "commission" DECIMAL(10,2),
ADD COLUMN     "reference" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
