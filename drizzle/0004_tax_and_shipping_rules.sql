CREATE TYPE "public"."shipping_method_type" AS ENUM('DELIVERY', 'PICKUP');--> statement-breakpoint
CREATE TYPE "public"."tax_rounding" AS ENUM('HALF_UP', 'FLOOR', 'CEIL');--> statement-breakpoint
CREATE TYPE "public"."tax_rule_scope" AS ENUM('ALL', 'CATEGORY', 'PRODUCT');--> statement-breakpoint
CREATE TYPE "public"."tax_treatment" AS ENUM('TAXABLE', 'EXEMPT');--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"rate_bps" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"prices_include_tax" boolean NOT NULL,
	"rounding" "tax_rounding" DEFAULT 'HALF_UP' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rates_code_unique" UNIQUE("code"),
	CONSTRAINT "tax_rates_rate_range" CHECK ("tax_rates"."rate_bps" BETWEEN 0 AND 10000)
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tax_rate_id" uuid NOT NULL,
	"scope" "tax_rule_scope" NOT NULL,
	"category_id" uuid,
	"product_id" uuid,
	"treatment" "tax_treatment" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tax_rules_scope_target" CHECK (("tax_rules"."scope" = 'ALL' AND "tax_rules"."category_id" IS NULL AND "tax_rules"."product_id" IS NULL) OR ("tax_rules"."scope" = 'CATEGORY' AND "tax_rules"."category_id" IS NOT NULL AND "tax_rules"."product_id" IS NULL) OR ("tax_rules"."scope" = 'PRODUCT' AND "tax_rules"."product_id" IS NOT NULL AND "tax_rules"."category_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "shipping_rates" ALTER COLUMN "country_code" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "shipping_rates" ALTER COLUMN "country_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD COLUMN "type" "shipping_method_type" DEFAULT 'DELIVERY' NOT NULL;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "min_order_amount" bigint;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "max_order_amount" bigint;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD COLUMN "free_shipping_threshold" bigint;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pricing_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rates_one_active" ON "tax_rates" USING btree ("is_active") WHERE "tax_rates"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rules_all_unique" ON "tax_rules" USING btree ("tax_rate_id") WHERE "tax_rules"."scope" = 'ALL';--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rules_category_unique" ON "tax_rules" USING btree ("tax_rate_id","category_id") WHERE "tax_rules"."scope" = 'CATEGORY';--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rules_product_unique" ON "tax_rules" USING btree ("tax_rate_id","product_id") WHERE "tax_rules"."scope" = 'PRODUCT';--> statement-breakpoint
CREATE INDEX "tax_rules_rate_idx" ON "tax_rules" USING btree ("tax_rate_id");--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_amounts_valid" CHECK ("shipping_rates"."price" >= 0 AND ("shipping_rates"."min_order_amount" IS NULL OR "shipping_rates"."min_order_amount" >= 0) AND ("shipping_rates"."max_order_amount" IS NULL OR "shipping_rates"."max_order_amount" >= 0) AND ("shipping_rates"."min_order_amount" IS NULL OR "shipping_rates"."max_order_amount" IS NULL OR "shipping_rates"."min_order_amount" <= "shipping_rates"."max_order_amount") AND ("shipping_rates"."free_shipping_threshold" IS NULL OR "shipping_rates"."free_shipping_threshold" >= 0));