-- CreateTable
CREATE TABLE "AuthNonce" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthNonce_wallet_key" ON "AuthNonce"("wallet");
