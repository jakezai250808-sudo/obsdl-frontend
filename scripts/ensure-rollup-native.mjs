import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const platform = process.platform;
const arch = process.arch;
const libc = process.platform === 'linux' && process.report?.getReport
  ? (process.report.getReport().header?.glibcVersionRuntime ? 'gnu' : 'musl')
  : null;

function getRollupNativePackage() {
  if (platform === 'win32' && arch === 'x64') return '@rollup/rollup-win32-x64-msvc';
  if (platform === 'win32' && arch === 'arm64') return '@rollup/rollup-win32-arm64-msvc';
  if (platform === 'darwin' && arch === 'x64') return '@rollup/rollup-darwin-x64';
  if (platform === 'darwin' && arch === 'arm64') return '@rollup/rollup-darwin-arm64';
  if (platform === 'linux' && arch === 'x64' && libc === 'gnu') return '@rollup/rollup-linux-x64-gnu';
  if (platform === 'linux' && arch === 'x64' && libc === 'musl') return '@rollup/rollup-linux-x64-musl';
  if (platform === 'linux' && arch === 'arm64' && libc === 'gnu') return '@rollup/rollup-linux-arm64-gnu';
  if (platform === 'linux' && arch === 'arm64' && libc === 'musl') return '@rollup/rollup-linux-arm64-musl';
  return null;
}

const require = createRequire(import.meta.url);

const pkg = getRollupNativePackage();

if (!pkg) {
  console.warn(`[ensure-rollup-native] Unsupported platform: ${platform}/${arch}. Skipping native Rollup precheck.`);
  process.exit(0);
}

try {
  require.resolve(pkg);
} catch {
  console.warn(`[ensure-rollup-native] Missing ${pkg}. Installing fallback to workaround npm optional-dependency bug...`);
  try {
    execSync(`npm i -D --no-save ${pkg}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`[ensure-rollup-native] Failed to install ${pkg}.`);
    console.error('Please run: rm -rf node_modules package-lock.json && npm i');
    throw error;
  }
}
