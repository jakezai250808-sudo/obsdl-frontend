import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const apiDir = path.join(projectRoot, 'src', 'api');
const docsCandidates = [
  process.env.OPENAPI_URL,
  'http://localhost:8080/v3/api-docs',
  'http://localhost:8080/api-docs',
].filter(Boolean);

const httpCallPattern =
  /http\.(get|post|put|delete|patch)\s*(?:<[^>]+>)?\s*\(\s*(`(?:\\`|[^`])*`|'(?:\\'|[^'])*'|"(?:\\"|[^"])*")/g;

function toNormalizedPath(rawPath) {
  const noQuotes = rawPath.slice(1, -1);
  const withVars = noQuotes.replace(/\$\{[^}]+\}/g, '{var}');
  return withVars.replace(/\/{2,}/g, '/');
}

function normalizeSegments(p) {
  return p
    .replace(/\/\{[^/]+\}/g, '/{var}')
    .replace(/\/:[^/]+/g, '/{var}')
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '') || '/';
}

function pathCandidates(p) {
  const normalized = normalizeSegments(p);
  if (normalized === '/api' || normalized.startsWith('/api/')) {
    return [normalized, normalizeSegments(normalized.replace(/^\/api/, ''))];
  }
  return [normalized, normalizeSegments(`/api${normalized}`)];
}

async function listApiFiles() {
  const entries = await fs.readdir(apiDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts') && entry.name !== 'http.ts')
    .map((entry) => path.join(apiDir, entry.name));
}

async function extractFrontendApis() {
  const files = await listApiFiles();
  const apis = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    let match = httpCallPattern.exec(content);
    while (match) {
      const method = match[1].toUpperCase();
      const rawPath = match[2];
      apis.push({
        file: path.relative(projectRoot, file),
        method,
        path: toNormalizedPath(rawPath),
      });
      match = httpCallPattern.exec(content);
    }
    httpCallPattern.lastIndex = 0;
  }

  return apis;
}

async function fetchOpenApi() {
  const errors = [];

  for (const url of docsCandidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (!json.paths || typeof json.paths !== 'object') {
        throw new Error('OpenAPI payload missing "paths"');
      }
      return { url, json };
    } catch (error) {
      errors.push(`${url} -> ${error.message}`);
    }
  }

  if (errors.length === 0) {
    throw new Error('No OpenAPI endpoint configured');
  }
  throw new Error(errors.join('\n'));
}

function collectSpecPairs(openApi) {
  const pairs = new Set();
  for (const [rawPath, methods] of Object.entries(openApi.paths)) {
    for (const method of Object.keys(methods || {})) {
      const upper = method.toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upper)) {
        pairs.add(`${upper} ${normalizeSegments(rawPath)}`);
      }
    }
  }
  return pairs;
}

function compare(frontApis, specPairs) {
  return frontApis.map((api) => {
    const matched = pathCandidates(api.path).some((p) => specPairs.has(`${api.method} ${p}`));
    return {
      ...api,
      matched,
    };
  });
}

function printReport(rows, openApiUrl) {
  console.log(`OpenAPI source: ${openApiUrl}`);
  console.log(`Frontend endpoints scanned: ${rows.length}`);
  const missing = rows.filter((row) => !row.matched);
  console.log(`Matched: ${rows.length - missing.length}`);
  console.log(`Unmatched: ${missing.length}`);
  console.log('');

  for (const row of rows) {
    const status = row.matched ? 'OK  ' : 'MISS';
    console.log(`${status} ${row.method.padEnd(6)} ${row.path.padEnd(35)} (${row.file})`);
  }

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

async function main() {
  const frontApis = await extractFrontendApis();
  if (frontApis.length === 0) {
    console.error('No frontend API calls found in src/api/*.ts');
    process.exit(1);
  }

  let openApi;
  try {
    openApi = await fetchOpenApi();
  } catch (error) {
    console.error('Failed to fetch OpenAPI docs.');
    console.error(error.message);
    process.exit(2);
  }

  const specPairs = collectSpecPairs(openApi.json);
  const compared = compare(frontApis, specPairs);
  printReport(compared, openApi.url);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
