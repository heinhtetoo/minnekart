CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'paused', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" "user_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" "subscription_status";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paddle_customer_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_paddle_customer_id_unique" UNIQUE("paddle_customer_id");--> statement-breakpoint
UPDATE "users" SET "plan" = 'paid';