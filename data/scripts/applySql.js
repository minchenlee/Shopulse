import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILES = ['schema.sql', 'search_products.sql', 'conversation_statistics.sql'];

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('SUPABASE_DB_URL not set');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  for (const f of FILES) {
    const sql = readFileSync(join(__dirname, '..', 'sql', f), 'utf8');
    process.stdout.write(`applying ${f} ... `);
    await client.query(sql);
    console.log('ok');
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
