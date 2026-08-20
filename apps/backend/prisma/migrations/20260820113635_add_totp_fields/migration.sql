-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totp_secret" TEXT;
