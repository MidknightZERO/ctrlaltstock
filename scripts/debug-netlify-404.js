/**
 * Post-build debug script for Netlify 404 on /blog refresh.
 * Writes one NDJSON line to .cursor/debug.log for hypothesis checking.
 * Run after: npm run build
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const logPath = path.join(root, '.cursor', 'debug.log');

// #region agent log
const hasRedirects = [
  path.join(root, '_redirects'),
  path.join(root, 'public', '_redirects'),
].some((p) => fs.existsSync(p));
const redirectsContent = (() => {
  const p = path.join(root, 'public', '_redirects');
  if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim().slice(0, 200);
  const p2 = path.join(root, '_redirects');
  if (fs.existsSync(p2)) return fs.readFileSync(p2, 'utf8').trim().slice(0, 200);
  return null;
})();
const hasNetlifyToml = fs.existsSync(path.join(root, 'netlify.toml'));
const distExists = fs.existsSync(distDir);
const distRootFiles = distExists ? fs.readdirSync(distDir) : [];
const distHasBlogIndex = distExists && fs.existsSync(path.join(distDir, 'blog', 'index.html'));
const payload = {
  id: 'netlify_404_build_check',
  timestamp: Date.now(),
  location: 'scripts/debug-netlify-404.js',
  message: 'Post-build Netlify SPA routing check',
  data: {
    hasRedirects,
    redirectsContent,
    hasNetlifyToml,
    distExists,
    distHasBlogIndex,
    distRootFiles,
  },
  hypothesisId: 'H1',
};
try {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(payload) + '\n');
} catch (_) {}
// #endregion
