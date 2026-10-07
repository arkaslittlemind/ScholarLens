import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { COVERED_PROGRAMS, type CoveredProgram } from "@/lib/programs";

// The same files the agent's knowledge base is built from, read at build time.
// Every page that calls this is statically generated, so the deployment never
// needs the corpus at runtime. Parsing mirrors backend/app/ingestion/documents.py
// so both sides accept exactly the same files.
const CORPUS_DIR = join(process.cwd(), "..", "backend", "data", "programs");

const SUFFIXES = new Set([".md", ".txt"]);

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

export interface Program extends CoveredProgram {
  officialName: string;
  document: string;
  url: string;
  // YYYY-MM-DD, the day the summary was last checked against the official source.
  reviewed: string;
  blocks: Block[];
}

class CorpusError extends Error {
  constructor(file: string, reason: string) {
    super(`Program corpus ${file}: ${reason}`);
  }
}

function parseFrontMatter(text: string, file: string): { fields: Map<string, string>; body: string } {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") throw new CorpusError(file, "missing front matter");
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) throw new CorpusError(file, "front matter is not closed");

  const fields = new Map<string, string>();
  for (const line of lines.slice(1, end)) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator === -1) throw new CorpusError(file, "malformed front matter line");
    const value = line.slice(separator + 1).trim().replace(/^["']+|["']+$/g, "");
    fields.set(line.slice(0, separator).trim(), value);
  }
  return { fields, body: lines.slice(end + 1).join("\n").trim() };
}

// Markdown the pages would otherwise print literally. The corpus only needs the
// three block kinds below, so anything else stops the build instead of shipping.
const UNSUPPORTED_INLINE = /\*\*|__|`|\]\(/;
const UNSUPPORTED_LINE = /^(#(?!# )|##\s*#|\s+\S|[*+>]\s|\d+[.)]\s)/;

function parseBody(body: string, file: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    if (list.length) blocks.push({ kind: "list", items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();
    if (!line) {
      flush();
      continue;
    }
    if (UNSUPPORTED_INLINE.test(line) || UNSUPPORTED_LINE.test(line)) {
      throw new CorpusError(file, `unsupported markdown in line "${line}"`);
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function loadDocument(file: string) {
  // Strip a BOM from a Windows editor so it cannot hide the opening delimiter.
  const text = readFileSync(join(CORPUS_DIR, file), "utf8").replace(/^\uFEFF/, "");
  const { fields, body } = parseFrontMatter(text, file);

  for (const key of ["program", "document", "url", "reviewed"]) {
    if (!fields.get(key)) throw new CorpusError(file, `missing required key '${key}'`);
  }
  const url = fields.get("url") ?? "";
  if (!/^https?:\/\/\S+$/.test(url)) throw new CorpusError(file, "url must be an http(s) address");
  const reviewed = fields.get("reviewed") ?? "";
  if (!isRealDate(reviewed)) throw new CorpusError(file, "reviewed must be a YYYY-MM-DD date");
  if (!body) throw new CorpusError(file, "document body is empty");

  return {
    slug: file.slice(0, -extname(file).length).replaceAll("_", "-"),
    officialName: fields.get("program") ?? "",
    document: fields.get("document") ?? "",
    url,
    reviewed,
    blocks: parseBody(body, file),
  };
}

export function getPrograms(): Program[] {
  const entries = readdirSync(CORPUS_DIR, { withFileTypes: true });
  // The backend walks subfolders, but a nested file would need a nested URL. Keep
  // the corpus flat until a page shape for that exists.
  const nested = entries.find((entry) => entry.isDirectory());
  if (nested) throw new CorpusError(nested.name, "subfolders are not supported");

  const documents = entries
    .filter((entry) => entry.isFile() && SUFFIXES.has(extname(entry.name).toLowerCase()))
    .map((entry) => loadDocument(entry.name));

  const bySlug = new Map(documents.map((document) => [document.slug, document]));
  if (bySlug.size !== documents.length) throw new CorpusError(CORPUS_DIR, "two files share a slug");

  const listed = new Set(COVERED_PROGRAMS.map((program) => program.slug));
  if (listed.size !== COVERED_PROGRAMS.length) {
    throw new CorpusError("src/lib/programs.ts", "COVERED_PROGRAMS repeats a slug");
  }
  const unlisted = documents.find((document) => !listed.has(document.slug));
  if (unlisted) {
    throw new CorpusError(unlisted.slug, "has no COVERED_PROGRAMS entry in src/lib/programs.ts");
  }

  return COVERED_PROGRAMS.map((program) => {
    const document = bySlug.get(program.slug);
    if (!document) throw new CorpusError(program.slug, "COVERED_PROGRAMS lists it but no corpus file matches");
    return { ...document, ...program };
  });
}

export function getProgram(slug: string): Program | undefined {
  return getPrograms().find((program) => program.slug === slug);
}

// The oldest, so a site-wide "last reviewed" claim holds for every program.
export function getOldestReviewDate(): string {
  return getPrograms()
    .map((program) => program.reviewed)
    .reduce((earliest, date) => (date < earliest ? date : earliest));
}

// Pinned to UTC: the date is a calendar day, and a local time zone could shift it back one.
const REVIEWED_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function formatReviewedDate(date: string): string {
  return REVIEWED_FORMAT.format(new Date(`${date}T00:00:00Z`));
}
