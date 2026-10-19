import { readFileSync } from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";

const templatesDir = path.join(process.cwd(), "src", "server", "email", "templates");

// HTML templates escape {{values}}; text templates must not, or "&" arrives as "&amp;".
const html = Handlebars.create();
const text = Handlebars.create();
html.registerPartial("layout", readFileSync(path.join(templatesDir, "layout.html.hbs"), "utf8"));

const cache = new Map<string, Handlebars.TemplateDelegate>();

function compiled(name: string): Handlebars.TemplateDelegate {
  let template = cache.get(name);
  if (!template) {
    const source = readFileSync(path.join(templatesDir, name), "utf8");
    template = name.endsWith(".txt.hbs") ? text.compile(source, { noEscape: true }) : html.compile(source);
    cache.set(name, template);
  }
  return template;
}

export function renderEmail(name: string, data: Record<string, unknown>): { html: string; text: string } {
  return {
    html: compiled(`${name}.html.hbs`)(data),
    text: compiled(`${name}.txt.hbs`)(data).replace(/\n{3,}/g, "\n\n").trim(),
  };
}
