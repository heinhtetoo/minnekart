ALTER TABLE "users" ADD COLUMN "paddle_subscription_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_renews_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_paddle_subscription_id_unique" UNIQUE("paddle_subscription_id");