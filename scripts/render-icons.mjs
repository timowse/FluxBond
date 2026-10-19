// Renders the FluxBond icons from their SVG sources in src-tauri/icons/:
//
//   node scripts/render-icons.mjs
//
// app-icon.svg becomes the app's PNG, ICNS and ICO icons (through `tauri icon`), and tray.svg the
// menu bar icons tray-on.png and tray-off.png. Uses the Chrome that Playwright drives for the e2e
// tests, so the output only changes when the sources (or Chrome's rasteriser) do.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const icons = new URL("../src-tauri/icons/", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "fluxbond-icons-"));
const OFF_TILE = "#9a9a9a";

async function render(page, svg, size, out) {
  await page.setViewportSize({ width: size, height: size });
  const data = Buffer.from(svg).toString("base64");
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}img{display:block}</style>` +
      `<img width="${size}" height="${size}" src="data:image/svg+xml;base64,${data}">`,
  );
  await page.locator("img").screenshot({ path: out, omitBackground: true });
}

const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const master = join(work, "app-icon.png");
  await render(page, readFileSync(join(icons, "app-icon.svg"), "utf8"), 1024, master);
  const tray = readFileSync(join(icons, "tray.svg"), "utf8");
  await render(page, tray, 64, join(icons, "tray-on.png"));
  await render(page, tray.replace('fill="#3ddbb4"', `fill="${OFF_TILE}"`), 64, join(icons, "tray-off.png"));

  const generated = join(work, "out");
  execFileSync("npx", ["tauri", "icon", master, "--output", generated], { stdio: "ignore" });
  for (const name of ["32x32.png", "64x64.png", "128x128.png", "128x128@2x.png", "icon.png", "icon.icns", "icon.ico"]) {
    copyFileSync(join(generated, name), join(icons, name));
  }
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
console.log("render-icons: icons updated in src-tauri/icons/");
