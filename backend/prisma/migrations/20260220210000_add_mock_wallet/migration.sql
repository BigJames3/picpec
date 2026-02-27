-- CreateTable
CREATE TABLE "mock_wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mock_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_wallets_user_id_key" ON "mock_wallets"("user_id");

-- CreateIndex
CREATE INDEX "mock_transactions_wallet_id_idx" ON "mock_transactions"("wallet_id");

-- AddForeignKey
ALTER TABLE "mock_wallets" ADD CONSTRAINT "mock_wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_transactions" ADD CONSTRAINT "mock_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "mock_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
