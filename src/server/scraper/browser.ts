import { chromium, type Browser } from "playwright-core";
import sparticuzChromium from "@sparticuz/chromium";

/**
 * Launches headless Chromium via the Lambda/Vercel-optimized binary from
 * @sparticuz/chromium. Used by the deployed API routes, where a full browser
 * can't be bundled into the function. Local dev iteration on the scraper
 * should use scripts/dev-scrape.ts instead, which uses the full `playwright`
 * package's bundled browser for faster, easier debugging.
 */
export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    args: sparticuzChromium.args,
    executablePath: await sparticuzChromium.executablePath(),
    headless: true,
  });
}
