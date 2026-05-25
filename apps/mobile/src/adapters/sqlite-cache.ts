/**
 * SQLite Cache Adapter
 * Wrapper around `expo-sqlite` for OFFLINE ticket data + QR string cache.
 *
 * BR-CHECKOUT-20: After first successful load, ticket data + QR string is cached
 * to SQLite so user can present QR even without network.
 *
 * Schema:
 *   tickets(id TEXT PK, payload TEXT, qr_string TEXT, updated_at INTEGER)
 *
 * TODO(coder): implement migration runner + TTL eviction policy.
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = '5bib-cache.db';
let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      qr_string TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_updated ON tickets(updated_at DESC);
  `);
  return _db;
}

export interface CachedTicket<TPayload = unknown> {
  id: string;
  payload: TPayload;
  qrString: string;
  updatedAt: number;
}

/** Cache a ticket payload + QR string. Upserts by id. */
export async function cacheTicket<T>(
  id: string,
  payload: T,
  qrString: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO tickets (id, payload, qr_string, updated_at) VALUES (?, ?, ?, ?)`,
    [id, JSON.stringify(payload), qrString, Date.now()]
  );
}

export async function getCachedTicket<T>(id: string): Promise<CachedTicket<T> | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    payload: string;
    qr_string: string;
    updated_at: number;
  }>(`SELECT id, payload, qr_string, updated_at FROM tickets WHERE id = ?`, [id]);
  if (!row) return null;
  return {
    id: row.id,
    payload: JSON.parse(row.payload) as T,
    qrString: row.qr_string,
    updatedAt: row.updated_at,
  };
}

export async function removeCachedTicket(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tickets WHERE id = ?`, [id]);
}

/** Clear all cached tickets (e.g. on logout — BR-AUTH-12). */
export async function clearTicketCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`DELETE FROM tickets`);
}
