// Screenshot the top of the rendered paper so the layout can be eyeballed.
// Screenshots the HTML under print media emulation, which is what the PDF
// uses. Not part of the build; a review aid.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

const here = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(join(here, "paper.html"), "utf8")

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 794, height: 1123 },
  deviceScaleFactor: 2
})
await page.emulateMedia({ media: "print" })
await page.setContent(html, { waitUntil: "load" })
await page.screenshot({
  path: join(here, "preview-top.png"),
  clip: { x: 0, y: 0, width: 794, height: 1123 }
})
await browser.close()
console.log("wrote preview-top.png")
