// Generic drawing helpers + shared palette + movie-style time stamp overlay.
(function () {
  const V = window.V;

  // Shared palette so every scene feels like the same film.
  V.pal = {
    ink: '#1f1a24', // outline / darkest
    skin: '#e9b48f',
    skinShade: '#d39a76',
    hair: '#4a2e1c',
    white: '#fbf7f0',
    wallWarm: '#f3dcc0',
    wallCool: '#cfe2ea',
    floorWood: '#b9825a',
    floorWoodDark: '#9b6745',
    tile: '#d9eef2',
    grass: '#6cbf5a',
    grassDark: '#4f9e44',
    road: '#5d6470',
    sidewalk: '#c9c2b6',
    brick: '#c86b4f',
    schoolWall: '#f2d6a2',
    leaf: '#5aa35a',
    leafDark: '#3f8448',
    trunk: '#7a5236',
    red: '#e2463c',
    blue: '#3b7dd8',
    navy: '#22385f',
    yellow: '#f6c945',
    orange: '#f39a3d',
    led: '#ff2a1f',
  };

  V.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  V.fillRound = (ctx, x, y, w, h, r, fill, stroke, lw = 4) => {
    V.roundRect(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  V.circle = (ctx, x, y, r, fill, stroke, lw = 4) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  V.ellipse = (ctx, x, y, rx, ry, fill, rot = 0) => {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  };
  V.line = (ctx, x1, y1, x2, y2, color, w = 4, cap = 'round') => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = cap;
    ctx.stroke();
  };
  // soft contact shadow under characters / furniture
  V.groundShadow = (ctx, x, y, rx, alpha = 0.22) => {
    V.ellipse(ctx, x, y, rx, rx * 0.16, `rgba(0,0,0,${alpha})`);
  };

  // Text. Hebrew is right-to-left: use {rtl:true} (default when the string contains Hebrew).
  V.text = (ctx, str, x, y, o = {}) => {
    const size = o.size || 40;
    const weight = o.weight || 700;
    const family = o.mono ? "'ShareTechMono', monospace" : "'Rubik', sans-serif";
    ctx.save();
    ctx.font = `${weight} ${size}px ${family}`;
    const heb = /[֐-׿]/.test(str);
    ctx.direction = o.rtl === false ? 'ltr' : o.rtl || heb ? 'rtl' : 'ltr';
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.shadow) {
      ctx.shadowColor = o.shadow;
      ctx.shadowBlur = o.shadowBlur || 12;
    }
    if (o.stroke) {
      ctx.lineJoin = 'round';
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.strokeWidth || size * 0.18;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // ---------- 7-segment LED digits (alarm clocks, scoreboards) ----------
  const SEGS = {
    0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd',
    6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcfgd', '-': 'g', ' ': '',
  };
  // draws text like "07:30" with digit height h; (x, y) = left/top. Returns total width.
  V.sevenSeg = (ctx, str, x, y, h, o = {}) => {
    const on = o.on || V.pal.led;
    const offC = o.off === undefined ? 'rgba(255,40,30,0.07)' : o.off;
    const w = h * 0.52;
    const th = h * 0.12;
    const gap = h * 0.16;
    let cx = x;
    ctx.save();
    const seg = (sx, sy, horiz, len, lit) => {
      ctx.fillStyle = lit ? on : offC;
      if (!lit && !offC) return;
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + th / 2, sy - th / 2);
        ctx.lineTo(sx + len - th / 2, sy - th / 2);
        ctx.lineTo(sx + len, sy);
        ctx.lineTo(sx + len - th / 2, sy + th / 2);
        ctx.lineTo(sx + th / 2, sy + th / 2);
      } else {
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + th / 2, sy + th / 2);
        ctx.lineTo(sx + th / 2, sy + len - th / 2);
        ctx.lineTo(sx, sy + len);
        ctx.lineTo(sx - th / 2, sy + len - th / 2);
        ctx.lineTo(sx - th / 2, sy + th / 2);
      }
      ctx.closePath();
      ctx.fill();
    };
    if (o.glow) {
      ctx.shadowColor = on;
      ctx.shadowBlur = h * 0.25 * o.glow;
    }
    const skew = h * 0.08;
    for (const ch of str) {
      if (ch === ':') {
        if (o.colon !== false) {
          ctx.fillStyle = on;
          ctx.fillRect(cx + th * 0.2, y + h * 0.28, th, th);
          ctx.fillRect(cx + th * 0.2 - skew * 0.4, y + h * 0.66, th, th);
        }
        cx += th * 1.4 + gap;
        continue;
      }
      const lit = SEGS[ch] || '';
      const L = (k) => lit.includes(k);
      const hh = h / 2;
      const sk = (yy) => skew * (1 - yy / h); // italic lean
      seg(cx + sk(0), y, true, w, L('a'));
      seg(cx + w + sk(0), y, false, hh, L('b'));
      seg(cx + w + sk(hh), y + hh, false, hh, L('c'));
      seg(cx + sk(h), y + h, true, w, L('d'));
      seg(cx + sk(hh), y + hh, false, hh, L('e'));
      seg(cx + sk(0), y, false, hh, L('f'));
      seg(cx + sk(hh), y + hh, true, w, L('g'));
      cx += w + gap;
    }
    ctx.restore();
    return cx - x - gap;
  };
  V.sevenSegWidth = (str, h) => {
    const w = h * 0.52, th = h * 0.12, gap = h * 0.16;
    let total = 0;
    for (const ch of str) total += ch === ':' ? th * 1.4 + gap : w + gap;
    return total - gap;
  };

  // ---------- the bedside alarm clock (the film's recurring motif) ----------
  // (x, y) = bottom-centre of the clock body. s = scale (1 -> 300px wide).
  // o.ring 0..1 makes it shake + shows ring lines; o.glow LED glow; o.colon blink.
  V.alarmClock = (ctx, x, y, s, time, o = {}) => {
    const ring = o.ring || 0;
    const t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    if (ring > 0) {
      ctx.translate(Math.sin(t * 90) * 5 * s * ring, 0);
      ctx.rotate(Math.sin(t * 70) * 0.03 * ring);
    }
    ctx.scale(s, s);
    const W = 300, Hh = 150;
    // feet
    V.fillRound(ctx, -W / 2 + 22, -10, 40, 14, 5, '#111');
    V.fillRound(ctx, W / 2 - 62, -10, 40, 14, 5, '#111');
    // body
    const body = ctx.createLinearGradient(0, -Hh - 8, 0, -8);
    body.addColorStop(0, o.bodyTop || '#3a3a44');
    body.addColorStop(1, o.bodyBottom || '#17171d');
    V.roundRect(ctx, -W / 2, -Hh - 8, W, Hh, 26);
    ctx.fillStyle = body;
    ctx.fill();
    // snooze button on top
    V.fillRound(ctx, -60, -Hh - 22, 120, 18, 8, o.button || '#53535f');
    // screen
    V.fillRound(ctx, -W / 2 + 22, -Hh + 14, W - 44, Hh - 44, 14, '#0b0606');
    const dh = 72;
    const str = time;
    const dw = V.sevenSegWidth(str, dh);
    const glow = o.glow === undefined ? 1 : o.glow;
    V.sevenSeg(ctx, str, -dw / 2, -Hh + 14 + (Hh - 44 - dh) / 2, dh, { glow, colon: o.colon !== false });
    // little PM/alarm dot
    V.circle(ctx, W / 2 - 34, -Hh + 30, 4, ring > 0 ? V.pal.led : 'rgba(255,40,30,0.25)');
    ctx.restore();
    // LED light spill (drawn unscaled, additive)
    if (glow > 0 && o.spill !== false) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 260 * s;
      const g = ctx.createRadialGradient(x, y - 80 * s, 10, x, y - 80 * s, r);
      g.addColorStop(0, `rgba(255,40,20,${0.22 * glow})`);
      g.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - 80 * s - r, r * 2, r * 2);
      ctx.restore();
    }
    // ring lines
    if (ring > 0) {
      ctx.save();
      ctx.strokeStyle = `rgba(255,230,120,${0.9 * ring})`;
      ctx.lineWidth = 7 * s;
      ctx.lineCap = 'round';
      const ph = (t * 6) % 1;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const ang = V.deg(-25 + k * 25);
          const r0 = (180 + ph * 30) * s, r1 = r0 + 45 * s;
          const cx = x, cy = y - 80 * s;
          ctx.beginPath();
          ctx.moveTo(cx + side * Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
          ctx.lineTo(cx + side * Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  };

  // ---------- analog wall clock ----------
  // hours may be fractional/24h; minutes 0..60. o.face, o.rim colours.
  V.wallClock = (ctx, x, y, r, hours, minutes, o = {}) => {
    ctx.save();
    ctx.translate(x, y);
    V.circle(ctx, 0, 0, r + r * 0.12, o.rim || '#2b2b33');
    V.circle(ctx, 0, 0, r, o.face || '#fdfaf2');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r0 = i % 3 === 0 ? r * 0.78 : r * 0.84;
      V.line(ctx, Math.sin(a) * r0, -Math.cos(a) * r0, Math.sin(a) * r * 0.92, -Math.cos(a) * r * 0.92, '#2b2b33', i % 3 === 0 ? r * 0.07 : r * 0.04);
    }
    const tm = (hours % 12) * 60 + minutes;
    const ha = (tm / 720) * Math.PI * 2;
    const ma = (minutes / 60) * Math.PI * 2;
    V.line(ctx, 0, 0, Math.sin(ha) * r * 0.5, -Math.cos(ha) * r * 0.5, o.hand || '#1f1a24', r * 0.09);
    V.line(ctx, 0, 0, Math.sin(ma) * r * 0.74, -Math.cos(ma) * r * 0.74, o.hand || '#1f1a24', r * 0.06);
    V.circle(ctx, 0, 0, r * 0.08, o.accent || V.pal.red);
    ctx.restore();
  };
  // same, but from a "HH:MM" string
  V.wallClockStr = (ctx, x, y, r, str, o) => {
    const m = V.toMin(str);
    V.wallClock(ctx, x, y, r, Math.floor(m / 60), m % 60, o);
  };

  // ---------- phone lock screen ----------
  // (x, y) centre, s scale (1 -> 220x440)
  V.phone = (ctx, x, y, s, time, o = {}) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    V.fillRound(ctx, -110, -220, 220, 440, 34, '#111');
    const g = ctx.createLinearGradient(0, -200, 0, 200);
    g.addColorStop(0, o.top || '#3d3b8e');
    g.addColorStop(1, o.bottom || '#c0508f');
    V.fillRound(ctx, -98, -206, 196, 412, 26, g);
    V.fillRound(ctx, -30, -198, 60, 14, 7, '#111');
    V.text(ctx, time, 0, -110, { size: 74, weight: 500, color: '#fff' });
    if (o.label) V.text(ctx, o.label, 0, -48, { size: 24, weight: 400, color: 'rgba(255,255,255,0.85)' });
    ctx.restore();
  };

  // ---------- sky / weather ----------
  // hour 0..24 -> [top, bottom] colours
  const SKY = [
    [0, '#0b1030', '#1d2752'],
    [5, '#1b1f4a', '#4a3a6a'],
    [6.5, '#6f86c9', '#f7b98a'],
    [7.5, '#8cc4f0', '#fde1b8'],
    [10, '#5fb2ef', '#bfe4fb'],
    [14, '#55a9ea', '#c4e6fa'],
    [16, '#6eaee6', '#fbe0b0'],
    [17.5, '#5f7fc4', '#f6b27a'],
    [18.3, '#3f4a8f', '#f08a6a'],
    [19.3, '#1f2558', '#5b4a85'],
    [21, '#0c1235', '#1e2a5a'],
    [24, '#0b1030', '#1d2752'],
  ];
  V.skyColors = (hour) => {
    hour = ((hour % 24) + 24) % 24;
    for (let i = 0; i < SKY.length - 1; i++) {
      const [h0, t0, b0] = SKY[i], [h1, t1, b1] = SKY[i + 1];
      if (hour >= h0 && hour <= h1) {
        const k = (hour - h0) / (h1 - h0);
        return [V.mixColor(t0, t1, k), V.mixColor(b0, b1, k)];
      }
    }
    return [SKY[0][1], SKY[0][2]];
  };
  V.sky = (ctx, hour, x = 0, y = 0, w = V.W, h = V.H) => {
    const [top, bottom] = V.skyColors(hour);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  V.sun = (ctx, x, y, r, color = '#ffe08a') => {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3);
    g.addColorStop(0, V.rgba(color, 0.55));
    g.addColorStop(1, V.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    V.circle(ctx, x, y, r, color);
    ctx.restore();
  };
  V.moon = (ctx, x, y, r, skyColor = '#0c1235') => {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, r, x, y, r * 3);
    g.addColorStop(0, 'rgba(255,250,220,0.25)');
    g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    V.circle(ctx, x, y, r, '#fff6d6');
    V.circle(ctx, x + r * 0.45, y - r * 0.25, r * 0.88, skyColor);
    ctx.restore();
  };
  V.stars = (ctx, seed, n, x, y, w, h, t = 0, alpha = 1) => {
    ctx.save();
    for (let i = 0; i < n; i++) {
      const sx = x + V.rand(seed + i * 3.1) * w;
      const sy = y + V.rand(seed + i * 7.7) * h;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.5 + V.rand(i) * 2) + i);
      const r = 1.2 + V.rand(seed + i * 1.3) * 2.2;
      ctx.globalAlpha = alpha * tw;
      V.circle(ctx, sx, sy, r, '#ffffff');
    }
    ctx.restore();
  };
  V.cloud = (ctx, x, y, s, color = 'rgba(255,255,255,0.92)') => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    [[0, 0, 50], [55, -18, 62], [115, 0, 48], [60, 18, 52]].forEach(([dx, dy, r]) => {
      ctx.moveTo(x + dx * s + r * s, y + dy * s);
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.restore();
  };

  // ---------- simple scenery used in many places ----------
  V.tree = (ctx, x, groundY, s = 1, o = {}) => {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(s, s);
    V.groundShadow(ctx, 0, 0, 90, 0.18);
    V.fillRound(ctx, -14, -170, 28, 172, 10, o.trunk || V.pal.trunk);
    const leaf = o.leaf || V.pal.leaf, dark = o.leafDark || V.pal.leafDark;
    V.circle(ctx, -50, -200, 70, dark);
    V.circle(ctx, 50, -205, 72, dark);
    V.circle(ctx, 0, -260, 85, leaf);
    V.circle(ctx, -40, -215, 60, leaf);
    V.circle(ctx, 45, -225, 58, V.shade(leaf, 0.08));
    ctx.restore();
  };
  V.streetLamp = (ctx, x, groundY, s = 1, lit = 0) => {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(s, s);
    V.fillRound(ctx, -8, -420, 16, 420, 6, '#3a3f4a');
    V.fillRound(ctx, -8, -430, 70, 14, 7, '#3a3f4a');
    V.fillRound(ctx, 40, -432, 44, 26, 10, '#2b2f38');
    if (lit > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(62, -410, 6, 62, -300, 330);
      g.addColorStop(0, `rgba(255,214,140,${0.55 * lit})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(48, -410);
      ctx.lineTo(76, -410);
      ctx.lineTo(260, 0);
      ctx.lineTo(-140, 0);
      ctx.closePath();
      ctx.fill();
      V.ellipse(ctx, 62, -408, 18, 7, `rgba(255,236,190,${lit})`);
    }
    ctx.restore();
  };

  // Full-frame colour tint (night/evening mood). mode 'multiply' darkens.
  V.tint = (ctx, color, alpha, mode = 'multiply') => {
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.restore();
  };
  // A warm/cool light pool (additive)
  V.lightPool = (ctx, x, y, r, color, alpha) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, V.rgba(color, alpha));
    g.addColorStop(1, V.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };

  // floating "Z" letters for sleep, music notes etc.
  V.floaters = (ctx, x, y, t, o = {}) => {
    const n = o.n || 3;
    const period = o.period || 1.6;
    for (let i = 0; i < n; i++) {
      const k = ((t / period + i / n) % 1 + 1) % 1;
      const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      V.text(ctx, o.char || 'Z', x + k * (o.dx || 60) + Math.sin(k * 6 + i) * 10, y - k * (o.rise || 160), {
        size: (o.size || 46) * (0.7 + k * 0.6),
        color: o.color || '#ffffff',
        alpha: a * (o.alpha || 1),
        weight: 900,
        rtl: false,
      });
    }
  };

  // ---------- movie-style time stamp (bottom-right, typewriter) ----------
  V.drawStamp = (ctx, time, place, t, dur) => {
    const tin = V.seg(t, 0.25, 0.25 + 0.5);
    const out = 1 - V.seg(t, dur - 0.35, dur - 0.05);
    const a = Math.min(V.ease.out(V.seg(t, 0.2, 0.5)), out);
    if (a <= 0) return;
    const x = V.W - 70;
    const yTime = V.H - V.LETTERBOX - 112;
    ctx.save();
    ctx.globalAlpha = a;
    // backing plate
    const plateW = 460;
    const g = ctx.createLinearGradient(x - plateW, 0, x + 40, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(x - plateW, yTime - 62, plateW + 70, 150);
    // time digits (typewriter reveal)
    const chars = Math.ceil(V.clamp(tin) * time.length);
    const shown = time.slice(0, chars);
    ctx.font = "400 92px 'ShareTechMono', monospace";
    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(shown, x, yTime);
    // blinking cursor block
    const cursorOn = Math.floor(t * 2.2) % 2 === 0;
    if (cursorOn) {
      ctx.fillStyle = V.pal.led;
      ctx.fillRect(x + 10, yTime - 34, 16, 66);
    }
    // place line
    const pk = V.seg(t, 0.55, 1.0);
    if (pk > 0) {
      ctx.shadowBlur = 8;
      ctx.globalAlpha = a * V.ease.out(pk);
      ctx.font = "500 40px 'Rubik', sans-serif";
      ctx.direction = 'rtl';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffe8a8';
      ctx.fillText(place, x + 26, yTime + 66);
    }
    ctx.restore();
  };
})();
