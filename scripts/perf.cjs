// Headless perf benchmark used for the PR metrics table.
// Usage: npm run build && npm run preview, then `node scripts/perf.cjs [url]`.
// Needs Playwright with Chromium available (not a project dependency).
// Renders with SwiftShader (CPU), so compare numbers only against runs of this same script.
const { chromium } = require('playwright');
(async () => {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const t0 = Date.now();
    await page.goto(process.argv[2] || 'http://localhost:4173');
    await page.waitForFunction(() => window.__washCrew);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const loadS = (Date.now() - t0) / 1000;
    await page.waitForTimeout(1000);
    const m = await page.evaluate(async () => {
      const g = window.__washCrew; g.state.playing = true;
      document.getElementById('overlay').classList.add('hidden');
      // Normal play: walk the room toward the north wall, turning and spraying half the time.
      g.player.position.set(0, 0, 12);
      g.player.onKey('KeyW', true);
      const ts = []; let last = performance.now(); const start = last;
      await new Promise(res => { function f(t) {
        ts.push(t - last); last = t;
        const el = (t - start) / 1000;
        g.camera.rotation.set(0, Math.sin(el * 0.8) * 0.9, 0, 'YXZ');
        g.state.firing = Math.floor(el) % 2 === 0;
        if (t - start < 8000) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
      g.player.onKey('KeyW', false); g.state.firing = false;
      ts.shift();
      const sorted = [...ts].sort((a, b) => a - b);
      const avg = ts.reduce((a, b) => a + b, 0) / ts.length;
      const worst1 = sorted.slice(Math.floor(sorted.length * 0.99));
      const low1 = 1000 / (worst1.reduce((a, b) => a + b, 0) / worst1.length);
      return { fps: 1000 / avg, ms: avg, low1, heapMB: performance.memory.usedJSHeapSize / 1048576 };
    });
    runs.push({ ...m, loadS });
    await browser.close();
  }
  const med = k => { const v = runs.map(x => x[k]).sort((a, b) => a - b); return +v[1].toFixed(2); };
  console.log(JSON.stringify({ runs, median: { fps: med('fps'), ms: med('ms'), low1: med('low1'), loadS: med('loadS'), heapMB: med('heapMB') } }, null, 1));
})();
