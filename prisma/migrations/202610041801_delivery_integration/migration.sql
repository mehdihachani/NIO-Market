CREATE TABLE "DeliveryIntegration" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "baseUrl" TEXT,
  "apiKeyEncrypted" TEXT,
  "apiSecretEncrypted" TEXT,
  "extraConfigEncrypted" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryIntegration_storeId_key" ON "DeliveryIntegration"("storeId");
ALTER TABLE "DeliveryIntegration" ADD CONSTRAINT "DeliveryIntegration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
