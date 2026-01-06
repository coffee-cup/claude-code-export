import { sql } from "bun";

const RETENTION_DAYS = 30;

const cutoff = new Date();
cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

const result = await sql`
  DELETE FROM chats
  WHERE created_at < ${cutoff}
  RETURNING id
`;

console.log(`[cleanup] deleted ${result.length} chats older than ${RETENTION_DAYS} days`);
