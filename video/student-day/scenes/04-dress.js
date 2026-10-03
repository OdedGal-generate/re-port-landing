// Scene 04-dress (5 s, 07:48) — the speed-dressing montage, by the open wardrobe.
//  Shot A (0 – CUT): medium-wide on the hero (towel) beside the open wardrobe, morning light.
//    0.00  hands on hips, sizing up the wardrobe; 0.28 rubs his hands with a scheming grin
//    0.62  crouches (anticipation) -> 0.80 WHOOSH: dust-cloud spin, a white tee zips in from the
//          wardrobe -> 1.25 revealed in the school tee (+ towel), "ta-da" arms
//    1.80  WHOOSH #2: jeans zip in, the towel is flung out of the cloud and lands on the desk lamp
//          -> 2.25 tee + jeans, hands on hips, then notices his bare feet
//    2.60  WHOOSH #3: the sneakers leave the wardrobe floor -> 2.92 he is down on one knee,
//          tying the laces at super speed, 3.18 tug!
//    3.22  grabs the blue backpack from the floor, rises, 3.53 zips it (zipper), 3.7 tosses it
//          up over his head and it drops onto his back (lands 3.96)
//  Shot B (CUT – end): over-the-shoulder into the wardrobe mirror: fixes his hair, teeth sparkle
//          (4.4), finger guns + wink at his reflection.
(function () {
  const V = window.V;
  const B = V.boy, P = B.pose;
  const BR = V.env.BEDROOM, IK = V.env.bedroomIK;
  const S = BR.heroScale; // 1.25
  const INK = V.pal.ink;
  const FLOOR = BR.floorY;
  const HX = 2150; // hero hip x (beside the wardrobe, facing it)
  const HX2 = HX + 96; // after rising from the kneel
  const CUT = 4.05;
  const BAG = { x: 2440, color: '#3b7dd8' }; // backpack on the floor, leaning in the wardrobe
  const CLOUDS = [
    { t0: 0.8, swap: 1.0, t1: 1.25 },
    { t0: 1.8, swap: 2.0, t1: 2.25 },
    { t0: 2.6, swap: 2.76, t1: 2.94 },
  ];
  const OUT_TOWEL = 'towel';
  const OUT_TEE = { shirt: '#fbfbf7', logo: true, sleeves: 'short', towel: '#4fb3a9', pants: null, pantsLen: 'none', shoes: 'bare' };
  const OUT_JEANS = { shirt: '#fbfbf7', logo: true, sleeves: 'short', pants: '#2f4f86', pantsLen: 'long', shoes: 'bare' };
  const OUT_FULL = 'school';

  // wardrobe interior geometry (mirrors env/bedroom.js drawClothes, for the "item taken" patches)
  const WR = BR.wardrobe;
  const IX0 = WR.x0 + 14, IX1 = WR.x1 - 14, IT = WR.top + 14, IB = WR.bottom - 16;
  const TY = IT + 60;
  const itemX = (i) => V.lerp(IX0 + 40, IX1 - 40, i / 5);
  const INTERIOR = '#3a2b22';

  // ------------------------------------------------------------------ small helpers
  const poly = (ctx, pts, fill, stroke, lw = 3) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };
  const lerpP = (a, b, k) => [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)];
  // keyframed 2D point
  const kf2 = (t, keys, e) => [V.kf(t, keys.map((k) => [k[0], k[1][0]]), e), V.kf(t, keys.map((k) => [k[0], k[1][1]]), e)];

  // ------------------------------------------------------------------ garments (flying / props)
  const teePts = (L) => [[-24, 0], [24, 0], [36, 30], [26, 38], [24, L], [-24, L], [-26, 38], [-36, 30]];
  function drawTee(ctx, x, y, rot, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    poly(ctx, teePts(110).map(([a, b]) => [a, b - 55]), '#fbfbf7', INK, 3.5);
    ctx.beginPath();
    ctx.moveTo(-10, -55);
    ctx.quadraticCurveTo(0, -44, 10, -55);
    ctx.strokeStyle = '#b9b5ad';
    ctx.lineWidth = 3;
    ctx.stroke();
    V.circle(ctx, 8, -18, 9, V.pal.navy);
    V.circle(ctx, 8, -18, 4, V.pal.yellow);
    ctx.restore();
  }
  function drawJeans(ctx, x, y, rot, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const c = '#2f4f86';
    poly(ctx, [[-24, -90], [24, -90], [27, 90], [5, 90], [0, -24], [-5, 90], [-27, 90]], c, INK, 3.5);
    V.line(ctx, -22, -78, 22, -78, V.shade(c, -0.25), 4);
    V.line(ctx, 8, -76, 6, -46, V.shade(c, 0.25), 2.5);
    ctx.restore();
  }
  function drawSneakerShape(ctx, x, y, rot, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    V.fillRound(ctx, -28, -13, 56, 26, 11, '#f4f4f4', INK, 3.5);
    V.fillRound(ctx, -28, 6, 56, 7, 3, '#cfcfcf');
    V.line(ctx, -10, -3, 10, -5, V.pal.red, 5);
    ctx.restore();
  }
  function drawFlyingTowel(ctx, x, y, rot, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    const c = '#4fb3a9';
    ctx.beginPath();
    const w = 90, h = 62;
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const px = -w / 2 + u * w, py = -h / 2 + Math.sin(u * 6 + t * 30) * 7;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    for (let i = 12; i >= 0; i--) {
      const u = i / 12;
      const px = -w / 2 + u * w, py = h / 2 + Math.sin(u * 6 + t * 30 + 1) * 7;
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    for (let k = 0; k < 2; k++) V.line(ctx, -36, -8 + k * 18, 36, -8 + k * 18 + Math.sin(t * 30 + k) * 4, V.shade(c, 0.25), 4);
    ctx.restore();
  }
  // speed-line trail behind a flying item
  function trail(ctx, from, to, k, n, color) {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const p = lerpP(from, to, k);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 16;
      const len = 70 + 40 * V.rand(i * 3.3);
      V.line(ctx, p[0] - ux * 30 - uy * off, p[1] - uy * 30 + ux * off, p[0] - ux * (30 + len) - uy * off, p[1] - uy * (30 + len) + ux * off, color, 4);
    }
  }

  // ------------------------------------------------------------------ the backpack
  // local frame: origin = top handle (where a hand grips); the body hangs below (+y)
  const BAG_W = 68, BAG_H = 140;
  function drawBag(ctx, x, y, rot, zip, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const c = BAG.color;
    // handle loop
    ctx.beginPath();
    ctx.moveTo(-12, 16);
    ctx.quadraticCurveTo(0, -12, 12, 16);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = '#2f68b8';
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // shoulder strap (side view, curls off the back)
    if (o.strap !== false) {
      ctx.beginPath();
      ctx.moveTo(BAG_W / 2 - 6, 26);
      ctx.quadraticCurveTo(BAG_W / 2 + 22, 70, BAG_W / 2 - 4, 118);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 13;
      ctx.stroke();
      ctx.strokeStyle = '#2b5fa8';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    V.fillRound(ctx, -BAG_W / 2, 10, BAG_W, BAG_H, 22, c, INK, 4);
    // front pocket
    V.fillRound(ctx, -BAG_W / 2 + 9, 72, BAG_W - 18, 54, 12, '#2f68b8', INK, 3);
    V.line(ctx, -BAG_W / 2 + 16, 86, BAG_W / 2 - 16, 86, '#f6c945', 3);
    // main zipper along the top: open gap -> closed
    const z = V.clamp(zip === undefined ? 1 : zip);
    const zx0 = -BAG_W / 2 + 10, zx1 = BAG_W / 2 - 10, zy = 28;
    if (z < 1) {
      // open mouth: dark gap with a notebook corner peeking out
      const gx = V.lerp(zx0, zx1, z);
      V.fillRound(ctx, gx, zy - 5, zx1 - gx, 10, 5, '#162a4a');
      if (z < 0.6) poly(ctx, [[zx1 - 26, zy - 2], [zx1 - 8, zy - 14], [zx1 - 2, zy - 4]], '#e2463c', INK, 2.5);
    }
    V.line(ctx, zx0, zy, V.lerp(zx0, zx1, z), zy, '#f6c945', 3);
    const pz = V.lerp(zx0, zx1, z);
    V.fillRound(ctx, pz - 4, zy - 2, 8, 14, 3, '#d9d2c4', INK, 2);
    ctx.restore();
  }

  // ------------------------------------------------------------------ dust-cloud spin
  // a cartoon whirlwind (funnel, wider at the top) around (cx, yTop..yBot). k 0..1 over its life:
  // 0-0.2 it whips up around him, 0.2-0.68 it hides him completely, 0.68-1 it bursts into puffs.
  function twisterShape(cx, yBot, yTop, k, t, seed, ws = 1) {
    const form = V.ease.outBack(V.seg(k, 0, 0.24));
    const fade = V.seg(k, 0.66, 1);
    // on the way out the whirlwind lifts off the floor and shrinks up into the ceiling
    const yB = V.lerp(yBot, yTop - 30, V.ease.in(fade));
    const n = 16;
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n;
      const y = V.lerp(yB, yTop - 60 * fade, v);
      const hw = (86 + 56 * Math.pow(v, 1.3)) * ws * form * (1 - 0.35 * fade) + 9 * Math.sin(v * 9 - t * 34 + seed);
      const sway = 9 * Math.sin(v * 4.5 + t * 20 + seed) * form;
      L.push([cx + sway - Math.max(0, hw), y]);
      R.push([cx + sway + Math.max(0, hw + 6 * Math.sin(v * 7 + t * 29)), y]);
    }
    return { L, R, form, fade, yB };
  }
  function drawTwister(ctx, cx, yBot, yTop, k, t, seed, ws = 1) {
    if (k <= 0 || k >= 1) return;
    const { L, R, form, fade, yB } = twisterShape(cx, yBot, yTop, k, t, seed, ws);
    const alpha = 1 - V.seg(fade, 0.75, 1);
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (alpha > 0.01 && form > 0.02) {
      ctx.globalAlpha = alpha;
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(L[0][0], L[0][1]);
        R.forEach((p) => ctx.lineTo(p[0], p[1]));
        for (let i = L.length - 1; i >= 0; i--) ctx.lineTo(L[i][0], L[i][1]);
        ctx.closePath();
      };
      // scalloped dust puffs along both edges, the top and the base
      const puffs = [];
      for (let i = 1; i < L.length; i += 2) {
        const v = i / (L.length - 1);
        const r = (22 + 8 * v + 7 * Math.sin(t * 38 + i * 1.9 + seed)) * form;
        puffs.push([L[i][0] + 4, L[i][1], r, '#d8d0c6']);
        puffs.push([R[i][0] - 4, R[i][1] + 6, r * 0.95, '#ddd5ca']);
      }
      const tl = L[L.length - 1], tr = R[R.length - 1];
      for (let i = 0; i < 4; i++) {
        const u = (i + 0.5) / 4;
        puffs.push([V.lerp(tl[0], tr[0], u), tl[1] - 4 + 6 * Math.sin(t * 30 + i), (30 + 6 * Math.sin(t * 27 + i * 2)) * form, '#f1ede6']);
      }
      for (let i = 0; i < 5; i++) {
        const u = (i + 0.5) / 5;
        puffs.push([V.lerp(L[0][0] - 30, R[0][0] + 30, u), yB - 18 - 6 * Math.sin(t * 33 + i), (28 + 8 * Math.sin(t * 29 + i * 1.3)) * form, '#e2dacd']);
      }
      // outline pass, then fills -> one merged silhouette
      body();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.stroke();
      puffs.forEach(([x, y, r]) => V.circle(ctx, x, y, r + 4.5, INK));
      const g = ctx.createLinearGradient(cx - 160, 0, cx + 160, 0);
      g.addColorStop(0, '#d6cec3');
      g.addColorStop(0.45, '#f7f5f1');
      g.addColorStop(0.62, '#ffffff');
      g.addColorStop(1, '#d3cabd');
      body();
      ctx.fillStyle = g;
      ctx.fill();
      puffs.forEach(([x, y, r, c]) => V.circle(ctx, x, y, r, c));
      puffs.forEach(([x, y, r]) => V.circle(ctx, x - r * 0.15, y - r * 0.25, r * 0.5, 'rgba(255,255,255,0.75)'));
      ctx.save();
      body();
      ctx.clip();
      // swirl bands travelling up the funnel
      for (let i = 0; i < 6; i++) {
        const v = (i / 6 + t * 2.6) % 1;
        const idx = v * (L.length - 1);
        const a = Math.floor(idx), b = Math.min(L.length - 1, a + 1), f = idx - a;
        const lx = V.lerp(L[a][0], L[b][0], f), rx = V.lerp(R[a][0], R[b][0], f), y = V.lerp(L[a][1], L[b][1], f);
        const mx = (lx + rx) / 2, hw = (rx - lx) / 2;
        ctx.beginPath();
        ctx.ellipse(mx, y, hw * 0.96, 18, 0, 0.12 * Math.PI, 0.7 * Math.PI);
        ctx.strokeStyle = 'rgba(110,95,80,0.55)';
        ctx.lineWidth = 4.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(mx, y - 10, hw * 0.7, 12, 0, 0.3 * Math.PI, 0.62 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.restore();
      // whirling speed arcs outside the column
      ctx.globalAlpha = alpha * form;
      for (let i = 0; i < 4; i++) {
        const y = V.lerp(yBot - 70, yTop + 50, (i + 0.5) / 4);
        const a0 = (t * 21 + i * 1.9) % (Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(cx, y, 190 + 14 * i, 34, 0, a0, a0 + 1.5);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    }
    // dust left on the floor rolls outward and shrinks away as the whirlwind lifts off
    if (fade > 0) {
      ctx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1;
        const d = V.ease.out(fade) * (60 + 120 * V.rand(i + seed));
        const x = cx + side * (70 + 26 * (i >> 1) + d);
        const y = yBot - 16 - 10 * V.rand(i * 2.7 + seed) - d * 0.12;
        const r = (26 + 12 * V.rand(i * 5.1 + seed)) * (1 - V.ease.in(fade));
        if (r < 1) continue;
        V.circle(ctx, x, y, r + 4, INK);
        V.circle(ctx, x, y, r, '#ece7df');
        V.circle(ctx, x - r * 0.2, y - r * 0.25, r * 0.55, '#ffffff');
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ hero, shot A
  const STAND = P.stand();
  const STAND_Y = B.standY(FLOOR, S, STAND);
  const J0 = B.joints(HX, STAND_Y, S, STAND);
  const FOOT_N = [J0.nearAnkle[0] + 8, J0.nearAnkle[1]];
  const FOOT_F = [J0.farAnkle[0] - 8, J0.farAnkle[1]];
  // one knee down: front foot flat, back knee on the floor, toes tucked
  const KNEEL = { hip: [HX + 10, 758], footN: [HX + 130, FLOOR - 11 * S], footF: [HX - 112, FLOOR - 52] };
  const FOOT_F2 = [HX2 - 34, FLOOR - 11 * S];
  const STAND_Y2 = STAND_Y + 4;
  const LAMP_TOWEL = [BR.lamp.head.x - 4, BR.lamp.head.y - 22];

  function outfitAt(t) {
    if (t < CLOUDS[0].swap) return OUT_TOWEL;
    if (t < CLOUDS[1].swap) return OUT_TEE;
    if (t < CLOUDS[2].swap) return OUT_JEANS;
    return OUT_FULL;
  }
  function cloudAt(t) {
    for (const c of CLOUDS) if (t > c.t0 && t < c.t1) return { c, k: V.seg(t, c.t0, c.t1), i: CLOUDS.indexOf(c) };
    return null;
  }
  // spin angle during a cloud: ~3 turns, eased in and out
  function spinAngle(t) {
    const cl = cloudAt(t);
    return cl ? V.ease.inOut(V.seg(cl.k, 0, 0.8)) * Math.PI * 2 * 3 : 0;
  }

  function heroA(t) {
    const pose = P.stand({ outfit: outfitAt(t), facing: 1 });
    let x = HX, y = STAND_Y;
    const crouch = Math.max(
      V.kf(t, [[0.6, 0], [0.74, 1], [0.84, 0.4], [0.95, 0]]),
      V.kf(t, [[1.58, 0], [1.74, 1], [1.84, 0.4], [1.95, 0]]),
      V.kf(t, [[2.5, 0], [2.58, 0.8], [2.66, 0]]),
    );
    const bounce = V.kf(t, [[1.12, 0], [1.25, 1], [1.38, -0.2], [1.5, 0]]) + V.kf(t, [[2.12, 0], [2.24, 0.6], [2.36, -0.15], [2.48, 0]]);
    const kneelDown = t < 2.68 ? 0 : V.ep(t, 2.68, 2.78);
    const rise = V.ep(t, 3.24, 3.5);
    const land = V.kf(t, [[3.94, 0], [3.99, 1], [4.05, 0.3]], 'sine');

    // ---------- hip + legs
    if (t < 2.68) {
      y += crouch * 34 - bounce * 16;
      IK.leg(pose, x, y, S, 'near', FOOT_N, 90);
      IK.leg(pose, x, y, S, 'far', FOOT_F, 90);
      if (t > 2.36 && t < 2.56) {
        // bare-feet toe wiggle
        const w = Math.sin((t - 2.36) * 50) * 14 * Math.sin(Math.PI * V.seg(t, 2.36, 2.56));
        pose.legNear.foot += w;
        pose.legFar.foot -= w;
      }
    } else if (t < 3.24) {
      // dropping into the kneel (hidden inside cloud #3)
      const hip = lerpP([HX, STAND_Y], KNEEL.hip, kneelDown);
      x = hip[0];
      y = hip[1] + 3 * V.osc(t, 5.5) * V.seg(t, 2.9, 3.0);
      IK.leg(pose, x, y, S, 'near', lerpP(FOOT_N, KNEEL.footN, kneelDown), 90);
      IK.leg(pose, x, y, S, 'far', lerpP(FOOT_F, KNEEL.footF, kneelDown), V.lerp(90, 30, kneelDown));
    } else {
      // rising: hip moves up and forward over the planted front foot, back foot steps up
      x = V.lerp(KNEEL.hip[0], HX2, V.ease.out(rise));
      y = V.lerp(KNEEL.hip[1], STAND_Y2, rise) + land * 10;
      IK.leg(pose, x, y, S, 'near', KNEEL.footN, 90);
      const fk = V.ep(t, 3.27, 3.52);
      const f = lerpP(KNEEL.footF, FOOT_F2, fk);
      f[1] -= Math.sin(Math.PI * fk) * 26;
      IK.leg(pose, x, y, S, 'far', f, V.lerp(30, 90, V.ep(t, 3.27, 3.45)));
    }

    // ---------- torso / head
    pose.torso = V.kf(t, [[0, 0], [0.3, 4], [0.62, 8], [0.74, 16], [0.9, 2], [1.25, -8], [1.5, -3], [1.74, 14], [1.9, 2], [2.25, -4], [2.4, 10], [2.5, 14], [2.62, 4]]);
    // 2.38-2.5: chin down, looking at his bare feet
    pose.head = V.kf(t, [[0, -6], [0.3, 0], [0.62, 8], [0.9, 0], [1.25, -10], [1.5, 4], [1.74, 10], [1.9, 0], [2.25, -6], [2.38, 38], [2.5, 36], [2.62, 0]]);
    if (t >= 2.62) {
      const kn = t < 3.24 ? kneelDown : 1 - rise;
      const up = V.kf(t, [[3.5, 4], [3.6, 2], [3.72, -10], [3.84, -14], [3.96, 2], [4.05, 0]]);
      const upH = V.kf(t, [[3.5, 8], [3.6, 16], [3.72, -14], [3.84, -26], [3.92, -6], [4.05, -2]]);
      pose.torso = V.lerp(up, t < 3.24 ? V.lerp(40, 64, V.ep(t, 2.8, 2.92)) : 64, kn);
      pose.head = V.lerp(upH, 24, kn) + (t < 3.2 ? V.osc(t, 9) * 2 : 0);
    }

    // ---------- face
    pose.eyes = B.blink(t, 'open', 4);
    pose.mouth = 'smile';
    pose.brows = 0.2;
    if (t < 0.28) {
      pose.mouth = 'neutral';
      pose.brows = 0.5;
    } else if (t < 0.62) {
      pose.mouth = 'grin';
      pose.brows = -0.7;
      pose.eyes = 'half';
    } else if (t < 0.8 || (t > 1.6 && t < 1.8) || (t > 2.52 && t < 2.6)) {
      pose.eyes = 'closed';
      pose.mouth = 'grin';
      pose.brows = -0.4;
    } else if (t > 1.2 && t < 1.6) {
      pose.eyes = t < 1.34 ? 'happy' : 'half';
      pose.mouth = t < 1.34 ? 'grin' : 'smile';
      pose.brows = 0.7;
    } else if (t > 2.2 && t < 2.52) {
      pose.eyes = t > 2.36 ? 'wide' : 'happy';
      pose.mouth = t > 2.36 ? 'o' : 'grin';
      pose.brows = t > 2.36 ? 1 : 0.4;
    } else if (t > 2.85 && t < 3.24) {
      pose.eyes = 'half';
      pose.mouth = t > 3.14 ? 'grin' : 'neutral';
      pose.brows = -0.6;
    } else if (t >= 3.24) {
      pose.eyes = B.blink(t, 'open', 1);
      pose.mouth = t > 3.52 && t < 3.68 ? 'teeth' : 'smile';
      pose.brows = 0.3;
      if (t > 3.72 && t < 3.94) {
        pose.mouth = 'o';
        pose.brows = 0.9;
      } else if (t >= 3.94) {
        pose.mouth = 'grin';
        pose.eyes = 'happy';
      }
    }
    const cl = cloudAt(t);
    if (cl && cl.k > 0.04 && cl.k < 0.96) {
      pose.eyes = 'wide';
      pose.mouth = 'open';
    }

    // ---------- arms: hand targets (world), IK
    const hipRel = (dx, dy) => [x + dx, y + dy];
    const HIPS_N = hipRel(26, -18), HIPS_F = hipRel(-26, -14);
    const TUCK_N = hipRel(48, -80), TUCK_F = hipRel(30, -70);
    let hn, hf, flipN = false, flipF = false;
    if (t < 0.28) {
      // he has just flung the wardrobe open: arm follows through, then hands on hips
      const k = V.ep(t, 0.06, 0.26, 'inOut');
      hn = lerpP(hipRel(150, -150), HIPS_N, k);
      hf = lerpP(hipRel(-90, -120), HIPS_F, k);
      flipN = k > 0.5;
      flipF = true;
    } else if (t < 0.62) {
      // rubbing his hands: far hand a little higher + further forward so both hands read
      const rub = V.osc(t, 9) * 9 * V.seg(t, 0.36, 0.42);
      const k = V.ep(t, 0.28, 0.4);
      hn = lerpP(HIPS_N, hipRel(86 + rub, -116), k);
      hf = lerpP(HIPS_F, hipRel(100 - rub, -142), k);
      flipN = flipF = k < 0.5;
    } else if (t < 1.25) {
      const k = V.ep(t, 0.62, 0.74);
      hn = lerpP(hipRel(86, -116), TUCK_N, k);
      hf = lerpP(hipRel(100, -142), TUCK_F, k);
    } else if (t < 1.58) {
      // model pose: far hand behind the head (elbow up), near hand on the hip, chin up
      const k = V.ep(t, 1.22, 1.34, 'outBack');
      hn = lerpP(TUCK_N, HIPS_N, k);
      hf = lerpP(TUCK_F, hipRel(-34, -262), k);
      flipN = k > 0.5;
      flipF = true;
    } else if (t < 2.25) {
      const k = V.ep(t, 1.58, 1.72);
      hn = lerpP(HIPS_N, TUCK_N, k);
      hf = lerpP(hipRel(-34, -262), TUCK_F, k);
      flipN = flipF = k < 0.5;
    } else {
      // proud hands on hips, then points down at his bare feet
      const k = V.ep(t, 2.22, 2.32, 'outBack');
      hn = lerpP(TUCK_N, HIPS_N, k);
      hf = lerpP(TUCK_F, HIPS_F, k);
      flipN = flipF = k > 0.5;
      const k2 = V.ep(t, 2.38, 2.48) * (1 - V.ep(t, 2.54, 2.62));
      if (k2 > 0) {
        hn = lerpP(hn, hipRel(118, 30), k2);
        flipN = k2 < 0.5;
      }
      if (t > 2.6) {
        const k3 = V.ep(t, 2.6, 2.7);
        hn = lerpP(hn, TUCK_N, k3);
        hf = lerpP(hf, TUCK_F, k3);
        flipN = flipF = false;
      }
    }
    const out = { x, y, pose };
    if (t < 2.76) {
      IK.arm(pose, x, y, S, 'near', hn, flipN);
      IK.arm(pose, x, y, S, 'far', hf, flipF);
    } else {
      const j = B.joints(x, y, S, pose);
      out.lace = laceSpot(j);
      if (t < 3.22) {
        const blur = t < 3.13 ? 1 : 0;
        const tug = V.ep(t, 3.12, 3.2, 'outBack');
        const o1 = V.osc(t, 11) * 11 * blur, o2 = V.osc(t, 11, 0.5) * 11 * blur;
        const L = out.lace;
        IK.arm(pose, x, y, S, 'near', [L[0] + 10 + o1 + tug * 40, L[1] - 8 - tug * 30]);
        IK.arm(pose, x, y, S, 'far', [L[0] - 8 + o2 - tug * 20, L[1] - 4 - tug * 34]);
      } else {
        const bag = bagState(t, x, y);
        out.bag = bag;
        IK.arm(pose, x, y, S, 'near', bag.nearHand, bag.flipN);
        IK.arm(pose, x, y, S, 'far', bag.farHand, bag.flipF);
      }
    }
    if (t >= 3.96) pose.backpack = true;
    return out;
  }

  // top of the near shoe (where the laces are), from the joints
  function laceSpot(j) {
    const a = j.nearAnkle, toe = j.nearToe;
    const dx = toe[0] - a[0], dy = toe[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const nx = uy, ny = -ux; // facing right: the top of the shoe
    return [a[0] + ux * 12 * S + nx * 12 * S, a[1] + uy * 12 * S + ny * 12 * S, ux, uy, nx, ny];
  }

  // backpack: on the floor -> grabbed (3.22) -> lifted to the chest -> zipped -> tossed up over
  // his head -> drops onto his back (3.96)
  function bagState(t, x, y) {
    const floorHandle = [BAG.x, FLOOR - BAG_H - 10];
    const chest = [x + 96, y - 176];
    const apex = [x + 4, y - 500];
    const back = [x - 64, y - 155];
    let handle, rot, zip = 0, behind = false, held = true;
    let nearHand, farHand, flipN = false, flipF = false;
    if (t < 3.3) {
      handle = floorHandle;
      rot = -0.08;
      const k = V.ep(t, 3.18, 3.3);
      nearHand = lerpP([x + 150, y + 60], [handle[0] - 2, handle[1] + 6], k);
      farHand = [x + 100, y + 70];
      held = k > 0.95;
    } else if (t < 3.52) {
      const k = V.ep(t, 3.3, 3.52);
      handle = [V.lerp(floorHandle[0], chest[0], k), V.lerp(floorHandle[1], chest[1], k) - Math.sin(Math.PI * k) * 24];
      rot = V.lerp(-0.08, 0.06, k) + Math.sin(k * Math.PI * 2) * 0.14 * (1 - k);
      nearHand = [handle[0] - 2, handle[1] + 6];
      farHand = lerpP([x + 70, y + 20], [handle[0] - 30, handle[1] + 70], V.ep(t, 3.38, 3.52));
    } else if (t < 3.7) {
      handle = chest;
      rot = 0.06;
      zip = V.ep(t, 3.53, 3.67);
      farHand = [handle[0] - 30, handle[1] + 70];
      nearHand = [handle[0] + V.lerp(-24, 26, zip), handle[1] + 24];
    } else {
      zip = 1;
      held = false;
      // the toss is planned by the bag's centre (it flips once in the air)
      const c0 = [chest[0], chest[1] + 80], cA = [x + 14, y - 396], c1 = [x - 64, y - 75];
      const k1 = V.ep(t, 3.7, 3.83, 'out'), k2 = V.ep(t, 3.83, 3.96, 'in');
      let cen;
      if (t < 3.83) {
        cen = [V.lerp(c0[0], cA[0], k1), V.lerp(c0[1], cA[1], k1)];
        rot = V.lerp(0.06, -Math.PI, k1);
      } else {
        cen = [V.lerp(cA[0], c1[0], k2), V.lerp(cA[1], c1[1], k2)];
        rot = V.lerp(-Math.PI, -Math.PI * 2, k2);
        behind = true;
      }
      handle = [cen[0] + Math.sin(rot) * 80, cen[1] - Math.cos(rot) * 80];
      // both hands throw it up (forward, clear of the face), then hook the shoulder straps
      const thrown = V.ep(t, 3.7, 3.78, 'out');
      const catchK = V.ep(t, 3.84, 3.97);
      nearHand = lerpP(lerpP([chest[0] + 10, chest[1] + 24], [x + 170, y - 300], thrown), [x + 36, y - 150], catchK);
      farHand = lerpP(lerpP([chest[0] - 30, chest[1] + 70], [x + 130, y - 290], thrown), [x + 6, y - 150], catchK);
    }
    return { handle, rot, zip, behind, held, nearHand, farHand, flipN, flipF };
  }

  // ------------------------------------------------------------------ wardrobe "item taken" patches
  function patchWardrobe(ctx, t, wOpen) {
    // the white tee (item 0, mostly behind the open left door) leaves its hanger at 0.68
    if (t > 0.7) {
      const ty = TY, hx = itemX(1);
      ctx.fillStyle = INTERIOR;
      ctx.fillRect(IX0 + 50, ty + 9, hx - 18 - (IX0 + 50), 126);
      const hanger = (cx) => {
        ctx.beginPath();
        ctx.moveTo(cx - 22, ty + 12);
        ctx.lineTo(cx, ty + 4);
        ctx.lineTo(cx + 22, ty + 12);
        ctx.strokeStyle = '#b9b2a4';
        ctx.lineWidth = 3;
        ctx.stroke();
      };
      ctx.save();
      ctx.beginPath();
      ctx.rect(IX0 + 50, ty - 10, 200, 40); // stay right of the open door's edge
      ctx.clip();
      hanger(itemX(0));
      ctx.restore();
      hanger(hx);
      poly(ctx, [[hx - 24, ty + 10], [hx + 24, ty + 10], [hx + 36, ty + 40], [hx + 26, ty + 48], [hx + 24, ty + 150], [hx - 24, ty + 150], [hx - 26, ty + 48], [hx - 36, ty + 40]], '#2f5d50', INK, 3);
      V.fillRound(ctx, hx - 14, ty + 100, 28, 22, 5, V.shade('#2f5d50', -0.15));
    }
    // jeans (item 3) leave their hanger at 1.7
    if (t > 1.72) {
      const cx = itemX(3), ty = TY;
      const pts = [[cx - 22, ty + 12], [cx + 22, ty + 12], [cx + 24, ty + 190], [cx + 4, ty + 190], [cx, ty + 70], [cx - 4, ty + 190], [cx - 24, ty + 190]];
      poly(ctx, pts, INTERIOR, INTERIOR, 6);
      // the grey tee next to it overlapped the jeans: redraw it; plus the now-empty hanger
      const gx = itemX(4);
      poly(ctx, [[gx - 24, ty + 10], [gx + 24, ty + 10], [gx + 36, ty + 40], [gx + 26, ty + 48], [gx + 24, ty + 128], [gx - 24, ty + 128], [gx - 26, ty + 48], [gx - 36, ty + 40]], '#8a96a8', INK, 3);
      ctx.beginPath();
      ctx.moveTo(cx - 22, ty + 12);
      ctx.lineTo(cx, ty + 4);
      ctx.lineTo(cx + 22, ty + 12);
      ctx.closePath();
      ctx.strokeStyle = '#b9b2a4';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // sneakers leave the wardrobe floor at 2.52
    if (t > 2.53) {
      // stop at the open right door's inner edge (same geometry as env drawWardrobe), so the
      // patch never paints over the door leaf
      const th = V.clamp(wOpen) * 78 * (Math.PI / 180);
      const edge = IX1 - ((IX1 - IX0) / 2) * Math.cos(th) - 10 * Math.sin(th) - 2.5;
      const px0 = IX1 - 134, px1 = Math.min(IX1 - 6, edge);
      ctx.fillStyle = INTERIOR;
      ctx.fillRect(px0, 856, px1 - px0, IB - 856 - 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px0, IB - 8, px1 - px0, 6.5);
    }
  }

  // ------------------------------------------------------------------ flying items
  const FLY = [
    { t0: 0.68, t1: 0.86, from: [itemX(0) + 54, TY + 70], to: [HX + 10, STAND_Y - 130], draw: (c, p, r, s) => drawTee(c, p[0], p[1], r, s), spin: -3 },
    { t0: 1.7, t1: 1.86, from: [itemX(3), TY + 100], to: [HX + 10, STAND_Y - 40], draw: (c, p, r, s) => drawJeans(c, p[0], p[1], r, s), spin: 2.5 },
    { t0: 2.52, t1: 2.66, from: [IX1 - 70, 872], to: [HX + 20, FLOOR - 40], draw: (c, p, r, s) => { drawSneakerShape(c, p[0] - 16, p[1], r, s); drawSneakerShape(c, p[0] + 18, p[1] + 6, r + 0.3, s); }, spin: 4, arc: 40 },
  ];
  function drawFlyers(ctx, t) {
    FLY.forEach((f) => {
      if (t < f.t0 || t > f.t1) return;
      const k = V.ease.in(V.seg(t, f.t0, f.t1));
      const p = lerpP(f.from, f.to, k);
      p[1] -= Math.sin(Math.PI * k) * (f.arc || 70);
      trail(ctx, f.from, f.to, k, 3, 'rgba(255,255,255,0.95)');
      f.draw(ctx, p, f.spin * k, 1 - 0.3 * k);
    });
    // the towel is flung out of cloud #2 and lands draped over the desk lamp
    const tk = V.seg(t, 1.97, 2.3);
    if (tk > 0 && tk < 1) {
      const from = [HX + 10, STAND_Y - 260], to = LAMP_TOWEL;
      const p = [V.lerp(from[0], to[0], tk), V.lerp(from[1], to[1], tk) - Math.sin(Math.PI * tk) * 170];
      trail(ctx, from, to, tk, 2, 'rgba(255,255,255,0.8)');
      drawFlyingTowel(ctx, p[0], p[1], -tk * 5.6, 1.0, t);
    }
  }
  // towel draped over the lamp shade (with a damped swing after landing)
  function drawLampTowel(ctx, t) {
    if (t < 2.3) return;
    const u = t - 2.3;
    const sw = Math.sin(u * 16) * Math.exp(-u * 5) * 0.22;
    const sq = V.kf(t, [[2.3, 0.7], [2.36, 1.1], [2.44, 1]], 'out');
    const c = '#4fb3a9';
    ctx.save();
    ctx.translate(LAMP_TOWEL[0], LAMP_TOWEL[1]);
    ctx.scale(1, sq);
    ctx.rotate(sw * 0.3);
    const flap = (dir, len) => {
      ctx.save();
      ctx.rotate(sw * dir);
      ctx.beginPath();
      ctx.moveTo(dir * 6, -6);
      ctx.quadraticCurveTo(dir * 50, -12, dir * 56, 20);
      ctx.lineTo(dir * 62, len);
      ctx.quadraticCurveTo(dir * 46, len + 8, dir * 30, len - 2);
      ctx.lineTo(dir * 24, 30);
      ctx.quadraticCurveTo(dir * 14, 10, 0, 8);
      ctx.closePath();
      ctx.fillStyle = dir < 0 ? V.shade(c, -0.12) : c;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.stroke();
      V.line(ctx, dir * 34, len - 30, dir * 56, len - 26, V.shade(c, 0.28), 4);
      V.line(ctx, dir * 32, len - 14, dir * 58, len - 10, V.shade(c, 0.28), 4);
      ctx.restore();
    };
    flap(-1, 110);
    flap(1, 86);
    ctx.restore();
  }

  // laces: flapping in a blur -> neat bow
  function drawLaces(ctx, t, lace) {
    if (!lace || t < 2.8 || t > 3.6) return;
    const [lx, ly, , , nx, ny] = lace;
    ctx.save();
    ctx.lineCap = 'round';
    if (t < 3.13) {
      for (let i = 0; i < 3; i++) {
        const a = t * 40 + i * 2.1;
        const r = 16 + i * 4;
        V.line(ctx, lx, ly, lx + Math.cos(a) * r, ly + Math.sin(a) * r * 0.7 - 6, INK, 6);
        V.line(ctx, lx, ly, lx + Math.cos(a) * r, ly + Math.sin(a) * r * 0.7 - 6, '#ffffff', 3);
      }
      // blur arcs around the busy hands
      for (let i = 0; i < 3; i++) {
        const a0 = t * 30 + i * 2;
        ctx.beginPath();
        ctx.arc(lx, ly - 14, 34 + i * 8, a0, a0 + 1.2);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    } else {
      const k = V.ep(t, 3.13, 3.21, 'outBack');
      ctx.translate(lx + nx * 2, ly + ny * 2);
      ctx.scale(k, k);
      ctx.beginPath();
      ctx.ellipse(-9, -4, 9, 5, 0.5, 0, Math.PI * 2);
      ctx.moveTo(18, -4);
      ctx.ellipse(9, -4, 9, 5, -0.5, 0, Math.PI * 2);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      V.circle(ctx, 0, -3, 3.5, '#ffffff', INK, 2);
      // "tug" tick lines
      const a = 1 - V.seg(t, 3.16, 3.3);
      if (a > 0 && a < 1) for (let i = -1; i <= 1; i++) V.line(ctx, i * 16, -22, i * 24, -36, V.rgba('#ffffff', a), 3);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ shot A
  function camA(t) {
    const x = V.kf(t, [[0, 2318], [0.8, 2300], [2.5, 2286], [2.9, 2300], [3.3, 2310], [3.6, 2300], [4.05, 2290]]);
    // 3.25-4.05: eases back so the new sneakers stay in frame (above the letterbox) while the
    // tossed backpack still clears the top of the frame
    const y = V.kf(t, [[0, 560], [0.8, 566], [2.5, 570], [2.9, 610], [3.25, 612], [3.62, 572], [3.82, 532], [4.05, 545]]);
    let z = V.kf(t, [[0, 1.3], [0.8, 1.36], [2.5, 1.4], [2.9, 1.52], [3.25, 1.54], [3.62, 1.34], [3.82, 1.22], [4.05, 1.25]]);
    // a little zoom punch on every whoosh
    CLOUDS.forEach((c) => {
      const k = V.seg(t, c.t0, c.t0 + 0.3);
      if (k > 0 && k < 1) z += 0.035 * Math.sin(Math.PI * k);
    });
    return { x, y, zoom: z };
  }

  // whirlwind centre x / width factor per change (the 3rd one covers the kneel)
  const TW_X = (i) => HX + 6 + (i === 2 ? 74 : 0);
  const TW_W = (i) => (i === 2 ? 1.42 : 1);

  function shotA(ctx, t) {
    const h = heroA(t);
    const cam = camA(t);
    const cl = cloudAt(t);
    const spin = spinAngle(t);
    const bag = h.bag;
    const wOpen = V.kf(t, [[0, 0.58], [0.2, 1], [0.3, 0.95], [0.4, 1]], 'out');
    V.env.bedroomScene(ctx, { cam, hour: 7.8, light: 1, t, clockTime: '07:48', wardrobeOpen: wOpen, backpack: false }, null, (c) => {
      patchWardrobe(c, t, wOpen);
      drawLampTowel(c, t);
      if (!bag || !bag.held && !bag.behind && t < 3.3) drawBag(c, BAG.x, FLOOR - BAG_H - 10, -0.08, 0);
      else if (bag.behind && t < 3.96) drawBag(c, bag.handle[0], bag.handle[1], bag.rot, 1);
      V.groundShadow(c, h.x + 20, FLOOR, 72 * S);
      c.save();
      if (cl && cl.k >= 0.66) {
        // lift-off reveal: he only shows below the rising base of the whirlwind (or inside the
        // funnel, where the cloud covers him), so nothing pokes out of its sides
        const tw = twisterShape(TW_X(cl.i), FLOOR, STAND_Y - 340, cl.k, t, cl.i * 7.3, TW_W(cl.i));
        c.beginPath();
        c.moveTo(tw.L[0][0], tw.L[0][1]);
        tw.R.forEach((p) => c.lineTo(p[0], p[1]));
        for (let i = tw.L.length - 1; i >= 0; i--) c.lineTo(tw.L[i][0], tw.L[i][1]);
        c.closePath();
        // same winding as the funnel -> union
        c.moveTo(-9999, tw.yB);
        c.lineTo(-9999, 9999);
        c.lineTo(9999, 9999);
        c.lineTo(9999, tw.yB);
        c.closePath();
        c.clip();
      }
      if (spin) {
        c.translate(h.x, 0);
        c.scale(Math.abs(Math.cos(spin)) < 0.02 ? 0.02 : Math.cos(spin), 1);
        c.translate(-h.x, 0);
      }
      // fully inside the whirlwind he is not drawn at all (nothing can poke out mid-change)
      if (!(cl && cl.k > 0.22 && cl.k < 0.66)) B.draw(c, h.x, h.y, S, h.pose);
      c.restore();
      if (bag && !bag.behind && (bag.held || t >= 3.7)) {
        drawBag(c, bag.handle[0], bag.handle[1], bag.rot, bag.zip);
        if (bag.held) {
          // the near hand grips over the bag
          const j = B.joints(h.x, h.y, S, h.pose);
          V.circle(c, j.nearHand[0], j.nearHand[1], B.D.HAND * S, V.pal.skin, INK, B.D.OUT * S);
          if (t > 3.53 && t < 3.68) {
            for (let i = 0; i < 3; i++) V.line(c, j.nearHand[0] - 26 - i * 12, j.nearHand[1] - 22 + i * 7, j.nearHand[0] - 46 - i * 12, j.nearHand[1] - 22 + i * 7, 'rgba(255,255,255,0.95)', 3.5);
          }
        }
      }
      if (bag && t >= 3.7 && t < 3.83) {
        // whoosh arcs under the tossed bag
        const k = V.seg(t, 3.7, 3.83);
        c.save();
        c.globalAlpha = Math.sin(Math.PI * k);
        c.beginPath();
        c.moveTo(bag.handle[0] + 40, bag.handle[1] + 150);
        c.quadraticCurveTo(h.x + 130, h.y - 300, bag.handle[0] + 50, bag.handle[1] + 60);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 6;
        c.stroke();
        c.restore();
      }
      drawLaces(c, t, h.lace);
      drawFlyers(c, t);
      if (cl) drawTwister(c, TW_X(cl.i), FLOOR, STAND_Y - 340, cl.k, t, cl.i * 7.3, TW_W(cl.i));
      // landing thump lines for the backpack
      const lk = V.seg(t, 3.96, 4.05);
      if (lk > 0 && lk < 1) {
        for (let i = 0; i < 3; i++) V.line(c, h.x - 112 - i * 4, h.y - 190 + i * 36, h.x - 150 - i * 4, h.y - 196 + i * 40, V.rgba('#ffffff', 1 - lk), 5);
      }
    });
  }

  // ------------------------------------------------------------------ shot B: the mirror
  // Close-up into the mirror on the wardrobe door (soft-focus clothes in the foreground, the
  // reflected room behind him). Hair fix (4.09-4.38), grin + teeth sparkle (4.4), finger guns +
  // "pew" + wink at himself (4.5-5.0).
  const MIR = { x0: 430, x1: 1640, y0: 96, y1: 1140 };
  const RF = { x: 1110, y: 1120, s: 3.0 };
  let lowBg = null, lowFg = null;
  const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

  function fingerGun(ctx) {
    // hand frame: +x along the forearm; thumb up (-y)
    V.line(ctx, 2, -2, 26, -2, INK, 9 + 7);
    V.line(ctx, -2, -6, 4, -21, INK, 9 + 7);
    V.line(ctx, 2, -2, 26, -2, V.pal.skin, 9);
    V.line(ctx, -2, -6, 4, -21, V.pal.skin, 9);
    V.circle(ctx, 0, 0, B.D.HAND, V.pal.skin, INK, B.D.OUT);
    V.line(ctx, 6, 3, 14, 4, 'rgba(150,80,50,0.45)', 2);
  }
  const winkProp = (ctx) => {
    // close the near eye (head frame: eye at (18, -6))
    V.ellipse(ctx, 18, -6, 9, 11, V.pal.skin);
    ctx.beginPath();
    ctx.arc(18, -2, 7, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  // the reflection's pose (u = seconds since the cut); drawn facing left (it is a mirror image)
  function poseB(u) {
    const pose = P.stand({ outfit: 'school', backpack: true, facing: -1 });
    pose.eyes = B.blink(u + 4, 'open', 3);
    pose.mouth = 'smile';
    pose.brows = 0.3;
    pose.torso = V.kf(u, [[0, 3], [0.1, -2], [0.3, -4], [0.5, 2], [0.62, -3], [0.8, -1]]);
    pose.head = V.kf(u, [[0, 6], [0.1, -2], [0.24, -10], [0.36, 0], [0.62, -5], [0.9, -2]]);
    // IK in a reference frame (hip at 0,0, s = 1, facing -1: +x is behind him)
    const j = B.joints(0, 0, 1, pose);
    const hd = j.head;
    const strapF = [-6 / S, -150 / S];
    // the FAR hand sweeps through the hair (front -> top -> back) so his face stays clear
    const keys = [
      [0.03, strapF],
      [0.12, [hd[0] - 40, hd[1] - 74]],
      [0.22, [hd[0] - 4, hd[1] - 92]],
      [0.32, [hd[0] + 40, hd[1] - 70]],
      [0.42, [hd[0] + 22, hd[1] + 6]], // slides down the back of the head (hidden behind it)
      [0.5, strapF],
    ];
    let hf = strapF;
    if (u > keys[0][0] && u < keys[keys.length - 1][0]) {
      let i = 0;
      while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
      hf = lerpP(keys[i][1], keys[i + 1][1], V.ease.inOut(V.seg(u, keys[i][0], keys[i + 1][0])));
    }
    // near arm hangs relaxed (a little swing settling from the cut) until the finger guns
    pose.armNear = { sh: 10 + 6 * Math.cos(u * 9) * Math.exp(-u * 5), el: 20 };
    IK.arm(pose, 0, 0, 1, 'far', hf, u > 0.36 && u < 0.5);
    // finger guns
    const g = V.ep(u, 0.46, 0.58, 'outBack');
    const recoil = V.kf(u, [[0.64, 0], [0.68, 1], [0.86, 0]], 'out');
    if (g > 0) {
      const aimN = { sh: 82 + recoil * 18, el: 8 - recoil * 6 }, aimF = { sh: 72 + recoil * 16, el: 10 };
      pose.armNear = { sh: V.lerp(pose.armNear.sh, aimN.sh, g), el: V.lerp(pose.armNear.el, aimN.el, g) };
      pose.armFar = { sh: V.lerp(pose.armFar.sh, aimF.sh, g), el: V.lerp(pose.armFar.el, aimF.el, g) };
      if (g > 0.5) pose.propNear = pose.propFar = fingerGun;
      pose.torso -= 3 * recoil;
      pose.head -= 4 * recoil;
    }
    // faces
    if (u > 0.06 && u < 0.34) {
      pose.eyes = 'half';
      pose.brows = 0.7;
    } else if (u >= 0.34 && u < 0.56) {
      pose.eyes = 'happy';
      pose.mouth = 'teeth';
      pose.brows = 0.5;
    } else if (u >= 0.56) {
      pose.mouth = 'grin';
      pose.brows = 0.4;
      pose.eyes = 'open';
      if (u > 0.62) pose.headProp = winkProp;
    }
    return pose;
  }

  function drawSparkle(ctx, x, y, r, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.2 : r;
      const an = (i / 8) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fff2b0';
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.restore();
  }

  // soft-focus hanging clothes at the left edge (the open wardrobe beside the mirror door)
  function drawForeground(ctx) {
    if (!lowFg) {
      lowFg = mk(96, 216);
      const f = lowFg.getContext('2d');
      f.setTransform(0.2, 0, 0, 0.2, 0, 0);
      f.fillStyle = '#2e221b';
      f.fillRect(0, 0, 480, 1080);
      V.line(f, 0, 70, 480, 70, '#b9b2a4', 14);
      [['#e2463c', 40, 'tee'], ['#2f5d50', 250, 'hoodie']].forEach(([c, cx, kind]) => {
        f.save();
        f.translate(cx, 80);
        f.scale(2.6, 2.6);
        poly(f, [[-24, 10], [24, 10], [36, 40], [26, 48], [24, kind === 'hoodie' ? 150 : 128], [-24, kind === 'hoodie' ? 150 : 128], [-26, 48], [-36, 40]], c, INK, 3);
        f.restore();
      });
      f.fillStyle = '#efe4d2';
      f.fillRect(380, 0, 100, 1080);
      f.fillStyle = 'rgba(0,0,0,0.25)';
      f.fillRect(372, 0, 10, 1080);
    }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lowFg, -20, 0, 500, V.H);
    ctx.restore();
  }

  function shotB(ctx, t) {
    const u = Math.max(0, t - CUT);
    const pose = poseB(u);
    const push = V.ep(t, CUT, 5.4, 'sine');
    ctx.save();
    // slow push-in toward the reflection's face
    ctx.translate(1000, 520);
    ctx.scale(1 + 0.05 * push, 1 + 0.05 * push);
    ctx.translate(-1000, -520);
    // the door around the mirror
    ctx.fillStyle = '#f4eadb';
    ctx.fillRect(-100, -100, V.W + 200, V.H + 200);
    V.fillRound(ctx, 360, 30, 1350, 1200, 8, null, 'rgba(120,90,50,0.35)', 4);
    // the wall beyond the wardrobe on the right
    ctx.fillStyle = '#ecd2ac';
    ctx.fillRect(1780, -100, 400, V.H + 200);
    ctx.fillStyle = 'rgba(170,110,60,0.08)';
    ctx.fillRect(1830, -100, 30, V.H + 200);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(1756, -100, 24, V.H + 200);
    V.line(ctx, 1780, -100, 1780, V.H + 100, INK, 5);

    // ---- mirror glass
    const mx0 = MIR.x0, mx1 = MIR.x1, my0 = MIR.y0, my1 = MIR.y1;
    ctx.save();
    V.roundRect(ctx, mx0, my0, mx1 - mx0, my1 - my0, 18);
    ctx.clip();
    // reflected room, soft focus + mirrored (no text in this part of the room)
    if (!lowBg) lowBg = mk(320, 180);
    const lx = lowBg.getContext('2d');
    lx.save();
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.translate(320, 0);
    lx.scale(-320 / V.W, 180 / V.H);
    V.env.bedroomCam(lx, { x: 770 + 24 * push, y: 470, zoom: 1.62 });
    V.env.bedroomParts.drawRoom(lx, { hour: 7.8, light: 1, t, clockTime: '07:48', clockRing: 0, clockSquash: 0, lamp: 0, doorOpen: 0, hallLight: 0, wardrobeOpen: 0, curtain: 0, bedSquash: 0, backpack: false, ball: true, hide: { clock: true, nightstand: true } }, false);
    lx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lowBg, mx0 - 40, my0 - 60, 1300, 1300 * 9 / 16);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,240,220,0.18)';
    ctx.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
    V.lightPool(ctx, 1000, 330, 640, '#ffe2b0', 0.2);
    // the reflection
    const rx = RF.x, ry = RF.y;
    B.draw(ctx, rx, ry, RF.s, pose);
    const rj = B.joints(rx, ry, RF.s, pose);
    // glass: cool tint, sheen streaks, edge darkening
    ctx.fillStyle = 'rgba(185,222,245,0.12)';
    ctx.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.moveTo(mx0 + 40, my0);
    ctx.lineTo(mx0 + 240, my0);
    ctx.lineTo(mx0 - 120, my0 + 620);
    ctx.lineTo(mx0 - 120, my0 + 300);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx0 + 300, my0);
    ctx.lineTo(mx0 + 350, my0);
    ctx.lineTo(mx0 - 60, my0 + 720);
    ctx.lineTo(mx0 - 110, my0 + 720);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx1 - 60, my1 - 420);
    ctx.lineTo(mx1, my1 - 520);
    ctx.lineTo(mx1, my1 - 440);
    ctx.lineTo(mx1 - 20, my1 - 400);
    ctx.fill();
    const vg = ctx.createRadialGradient((mx0 + mx1) / 2, 560, 360, (mx0 + mx1) / 2, 560, 900);
    vg.addColorStop(0, 'rgba(40,60,80,0)');
    vg.addColorStop(1, 'rgba(40,60,80,0.24)');
    ctx.fillStyle = vg;
    ctx.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
    ctx.restore();
    // frame: bevel + ink
    V.roundRect(ctx, mx0, my0, mx1 - mx0, my1 - my0, 18);
    ctx.strokeStyle = '#fffaf2';
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.stroke();
    V.roundRect(ctx, mx0 + 7, my0 + 7, mx1 - mx0 - 14, my1 - my0 - 14, 14);
    ctx.strokeStyle = 'rgba(80,110,130,0.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // sticky note on the mirror: "you rock!"
    ctx.save();
    ctx.translate(1515, 232);
    ctx.rotate(0.07);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(-76, -58, 160, 128);
    V.fillRound(ctx, -82, -66, 164, 132, 4, '#ffe46b', INK, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(-80, -64, 160, 22);
    V.text(ctx, 'אתה', 0, -10, { size: 34, weight: 800, color: '#3a2c22' });
    V.text(ctx, 'תותח!', 0, 32, { size: 38, weight: 900, color: '#e2463c' });
    ctx.restore();

    // ---- teeth sparkle (4.4)
    const sk = V.seg(t, 4.38, 4.62);
    if (sk > 0 && sk < 1) {
      const a = Math.sin(Math.PI * sk);
      drawSparkle(ctx, rj.mouth[0] + 6, rj.mouth[1] - 2, 30 + 30 * a, a);
      drawSparkle(ctx, rj.mouth[0] - 40, rj.mouth[1] - 50, 14 * a, a * 0.8);
    }
    // finger-gun "pew" ticks
    const pk = V.seg(t, CUT + 0.64, CUT + 0.84);
    if (pk > 0 && pk < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - pk;
      [rj.nearHand, rj.farHand].forEach((hnd, i) => {
        for (let k = -1; k <= 1; k++) {
          const an = Math.PI + k * 0.5;
          const r0 = 90 + pk * 40;
          const cy = hnd[1] - 10 - i * 8;
          V.line(ctx, hnd[0] + Math.cos(an) * r0, cy + Math.sin(an) * r0, hnd[0] + Math.cos(an) * (r0 + 30), cy + Math.sin(an) * (r0 + 30), '#ffffff', 6);
        }
      });
      ctx.restore();
    }
    drawForeground(ctx);
    ctx.restore();
  }

  V.registerScene('04-dress', {
    sfx: [
      { t: 0.0, type: 'creak', vol: 0.35 },
      { t: 0.8, type: 'whoosh' },
      { t: 1.8, type: 'whoosh' },
      { t: 2.3, type: 'plop', vol: 0.45 },
      { t: 2.6, type: 'whoosh' },
      { t: 3.53, type: 'zipper' },
      { t: 3.7, type: 'whoosh', vol: 0.4 },
      { t: 3.96, type: 'plop', vol: 0.4 },
      { t: 4.4, type: 'sparkle' },
      { t: 4.71, type: 'pop', vol: 0.35 },
    ],
    draw(ctx, t) {
      if (t < CUT) shotA(ctx, t);
      else shotB(ctx, Math.min(t, 5.4));
    },
  });
})();
