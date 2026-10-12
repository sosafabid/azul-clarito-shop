CREATE TYPE "public"."product_type" AS ENUM('PHYSICAL', 'DIGITAL');--> statement-breakpoint
CREATE TABLE "product_collections" (
	"product_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_collections_product_id_collection_id_pk" PRIMARY KEY("product_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text DEFAULT 'application/pdf' NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_assets_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "digital_assets_size_positive" CHECK ("digital_assets"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "digital_download_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_downloads" integer NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_downloaded_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digital_download_links_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "digital_links_counts" CHECK ("digital_download_links"."max_downloads" > 0 AND "digital_download_links"."download_count" >= 0 AND "digital_download_links"."download_count" <= "digital_download_links"."max_downloads")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" "product_type" DEFAULT 'PHYSICAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "fulfillment_type" "product_type" DEFAULT 'PHYSICAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "requires_shipping" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_download_links" ADD CONSTRAINT "digital_download_links_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_download_links" ADD CONSTRAINT "digital_download_links_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_collections_collection_idx" ON "product_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "digital_assets_product_idx" ON "digital_assets" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "digital_assets_one_active_per_product" ON "digital_assets" USING btree ("product_id") WHERE "digital_assets"."is_active";--> statement-breakpoint
CREATE INDEX "digital_links_item_idx" ON "digital_download_links" USING btree ("order_item_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "digital_links_order_idx" ON "digital_download_links" USING btree ("order_id");--> statement-breakpoint
-- Datos: la colección única que ya tenía cada producto pasa a la tabla de relación (idempotente). `products.collection_id` NO se borra.
INSERT INTO "product_collections" ("product_id", "collection_id") SELECT "id", "collection_id" FROM "products" WHERE "collection_id" IS NOT NULL ON CONFLICT DO NOTHING;
