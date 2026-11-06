// Render paper.md to paper.pdf.
//
// The markdown is the source of truth; this only typesets it. The front
// matter is lifted out of the YAML block and used for the title block, and
// the title lines it duplicates are dropped from the body.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { marked } from "marked"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "paper.md"), "utf8")

const frontmatter = {}
let body = source

const match = source.match(/^---\n([\s\S]*?)\n---\n/)
if (match) {
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) continue
    frontmatter[kv[1]] = kv[2].replace(/^"|"$/g, "")
  }
  body = source.slice(match[0].length)
}

// The body opens with the title and byline; the title block below replaces it.
body = body
  .trimStart()
  .replace(/^#\s+Prose Does Not Bind Agents\s*\n+/, "")
  .replace(/^##\s+Mechanically Enforced Safeguards[^\n]*\n+/, "")
  .replace(/^\*\*Rich Tillman\*\*\s*\n+[^\n]*\n+/, "")
  .replace(/^---\s*\n+/, "")
  .trimStart()

const styles = `
  @page { size: A4; margin: 22mm 20mm 20mm 20mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    font-size: 10.6pt; line-height: 1.52; color: #16181d; margin: 0;
    hyphens: auto; text-rendering: optimizeLegibility;
    /* No ligatures: Chrome maps the fi/fl ligature glyph back to a two-letter
       string on extraction, which makes "files" unsearchable in the PDF. */
    font-variant-ligatures: none;
    font-feature-settings: "liga" 0, "clig" 0;
  }
  .titleblock { border-bottom: 1.5px solid #16181d; padding-bottom: 14px; margin-bottom: 22px; }
  .titleblock h1 {
    font-size: 19pt; line-height: 1.22; margin: 0 0 6px; letter-spacing: -0.2pt; font-weight: 700;
  }
  .titleblock .subtitle { font-size: 12.5pt; font-style: italic; color: #3a3f47; margin: 0 0 14px; line-height: 1.35; }
  .titleblock .byline { font-size: 10pt; color: #3a3f47; margin: 0; }
  .titleblock .byline a { color: #3a3f47; }
  .titleblock .date { color: #6b717a; font-size: 9.2pt; margin-top: 3px; }
  h2 {
    font-size: 12.6pt; margin: 26px 0 8px; font-weight: 700; letter-spacing: -0.1pt;
    break-after: avoid; break-inside: avoid;
  }
  h3 { font-size: 10.9pt; margin: 17px 0 5px; font-weight: 700; break-after: avoid; }
  p { margin: 0 0 9px; text-align: justify; }
  ul, ol { margin: 0 0 10px; padding-left: 1.4em; }
  li { margin-bottom: 4px; text-align: justify; }
  strong { font-weight: 700; }
  code {
    font-family: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    font-size: 8.9pt; background: #f2f3f5; padding: 1px 3.5px; border-radius: 2.5px;
  }
  pre {
    background: #f7f8f9; border: 1px solid #e3e5e8; border-left: 3px solid #b9bec6;
    padding: 9px 12px; overflow: visible; break-inside: avoid; margin: 0 0 12px;
  }
  pre code { background: none; padding: 0; font-size: 8.5pt; line-height: 1.45; }
  blockquote {
    margin: 12px 0; padding: 2px 0 2px 14px; border-left: 3px solid #c6cad0;
    color: #3a3f47; font-style: italic;
  }
  table {
    border-collapse: collapse; width: 100%; margin: 12px 0 16px;
    font-size: 8.9pt; break-inside: avoid;
  }
  th {
    text-align: left; font-weight: 700; background: #eef0f2; border-bottom: 1.5px solid #9aa1aa;
    padding: 5px 8px;
  }
  td { padding: 4.5px 8px; border-bottom: 1px solid #dde0e4; vertical-align: top; }
  td:first-child { font-weight: 600; }
  tr:last-child td { border-bottom: 1.5px solid #9aa1aa; }
  hr { border: 0; border-top: 1px solid #d7dade; margin: 20px 0; }
  a { color: #1a4f8a; text-decoration: none; }
  .abstract {
    margin: 0 0 20px; padding: 12px 14px; background: #f6f7f8;
    border-left: 3px solid #16181d; font-size: 9.8pt; line-height: 1.48;
  }
  .abstract h2 { margin: 0 0 6px; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.7pt; }
  .abstract p { margin-bottom: 6px; }
  .abstract p:last-child { margin-bottom: 0; }
  .keywords { font-size: 8.9pt; color: #3a3f47; margin-top: 10px; font-style: italic; }
  .disclosure {
    font-size: 8.6pt; color: #3a3f47; margin-top: 9px; padding-top: 8px;
    border-top: 1px solid #d7dade; text-align: justify;
  }
  .disclosure strong { font-weight: 700; }
  .references p {
    text-align: left; margin: 0 0 0.55em; padding-left: 2.4em; text-indent: -2.4em;
  }
`

// Lift the abstract and its keywords out of the body so they can be styled
// as a block rather than as two more sections. This has to happen before the
// body is rendered, or the abstract is rendered twice.
const abstractMatch = body.match(/## Abstract\n\n([\s\S]*?)\n\*\*Keywords:\*\*\s*([\s\S]*?)\n\n/)
let abstractBlock = ""
if (abstractMatch) {
  abstractBlock = `<div class="abstract"><h2>Abstract</h2>${marked.parse(
    abstractMatch[1],
    { gfm: true }
  )}<div class="keywords"><strong>Keywords:</strong> ${abstractMatch[2].trim()}</div>${
    frontmatter.ai_disclosure
      ? `<div class="disclosure"><strong>AI use disclosure.</strong> ${frontmatter.ai_disclosure}</div>`
      : ""
  }</div>`
  body = body.replace(abstractMatch[0], "")
}

const html = marked.parse(body, { gfm: true, breaks: false })

// The reference list reads badly justified, because the entries are mostly
// long titles and DOIs. Give it a hanging indent and set it flush left.
const references = html.replace(
  /(<h2[^>]*>References<\/h2>)([\s\S]*?)(?=<h2|<hr)/,
  (_, head, entries) => `${head}<div class="references">${entries}</div>`
)

const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${frontmatter.title ?? "Paper"}</title>
<style>${styles}</style>
</head>
<body>
<div class="titleblock">
  <h1>${frontmatter.short_title ?? frontmatter.title ?? ""}</h1>
  <div class="subtitle">${frontmatter.subtitle ?? ""}</div>
  <p class="byline">${frontmatter.author ?? ""} · ${frontmatter.role ?? ""} ·
    <a href="https://github.com/effinrich">github.com/effinrich</a> ·
    ${frontmatter.email ?? ""}</p>
  <p class="date">Preprint, ${frontmatter.date ?? ""}</p>
</div>
${abstractBlock}
${references}
</body>
</html>`

const htmlPath = join(here, "paper.html")
writeFileSync(htmlPath, document, "utf8")

const { chromium } = await import("playwright")
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto("file:///" + htmlPath.replace(/\\/g, "/"))
await page.pdf({
  path: join(here, "paper.pdf"),
  format: "A4",
  margin: { top: "20mm", bottom: "18mm", left: "20mm", right: "20mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `<div style="font-family: Georgia, serif; font-size: 7.5pt; width: 100%; text-align: center; color: #6b717a;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
  printBackground: true
})
await browser.close()

console.log("wrote paper.html and paper.pdf")
