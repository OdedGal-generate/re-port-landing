// Scene 15-homework (6 s, 18:30 -> 20:00) — homework montage at the desk, time racing by.
//  The stamp interpolates with k = ease.inOut(seg(t, 0.9, 5.1)); the desk LED clock and the
//  bedside clock show exactly V.lerpTime('18:30', '20:00', k).
//  0.0-0.9  medium close: the hero (grey 'home' outfit) writes in a spiral notebook under the
//           warm desk lamp, tongue out in concentration (pencil scribbling, right-to-left).
//  0.9      the clock starts racing; the camera eases back to a wide shot that shows the window
//           going from dusk to night while he works in fast motion:
//           1.6-2.3 taps his chin with the pencil, thinking ("?"); 2.6 + 3.6 page flips;
//           finished sheets pile up next to the notebook; ~4.3 a sleepy yawn mid-sentence.
//  5.15     slaps the notebook shut (ding + check mark), 5.3 big stretch, arms behind his head.
(function () {
  const V = window.V;
  const B = V.boy, P = B.pose;
  const BR = V.env.BEDROOM, IK = V.env.bedroomIK;
  const S = BR.heroScale;
  const INK = V.pal.ink;
  const DESK = BR.desk.top; // 650
  const lerpP = (a, b, k) => [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)];
  const HIP = BR.chair.hip; // {x: 1642, y: 746}
  const T0 = 0.9, T1 = 5.1;
  const clockK = (t) => V.ease.inOut(V.seg(t, T0, T1));
  const clockStr = (t) => V.lerpTime('18:30', '20:00', clockK(t));

  // ------------------------------------------------------------------ desk-top layout (world)
  // spiral notebook in a slight "cheated" perspective so the page faces the camera a little
  const NB = { nearY: DESK + 1, farY: DESK - 34, x0: 1768, x1: 1904, spine: 1836 };
  const PILE = { x: 1940, w: 58 };
  const CLOCK = { x: 2032, y: DESK, s: 0.27 };
  const LINES = 5;
  const PENCIL_REST = [1934, DESK - 4];
  const closeKOf = (t) => V.ep(t, 5.12, 5.26, 'inOut');
  // page quad helpers: u across (0 = spine side for right page), v from far (0) to near (1)
  const pageXY = (side, u, v) => {
    // side +1 right page, -1 left page
    const nearOuter = side > 0 ? NB.x1 : NB.x0, farOuter = side > 0 ? NB.x1 - 9 : NB.x0 + 9;
    const xs = V.lerp(NB.spine + 1, NB.spine, v);
    const xo = V.lerp(farOuter, nearOuter, v);
    const y = V.lerp(NB.farY, NB.nearY, v) - Math.sin(Math.PI * (1 - u) * 0.5) * 0 - (1 - u) * 2;
    return [V.lerp(xs, xo, u), y];
  };
  const lineV = (i) => (i + 0.75) / (LINES + 0.4);

  // ------------------------------------------------------------------ writing progress
  // lines written on the current right page (0..LINES), keyed per page
  const PAGES = [
    { t0: 0.0, t1: 2.56, keys: [[0.12, 0.3], [0.9, 1.0], [1.62, 3.5], [2.3, 3.5], [2.52, 5]] },
    { t0: 2.56, t1: 3.56, keys: [[2.78, 0], [3.5, 5]] },
    { t0: 3.56, t1: 9, keys: [[3.8, 0], [4.3, 2.3], [4.6, 2.55], [5.04, 5]] },
  ];
  const FLIPS = [[2.53, 2.76], [3.53, 3.76]];
  function pageAt(t) {
    let i = 0;
    while (i < PAGES.length - 1 && t >= PAGES[i].t1) i++;
    return i;
  }
  const progress = (t, i) => V.kf(t, PAGES[i].keys, 'linear');
  // fast-forward amount (0 normal .. 1 racing) for motion smears / scribble speed
  const fastK = (t) => V.seg(t, 0.85, 1.05) * (1 - V.seg(t, 5.0, 5.15));

  // pencil tip position for a progress value p on the right page (writes right-to-left, Hebrew!)
  function tipAt(p) {
    const li = Math.min(LINES - 1, Math.floor(p));
    const f = p >= LINES ? 1 : p - li;
    const v = lineV(li);
    const a = pageXY(1, 0.1, v), b = pageXY(1, 0.9, v);
    let x, y, lift = 0;
    if (f < 0.86 || p >= LINES) {
      const k = Math.min(1, f / 0.86);
      x = V.lerp(b[0], a[0], k);
      y = V.lerp(b[1], a[1], k) + Math.sin(k * 46) * 1.4;
    } else {
      // carriage return to the start of the next line, pencil lifted
      const k = V.ease.inOut((f - 0.86) / 0.14);
      const nv = lineV(Math.min(LINES - 1, li + 1));
      const c = pageXY(1, 0.9, nv);
      x = V.lerp(a[0], c[0], k);
      y = V.lerp(a[1], c[1], k);
      lift = Math.sin(Math.PI * k) * 7;
    }
    return [x, y - lift - 1];
  }

  // ------------------------------------------------------------------ props
  function scribbleLine(ctx, a, b, k, seed, color) {
    // handwriting squiggle from b (right) toward a (left), k = 0..1 of the line written
    if (k <= 0) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const n = Math.max(2, Math.floor(30 * k));
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const u = (i / 30);
      if (u > k) break;
      const gap = V.rand(seed + Math.floor(u * 7) * 3.1) < 0.18 && (u * 7) % 1 < 0.25; // word gaps
      const x = V.lerp(b[0], a[0], u), y = V.lerp(b[1], a[1], u) + Math.sin(u * 95 + seed) * 1.8 - 1;
      if (gap) {
        pen = false;
        continue;
      }
      if (!pen) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      pen = true;
    }
    ctx.stroke();
    ctx.restore();
  }
  function drawPageLines(ctx, side, written, seed) {
    for (let i = 0; i < LINES; i++) {
      const v = lineV(i);
      const a = pageXY(side, 0.06, v), b = pageXY(side, 0.94, v);
      V.line(ctx, a[0], a[1] + 2.5, b[0], b[1] + 2.5, 'rgba(90,140,200,0.35)', 1);
      const k = V.clamp(written - i);
      scribbleLine(ctx, pageXY(side, 0.1, v), pageXY(side, 0.9, v), k, seed + i * 11, '#3b3a52');
    }
    // red margin line on the outer side
    const m0 = pageXY(side, 0.9, 0.02), m1 = pageXY(side, 0.9, 0.98);
    V.line(ctx, m0[0] + side * 2, m0[1], m1[0] + side * 2, m1[1], 'rgba(226,70,60,0.5)', 1.2);
  }
  function pagePoly(ctx, side, fill) {
    const pts = [pageXY(side, 0, 0), pageXY(side, 1, 0), pageXY(side, 1, 1), pageXY(side, 0, 1)];
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  // a page rotating about the spine: theta 0 (lying right) .. PI (lying left)
  function flippingPage(ctx, theta, written, seed, cover) {
    const c = Math.cos(theta), sn = Math.sin(theta);
    const w = NB.x1 - NB.spine;
    const lift = FLIP_LIFT;
    // the hand pulls the NEAR corner; the far corner lags behind, so the sheet twists and still
    // shows its face when it stands upright (a rigid page would be an edge-on sliver here)
    const thF = theta - 0.6 * sn;
    const cF = Math.cos(thF), snF = Math.sin(thF);
    const sNear = [NB.spine, NB.nearY], sFar = [NB.spine + 1, NB.farY];
    const eNear = [NB.spine + w * c, NB.nearY - sn * lift], eFar = [NB.spine + 1 + (w - 9) * cF, NB.farY - snF * lift];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sFar[0], sFar[1]);
    ctx.quadraticCurveTo((sFar[0] + eFar[0]) / 2, (sFar[1] + eFar[1]) / 2 - snF * 14, eFar[0], eFar[1]);
    ctx.lineTo(eNear[0], eNear[1]);
    ctx.quadraticCurveTo((sNear[0] + eNear[0]) / 2, (sNear[1] + eNear[1]) / 2 - sn * 14, sNear[0], sNear[1]);
    ctx.closePath();
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = c > 0 ? '#ffffff' : cover ? '#d24e43' : '#f1efe6';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // a hint of the writing on the visible side
    if (c > 0.25) {
      ctx.clip();
      for (let i = 0; i < 4; i++) {
        const v = lineV(i);
        const y0 = V.lerp(NB.farY, NB.nearY, v);
        V.line(ctx, NB.spine + 8 * c, y0 - sn * lift * 0.4, NB.spine + (w - 12) * c, y0 - sn * lift * 0.9, 'rgba(59,58,82,0.6)', 1.5);
      }
    }
    ctx.restore();
    // motion arc swept by the free edge
    if (sn > 0.15) {
      ctx.save();
      ctx.globalAlpha = 0.7 * sn;
      ctx.beginPath();
      ctx.ellipse(NB.spine, NB.nearY - 6, w + 14, lift + 16, 0, Math.PI + 0.25, Math.PI * 2 - 0.25);
      ctx.strokeStyle = '#fff6dc';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 9]);
      ctx.stroke();
      ctx.restore();
    }
    void written;
    void seed;
  }
  function drawNotebook(ctx, t) {
    const pi = pageAt(t);
    const closeK = closeKOf(t);
    // back cover + page block thickness (grows a little with every flip)
    const thick = 4 + pi * 1.5;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(NB.x0 - 3, NB.nearY + 3);
    ctx.lineTo((closeK > 0.999 ? NB.spine + 4 : NB.x1 + 3), NB.nearY + 3);
    ctx.lineTo((closeK > 0.999 ? NB.spine + 2 : NB.x1 - 6), NB.farY - 1);
    ctx.lineTo(NB.x0 + 6, NB.farY - 1);
    ctx.closePath();
    ctx.fillStyle = '#c2453c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
    V.fillRound(ctx, NB.x0 - 2, NB.nearY - thick + 2, NB.spine - NB.x0, thick, 1, '#efece2', INK, 1.5);
    // left page (earlier work, fully written)
    pagePoly(ctx, -1, '#fdfcf6');
    drawPageLines(ctx, -1, LINES, 900 + pi * 40);
    if (closeK < 0.999) {
      V.fillRound(ctx, NB.spine, NB.nearY - 4 + 2, NB.x1 - NB.spine, 4, 1, '#efece2', INK, 1.5);
      // right page (current work)
      const flipping = FLIPS.find(([a, b]) => t >= a && t < b);
      pagePoly(ctx, 1, '#fdfcf6');
      const written = flipping && t < (flipping[0] + flipping[1]) / 2 ? LINES : progress(Math.min(t, 5.1), pi);
      drawPageLines(ctx, 1, flipping ? (t < flipping[0] + 0.01 ? LINES : 0) : written, pi * 40);
      if (flipping) {
        const k = V.ease.inOut(V.seg(t, flipping[0], flipping[1]));
        flippingPage(ctx, k * Math.PI, LINES, pi);
      }
    }
    // closing: the right half (cover side up) swings over onto the left
    if (closeK > 0) {
      if (closeK < 0.999) flippingPage(ctx, closeK * Math.PI, LINES, 99, true);
      else {
        // closed: red cover with a white label
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(NB.x0 - 3, NB.nearY - thick - 2);
        ctx.lineTo(NB.spine + 3, NB.nearY - thick - 2);
        ctx.lineTo(NB.spine + 2, NB.farY - 4);
        ctx.lineTo(NB.x0 + 6, NB.farY - 4);
        ctx.closePath();
        ctx.fillStyle = '#d24e43';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
        V.fillRound(ctx, NB.x0 + 18, NB.farY + 8, 34, 14, 2, '#fbf6ea', INK, 1.5);
      }
    }
    // spiral binding
    for (let i = 0; i < 7; i++) {
      const v = (i + 0.5) / 7;
      const y = V.lerp(NB.farY, NB.nearY, v);
      const x = V.lerp(NB.spine + 1, NB.spine, v);
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 4, 3, 0, Math.PI * 0.9, Math.PI * 2.1);
      ctx.strokeStyle = '#7b8494';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // open textbook propped up against the wall behind the notebook
  function drawTextbook(ctx) {
    const cx = 1846, base = NB.farY - 2, top = base - 74;
    ctx.save();
    // back cover
    ctx.beginPath();
    ctx.moveTo(cx - 64, top + 8);
    ctx.lineTo(cx, top + 2);
    ctx.lineTo(cx + 64, top + 8);
    ctx.lineTo(cx + 66, base);
    ctx.lineTo(cx - 66, base);
    ctx.closePath();
    ctx.fillStyle = '#1f4f96';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // pages
    const page = (side) => {
      ctx.beginPath();
      ctx.moveTo(cx, top + 6);
      ctx.quadraticCurveTo(cx + side * 30, top + 2, cx + side * 58, top + 10);
      ctx.lineTo(cx + side * 60, base - 3);
      ctx.quadraticCurveTo(cx + side * 30, base - 8, cx, base - 3);
      ctx.closePath();
      ctx.fillStyle = '#e3cf9f';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    page(-1);
    page(1);
    // a triangle diagram (left) and formula lines (right)
    ctx.beginPath();
    ctx.moveTo(cx - 46, base - 14);
    ctx.lineTo(cx - 14, base - 14);
    ctx.lineTo(cx - 14, top + 26);
    ctx.closePath();
    ctx.strokeStyle = '#e2463c';
    ctx.lineWidth = 2;
    ctx.stroke();
    V.text(ctx, 'x²', cx + 22, top + 24, { size: 14, weight: 700, color: '#2f4f86', rtl: false });
    for (let i = 0; i < 4; i++) V.line(ctx, cx + 10, top + 38 + i * 9, cx + 50 - (i % 2) * 10, top + 38 + i * 9, 'rgba(60,60,80,0.55)', 1.6);
    ctx.restore();
  }
  // pile of finished sheets: n sheets (fractional n -> the top one is sliding in)
  function drawPile(ctx, n) {
    const full = Math.floor(n), f = n - full;
    const sheet = (i, dx, dy, a) => {
      const y = DESK - 3 - i * 3.6 + dy;
      const x = PILE.x + (V.rand(i * 3.7) - 0.5) * 6 + dx;
      ctx.save();
      ctx.globalAlpha = a;
      V.fillRound(ctx, x - PILE.w / 2, y - 3, PILE.w, 5, 1.5, '#fbf8ef', INK, 1.6);
      ctx.restore();
    };
    for (let i = 0; i < full; i++) sheet(i, 0, 0, 1);
    if (f > 0) {
      const k = V.ease.out(f);
      sheet(full, (1 - k) * -70, -Math.sin(Math.PI * k) * 26 * (1 - k * 0.3), 1);
    }
  }
  // sheets land on the pile at these times (time-lapse)
  const SHEETS = [1.25, 1.5, 2.44, 2.9, 3.3, 3.62, 4.1, 4.5, 4.86];
  const pileCount = (t) => SHEETS.reduce((n, ts) => n + V.seg(t, ts - 0.12, ts), 1);

  // pencil (world coords): grip at the hand, angle phi (direction eraser -> tip)
  function drawPencil(ctx, hand, phi, s) {
    const dx = Math.cos(phi), dy = Math.sin(phi);
    const tip = [hand[0] + dx * 22 * s, hand[1] + dy * 22 * s];
    const er = [hand[0] - dx * 34 * s, hand[1] - dy * 34 * s];
    const cone = [hand[0] + dx * 12 * s, hand[1] + dy * 12 * s];
    V.line(ctx, er[0], er[1], cone[0], cone[1], INK, 9 * s);
    V.line(ctx, er[0], er[1], cone[0], cone[1], '#f6c945', 6 * s);
    V.line(ctx, er[0], er[1], er[0] + dx * 6 * s, er[1] + dy * 6 * s, '#f08aa0', 6 * s, 'butt');
    V.line(ctx, er[0] + dx * 6 * s, er[1] + dy * 6 * s, er[0] + dx * 9 * s, er[1] + dy * 9 * s, '#b9b9c4', 6 * s, 'butt');
    ctx.beginPath();
    const nx = -dy, ny = dx;
    ctx.moveTo(cone[0] + nx * 4 * s, cone[1] + ny * 4 * s);
    ctx.lineTo(tip[0], tip[1]);
    ctx.lineTo(cone[0] - nx * 4 * s, cone[1] - ny * 4 * s);
    ctx.closePath();
    ctx.fillStyle = '#f3d2a2';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    V.circle(ctx, tip[0] - dx * 1.5, tip[1] - dy * 1.5, 1.8, '#333');
    return tip;
  }

  // ------------------------------------------------------------------ the hero
  const WRITE_PHI = V.deg(62), THINK_PHI = V.deg(98);
  const FLIP_LIFT = 108;
  // free outer edge of a page swinging about the spine (theta 0 = lying right, PI = lying left)
  const pageEdge = (th, dy = 0) => [NB.spine + (NB.x1 - NB.spine - 6) * Math.cos(th), NB.nearY - 8 - Math.sin(th) * FLIP_LIFT + dy];
  const FAR_REST = [1790, DESK - 9];
  function hero(t) {
    const pose = P.sit({ outfit: 'home', facing: 1 });
    const x = HIP.x, y = HIP.y;
    const fk = fastK(t);
    const pi = pageAt(t);
    const stretch = V.ep(t, 5.32, 5.62, 'outBack');
    const think = V.ep(t, 1.6, 1.72) * (1 - V.ep(t, 2.22, 2.34));
    const scratch = V.ep(t, 3.0, 3.08) * (1 - V.ep(t, 3.3, 3.4));
    const yawnK = Math.sin(Math.PI * V.seg(t, 4.28, 4.62));
    const sitUp = V.ep(t, 5.02, 5.14); // proud of the finished work: sits up before closing it
    const flipLean = FLIPS.reduce((m, [a, b]) => Math.max(m, V.ep(t, a - 0.1, a + 0.02) * (1 - V.ep(t, b - 0.02, b + 0.1))), 0);
    // ---- torso / head
    pose.torso = 25 + V.osc(t, 0.7) * 1.5 - think * 7 - yawnK * 6 - scratch * 3;
    pose.head = 16 + V.osc(t * (1 + 3 * fk), 1.6) * 2 - think * 22 - yawnK * 14 + scratch * 6;
    pose.torso -= flipLean * 9;
    pose.head -= flipLean * 8;
    pose.torso = V.lerp(pose.torso, 14, sitUp);
    pose.head = V.lerp(pose.head, 8, sitUp);
    pose.torso = V.lerp(pose.torso, -12, stretch);
    pose.head = V.lerp(pose.head, -14, stretch);
    // ---- face
    pose.eyes = B.blink(t * (1 + fk), 'half', 2);
    pose.mouth = 'neutral';
    pose.brows = -0.3;
    let tongue = t < 1.6 || (t > 2.3 && t < 4.2 && scratch < 0.3);
    if (think > 0.3) {
      pose.eyes = B.blink(t, 'open', 5);
      pose.mouth = 'o';
      pose.brows = 0.8;
      tongue = false;
    }
    if (scratch > 0.3) {
      pose.eyes = 'half';
      pose.mouth = 'frown';
      pose.brows = -0.8;
    }
    if (yawnK > 0.25) {
      pose.eyes = 'closed';
      pose.mouth = 'yawn';
      pose.brows = 0.4;
      tongue = false;
    }
    if (t > 5.06) {
      tongue = false;
      pose.eyes = t < 5.32 ? 'happy' : t < 5.78 ? 'closed' : 'happy';
      pose.mouth = t < 5.32 ? 'grin' : t < 5.78 ? 'yawn' : 'grin';
      pose.brows = 0.6;
    }
    if (tongue) {
      pose.headProp = (c) => {
        V.ellipse(c, 37, 29, 6, 4.5, '#e2717b');
        c.beginPath();
        c.ellipse(37, 29, 6, 4.5, 0, 0, Math.PI);
        c.strokeStyle = INK;
        c.lineWidth = 2.5;
        c.stroke();
      };
    }

    // ---- near hand (holds the pencil): writing -> flips pages -> chin taps -> closes the notebook
    let phi = WRITE_PHI;
    const p = progress(Math.min(t, 5.1), pi);
    const tip = t < 0.12 ? tipAt(0.3) : tipAt(Math.min(p, LINES - 0.001));
    let hn = [tip[0] - Math.cos(phi) * 22, tip[1] - Math.sin(phi) * 22 + V.osc(t, 9 + 9 * fk) * 1.2];
    const flipping = FLIPS.find(([a, b]) => t >= a - 0.08 && t < b + 0.08);
    if (flipping) {
      const [f0, f1] = flipping;
      const th = V.ease.inOut(V.seg(t, f0, f1)) * Math.PI;
      const grab = Math.min(V.ep(t, f0 - 0.08, f0 + 0.01), 1 - V.ep(t, f1 - 0.01, f1 + 0.08));
      hn = lerpP(hn, pageEdge(th, -6), grab);
    }
    let pencilOnDesk = false;
    if (think > 0) {
      const j0 = B.joints(x, y, S, pose);
      const tap = Math.max(0, V.osc(t, 4.5)) * 6;
      const chin = [j0.mouth[0] + 2, j0.mouth[1] + 18 + tap];
      phi = V.lerp(WRITE_PHI, THINK_PHI, think);
      hn = lerpP(hn, [chin[0] + Math.cos(phi) * 34, chin[1] + Math.sin(phi) * 34], think);
    }
    if (t > 5.0) {
      // pencil tossed onto the desk, then the same hand swings the right half over: shut! (slap)
      const down = V.ep(t, 5.0, 5.07);
      hn = lerpP(hn, [PENCIL_REST[0] + 2, PENCIL_REST[1] - 16], down);
      if (t > 5.06) pencilOnDesk = true;
      const grab = V.ep(t, 5.07, 5.12);
      hn = lerpP(hn, pageEdge(closeKOf(t) * Math.PI, -6), grab);
      if (t >= 5.26) hn = [NB.x0 + 52, NB.nearY - 30 + V.kf(t, [[5.26, 0], [5.29, 6], [5.36, 0]])];
    }
    // ---- far hand: rests on the left page; scratches his head when stuck (3.0-3.4)
    let hf = FAR_REST;
    if (scratch > 0) {
      const j0 = B.joints(x, y, S, pose);
      const sc = [j0.head[0] - 6 + V.osc(t, 9) * 12, j0.head[1] - 78 + Math.abs(V.osc(t, 9)) * 6];
      hf = lerpP(FAR_REST, sc, scratch);
    }
    IK.arm(pose, x, y, S, 'near', hn);
    IK.arm(pose, x, y, S, 'far', hf, scratch > 0.5);
    // ---- the big stretch: arms flung up in a V, leaning back in the chair
    if (stretch > 0) {
      const wob = V.osc(t, 1.3) * 3 * V.seg(t, 5.6, 5.8);
      // wide V: the far fist clears the back of his head instead of sitting on the hair
      const tgtN = { sh: 148 + wob, el: 16 }, tgtF = { sh: 224 - wob, el: 16 };
      const k = V.clamp(stretch);
      pose.armNear = { sh: V.lerp(pose.armNear.sh, tgtN.sh, k) + Math.max(0, stretch - 1) * 24, el: V.lerp(pose.armNear.el, tgtN.el, k) };
      pose.armFar = { sh: V.lerp(pose.armFar.sh, tgtF.sh, k) + Math.max(0, stretch - 1) * 24, el: V.lerp(pose.armFar.el, tgtF.el, k) };
    }
    return { x, y, pose, phi, pencilOnDesk, think, fk };
  }

  // ------------------------------------------------------------------ camera
  function cam(t) {
    const x = V.kf(t, [[0, 1872], [0.9, 1866], [2.1, 1612], [4.6, 1640], [5.3, 1744], [6.4, 1756]]);
    const y = V.kf(t, [[0, 572], [0.9, 568], [2.1, 520], [4.6, 524], [5.3, 540], [6.4, 534]]);
    const zoom = V.kf(t, [[0, 2.02], [0.9, 2.1], [2.1, 1.34], [4.6, 1.38], [5.3, 1.62], [6.4, 1.66]]);
    return { x, y, zoom };
  }

  function drawQuestion(ctx, h, t) {
    const a = V.ep(t, 1.66, 1.8, 'outBack') * (1 - V.ep(t, 2.2, 2.32));
    if (a <= 0) return;
    const j = B.joints(h.x, h.y, S, h.pose);
    ctx.save();
    ctx.translate(j.head[0] + 70, j.head[1] - 110 + V.osc(t, 2) * 4);
    ctx.scale(a, a);
    ctx.rotate(0.12 * V.osc(t, 1.5));
    V.text(ctx, '?', 0, 0, { size: 84, weight: 900, color: '#ffffff', stroke: INK, strokeWidth: 9, rtl: false });
    ctx.restore();
  }
  function drawCheck(ctx, t) {
    const a = V.ep(t, 5.28, 5.42, 'outBack');
    if (a <= 0) return;
    const fade = 1 - V.ep(t, 5.9, 6.2);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(1952, NB.farY - 96 - V.ep(t, 5.28, 6.2, 'out') * 24);
    ctx.scale(a, a);
    V.circle(ctx, 0, 0, 30, '#5ab55a', INK, 4);
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.lineTo(-4, 12);
    ctx.lineTo(15, -11);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    // sparkle rays
    const r = V.ep(t, 5.3, 5.6, 'out');
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      V.line(ctx, Math.cos(an) * (40 + r * 14), Math.sin(an) * (40 + r * 14), Math.cos(an) * (52 + r * 22), Math.sin(an) * (52 + r * 22), V.rgba('#fff3b0', 1 - r), 4);
    }
    ctx.restore();
  }

  function draw(ctx, t) {
    const k = clockK(t);
    const time = clockStr(t);
    const hour = V.lerp(18.5, 20.0, k); // window sky: dusk -> night
    const light = V.lerp(0.7, 0.24, k);
    const actorLight = V.lerp(0.88, 0.58, k);
    const c = cam(t);
    const h = hero(t);
    const fk = h.fk;
    V.env.bedroomScene(ctx, { cam: c, hour, light, actorLight, lamp: 1, t, clockTime: time, backpack: true, ball: true, sky: skyExtras(hour, t) }, null, (cx) => {
      drawTextbook(cx);
      drawPile(cx, pileCount(t));
      drawNotebook(cx, t);
      if (h.pencilOnDesk) drawPencil(cx, PENCIL_REST, V.deg(-6), S * 0.85);
      B.draw(cx, h.x, h.y, S, h.pose);
      const j = B.joints(h.x, h.y, S, h.pose);
      if (!h.pencilOnDesk) {
        const tip = drawPencil(cx, j.nearHand, h.phi, S * 0.85);
        // fast-forward smear around the scribbling hand
        if (fk > 0.3 && h.think < 0.2 && t < 5.04) {
          cx.save();
          cx.globalAlpha = 0.55 * fk;
          for (let i = 0; i < 3; i++) {
            const a0 = t * 40 + i * 2.1;
            cx.beginPath();
            cx.arc(tip[0] + 6, tip[1] - 16, 26 + i * 7, a0, a0 + 1.1);
            cx.strokeStyle = '#fff4d6';
            cx.lineWidth = 2.5;
            cx.stroke();
          }
          cx.restore();
        }
      }
      // the desk LED clock (body lit by the room; digits redrawn bright below)
      V.alarmClock(cx, CLOCK.x, CLOCK.y, CLOCK.s, time, { glow: 0, spill: false });
    });
    // overlay pass in world coords: bright LED digits, lamp glow on the clock, "?", check mark
    ctx.save();
    V.env.bedroomCam(ctx, c);
    // extra warm spill from the desk lamp over the hero and the desk
    V.lightPool(ctx, 1820, 600, 560, '#ffae5c', 0.07 + 0.07 * k);
    {
      const s = CLOCK.s;
      const dw = V.sevenSegWidth(time, 72 * s);
      // off: null -> no second (glowing) set of unlit segments on top of the body's own, so the
      // leading '1' of 18:xx / 19:xx doesn't read as an '8'
      V.sevenSeg(ctx, time, CLOCK.x - dw / 2, CLOCK.y - 150 * s + 14 * s + (150 - 44 - 72) / 2 * s, 72 * s, { glow: 1, off: null });
      V.lightPool(ctx, CLOCK.x, CLOCK.y - 26, 90, '#ff3a22', 0.12 + 0.2 * k);
    }
    drawQuestion(ctx, h, t);
    drawCheck(ctx, t);
    ctx.restore();
  }

  // a setting sun sinking behind the rooftops in the window (the env draws its own sun at the
  // window edge until 18.6 h and then drops it in one frame: we paint that one out and draw ours)
  function skyExtras(hour, t) {
    return (ctx, r) => {
      // The env pops its moon in at full strength from ~18.3 h and bites the crescent out with a
      // flat sky-top disc, which shows as a dark blot on the dusk gradient. Repaint that patch
      // (sky, stars, the cloud that drifts over it) and draw a true crescent that fades in after
      // the sun has set.
      const nk = V.env.bedroomParts.nightK(hour);
      if (nk > 0.05) {
        const mx = r.x + r.w * 0.74, my = r.y + r.h * 0.24, mr = 26;
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, mr * 3 + 3, 0, Math.PI * 2);
        ctx.clip();
        V.sky(ctx, hour, r.x, r.y, r.w, r.h);
        V.stars(ctx, 41, 22, r.x, r.y, r.w, r.h * 0.55, t, nk);
        const ma = V.ease.inOut(V.seg(hour, 18.75, 19.4));
        if (ma > 0) {
          ctx.globalAlpha = ma;
          const g = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 3);
          g.addColorStop(0, 'rgba(255,250,220,0.25)');
          g.addColorStop(1, 'rgba(255,250,220,0)');
          ctx.fillStyle = g;
          ctx.fillRect(mx - mr * 3, my - mr * 3, mr * 6, mr * 6);
          // crescent as ONE closed path (outer lit arc + inner bite arc), no seams
          const bx = mr * 0.45, by = -mr * 0.25, br = mr * 0.88;
          const d = Math.hypot(bx, by), thc = Math.atan2(by, bx);
          const al = Math.acos(V.clamp((mr * mr - br * br + d * d) / (2 * d * mr), -1, 1));
          const i1 = [mr * Math.cos(thc + al), mr * Math.sin(thc + al)];
          const i2 = [mr * Math.cos(thc - al), mr * Math.sin(thc - al)];
          ctx.beginPath();
          ctx.arc(mx, my, mr, thc + al, thc + Math.PI * 2 - al, false);
          ctx.arc(mx + bx, my + by, br, Math.atan2(i2[1] - by, i2[0] - bx), Math.atan2(i1[1] - by, i1[0] - bx), true);
          ctx.closePath();
          ctx.fillStyle = '#fff6d6';
          ctx.fill();
        }
        if (nk < 0.9) {
          ctx.globalAlpha = 1 - nk;
          V.cloud(ctx, r.x + 210 + ((t * 6) % 80), r.y + 92, 0.42);
        }
        ctx.restore();
      }
      if (hour < 18.6) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x + 337, r.y + r.h * 0.62, 96, 0, Math.PI * 2);
        ctx.clip();
        V.sky(ctx, hour, r.x, r.y, r.w, r.h);
        ctx.restore();
      }
      const set = V.seg(hour, 18.5, 18.8);
      if (set < 1) {
        const sx = r.x + 150, sy = V.lerp(r.y + 214, r.y + 300, set);
        ctx.save();
        ctx.globalAlpha = 1 - 0.3 * set;
        V.sun(ctx, sx, sy, 26, V.mixColor('#ffc070', '#ff8a50', set));
        ctx.restore();
      }
    };
  }

  V.registerScene('15-homework', {
    sfx: [
      { t: 0.3, type: 'pencil', dur: 1.5 },
      { t: 0.9, type: 'clock_fast', dur: 4.2, vol: 0.5 },
      { t: 2.6, type: 'page' },
      { t: 2.8, type: 'pencil', dur: 0.7, vol: 0.7 },
      { t: 3.6, type: 'page' },
      { t: 3.8, type: 'pencil', dur: 1.2 },
      { t: 5.26, type: 'clap', vol: 0.4 },
      { t: 5.3, type: 'ding' },
    ],
    draw(ctx, t) {
      draw(ctx, Math.min(t, 6.4));
    },
  });
})();
