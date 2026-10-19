import { db, toVectorLiteral } from "../db/db-client";

export interface ScoredPassage {
  id: string;
  document_slug: string;
  document_title: string;
  section_number: number;
  heading: string;
  content: string;
  similarity: number;
}

export class PassageRepository {
  async findClosest(embedding: number[], limit: number): Promise<ScoredPassage[]> {
    const sql = db();
    const vector = toVectorLiteral(embedding);
    const rows = await sql`
      select
        p.id,
        d.slug as document_slug,
        d.title as document_title,
        p.section_number,
        p.heading,
        p.content,
        1 - (p.embedding <=> ${vector}::vector) as similarity
      from passages p
      join documents d on d.id = p.document_id
      where d.deleted_at is null
      order by p.embedding <=> ${vector}::vector
      limit ${limit}
    `;
    return rows.map((row) => ({
      id: String(row.id),
      document_slug: String(row.document_slug),
      document_title: String(row.document_title),
      section_number: Number(row.section_number),
      heading: String(row.heading),
      content: String(row.content),
      similarity: Number(row.similarity),
    }));
  }

  async count(): Promise<number> {
    const [row] = await db()`
      select count(*)::int as total from passages p join documents d on d.id = p.document_id where d.deleted_at is null
    `;
    return Number(row.total);
  }
}

export const passageRepository = new PassageRepository();
