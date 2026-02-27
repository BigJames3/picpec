-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "product_purchases_buyer_id_idx" ON "product_purchases"("buyer_id");

-- CreateIndex
CREATE INDEX "product_purchases_product_id_idx" ON "product_purchases"("product_id");

-- CreateIndex
CREATE INDEX "product_purchases_created_at_idx" ON "product_purchases"("created_at");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_seller_id_idx" ON "products"("seller_id");

-- CreateIndex
CREATE INDEX "products_created_at_idx" ON "products"("created_at");

-- CreateIndex
CREATE INDEX "tontine_members_tontine_id_idx" ON "tontine_members"("tontine_id");

-- CreateIndex
CREATE INDEX "tontines_status_idx" ON "tontines"("status");

-- CreateIndex
CREATE INDEX "tontines_next_payment_date_idx" ON "tontines"("next_payment_date");

-- CreateIndex
CREATE INDEX "tontines_creator_id_idx" ON "tontines"("creator_id");
