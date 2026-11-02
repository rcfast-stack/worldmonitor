import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';

import {
  GENERATED_DIRS,
  buildCorpus,
  relativizeDashboardAnchors,
} from '../scripts/build-crawlable-corpus.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const BASE = 'https://www.worldmonitor.app';
const ABSOLUTE_DASHBOARD_ANCHOR = /<a\b[^>]*\shref="https:\/\/www\.worldmonitor\.app\/dashboard/;

function generatedHtml(outDir) {
  const pages = [];
  for (const dir of GENERATED_DIRS) {
    let entries;
    try {
      entries = readdirSync(join(outDir, dir), { recursive: true, withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.html')) {
        const file = join(entry.parentPath, entry.name);
        pages.push({ file, html: readFileSync(file, 'utf8') });
      }
    }
  }
  return pages;
}

describe('self-hosted corpus dashboard links', () => {
  it('rewrites only <a> links to the dashboard', () => {
    const html = [
      `<link rel="canonical" href="${BASE}/countries/japan/">`,
      `<a class="cta" data-dashboard-link href="${BASE}/dashboard?country=JP&amp;expanded=1">Open</a>`,
      `<a href="${BASE}/dashboard">Live</a>`,
      `<a href="${BASE}/docs/documentation">Docs</a>`,
      `<a href="${BASE}/dashboards-archive/">Not the dashboard</a>`,
      `<script type="application/ld+json">{"url":"${BASE}/dashboard"}</script>`,
    ].join('\n');

    const out = relativizeDashboardAnchors(html, `${BASE}/`);

    assert.match(out, /<a class="cta" data-dashboard-link href="\/dashboard\?country=JP&amp;expanded=1">/);
    assert.match(out, /<a href="\/dashboard">Live<\/a>/);
    assert.match(out, new RegExp(`<link rel="canonical" href="${BASE}/countries/japan/">`));
    assert.match(out, new RegExp(`<a href="${BASE}/docs/documentation">`));
    assert.match(out, new RegExp(`<a href="${BASE}/dashboards-archive/">`));
    assert.match(out, new RegExp(`"url":"${BASE}/dashboard"`));
  });

  describe('built corpus', () => {
    const outDirs = [];
    after(() => {
      for (const dir of outDirs) rmSync(dir, { recursive: true, force: true });
    });

    async function build(relativeDashboardLinks) {
      const outDir = mkdtempSync(join(tmpdir(), 'wm-corpus-self-hosted-'));
      outDirs.push(outDir);
      const manifest = await buildCorpus({ rootDir: repoRoot, outDir, baseUrl: BASE, relativeDashboardLinks });
      return { outDir, manifest };
    }

    it('keeps hosted dashboard links by default', async () => {
      const { outDir } = await build(false);
      assert.ok(
        generatedHtml(outDir).some(({ html }) => ABSOLUTE_DASHBOARD_ANCHOR.test(html)),
        'the default build should still link CTAs to the hosted dashboard',
      );
    });

    it('leaves no hosted dashboard <a> link when relativeDashboardLinks is set', async () => {
      const { outDir, manifest } = await build(true);
      const pages = generatedHtml(outDir);
      assert.ok(pages.length > 0, 'expected generated HTML pages');
      const offenders = pages.filter(({ html }) => ABSOLUTE_DASHBOARD_ANCHOR.test(html)).map(({ file }) => file);
      assert.deepEqual(offenders, []);

      const countryRoute = manifest.sections.countries.routes[0];
      const countryPage = readFileSync(join(outDir, countryRoute, 'index.html'), 'utf8');
      assert.match(countryPage, /<a class="cta" href="\/dashboard\?country=/);
      assert.match(countryPage, new RegExp(`<link rel="canonical" href="${BASE}${countryRoute}">`));
    });
  });
});
