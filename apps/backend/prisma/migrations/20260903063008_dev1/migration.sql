-- AlterTable
ALTER TABLE "streams" ADD COLUMN     "is_chat_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_chat_followers_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_chat_premium_followers_only" BOOLEAN NOT NULL DEFAULT false;
