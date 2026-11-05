// Render the graphical abstract to a PNG for the preprint listing.
//
// The HTML is the source of truth; this only rasterises it at a size the
// listing can show and a resolution a reader can zoom into.

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(here, "graphical-abstract.html")

const { chromium } = await import("playwright")
const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1600, height: 800 },
  deviceScaleFactor: 2
})
await page.goto("file:///" + htmlPath.replace(/\\/g, "/"))
await page.waitForTimeout(400)
const height = await page.evaluate(() => document.body.scrollHeight)
console.log("canvas height:", height)
await page.screenshot({
  path: join(here, "graphical-abstract.png"),
  clip: { x: 0, y: 0, width: 1600, height }
})
await browser.close()

console.log("wrote graphical-abstract.png")
