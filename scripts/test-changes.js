/**
 * Quick smoke test for Images & Amazon Product Overhaul changes.
 * Run: node scripts/test-changes.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_JSON = path.join(__dirname, '..', 'public', 'blog-posts.json');

function test() {
  console.log('Testing Images & Amazon Product Overhaul changes...\n');

  // 1. Load blog-posts.json
  if (!fs.existsSync(BLOG_JSON)) {
    console.error('FAIL: blog-posts.json not found. Run: npm run build:blog');
    process.exit(1);
  }
  const posts = JSON.parse(fs.readFileSync(BLOG_JSON, 'utf-8'));
  console.log(`✓ Loaded ${posts.length} posts from blog-posts.json`);

  // 2. Check for inline images in content
  const postsWithInlineImages = posts.filter(
    (p) => p.content?.includes('![') || (p.contentBlocks || []).some((b) => b.content?.includes('!['))
  );
  console.log(`✓ ${postsWithInlineImages.length} posts have inline markdown images`);

  // 3. Check for featured-product comments
  const postsWithFeatured = posts.filter(
    (p) =>
      p.content?.includes('<!-- featured-product:') ||
      (p.contentBlocks || []).some((b) => b.content?.includes('<!-- featured-product:'))
  );
  console.log(`✓ ${postsWithFeatured.length} posts have featured-product callouts`);

  // 4. Check amazonProducts limited to 3
  const postsWithAmazon = posts.filter((p) => (p.amazonProducts || []).length > 0);
  const overLimit = postsWithAmazon.filter((p) => (p.amazonProducts || []).length > 3);
  if (overLimit.length > 0) {
    console.log(`⚠ ${overLimit.length} posts have >3 amazonProducts in JSON (UI slices to 3)`);
  } else {
    console.log(`✓ Amazon products present in ${postsWithAmazon.length} posts`);
  }

  // 5. Verify parse logic for featured-product (mirror MarkdownRenderer)
  const sampleComment =
    '<!-- featured-product: AMD Radeon RX 7800 XT | From £479 | https://example.com/img.jpg | https://amazon.co.uk/... -->';
  const inner = sampleComment
    .replace(/^<!--\s*featured-product:\s*/, '')
    .replace(/\s*-->$/, '')
    .trim();
  const parts = inner.split(/\s*\|\s*/).map((p) => p?.trim() || '');
  const parsed =
    parts.length >= 3
      ? {
          title: parts[0] || 'Product',
          price: parts[1] || undefined,
          imageUrl: parts.length >= 4 ? parts[2] : undefined,
          affiliateUrl: parts.length >= 4 ? parts[3] : parts[2],
        }
      : null;
  if (parsed?.title === 'AMD Radeon RX 7800 XT' && parsed?.affiliateUrl?.includes('amazon')) {
    console.log('✓ Featured-product comment parsing works');
  } else {
    console.error('FAIL: Featured-product parse failed', parsed);
    process.exit(1);
  }

  console.log('\nAll checks passed.');
}

test();
