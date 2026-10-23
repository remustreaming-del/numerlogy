import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  accessHash: text("access_hash").notNull(),
  callbackHash: text("callback_hash").notNull(),
  product: text("product").notNull().default("etsgiin-kod"),
  // name/birthday are the customer's (child's); father fields and email are nullable for pre-existing orders.
  name: text("name").notNull(),
  birthday: text("birthday").notNull(),
  fatherName: text("father_name"),
  fatherBirthday: text("father_birthday"),
  birthTime: text("birth_time"),
  birthCity: text("birth_city"),
  birthTimezone: text("birth_timezone"),
  birthLatitude: real("birth_latitude"),
  birthLongitude: real("birth_longitude"),
  unknownTime: integer("unknown_time", { mode: "boolean" }),
  chartJson: text("chart_json"),
  email: text("email"),
  emailStatus: text("email_status"),
  emailedAt: integer("emailed_at"),
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
