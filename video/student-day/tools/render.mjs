// Headless renderer for the canvas film.
//
//   node tools/render.mjs sheet  <sceneId> [--step 0.5] [--cols 4] [--out file.png]
//        contact sheet of one scene (frames every --step seconds, labelled) -> previews/<id>-sheet.png
//   node tools/render.mjs stills <sceneId> <t1,t2,...> [--scale 0.5]
//        full-size (or scaled) stills of one scene at local times -> previews/<id>-<t>.png
//   node tools/render.mjs global <T1,T2,...>          stills of the whole film at global times
//   node tools/render.mjs perf <sceneId>               average draw time per frame (keep < 60 ms)
//   node tools/render.mjs cues                         writes out/cues.json (all sfx cues, global time)
//   node tools/render.mjs video [--from 0] [--to end] [--scale 1] [--crf 18] [--preset medium] [--out out/student-day.mp4] [--audio out/audio.wav]
//
// Needs: npm i playwright-core (in this folder or a parent), ffmpeg on PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
for (const p of [ROOT, process.cwd(), process.env.PLAYWRIGHT_CORE_DIR].filter(Boolean)) {
  try {
    ({ chromium } = require(require.resolve('playwright-core', { paths: [p] })));
    break;
  } catch {}
}
if (!chromium) ({ chromium } = await import('playwright-core'));

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404);
    return res.end();
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', process.env.CHROME_PATH].find((p) => p && fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push((e.stack || String(e)).split('\n').slice(0, 3).join(' | ')));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`${m.text()} @ ${m.location().url || ''}:${m.location().lineNumber ?? ''}`);
});
await page.goto(base + 'index.html');
const total = await page.evaluate(() => window.ready);

// Syntax-check every script so a broken file is reported by name (one bad file only disables itself).
for (const dir of ['src', 'env', 'scenes']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith('.js'))) {
    const r = spawnSync(process.execPath, ['--check', path.join(ROOT, dir, f)], { encoding: 'utf8' });
    if (r.status !== 0) errors.push(`SYNTAX ERROR in ${dir}/${f}: ${(r.stderr || '').split('\n').slice(0, 5).join(' | ')}`);
  }
}
const missing = await page.evaluate(() => V.timeline.scenes.filter((s) => !V.scenes[s.id]).map((s) => s.id));
if (missing.length) errors.push('scenes not registered (script failed to load?): ' + missing.join(', '));

fs.mkdirSync(path.join(ROOT, 'previews'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

const dataUrlToBuf = (d) => Buffer.from(d.split(',')[1], 'base64');

async function finish(code = 0) {
  if (errors.length) {
    console.error('PAGE ERRORS:\n' + [...new Set(errors)].join('\n'));
    code = code || 2;
  }
  await browser.close();
  server.close();
  process.exit(code);
}

try {
  if (mode === 'sheet') {
    const id = args[1];
    const step = parseFloat(opt('step', '0.5'));
    const cols = parseInt(opt('cols', '4'));
    const out = opt('out', path.join(ROOT, 'previews', `${id}-sheet.png`));
    const png = await page.evaluate(({ id, step, cols }) => {
      const sc = V.timeline.scenes.find((s) => s.id === id) || (V.scenes[id] && { id, dur: V.scenes[id].dur || 4 });
      if (!sc) throw new Error('unknown scene ' + id);
      const times = [];
      for (let t = 0; t <= sc.dur + 1e-6; t += step) times.push(Math.min(t, sc.dur - 1 / 30));
      const tw = 480, th = 270, pad = 6, lab = 26;
      const rows = Math.ceil(times.length / cols);
      const sheet = document.createElement('canvas');
      sheet.width = cols * (tw + pad) + pad;
      sheet.height = rows * (th + lab + pad) + pad;
      const sx = sheet.getContext('2d');
      sx.fillStyle = '#222';
      sx.fillRect(0, 0, sheet.width, sheet.height);
      const c = document.createElement('canvas');
      c.width = 1920;
      c.height = 1080;
      const cx = c.getContext('2d');
      times.forEach((t, i) => {
        V.renderScene(cx, id, t);
        const x = pad + (i % cols) * (tw + pad), y = pad + Math.floor(i / cols) * (th + lab + pad);
        sx.drawImage(c, x, y + lab, tw, th);
        sx.fillStyle = '#fff';
        sx.font = '18px monospace';
        sx.fillText(`${id}  t=${t.toFixed(2)}s`, x + 4, y + 19);
      });
      return sheet.toDataURL('image/png');
    }, { id, step, cols });
    fs.writeFileSync(out, dataUrlToBuf(png));
    console.log('wrote', out);
  } else if (mode === 'stills' || mode === 'global') {
    const isGlobal = mode === 'global';
    const id = isGlobal ? null : args[1];
    const times = (isGlobal ? args[1] : args[2]).split(',').map(Number);
    const scale = parseFloat(opt('scale', '1'));
    for (const t of times) {
      const png = await page.evaluate(({ id, t, scale }) => {
        const c = document.createElement('canvas');
        c.width = 1920;
        c.height = 1080;
        const cx = c.getContext('2d');
        if (id) V.renderScene(cx, id, t);
        else V.renderAt(cx, t);
        if (scale === 1) return c.toDataURL('image/png');
        const s = document.createElement('canvas');
        s.width = Math.round(1920 * scale);
        s.height = Math.round(1080 * scale);
        s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
        return s.toDataURL('image/png');
      }, { id, t, scale });
      const out = path.join(ROOT, 'previews', `${id || 'global'}-${t.toFixed(2)}.png`);
      fs.writeFileSync(out, dataUrlToBuf(png));
      console.log('wrote', out);
    }
  } else if (mode === 'perf') {
    const id = args[1];
    const r = await page.evaluate((id) => {
      const sc = V.timeline.scenes.find((s) => s.id === id) || { dur: 4 };
      const c = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 });
      const cx = c.getContext('2d');
      const n = Math.round(sc.dur * 30);
      const t0 = performance.now();
      for (let i = 0; i < n; i++) V.renderScene(cx, id, i / 30);
      cx.getImageData(0, 0, 1, 1);
      return { frames: n, msPerFrame: (performance.now() - t0) / n };
    }, id);
    console.log(`${id}: ${r.frames} frames, ${r.msPerFrame.toFixed(1)} ms/frame`);
  } else if (mode === 'cues') {
    const cues = await page.evaluate(() => ({ total: V.timeline.total, scenes: V.timeline.scenes.map((s) => ({ id: s.id, start: s.start, dur: s.dur })), cues: V.collectCues() }));
    const out = path.join(ROOT, 'out', 'cues.json');
    fs.writeFileSync(out, JSON.stringify(cues, null, 2));
    console.log('wrote', out, cues.cues.length, 'cues');
  } else if (mode === 'video') {
    const fps = 30;
    const from = parseFloat(opt('from', '0'));
    const to = parseFloat(opt('to', String(total)));
    const scale = parseFloat(opt('scale', '1'));
    const out = path.resolve(opt('out', path.join(ROOT, 'out', 'student-day.mp4')));
    const audio = opt('audio', null);
    const W = Math.round((1920 * scale) / 2) * 2, H = Math.round((1080 * scale) / 2) * 2;
    const ff = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
    if (audio) ff.push('-ss', String(from), '-t', String(to - from), '-i', audio);
    ff.push('-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-tune', 'animation', '-crf', opt('crf', '18'), '-movflags', '+faststart');
    if (audio) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    ff.push(out);
    const proc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });
    const n = Math.round((to - from) * fps);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const T = from + i / fps;
      const jpg = await page.evaluate((T) => {
        const c = window.__vc || (window.__vc = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 }));
        V.renderAt(c.getContext('2d'), T);
        return c.toDataURL('image/jpeg', 0.96);
      }, T);
      const buf = dataUrlToBuf(jpg);
      if (!proc.stdin.write(buf)) await new Promise((r) => proc.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    proc.stdin.end();
    await new Promise((r) => proc.on('close', r));
    console.log('wrote', out);
  } else {
    console.log('usage: see header of tools/render.mjs');
  }
} catch (e) {
  console.error(e);
  await finish(1);
}
await finish(0);
