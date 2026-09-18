import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const { version } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

const content = `// Bu dosya \`npm run build\`/\`npm start\` öncesinde otomatik olarak
// scripts/generate-build-info.mjs tarafından yeniden üretilir.
export const buildInfo = {
  version: 'v${version}',
  timestamp: '${new Date().toISOString()}',
};
`;

writeFileSync(join(rootDir, 'src/app/build-info.ts'), content);
