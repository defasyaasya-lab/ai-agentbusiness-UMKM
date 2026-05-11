CREATE TABLE "connectivity_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"connection_status" text NOT NULL,
	"active_route" text NOT NULL,
	"primary_connection" jsonb NOT NULL,
	"backup_connection" jsonb NOT NULL,
	"speed_mbps" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"risk_state" text NOT NULL,
	"business_impact" jsonb NOT NULL,
	"chart_values" jsonb NOT NULL,
	"latest_switch_event" jsonb NOT NULL,
	"risk_insight" jsonb NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"diagnosis" text NOT NULL,
	"action_taken" text NOT NULL,
	"protected_revenue" integer NOT NULL,
	"started_at" text NOT NULL,
	"resolved_at" text
);
--> statement-breakpoint
CREATE TABLE "network_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"connection_status" text NOT NULL,
	"active_route" text NOT NULL,
	"speed_mbps" integer NOT NULL,
	"latency_ms" integer NOT NULL,
	"risk_state" text NOT NULL,
	"timestamp" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"owner_name" text NOT NULL,
	"telegram_chat_id" text NOT NULL,
	"estimated_daily_revenue" integer NOT NULL,
	"primary_wifi_name" text NOT NULL,
	"backup_wifi_name" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connectivity_states" ADD CONSTRAINT "connectivity_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "network_logs" ADD CONSTRAINT "network_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "network_logs_user_timestamp_idx" ON "network_logs" USING btree ("user_id","timestamp");--> statement-breakpoint
CREATE INDEX "network_logs_status_timestamp_idx" ON "network_logs" USING btree ("connection_status","timestamp");