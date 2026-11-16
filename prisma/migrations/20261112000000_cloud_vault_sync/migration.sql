-- EXMARK ERP — Additive Cloud Vault Sync Migration (20261112000000_cloud_vault_sync)
-- Non-destructive DDL: Zero DROP / TRUNCATE statements.

CREATE TABLE IF NOT EXISTS "CloudVaultStore" (
    "storeKey" TEXT NOT NULL PRIMARY KEY,
    "sha256" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "sizeBytes" INTEGER NOT NULL,
    "appVersion" TEXT NOT NULL DEFAULT '1.0.1',
    "deviceName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
