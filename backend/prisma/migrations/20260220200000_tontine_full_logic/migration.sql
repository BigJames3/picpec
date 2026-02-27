-- CreateEnum
CREATE TYPE "FrequenceType" AS ENUM ('JOURNALIER', 'HEBDOMADAIRE', 'MENSUEL', 'TRIMESTRIEL');
CREATE TYPE "MemberRole" AS ENUM ('CREATOR', 'MEMBER');
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'REMOVED');
CREATE TYPE "CotisationStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'MISSING');
CREATE TYPE "CycleStatus" AS ENUM ('OPEN', 'WAITING', 'DISBURSED', 'CANCELLED');

-- Add new columns to tontines (nullable first for data migration)
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "titre" TEXT;
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "montant" DOUBLE PRECISION;
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "nombre_membres" INTEGER;
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "frequence" "FrequenceType";
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "taux_penalite" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "date_debut" TIMESTAMP(3);
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "invitation_token" TEXT;
ALTER TABLE "tontines" ADD COLUMN IF NOT EXISTS "invitation_active" BOOLEAN DEFAULT true;

-- Migrate existing tontine data
UPDATE "tontines" SET
  "titre" = COALESCE("title", 'Tontine'),
  "montant" = COALESCE(("contribution_amount")::double precision, 0),
  "nombre_membres" = COALESCE("members_limit", 2),
  "frequence" = CASE
    WHEN "frequency" = 'DAILY' THEN 'JOURNALIER'::"FrequenceType"
    WHEN "frequency" = 'WEEKLY' THEN 'HEBDOMADAIRE'::"FrequenceType"
    WHEN "frequency" = 'BIWEEKLY' THEN 'MENSUEL'::"FrequenceType"
    WHEN "frequency" = 'MONTHLY' THEN 'MENSUEL'::"FrequenceType"
    ELSE 'MENSUEL'::"FrequenceType"
  END,
  "date_debut" = COALESCE("next_payment_date", "created_at", CURRENT_TIMESTAMP),
  "invitation_token" = gen_random_uuid()::text,
  "invitation_active" = true
WHERE "titre" IS NULL OR "montant" IS NULL;

-- Ensure description is not null
UPDATE "tontines" SET "description" = '' WHERE "description" IS NULL;

-- Make new columns NOT NULL
ALTER TABLE "tontines" ALTER COLUMN "titre" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "montant" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "nombre_membres" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "frequence" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "date_debut" SET NOT NULL;
ALTER TABLE "tontines" ALTER COLUMN "invitation_token" SET NOT NULL;

-- Drop old columns from tontines
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "title";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "contribution_amount";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "members_limit";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "frequency";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "current_turn";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "next_payment_date";
ALTER TABLE "tontines" DROP COLUMN IF EXISTS "alert_sent_at";

-- Add unique constraint on invitation_token
CREATE UNIQUE INDEX IF NOT EXISTS "tontines_invitation_token_key" ON "tontines"("invitation_token");
CREATE INDEX IF NOT EXISTS "tontines_invitation_token_idx" ON "tontines"("invitation_token");

-- Add new columns to tontine_members
ALTER TABLE "tontine_members" ADD COLUMN IF NOT EXISTS "role" "MemberRole" DEFAULT 'MEMBER';
ALTER TABLE "tontine_members" ADD COLUMN IF NOT EXISTS "status" "MemberStatus" DEFAULT 'ACTIVE';
ALTER TABLE "tontine_members" ADD COLUMN IF NOT EXISTS "tour_order" INTEGER;
ALTER TABLE "tontine_members" ADD COLUMN IF NOT EXISTS "joined_at" TIMESTAMP(3);

-- Migrate tontine_members: set role CREATOR for creator, copy turn_order to tour_order
UPDATE "tontine_members" tm SET
  "role" = CASE WHEN t."creator_id" = tm."user_id" THEN 'CREATOR'::"MemberRole" ELSE 'MEMBER'::"MemberRole" END,
  "status" = 'ACTIVE'::"MemberStatus",
  "tour_order" = tm."turn_order",
  "joined_at" = tm."created_at"
FROM "tontines" t
WHERE tm."tontine_id" = t."id";

-- Drop old columns from tontine_members
ALTER TABLE "tontine_members" DROP COLUMN IF EXISTS "turn_order";
ALTER TABLE "tontine_members" DROP COLUMN IF EXISTS "is_paid";
ALTER TABLE "tontine_members" DROP COLUMN IF EXISTS "paid_at";
ALTER TABLE "tontine_members" DROP COLUMN IF EXISTS "paid_cycles";

-- Create tontine_cycles table
CREATE TABLE "tontine_cycles" (
    "id" TEXT NOT NULL,
    "tontine_id" TEXT NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "date_paiement" TIMESTAMP(3),
    "montant_total" DOUBLE PRECISION NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tontine_cycles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tontine_cycles_tontine_id_cycle_number_key" ON "tontine_cycles"("tontine_id", "cycle_number");
CREATE INDEX "tontine_cycles_tontine_id_idx" ON "tontine_cycles"("tontine_id");
CREATE INDEX "tontine_cycles_status_idx" ON "tontine_cycles"("status");

ALTER TABLE "tontine_cycles" ADD CONSTRAINT "tontine_cycles_tontine_id_fkey" FOREIGN KEY ("tontine_id") REFERENCES "tontines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tontine_cycles" ADD CONSTRAINT "tontine_cycles_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "tontine_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create cotisations table
CREATE TABLE "cotisations" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "penalite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_paye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "CotisationStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "provider" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotisations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cotisations_cycle_id_member_id_key" ON "cotisations"("cycle_id", "member_id");
CREATE INDEX "cotisations_cycle_id_idx" ON "cotisations"("cycle_id");
CREATE INDEX "cotisations_member_id_idx" ON "cotisations"("member_id");

ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "tontine_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "tontine_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add cotisation_id to pending_payments
ALTER TABLE "pending_payments" ADD COLUMN IF NOT EXISTS "cotisation_id" TEXT;

-- Add unique constraint on tontine_members (tontine_id, tour_order) - only for non-null tour_order
CREATE UNIQUE INDEX IF NOT EXISTS "tontine_members_tontine_id_tour_order_key" ON "tontine_members"("tontine_id", "tour_order") WHERE "tour_order" IS NOT NULL;
