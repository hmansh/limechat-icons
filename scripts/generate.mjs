import { readdir, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const iconsDir = join(__dirname, '../src/icons');

function toPascalCase(str) {
  return str
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

async function main() {
  const files = await readdir(iconsDir);
  const svgFiles = files.filter(f => f.endsWith('.svg'));
  const generatedExports = [];

  for (const file of svgFiles) {
    const name = basename(file, '.svg');
    const exportName = `Icon${toPascalCase(name)}`;
    const raw = await readFile(join(iconsDir, file), 'utf-8');

    // Strip class attribute (tabler-specific), replace size
    const svg = raw
      .replace(/\s+class="[^"]*"/g, '')
      .replace(/width="\d+"/, 'width="${size}"')
      .replace(/height="\d+"/, 'height="${size}"')
      .replace(/`/g, '\\`');

    const ts = `export function ${exportName}({ size = 24 }: { size?: number } = {}): string {
  return \`${svg}\`;
}
`;

    await writeFile(join(iconsDir, `${exportName}.ts`), ts);
    generatedExports.push(exportName);
    console.log(`  ✓ ${exportName}`);
  }

  // Rebuild index.ts with all exports (generated + any hand-written .ts icons)
  const tsFiles = (await readdir(iconsDir))
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');

  const allExports = tsFiles.map(f => {
    const name = basename(f, '.ts');
    return `export { ${name} } from './icons/${name}';`;
  });

  await writeFile(
    join(__dirname, '../src/index.ts'),
    allExports.join('\n') + '\n'
  );

  console.log(`\nUpdated src/index.ts with ${allExports.length} icons`);
}

main().catch(console.error);
