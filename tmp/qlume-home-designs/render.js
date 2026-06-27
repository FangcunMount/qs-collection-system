const path = require("path");
const { chromium } = require("playwright");

async function main() {
  const outDir = __dirname;
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1688, height: 900, deviceScaleFactor: 2 },
  });

  await page.goto(`file://${path.join(__dirname, "index.html")}`);
  await page.waitForLoadState("networkidle");

  const shots = await page.$$("[data-shot]");
  for (const shot of shots) {
    const name = await shot.getAttribute("data-shot");
    await shot.screenshot({
      path: path.join(outDir, `${name}.png`),
    });
  }

  await page.locator(".board").screenshot({
    path: path.join(outDir, "all-four-home-designs.png"),
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
