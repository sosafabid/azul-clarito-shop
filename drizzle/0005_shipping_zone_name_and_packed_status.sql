ALTER TYPE "public"."order_status" ADD VALUE 'PACKED' BEFORE 'SHIPPED';--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "zone_name" text;