// Render paper.md to paper.tex.
//
// The markdown is the source of truth, the same as paper.html and paper.pdf.
// This exists because the two venues that will actually index the preprint in
// Google Scholar want a source file: Preprints.org asks for Word or LaTeX,
// and arXiv takes a PDF but prefers LaTeX.
//
// It is a converter for this document, not a general markdown-to-LaTeX
// engine: it handles the constructs paper.md actually uses (headings,
// paragraphs, bullet and numbered lists, pipe tables, fenced code, block
// quotes, rules) and nothing else.

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(join(here, "paper.md"), "utf8")

// --- front matter -----------------------------------------------------------

const frontmatter = {}
let body = source

const fm = source.match(/^---\n([\s\S]*?)\n---\n/)
if (fm) {
  for (const line of fm[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/)
    if (!kv) continue
    frontmatter[kv[1]] = kv[2].replace(/^"|"$/g, "")
  }
  body = source.slice(fm[0].length)
}

// The body opens with the title and byline; the title block replaces both.
body = body
  .trimStart()
  .replace(/^#\s+Prose Does Not Bind Agents\s*\n+/, "")
  .replace(/^##\s+Mechanically Enforced Safeguards[^\n]*\n+/, "")
  .replace(/^\*\*Rich Tillman\*\*\s*\n+[^\n]*\n+/, "")
  .replace(/^---\s*\n+/, "")
  .trimStart()

// Lift the abstract and its keywords out of the body so they can be set as
// an abstract rather than as one more section.
const abstractMatch = body.match(
  /## Abstract\n\n([\s\S]*?)\n\*\*Keywords:\*\*\s*([\s\S]*?)\n\n/
)
let abstract = ""
let keywords = ""
if (abstractMatch) {
  abstract = abstractMatch[1]
  keywords = abstractMatch[2].trim()
  body = body.replace(abstractMatch[0], "")
}

// --- inline conversion ------------------------------------------------------

const SPECIAL = {
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "\\": "\\textbackslash{}",
  '"': "\\textquotedbl{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}"
}

// Unicode that pdfLaTeX will not take as-is.
const UNICODE = {
  "—": "---", // em dash
  "–": "--", // en dash
  "§": "\\S{}", // section sign
  "−": "\\textminus{}", // minus sign
  "·": "\\textperiodcentered{}", // middle dot
  "→": "$\\rightarrow$", // right arrow
  "ş": "\\c{s}", // s with cedilla, not in T1
  "İ": "\\.{I}", // capital I with dot above, not in T1
  "…": "\\ldots{}" // ellipsis
}

// Inside a code span the typewriter font has fewer glyphs, so the unicode
// punctuation falls back to ASCII.
const CODE_UNICODE = {
  "−": "-",
  "—": "--",
  "–": "-",
  "…": "..."
}

function escapeChar(ch, table = UNICODE) {
  if (SPECIAL[ch]) return SPECIAL[ch]
  if (table[ch]) return table[ch]
  return ch
}

function escapeUrl(url) {
  // Inside \url, only these two would break the argument.
  return url.replace(/%/g, "\\%").replace(/#/g, "\\#")
}

// Inline markdown to LaTeX. Recurses so that a link label or a bold run can
// itself contain code spans or emphasis.
function inline(text) {
  let out = ""
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    let m

    if ((m = rest.match(/^`([^`]+)`/))) {
      let code = ""
      for (const ch of m[1]) code += escapeChar(ch, CODE_UNICODE)
      out += `\\texttt{${code}}`
      i += m[0].length
      continue
    }
    if ((m = rest.match(/^<((?:https?:\/\/)[^>\s]+)>/))) {
      out += `\\url{${escapeUrl(m[1])}}`
      i += m[0].length
      continue
    }
    if ((m = rest.match(/^\[([^\]]*)\]\(([^)\s]*)\)/))) {
      out += `\\href{${escapeUrl(m[2])}}{${inline(m[1])}}`
      i += m[0].length
      continue
    }
    if ((m = rest.match(/^\*\*([^*]+)\*\*/))) {
      out += `\\textbf{${inline(m[1])}}`
      i += m[0].length
      continue
    }
    if ((m = rest.match(/^\*([^*]+)\*/))) {
      out += `\\emph{${inline(m[1])}}`
      i += m[0].length
      continue
    }

    out += escapeChar(text[i])
    i += 1
  }
  return out
}

// --- block conversion -------------------------------------------------------

function tableToTex(rows) {
  // Drop the alignment row and split the rest into cells.
  const cells = rows
    .filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r))
    .map((r) =>
      r
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim())
    )

  const columns = cells[0].length
  const weights = []
  for (let c = 0; c < columns; c += 1) {
    const longest = Math.max(
      ...cells.map((row) => (row[c] ?? "").replace(/`[^`]*`/g, "xx").length)
    )
    weights.push(Math.sqrt(longest))
  }
  const total = weights.reduce((a, b) => a + b, 0)

  // Share the text width, leaving room for the inter-column padding.
  const usable = 0.94
  let shares = weights.map((w) =>
    Math.min(0.55, Math.max(0.12, (w / total) * usable))
  )
  const sum = shares.reduce((a, b) => a + b, 0)
  if (sum > usable) shares = shares.map((s) => (s / sum) * usable)

  const spec = shares
    .map(
      (s) =>
        `>{\\raggedright\\arraybackslash}p{\\dimexpr${s.toFixed(
          4
        )}\\textwidth\\relax}`
    )
    .join("")

  const out = []
  out.push("\\begin{tabular}{@{}" + spec + "@{}}")
  out.push("\\toprule")
  out.push(
    cells[0].map((cell) => `\\textbf{${inline(cell)}}`).join(" & ") + " \\\\"
  )
  out.push("\\midrule")
  for (const row of cells.slice(1)) {
    out.push(row.map((cell) => inline(cell)).join(" & ") + " \\\\")
  }
  out.push("\\bottomrule")
  out.push("\\end{tabular}")
  return out.join("\n")
}

function blocksToTex(md) {
  const lines = md.split("\n")
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // blank
    if (line.trim() === "") {
      i += 1
      continue
    }

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const body = []
      i += 1
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      i += 1
      // The typewriter font has no minus sign; use a hyphen in code.
      const code = body
        .join("\n")
        .replace(/−/g, "-")
        .replace(/—/g, "--")
      out.push(
        "\\begin{Verbatim}[fontsize=\\footnotesize,breaklines=true,breakanywhere=true]\n" +
          code +
          "\n\\end{Verbatim}"
      )
      continue
    }

    // heading
    const heading = line.match(/^(#{2,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length === 2 ? "section" : "subsection"
      out.push(`\\${level}*{${inline(heading[2])}}`)
      i += 1
      continue
    }

    // horizontal rule
    if (/^---+\s*$/.test(line)) {
      out.push("\\medskip\\hrule\\medskip")
      i += 1
      continue
    }

    // block quote
    if (/^>\s?/.test(line)) {
      const quoted = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""))
        i += 1
      }
      out.push(
        "\\begin{quote}\n" + blocksToTex(quoted.join("\n")) + "\n\\end{quote}"
      )
      continue
    }

    // table
    if (line.trim().startsWith("|")) {
      const rows = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i])
        i += 1
      }
      out.push(tableToTex(rows))
      continue
    }

    // lists
    if (/^(-|\d+\.)\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line)
      const env = ordered ? "enumerate" : "itemize"
      const items = []
      while (i < lines.length && /^(-|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i].replace(/^(-|\d+\.)\s+/, "")
        i += 1
        // continuation lines are indented under the bullet
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          !/^(-|\d+\.)\s+/.test(lines[i]) &&
          !lines[i].trim().startsWith("|")
        ) {
          item += " " + lines[i].trim()
          i += 1
        }
        items.push(item)
      }
      out.push(
        `\\begin{${env}}\n` +
          items.map((it) => `\\item ${inline(it)}`).join("\n") +
          `\n\\end{${env}}`
      )
      continue
    }

    // paragraph
    const para = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{2,3})\s+/.test(lines[i]) &&
      !/^(-|\d+\.)\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith("|") &&
      !/^```/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim())
      i += 1
    }
    if (para.length) out.push(inline(para.join(" ")))
  }

  return out.join("\n\n")
}

// --- assemble ---------------------------------------------------------------

const title = frontmatter.short_title ?? frontmatter.title ?? "Paper"
const subtitle = frontmatter.subtitle ?? ""
const author = frontmatter.author ?? ""
const role = frontmatter.role ?? ""
const email = frontmatter.email ?? ""
const date = frontmatter.date ?? ""

const preamble = `\\documentclass[11pt,a4paper]{article}

\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage[margin=25mm]{geometry}
\\usepackage{microtype}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{enumitem}
\\usepackage{fancyvrb}
\\usepackage{fvextra}
\\usepackage[hidelinks,breaklinks]{hyperref}

\\setlength{\\parskip}{0.4em}
\\setlength{\\parindent}{0pt}
\\setlist{itemsep=0.25em, topsep=0.4em}
\\setlength{\\emergencystretch}{3em}

\\begin{document}

\\title{${inline(title)}\\\\ \\large ${inline(subtitle)}}
\\author{${inline(author)}\\\\ ${inline(role)} \\\\ \\href{https://github.com/effinrich}{github.com/effinrich} \\\\ ${inline(email)}}
\\date{${inline(date)}}

\\maketitle

\\begin{abstract}
${blocksToTex(abstract)}
\\end{abstract}

\\noindent\\textbf{Keywords:} ${inline(keywords)}
`

const disclosure = frontmatter.ai_disclosure
  ? `\n\n\\noindent\\textbf{AI use disclosure.} ${inline(frontmatter.ai_disclosure)}\n`
  : "\n"

const tex = `${preamble}${disclosure}
${blocksToTex(body)}

\\end{document}
`

const outPath = join(here, "paper.tex")
writeFileSync(outPath, tex, "utf8")
console.log(`wrote ${outPath}`)
