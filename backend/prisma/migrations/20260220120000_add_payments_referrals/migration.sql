-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'VALIDATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralRewardType" AS ENUM ('PENALTY_CREDIT', 'CASHBACK', 'NONE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ref_code" VARCHAR(12) UNIQUE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "penalty_credits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "referrals" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "referrer_id" TEXT NOT NULL,
    "referred_id" TEXT NOT NULL,
    "tontine_id" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "reward_type" "ReferralRewardType" NOT NULL DEFAULT 'PENALTY_CREDIT',
    "reward_value" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "pending_payments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "reference" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "provider" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "referrals_referrer_id_idx" ON "referrals"("referrer_id");
CREATE INDEX IF NOT EXISTS "referrals_referred_id_idx" ON "referrals"("referred_id");
CREATE INDEX IF NOT EXISTS "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "pending_payments_reference_key" ON "pending_payments"("reference");
CREATE INDEX IF NOT EXISTS "pending_payments_tontine_id_idx" ON "pending_payments"("tontine_id");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
