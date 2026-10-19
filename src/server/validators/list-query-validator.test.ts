// @vitest-environment node
// Spec 003, admin list queries.
import { describe, expect, it } from "vitest";
import { buildPaginationMeta, parseListQuery } from "./list-query-validator";

const parse = (query: string) => parseListQuery(`http://localhost/api/admin/gaps${query}`);

describe("parseListQuery", () => {
  it("defaults to page 1 of 20 over 30 days with no search", () => {
    expect(parse("")).toEqual({ page: 1, page_size: 20, search: null, days: 30 });
  });

  it("caps page_size at 100", () => {
    expect(parse("?page_size=500").page_size).toBe(100);
  });

  it("trims search and treats blank as none", () => {
    expect(parse("?search=%20price%20").search).toBe("price");
    expect(parse("?search=%20%20").search).toBeNull();
  });

  it("rejects a page below 1", () => {
    expect(() => parse("?page=0")).toThrow();
  });
});

describe("buildPaginationMeta", () => {
  it("rounds pages up and never reports zero pages", () => {
    expect(buildPaginationMeta(1, 20, 41)).toEqual({ page: 1, page_size: 20, total: 41, total_pages: 3 });
    expect(buildPaginationMeta(1, 20, 0).total_pages).toBe(1);
  });
});
