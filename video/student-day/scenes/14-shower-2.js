// Scene 14-shower-2 — 18:05, quick shower after football practice (4 s).
// Same stall, EVENING: dark-blue window, warm lamp light, slight Dutch tilt, hero faces LEFT.
// Opens LOW on the shower tray: muddy water + grass swirling into the drain, muddy shins tapping
// to the beat, his dirty kit dumped on the bath mat. 0.55–1.55 the camera tilts up to reveal him
// singing into the shampoo bottle like a microphone, mud on his face, brownish lather on his hair
// while the other hand scrubs. 2.65–3.1 wet-dog head shake flings the foam off; 3.1+ clean,
// rock-star finale (arm up, big note, ♪ ♫), sparkle on the hair.
(function () {
  const V = window.V;
  const BA = V.env.bathroom, L = BA.L, K = BA.kit;
  const B = V.boy, P = B.pose;
  const ink = V.pal.ink;
  const S = 1.2;
  const HX = 520;
  const HOUR = 19.4; // window: dark-blue evening sky (18:05 in winter)
  const BARE = { shirt: null, towel: null, pants: null, pantsLen: 'none', shoes: 'bare', logo: false };
  const W2 = Math.PI * 2;
  const BEAT = 2.3; // Hz

  // lather blobs (head frame), same layout idea as 02
  const FOAM = [];
  for (let i = 0; i < 24; i++) {
    const a = V.lerp(-178, -60, (i + V.rand(i * 4.7 + 3)) / 24) * (Math.PI / 180);
    const rr = 50 + V.rand(i * 3.9 + 1) * 12;
    FOAM.push({ x: Math.cos(a) * rr - 6, y: Math.sin(a) * rr - 8, r: 11 + V.rand(i * 2.9) * 8, k: V.rand(i * 6.1) * 0.5, i });
  }
  for (let i = 0; i < 10; i++) {
    const x = V.lerp(-46, 20, V.rand(i * 5.3 + 2));
    const h = V.rand(i * 7.9 + 4);
    FOAM.push({ x, y: -70 - h * 32 + Math.abs(x + 12) * 0.3, r: 12 + V.rand(i * 3.1) * 8, k: 0.45 + h * 0.4, i: 30 + i });
  }
  const MUD_HAIR = [[-30, -44, 13, 8], [6, -56, 11, 7], [-44, -16, 9, 11], [22, -40, 9, 6]];
  const MUD_FACE = [[20, 10, 12, 8], [8, -26, 14, 7], [40, 4, 6, 5], [30, 38, 10, 6], [-2, 18, 7, 9]];

  const mudFace = (t) => 1 - V.ep(t, 1.75, 2.75);
  const mudHair = (t) => 1 - V.ep(t, 1.6, 2.9);
  const foamAmt = (t) => V.ep(t, 0.3, 2.2, 'out');
  const shakeK = (t) => V.seg(t, 2.65, 2.75) * (1 - V.seg(t, 3.0, 3.12));
  const fin = (t) => V.ep(t, 3.05, 3.35, 'outBack');

  function heroAt(t) {
    const beat = Math.sin(t * W2 * BEAT);
    const sh = shakeK(t);
    const f = fin(t);
    const sing = Math.floor(t * BEAT * 2) % 4;
    let mouth = ['open', 'o', 'open', 'grin'][sing];
    let eyes = 'happy', brows = 0.5;
    if (sh > 0) { eyes = 'closed'; mouth = 'o'; brows = -0.3; }
    if (t > 3.1) { mouth = 'open'; eyes = 'happy'; brows = 1; }
    const pose = P.stand({
      outfit: BARE,
      facing: -1,
      torso: 3 + 3 * beat * (1 - f) - 6 * f,
      head: 4 * beat * (1 - f) + 16 * Math.sin(t * W2 * 7) * sh - 14 * f,
      eyes, mouth, brows,
      blush: 0.3 + 0.2 * f,
    });
    // feet tap to the beat (alternating heel lifts)
    const tapN = Math.max(0, Math.sin(t * W2 * BEAT)), tapF = Math.max(0, -Math.sin(t * W2 * BEAT));
    pose.legNear = { hip: 3 + 4 * tapN, knee: -3 - 12 * tapN, foot: -10 * tapN };
    pose.legFar = { hip: -3 + 4 * tapF, knee: -3 - 12 * tapF, foot: -10 * tapF };
    // near hand: shampoo-bottle microphone under the mouth
    const micUp = f;
    const micT = K.headPt(pose, V.lerp(46, 52, micUp), V.lerp(58, 46, micUp) + 3 * beat * (1 - f));
    pose.armNear = K.ik(pose, 'near', micT[0], micT[1], 1);
    const mouthL = K.headPt(pose, 30, 26);
    const aim = K.aim(pose, 'near', mouthL[0], mouthL[1]);
    pose.propNear = micProp(aim.ang);
    // far hand: scrubs the back of the head, then is thrown up for the finale
    const w = t * W2 * 2.6;
    const fT = K.headPt(pose, -30 + 12 * Math.cos(w), -56 + 9 * Math.sin(w));
    // ik() wraps sh at ±180 (this arm sits at about -145 = 215): unwrap near 200 before blending,
    // otherwise the arm windmills forward through a full turn on its way up
    let af = K.wrapArm(K.ik(pose, 'far', fT[0], fT[1], -1), 200);
    // head shake: the hand lets go of the hair and stays raised behind the head (steady, mostly
    // hidden) ...
    const shakeArm = V.ep(t, 2.6, 2.72);
    af = { sh: V.lerp(af.sh, 205, shakeArm), el: V.lerp(af.el, -18, shakeArm) };
    // ... then the finale fist is punched up and over to the FRONT (205 -> 146, ~60 deg), elbow
    // bending the natural way, fist clear above his brow
    const fp = V.ep(t, 3.05, 3.3, 'outBack');
    af = { sh: V.lerp(af.sh, 146, fp), el: V.lerp(af.el, 26, V.ep(t, 3.05, 3.22)) };
    pose.armFar = af;
    const y = B.standY(L.SHOWER_Y, S, pose);
    return { x: HX, y, s: S, pose, beat, sh, f };
  }

  function micProp(ang) {
    return (ctx) => {
      ctx.save();
      ctx.rotate(ang + Math.PI / 2); // bottle "up" (its cap) points at the mouth
      ctx.translate(0, 30);
      BA.shampoo(ctx, 0, 0, 0.62);
      ctx.restore();
      // fingers round the bottle
      V.fillRound(ctx, -10, -11, 20, 22, 9, B.HERO.skin, ink, 3.5);
    };
  }

  function lather(t, h) {
    const fa = foamAmt(t);
    const [gx, gy] = K.down(h.pose);
    const out = [];
    FOAM.forEach((b) => {
      let g = V.ease.outBack(V.seg(fa, b.k, b.k + 0.3));
      if (g <= 0) return;
      let x = b.x + Math.sin(t * 14 + b.i) * 2.2;
      let y = b.y + Math.cos(t * 12 + b.i * 1.3) * 2;
      // head shake flings the lather off: blobs fly outward and fall
      const rel = 2.68 + V.rand(b.i * 8.3) * 0.32;
      const d = t - rel;
      if (d > 0) {
        const ox = b.x / 60, oy = (b.y + 20) / 60;
        x += ox * 420 * d + gx * 900 * d * d;
        y += oy * 300 * d + gy * 900 * d * d;
        g *= V.clamp(1 - d / 0.35);
      }
      if (g > 0.03) out.push({ x, y, r: b.r * g });
    });
    return out;
  }

  function drawMud(ctx, t, h) {
    const mh = mudHair(t), mf = mudFace(t);
    ctx.save();
    K.headFrame(ctx, h.x, h.y, h.s, h.pose);
    if (mh > 0) {
      ctx.globalAlpha = mh * 0.85;
      MUD_HAIR.forEach(([x, y, rx, ry]) => V.ellipse(ctx, x, y, rx, ry, '#7a5232'));
    }
    if (mf > 0) {
      ctx.globalAlpha = mf * 0.9;
      MUD_FACE.forEach(([x, y, rx, ry], i) => V.ellipse(ctx, x, y + (1 - mf) * 10, rx, ry, '#73492a', i * 0.3));
      // sweat drops on the forehead (start)
      ctx.globalAlpha = mf;
      [[14, -30], [30, -24]].forEach(([x, y]) => {
        V.ellipse(ctx, x, y, 3, 4.5, 'rgba(150,210,245,0.95)');
        V.circle(ctx, x - 0.8, y - 1.5, 1.1, '#ffffff');
      });
      // muddy streaks running down the cheek as it washes off
      ctx.globalAlpha = mf * (1 - mf) * 2.4;
      V.line(ctx, 18, 14, 16, 14 + 30 * (1 - mf), '#8a6040', 4);
      V.line(ctx, 34, 8, 33, 8 + 24 * (1 - mf), '#8a6040', 3);
    }
    ctx.restore();
  }

  // muddy shins with brown drips running down (below the curtain hem)
  function shinMud(ctx, t, h) {
    const j = B.joints(h.x, h.y, h.s, h.pose);
    const m = 1 - V.ep(t, 0.4, 2.6);
    ctx.save();
    [[j.nearKnee, j.nearAnkle, 0], [j.farKnee, j.farAnkle, 1]].forEach(([k, a, side]) => {
      const p = (u) => [V.lerp(k[0], a[0], u), V.lerp(k[1], a[1], u)];
      // smeared mud: a wide brown band over the lower shin + one splat
      ctx.globalAlpha = 0.75 * m;
      const q0 = p(0.62), q1 = p(0.97);
      V.line(ctx, q0[0], q0[1], q1[0], q1[1], '#7a5232', 22);
      const q2 = p(0.4);
      V.ellipse(ctx, q2[0] + 3, q2[1], 9, 6, '#7a5232', 0.4);
      // drips
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 1.4) + i / 3 + side * 0.17) % 1;
        const q = p(0.5 + ph * 0.5);
        ctx.globalAlpha = Math.sin(Math.PI * ph) * (0.25 + 0.6 * m);
        V.ellipse(ctx, q[0] + (i - 1) * 6, q[1], 3.5, 6, V.mixColor('#7fc4ee', '#7a5232', m));
      }
    });
    ctx.restore();
  }

  // musical notes rising from the mic
  function notes(ctx, t, h) {
    if (t < 0.4) return;
    const m = K.headWorld(h.x, h.y, h.s, h.pose, 40, 10);
    const n = t > 3.1 ? 6 : 3;
    // in the finale the fist is up in front of his brow: send the notes out sideways, under it
    const f = h.f;
    for (let i = 0; i < n; i++) {
      const per = 1.4;
      const ph = ((t / per) + i / n) % 1;
      const x = m[0] - 30 - ph * (V.lerp(130, 250, f) + 40 * (i % 2)) + Math.sin(ph * 7 + i) * 14;
      const y = m[1] - 20 + 30 * f - ph * V.lerp(230, 120, f);
      const a = (ph < 0.15 ? ph / 0.15 : ph > 0.75 ? (1 - ph) / 0.25 : 1) * V.seg(t, 0.4, 0.8);
      const sz = (48 + (i % 3) * 10) * (0.75 + ph * 0.5) * (t > 3.1 ? 1.15 : 1);
      V.text(ctx, i % 2 ? '♫' : '♪', x, y, {
        size: sz, weight: 900, rtl: false, alpha: a,
        color: ['#ffd56b', '#ffffff', '#ff9fc0'][i % 3], stroke: ink, strokeWidth: 5,
      });
    }
  }

  // the raised finale fist: chunky fist with knuckle creases (the far hand is otherwise a plain
  // circle). Drawn over the rig only once the fist is up and clear of the head (t > 3.2).
  function fist(ctx, t, h) {
    const k = V.ep(t, 3.2, 3.32);
    if (k <= 0) return;
    const j = B.joints(h.x, h.y, h.s, h.pose);
    ctx.save();
    ctx.translate(j.farHand[0], j.farHand[1]);
    ctx.scale(h.pose.facing * h.s, h.s);
    ctx.rotate(V.deg(-10));
    const w = V.lerp(24, 31, k), hh = V.lerp(24, 27, k);
    const skin = B.HERO.skinShade;
    V.fillRound(ctx, -w / 2, -hh / 2, w, hh, 11, skin, ink, 3.5);
    ctx.globalAlpha = k;
    for (let i = 0; i < 3; i++) V.line(ctx, w / 2 - 11, -7 + i * 7, w / 2 - 2, -7 + i * 7, ink, 2.5);
    ctx.restore();
  }

  // water drops flung off by the head shake
  function shakeDrops(ctx, t, h) {
    if (t < 2.66 || t > 3.4) return;
    const c = K.headWorld(h.x, h.y, h.s, h.pose, -4, -20);
    for (let i = 0; i < 18; i++) {
      const t0 = 2.66 + V.rand(i * 2.3) * 0.36;
      const d = t - t0;
      if (d < 0 || d > 0.4) continue;
      const a = V.rand(i * 5.9) * W2;
      const sp = 380 + V.rand(i * 1.7) * 300;
      const x = c[0] + Math.cos(a) * (60 + sp * d);
      const y = c[1] + Math.sin(a) * (50 + sp * d) * 0.8 + 900 * d * d;
      ctx.globalAlpha = 1 - d / 0.4;
      V.ellipse(ctx, x, y, 4.5, 6, 'rgba(110,185,235,0.95)');
      V.circle(ctx, x - 1.3, y - 2, 1.6, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  V.registerScene('14-shower-2', {
    sfx: [
      { t: 0, type: 'shower', dur: 4.4 },
      { t: 2.68, type: 'splash', vol: 0.7 },
      { t: 3.3, type: 'sparkle', vol: 0.6 },
    ],
    draw(ctx, t, info) {
      const T = Math.min(t, 4.45);
      const up = V.ep(T, 0.45, 1.8, 'sine'); // smooth tilt (cubic in-out whipped ~60 px/frame)
      const back = V.ep(T, 3.0, 4.2, 'sine');
      const cam = {
        x: V.lerp(585, 505, up) + 10 * back,
        y: V.lerp(842, 430, up) + 22 * back,
        zoom: V.lerp(2.0, 1.66, up) - 0.16 * back,
        rot: -2.5,
      };
      const h = heroAt(T);
      BA(ctx, { t: T, hour: HOUR, light: 'warm', cam, fog: 0.5, kit: true, shampooOut: true });
      ctx.save();
      BA.cam(ctx, cam);
      BA.drain(ctx, { t: T, mud: 1 - V.ep(T, 0.8, 3.4), x0: 400 });
      B.draw(ctx, h.x, h.y, h.s, h.pose);
      fist(ctx, T, h);
      shinMud(ctx, T, h);
      drawMud(ctx, T, h);
      const fCol = V.mixColor('#ffffff', '#cfa978', mudHair(T) * 0.8);
      ctx.save();
      K.headFrame(ctx, h.x, h.y, h.s, h.pose);
      BA.foam(ctx, lather(T, h), { color: fCol });
      ctx.restore();
      const left = foamAmt(T) * (1 - V.seg(T, 2.68, 3.0));
      const hc = K.headWorld(h.x, h.y, h.s, h.pose, -4, -16 - 14 * left);
      const j = B.joints(h.x, h.y, h.s, h.pose);
      BA.water(ctx, {
        t: T,
        hits: [
          { x: hc[0], y: hc[1], r: (54 + 18 * left) * S },
          { x: j.shoulder[0], y: j.shoulder[1] + 8, r: 36 * S },
        ],
      });
      BA.curtain(ctx, { t: T, wet: 0.8 });
      shakeDrops(ctx, T, h);
      notes(ctx, T, h);
      BA.steam(ctx, { t: T, amount: 0.8, y: 640, rise: 640, seed: 9 });
      const sp = K.headWorld(h.x, h.y, h.s, h.pose, 26, -56);
      const sk = V.ep(T, 3.3, 3.45, 'outBack') * (1 - V.ep(T, 4.0, 4.4));
      BA.sparkle(ctx, sp[0], sp[1], 26 * sk, T * 2, 1);
      ctx.restore();
      BA.light(ctx, { cam, hour: HOUR, light: 'warm', t: T });
    },
  });
})();
