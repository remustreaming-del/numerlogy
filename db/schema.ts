import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  accessHash: text("access_hash").notNull(),
  callbackHash: text("callback_hash").notNull(),
  name: text("name").notNull(),
  birthday: text("birthday").notNull(),
  language: text("language").notNull(),
  amount: integer("amount").notNull(),
  year: integer("year").notNull(),
  status: text("status").notNull().default("creating"),
  invoiceId: text("invoice_id"),
  invoiceJson: text("invoice_json"),
  createdAt: integer("created_at").notNull(),
  paidAt: integer("paid_at"),
});

export const serviceTokens = sqliteTable("service_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
