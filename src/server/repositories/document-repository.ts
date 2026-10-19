import type { NeonQueryFunctionInTransaction } from "@neondatabase/serverless";
import { db, toVectorLiteral } from "../db/db-client";

export type DocumentOrigin = "sample" | "upload";

export interface DocumentRow {
  id: string;
  slug: string;
  title: string;
  origin: DocumentOrigin;
  source_filename: string | null;
  char_count: number;
  passage_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentPassage {
  section_number: number;
  heading: string;
  content: string;
}

export interface NewPassage extends DocumentPassage {
  embedding: number[];
}

export interface DocumentContent {
  title: string;
  origin: DocumentOrigin;
  source_filename: string | null;
  char_count: number;
  passages: NewPassage[];
}

const ACTIVE_COLUMNS = `
  d.id, d.slug, d.title, d.origin, d.source_filename, d.char_count, d.created_at, d.updated_at,
  (select count(*)::int from passages p where p.document_id = d.id) as passage_count
`;

function toDocument(row: Record<string, unknown>): DocumentRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    origin: row.origin === "upload" ? "upload" : "sample",
    source_filename: row.source_filename ? String(row.source_filename) : null,
    char_count: Number(row.char_count),
    passage_count: Number(row.passage_count),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export class DocumentRepository {
  async list(page: number, pageSize: number): Promise<{ rows: DocumentRow[]; total: number }> {
    const sql = db();
    const [rows, totals] = await Promise.all([
      sql.query(
        `select ${ACTIVE_COLUMNS} from documents d where d.deleted_at is null order by d.title limit $1 offset $2`,
        [pageSize, (page - 1) * pageSize],
      ),
      sql.query(`select count(*)::int as total from documents where deleted_at is null`),
    ]);
    return { rows: rows.map(toDocument), total: Number(totals[0]?.total ?? 0) };
  }

  // For /demo: titles only, in a stable order.
  async titles(): Promise<string[]> {
    const rows = await db()`select title from documents where deleted_at is null order by created_at, title`;
    return rows.map((row) => String(row.title));
  }

  async countActive(): Promise<number> {
    const [row] = await db()`select count(*)::int as total from documents where deleted_at is null`;
    return Number(row.total);
  }

  async findById(id: string): Promise<DocumentRow | null> {
    const [row] = await db().query(`select ${ACTIVE_COLUMNS} from documents d where d.id = $1 and d.deleted_at is null`, [id]);
    return row ? toDocument(row) : null;
  }

  async findBySlug(slug: string): Promise<DocumentRow | null> {
    const [row] = await db().query(`select ${ACTIVE_COLUMNS} from documents d where d.slug = $1 and d.deleted_at is null`, [slug]);
    return row ? toDocument(row) : null;
  }

  async slugsLike(base: string): Promise<string[]> {
    const rows = await db()`
      select slug from documents where deleted_at is null and (slug = ${base} or slug like ${`${base}-%`})
    `;
    return rows.map((row) => String(row.slug));
  }

  async passages(id: string): Promise<DocumentPassage[]> {
    const rows = await db()`
      select section_number, heading, content from passages where document_id = ${id} order by section_number, created_at
    `;
    return rows.map((row) => ({
      section_number: Number(row.section_number),
      heading: String(row.heading),
      content: String(row.content),
    }));
  }

  // The document row and all its passages land together, or not at all.
  async create(slug: string, content: DocumentContent): Promise<string> {
    const sql = db();
    const results = await sql.transaction((txn) => [
      txn`
        insert into documents (slug, title, origin, source_filename, char_count)
        values (${slug}, ${content.title}, ${content.origin}, ${content.source_filename}, ${content.char_count})
        returning id
      `,
      ...this.insertPassages(txn, slug, content.passages),
    ]);
    return String((results[0] as Record<string, unknown>[])[0].id);
  }

  // Old passages are swapped for the new ones in one transaction, so answers never see half a document.
  async replace(id: string, content: DocumentContent): Promise<void> {
    const sql = db();
    const [row] = await sql`select slug from documents where id = ${id} and deleted_at is null`;
    if (!row) return;
    const slug = String(row.slug);
    await sql.transaction((txn) => [
      txn`
        update documents
        set title = ${content.title}, source_filename = ${content.source_filename}, char_count = ${content.char_count},
            origin = ${content.origin}, updated_at = now()
        where id = ${id}
      `,
      txn`delete from passages where document_id = ${id}`,
      ...this.insertPassages(txn, slug, content.passages),
    ]);
  }

  // Spec 005: the document row is kept (soft delete); its passages leave the search index.
  async softDelete(id: string): Promise<boolean> {
    const sql = db();
    const results = await sql.transaction((txn) => [
      txn`update documents set deleted_at = now() where id = ${id} and deleted_at is null returning id`,
      txn`delete from passages where document_id = ${id}`,
    ]);
    return (results[0] as unknown[]).length > 0;
  }

  private insertPassages(txn: NeonQueryFunctionInTransaction<false, false>, slug: string, passages: NewPassage[]) {
    return passages.map(
      (passage) => txn`
        insert into passages (document_id, section_number, heading, content, embedding)
        values (
          (select id from documents where slug = ${slug} and deleted_at is null),
          ${passage.section_number},
          ${passage.heading},
          ${passage.content},
          ${toVectorLiteral(passage.embedding)}::vector
        )
      `,
    );
  }
}

export const documentRepository = new DocumentRepository();
