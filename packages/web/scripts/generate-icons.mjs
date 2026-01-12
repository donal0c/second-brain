// Generate PWA icons from SVG source
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

async function generateIcons() {
  const sizes = [192, 512];

  for (const size of sizes) {
    const svgPath = join(publicDir, `icon-${size}.svg`);
    const pngPath = join(publicDir, `icon-${size}.png`);

    const svg = readFileSync(svgPath);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath);

    console.log(`Generated ${pngPath}`);
  }

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
