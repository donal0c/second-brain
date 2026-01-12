/* eslint-env node */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#111827"/>
  <text x="256" y="340" font-family="system-ui, sans-serif" font-size="280" font-weight="900" fill="white" text-anchor="middle">S</text>
</svg>`;

const sizes = [192, 512];
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  for (const size of sizes) {
    const buffer = Buffer.from(svg);
    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);
