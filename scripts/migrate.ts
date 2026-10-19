// Applies db/migrations/*.sql in name order, once each. Usage: npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/server/db/db-client";

const migrationsDir = path.join(process.cwd(), "db", "migrations");

// Neon's HTTP driver runs one statement per query, so files are split on semicolons
// at line ends. Keep migrations free of functions with semicolons in their bodies.
function statementsOf(fileText: string): string[] {
  return fileText
    .split(/;\s*$/m)
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

async function main() {
  const sql = db();
  await sql`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `;
  const applied = new Set(
    (await sql`select name from schema_migrations`).map((row) => String(row.name)),
  );
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = statementsOf(await readFile(path.join(migrationsDir, file), "utf8"));
    await sql.transaction((txn) => [
      ...statements.map((statement) => txn.query(statement)),
      txn`insert into schema_migrations (name) values (${file})`,
    ]);
    console.log(`applied ${file}`);
    count++;
  }
  console.log(count ? `${count} migration(s) applied` : "database is up to date");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
