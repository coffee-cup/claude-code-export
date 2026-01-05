import { sql } from "bun";

export const db = sql;

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      raw_content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function saveChat(id: string, rawContent: string) {
  await sql`
    INSERT INTO chats (id, raw_content)
    VALUES (${id}, ${rawContent})
  `;
}

export async function getChat(id: string) {
  const [chat] = await sql`
    SELECT id, raw_content, created_at
    FROM chats
    WHERE id = ${id}
  `;
  return chat as { id: string; raw_content: string; created_at: Date } | undefined;
}
