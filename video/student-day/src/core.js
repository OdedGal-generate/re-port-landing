// Core engine: math helpers, scene registry, timeline playback, transitions.
// Everything is drawn on a 1920x1080 canvas. All time values are in seconds.
(function () {
  const V = (window.V = window.V || {});
  V.W = 1920;
  V.H = 1080;
  V.FPS = 30;
  V.LETTERBOX = 64; // cinematic black bars (top & bottom). Keep key content inside SAFE.
  V.SAFE = { x: 0, y: 64, w: 1920, h: 952 };
  V.scenes = {};

  // ---------- math ----------
  V.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  V.lerp = (a, b, k) => a + (b - a) * k;
  // progress of t inside [a, b] -> 0..1 (clamped)
  V.seg = (t, a, b) => V.clamp((t - a) / (b - a));
  V.deg = (d) => (d * Math.PI) / 180;
  V.ease = {
    linear: (k) => k,
    in: (k) => k * k * k,
    out: (k) => 1 - Math.pow(1 - k, 3),
    inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    sine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: (k) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    },
    outElastic: (k) => {
      if (k === 0 || k === 1) return k;
      return Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    },
  };
  // eased progress helper: V.ep(t, a, b, 'inOut')
  V.ep = (t, a, b, e = 'inOut') => V.ease[e](V.seg(t, a, b));
  // keyframe interpolation: V.kf(t, [[t0, v0], [t1, v1], ...], 'inOut')
  V.kf = (t, keys, e = 'inOut') => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
      if (t <= t1) return V.lerp(v0, v1, V.ease[e](V.seg(t, t0, t1)));
    }
    return keys[keys.length - 1][1];
  };
  // deterministic pseudo random in [0,1) from an integer/float seed
  V.rand = (seed) => {
    let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  V.osc = (t, hz = 1, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);

  // colour helpers: '#rrggbb' mixing
  const hex = (c) => {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    return [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16));
  };
  V.mixColor = (a, b, k) => {
    const A = hex(a), B = hex(b);
    const r = A.map((v, i) => Math.round(V.lerp(v, B[i], V.clamp(k))));
    return '#' + r.map((v) => v.toString(16).padStart(2, '0')).join('');
  };
  V.shade = (c, k) => (k < 0 ? V.mixColor(c, '#000000', -k) : V.mixColor(c, '#ffffff', k));
  V.rgba = (c, a) => {
    const [r, g, b] = hex(c);
    return `rgba(${r},${g},${b},${a})`;
  };

  // time helpers for "HH:MM" strings
  V.toMin = (s) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  V.fmtMin = (mins) => {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  };
  // interpolate between two clock times going forward (wraps past midnight)
  V.lerpTime = (from, to, k) => {
    const a = V.toMin(from);
    let b = V.toMin(to);
    if (b < a) b += 1440;
    return V.fmtMin(V.lerp(a, b, V.clamp(k)));
  };

  // ---------- scene registry ----------
  // V.registerScene(id, { draw(ctx, t, info), sfx: [...], stampTime(t) })
  V.registerScene = (id, def) => {
    V.scenes[id] = def;
  };

  // ---------- timeline ----------
  V.timeline = null;
  V.loadTimeline = (tl) => {
    let start = 0;
    tl.scenes.forEach((s) => {
      s.start = start;
      start += s.dur;
    });
    tl.total = start;
    V.timeline = tl;
    return tl;
  };

  const FADE = 0.45; // crossfade length
  const BLACK = 0.35; // half-length of a dip to black

  let off = null;
  const offCtx = () => {
    if (!off) {
      off = document.createElement('canvas');
      off.width = V.W;
      off.height = V.H;
    }
    return off.getContext('2d');
  };

  function drawSceneRaw(ctx, scene, t) {
    const def = V.scenes[scene.id];
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, V.W, V.H);
    if (def && def.draw) {
      def.draw(ctx, t, { dur: scene.dur, scene });
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, V.W, V.H);
      V.text(ctx, scene.id + ' (missing)', V.W / 2, V.H / 2, { size: 80, color: '#fff', align: 'center' });
    }
    ctx.restore();
  }

  // Draw one scene in isolation (used for previews): scene + overlay + letterbox.
  V.renderScene = (ctx, id, t, opts = {}) => {
    const scene = V.timeline.scenes.find((s) => s.id === id) || { id, dur: (V.scenes[id] || {}).dur || 4 };
    drawSceneRaw(ctx, scene, t);
    if (opts.overlay !== false) V.drawStampFor(ctx, scene, t);
    V.drawFrameChrome(ctx);
  };

  // Draw the full movie at global time T.
  V.renderAt = (ctx, T) => {
    const tl = V.timeline;
    const scenes = tl.scenes;
    let i = scenes.findIndex((s) => T >= s.start && T < s.start + s.dur);
    if (i < 0) i = T < 0 ? 0 : scenes.length - 1;
    const cur = scenes[i];
    const t = T - cur.start;

    drawSceneRaw(ctx, cur, t);

    // incoming transition from previous scene
    if (i > 0) {
      const prev = scenes[i - 1];
      if (cur.in === 'fade' && t < FADE) {
        // previous scene keeps running (t beyond its dur) and fades out over the new one
        const o = offCtx();
        drawSceneRaw(o, prev, prev.dur + t);
        ctx.save();
        ctx.globalAlpha = 1 - V.ease.sine(t / FADE);
        ctx.drawImage(off, 0, 0);
        ctx.restore();
      }
    }
    // dips to black: end of scene before a 'black' scene, and start of a 'black' scene
    let black = 0;
    if (cur.in === 'black' && t < BLACK) black = 1 - V.ease.sine(t / BLACK);
    const next = scenes[i + 1];
    if (next && next.in === 'black' && cur.dur - t < BLACK) black = Math.max(black, V.ease.sine(1 - (cur.dur - t) / BLACK));
    if (i === 0 && t < 0.9) black = Math.max(black, 1 - V.ease.sine(t / 0.9));
    if (!next && cur.dur - t < 1.2) black = Math.max(black, V.ease.sine(1 - (cur.dur - t) / 1.2));

    V.drawStampFor(ctx, cur, t);
    if (black > 0) {
      ctx.save();
      ctx.globalAlpha = black;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
    V.drawFrameChrome(ctx);
  };

  V.drawStampFor = (ctx, scene, t) => {
    if (!scene.stamp) return;
    const def = V.scenes[scene.id] || {};
    let time = scene.stamp.time;
    if (def.stampTime) time = def.stampTime(t);
    else if (scene.stamp.to) time = V.lerpTime(scene.stamp.time, scene.stamp.to, V.ease.inOut(V.seg(t, scene.dur * 0.15, scene.dur * 0.85)));
    V.drawStamp(ctx, time, scene.stamp.place, t, scene.dur);
  };

  // letterbox + soft vignette, drawn last on every frame
  V.drawFrameChrome = (ctx) => {
    ctx.save();
    const g = ctx.createRadialGradient(V.W / 2, V.H / 2, V.H * 0.45, V.W / 2, V.H / 2, V.H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, V.W, V.LETTERBOX);
    ctx.fillRect(0, V.H - V.LETTERBOX, V.W, V.LETTERBOX);
    ctx.restore();
  };

  // global sound-effect cue list (scene-local cue times shifted to global time)
  V.collectCues = () =>
    V.timeline.scenes.flatMap((s) => {
      const def = V.scenes[s.id] || {};
      return (def.sfx || []).map((c) => Object.assign({}, c, { scene: s.id, t: s.start + c.t }));
    });
})();
