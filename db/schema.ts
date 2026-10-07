import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
export const catalogs=sqliteTable('catalogs',{id:integer('id').primaryKey(),body:text('body').notNull(),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const fxCache=sqliteTable('fx_cache',{id:integer('id').primaryKey(),body:text('body').notNull(),fetchedAt:integer('fetched_at').notNull()});
export const adminSessions=sqliteTable('admin_sessions',{tokenHash:text('token_hash').primaryKey(),subject:text('subject').notNull(),credentialVersion:text('credential_version').notNull(),expiresAt:integer('expires_at').notNull()});
export const loginAttempts=sqliteTable('login_attempts',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()});
