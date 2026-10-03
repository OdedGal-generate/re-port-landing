// Scene 03-teeth — 07:42, brushing teeth at the sink (5 s).
// Towel round his waist, damp messy hair. Side framing: he faces the (fogged, hand-wiped) mirror,
// his reflection faces him. 0–0.3 brush comes up, 0.3–3.35 vigorous brushing with foam at the
// mouth, 3.35–3.55 brush down + lean over the basin, 3.6 SPIT, 3.7 hand under the sensor faucet,
// 3.9 splash of water to the mouth, 4.1 straighten, 4.2–5.0 big grin at the mirror, 4.3 sparkle.
// Camera: slow push-in, dips with the lean, then an over-the-shoulder push onto the reflection.
(function () {
  const V = window.V;
  const BA = V.env.bathroom, L = BA.L, K = BA.kit;
  const B = V.boy, P = B.pose;
  const ink = V.pal.ink;
  const S = 1.2;
  const HX = 1150;
  const MIR = { axis: 1380, axisY: 495, k: 0.86 };
  const W2 = Math.PI * 2;
  const HAND_REST = [1252, 640]; // where the brush gets laid down on the counter
  const FAR_HAND = [1222, 646]; // far hand leans on the counter edge
  const SPOUT = [L.SPOUT.x, L.SPOUT.y + 42];
  const T_REACH = [3.7, 3.8]; // hand to the sensor faucet (after the spit lands at ~3.73)
  const T_SCOOP = [3.84, 3.93]; // cupped water up to the mouth (splash sfx 3.9)
  const T_TAP = [3.73, 3.77, 3.9, 3.95]; // faucet on / off

  const lerp2 = (a, b, k) => [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)];

  function basePose(t) {
    const lean = V.ep(t, 3.36, 3.58) * (1 - V.ep(t, 4.0, 4.32));
    const scoop = V.ep(t, 3.6, 3.75) * (1 - V.ep(t, 3.95, 4.2));
    const brushing = V.seg(t, 0.3, 0.4) * (1 - V.seg(t, 3.3, 3.4));
    const w = t * W2 * 5.2;
    const proud = V.ep(t, 4.15, 4.5);
    let eyes = t < 1.0 ? 'half' : B.blink(t, 'open', 1);
    let mouth = 'grin', brows = 0;
    if (t < 0.3) mouth = 'neutral';
    if (t > 1.85 && t < 2.25) brows = 1; // quick eyebrow wiggle at the mirror
    if (t > 2.25 && t < 2.55) brows = -0.4;
    if (t >= 3.35 && t < 3.62) { mouth = 'o'; eyes = 'open'; }
    if (t >= 3.62 && t < 3.86) { mouth = 'open'; }
    if (t >= 3.86 && t < 4.15) { mouth = 'o'; eyes = 'closed'; }
    if (t >= 4.15) { mouth = 'teeth'; eyes = t > 4.62 && t < 4.95 ? 'happy' : 'open'; brows = 0.9; }
    const pose = P.stand({
      outfit: 'towel',
      facing: 1,
      torso: 4 + 20 * lean + 4 * scoop - 3 * proud,
      head: 2 + 2.2 * Math.sin(w) * brushing - 6 * V.ep(t, 1.5, 1.8) * (1 - V.ep(t, 2.3, 2.6)) + 17 * lean - 7 * proud,
      eyes, mouth, brows,
      blush: 0.25 + 0.2 * proud,
    });
    pose.legNear = { hip: -2 - 6 * lean, knee: -2, foot: 0 };
    pose.legFar = { hip: -6 - 6 * lean, knee: -2, foot: 0 };
    return { pose, lean, brushing, w, proud };
  }

  // brush-in-mouth target (head frame) while brushing
  const brushOffset = (t, w) => {
    const vert = V.seg(t, 1.5, 1.7) * (1 - V.seg(t, 2.3, 2.5));
    return [52 + 10 * Math.sin(w) * (1 - vert * 0.6), 12 + 7 * Math.sin(w * 0.98 + 1.2) * vert + 2 * Math.cos(w)];
  };

  function heroAt(t) {
    const b = basePose(t);
    const pose = b.pose;
    const x = HX - 12 * b.lean;
    const y = B.standY(L.SINK_Y, S, pose);
    const W = (p) => K.toLocal(x, y, S, pose, p[0], p[1]);
    const mouthL = K.headPt(pose, 28, 24);
    // ---- near hand target (rig-local)
    let tgt;
    const ready = K.headPt(pose, 64, 76);
    const bo = brushOffset(t, b.w);
    const atMouth = K.headPt(pose, bo[0], bo[1]);
    if (t < 3.35) {
      tgt = lerp2(ready, atMouth, V.ep(t, 0.0, 0.32, 'outBack'));
    } else {
      const lastMouth = K.headPt(pose, 52, 12);
      // brush down -> (spit, hand stays on the counter) -> hand under the faucet -> water to the
      // mouth -> back to the counter. The hand only leaves after the spit has landed (3.73).
      tgt = lerp2(lastMouth, W(HAND_REST), V.ep(t, 3.35, 3.5));
      tgt = lerp2(tgt, W([SPOUT[0] - 4, SPOUT[1] - 2]), V.ep(t, T_REACH[0], T_REACH[1]));
      tgt = lerp2(tgt, K.headPt(pose, 40, 36), V.ep(t, T_SCOOP[0], T_SCOOP[1]));
      tgt = lerp2(tgt, W([HAND_REST[0] + 10, HAND_REST[1] + 4]), V.ep(t, 4.0, 4.3));
    }
    pose.armNear = K.ik(pose, 'near', tgt[0], tgt[1], 1);
    const fl = W(FAR_HAND);
    pose.armFar = K.ik(pose, 'far', fl[0], fl[1], 1);
    // ---- toothbrush in the near hand until it is laid down at 3.5 s
    if (t < 3.5) {
      const aimM = K.aim(pose, 'near', mouthL[0] - 4, mouthL[1] + 1);
      // laid flat (world horizontal) when lowering
      const flat = K.aim(pose, 'near', tgt[0] + 100, tgt[1]);
      const k = V.ep(t, 3.36, 3.48);
      const ang = V.lerp(aimM.ang, flat.ang, k);
      const len = V.lerp(aimM.dist + 2, 62, Math.max(k, 1 - V.ep(t, 0.05, 0.3)));
      pose.propNear = brushProp(ang, len);
    }
    return { x, y, s: S, pose, ...b };
  }

  function drawBrush(ctx, len) {
    V.fillRound(ctx, -18, -5, len + 16, 10, 5, '#3b7dd8', ink, 3);
    V.fillRound(ctx, len - 8, -6, 24, 12, 5, '#3b7dd8', ink, 3);
    V.fillRound(ctx, len - 6, -16, 20, 11, 3, '#ffffff', ink, 2.5);
    V.line(ctx, -10, -1, len - 14, -1, 'rgba(255,255,255,0.5)', 2.5);
  }
  function brushProp(ang, len) {
    return (ctx) => {
      ctx.save();
      ctx.rotate(ang);
      drawBrush(ctx, len);
      // fingers wrapped round the handle
      V.fillRound(ctx, -11, -12, 22, 24, 10, B.HERO.skin, ink, 3.5);
      V.line(ctx, -2, -9, -2, 9, 'rgba(160,90,60,0.5)', 2);
      ctx.restore();
    };
  }

  // foam at the mouth (head frame)
  const MFOAM = [[30, 30, 6], [21, 31, 5], [37, 25, 5], [27, 36, 4.5], [41, 31, 4], [16, 27, 3.5], [33, 39, 3.5], [44, 22, 3]];
  function mouthFoam(ctx, t, h) {
    const f = V.ep(t, 0.6, 2.8, 'out') * (1 - V.ep(t, 3.56, 3.66));
    if (f <= 0.02) return;
    ctx.save();
    K.headFrame(ctx, h.x, h.y, h.s, h.pose);
    const blobs = MFOAM.map(([x, y, r], i) => ({
      x: x + Math.sin(t * 17 + i) * 1.2 * h.brushing,
      y: y + Math.cos(t * 15 + i * 2) * 1.2 * h.brushing,
      r: r * V.ease.outBack(V.seg(f, i * 0.08, i * 0.08 + 0.35)),
    }));
    // a drip sliding down the chin
    const d = V.seg(t, 2.4, 3.3);
    if (d > 0) blobs.push({ x: 26 - d * 4, y: 40 + d * 22, r: 4.2 * (1 - d * 0.4) });
    BA.foam(ctx, blobs, { lw: 2.5, ring: false });
    ctx.restore();
  }

  // drops on the damp hair (head frame) + an occasional drip
  function hairDrops(ctx, t, h) {
    ctx.save();
    K.headFrame(ctx, h.x, h.y, h.s, h.pose);
    const pts = [[-30, -42], [4, -50], [-42, -12], [24, -32]];
    pts.forEach(([x, y], i) => {
      V.ellipse(ctx, x, y, 2.8, 3.8, 'rgba(150,210,245,0.9)');
      V.circle(ctx, x - 0.8, y - 1.2, 1.2, '#ffffff');
    });
    ctx.restore();
    // drips falling from the back of the hair
    for (let i = 0; i < 2; i++) {
      const per = 1.3;
      const ph = ((t / per) + i * 0.5) % 1;
      const p = K.headWorld(h.x, h.y, h.s, h.pose, -44 + i * 6, 6 + i * 4);
      const yy = p[1] + ph * ph * 200;
      ctx.globalAlpha = 1 - ph;
      V.ellipse(ctx, p[0], yy, 3.5, 5.5, 'rgba(120,190,235,0.95)');
      ctx.globalAlpha = 1;
    }
  }

  // everything that belongs to the hero (also drawn inside the mirror)
  function drawHero(ctx, t, h) {
    B.draw(ctx, h.x, h.y, h.s, h.pose);
    hairDrops(ctx, t, h);
    mouthFoam(ctx, t, h);
    // little foam flecks flying off while brushing
    if (h.brushing > 0) {
      for (let i = 0; i < 4; i++) {
        const per = 0.45;
        const ph = ((t / per) + V.rand(i * 3.3)) % 1;
        const m = K.headWorld(h.x, h.y, h.s, h.pose, 44, 24);
        const x = m[0] + (12 + V.rand(i + Math.floor(t / per)) * 40) * ph;
        const y = m[1] - 30 * ph + 70 * ph * ph;
        ctx.globalAlpha = (1 - ph) * h.brushing;
        V.circle(ctx, x, y, 3.5 * (1 - ph * 0.5), '#ffffff', ink, 1.5);
        ctx.globalAlpha = 1;
      }
    }
    // sparkling clean teeth: the "ting" sits on the front corner of the grin (head frame), so it
    // reads as the TEETH shining, not the nose
    const m1 = K.headWorld(h.x, h.y, h.s, h.pose, 47, 16);
    const a = V.ep(t, 4.3, 4.46, 'outBack') * (1 - V.ep(t, 5.1, 5.4));
    BA.sparkle(ctx, m1[0], m1[1], 25 * a, 0.3 + t * 1.5, 1);
    const m2 = K.headWorld(h.x, h.y, h.s, h.pose, 66, 34);
    const a2 = V.ep(t, 4.42, 4.58, 'outBack') * (1 - V.ep(t, 5.0, 5.3));
    BA.sparkle(ctx, m2[0], m2[1], 14 * a2, -t * 2, 1);
    const m3 = K.headWorld(h.x, h.y, h.s, h.pose, 62, 6);
    const a3 = V.ep(t, 4.52, 4.66, 'outBack') * (1 - V.ep(t, 4.95, 5.2));
    BA.sparkle(ctx, m3[0], m3[1], 11 * a3, t * 2.5, 1);
  }

  // spit glob arcing into the basin, splat, water splash
  function spitAndSplash(ctx, t) {
    const B0 = [L.BASIN.x + 4, L.BASIN.rim + 6];
    if (t >= 3.58 && t < 3.75) {
      const h0 = heroAt(3.6);
      const m0 = K.headWorld(h0.x, h0.y, S, h0.pose, 38, 26);
      const k = V.ease.in(V.seg(t, 3.6, 3.73)) * 0.7 + V.seg(t, 3.6, 3.73) * 0.3;
      const x = V.lerp(m0[0], B0[0], k);
      const y = V.lerp(m0[1], B0[1], k) - 30 * Math.sin(Math.PI * k);
      const r = 13 * (1 - 0.3 * k) * V.ease.outBack(V.seg(t, 3.58, 3.62));
      const tail = [x - (B0[0] - m0[0]) * 0.12, y - 12 * (1 - k)];
      BA.foam(ctx, [{ x, y, r }, { x: tail[0], y: tail[1], r: r * 0.55 }, { x: x + r * 0.6, y: y + r * 0.4, r: r * 0.5 }], { lw: 2.8, ring: false });
      // spray flecks right at the lips
      if (t < 3.66) {
        for (let i = 0; i < 5; i++) {
          const a = -0.6 + i * 0.3, d = 20 + 40 * V.seg(t, 3.6, 3.66);
          V.circle(ctx, m0[0] + Math.cos(a) * d, m0[1] + Math.sin(a) * d, 3, '#ffffff', ink, 1.5);
        }
      }
    }
    // water hitting his hand under the faucet (drops fall back into the bowl, never below its rim)
    if (t > T_TAP[1] && t < T_TAP[2] + 0.02) {
      for (let i = 0; i < 8; i++) {
        const ph = ((t * 6) + V.rand(i * 3.1)) % 1;
        const a = -Math.PI * (0.15 + 0.7 * V.rand(i * 7.7));
        const x = SPOUT[0] + Math.cos(a) * 70 * ph, y = SPOUT[1] - 12 + Math.sin(a) * 50 * ph + 140 * ph * ph;
        if (y > L.BASIN.rim + 6) continue;
        V.ellipse(ctx, x, y, 3, 4, 'rgba(110,185,235,0.95)');
      }
    }
  }
  function splat(ctx, t) {
    const k = V.seg(t, 3.72, 3.8);
    const fade = 1 - V.ep(t, 3.8, 4.3);
    if (k <= 0 || fade <= 0) return;
    const x = L.BASIN.x + 4, y = L.BASIN.rim + 3;
    ctx.save();
    ctx.globalAlpha = fade;
    V.ellipse(ctx, x, y, 34 * V.ease.outBack(k), 6 * V.ease.outBack(k), '#ffffff');
    V.circle(ctx, x - 24, y - 4 - 10 * k, 3.5, '#ffffff');
    V.circle(ctx, x + 28, y - 6 - 8 * k, 3, '#ffffff');
    ctx.restore();
  }
  function waterSplash(ctx, t) {
    if (t < 3.86 || t > 4.3) return;
    const h0 = heroAt(3.9);
    const m0 = K.headWorld(h0.x, h0.y, S, h0.pose, 36, 26);
    const tt = t - 3.88;
    if (tt < 0) return;
    for (let i = 0; i < 14; i++) {
      const ang = -Math.PI * (0.05 + 0.9 * V.rand(i * 2.7));
      const sp = 220 + V.rand(i * 5.1) * 260;
      const x = m0[0] + Math.cos(ang) * sp * tt;
      const y = m0[1] + Math.sin(ang) * sp * tt + 1300 * tt * tt;
      const r = 3 + V.rand(i) * 3.5;
      ctx.globalAlpha = V.clamp(1 - tt / 0.4);
      V.ellipse(ctx, x, y, r, r * 1.25, 'rgba(110,185,235,0.95)');
      V.circle(ctx, x - r * 0.3, y - r * 0.4, r * 0.35, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  // brush lying on the counter once he lets go of it
  function brushOnCounter(ctx, t) {
    if (t < 3.5) return;
    const h0 = heroAt(3.4999);
    const j = B.joints(h0.x, h0.y, S, h0.pose);
    ctx.save();
    ctx.translate(j.nearHand[0], j.nearHand[1] + 2);
    ctx.scale(S, S);
    drawBrush(ctx, 62);
    ctx.restore();
  }

  V.registerScene('03-teeth', {
    sfx: [
      { t: 0.3, type: 'brush', dur: 3.1 },
      { t: 3.6, type: 'spit' },
      { t: 3.9, type: 'splash' },
      { t: 4.3, type: 'sparkle' },
    ],
    draw(ctx, t, info) {
      const T = Math.min(t, 5.45);
      const h = heroAt(T);
      const e1 = V.ep(T, 0, 3.4, 'sine');
      const dip = V.ep(T, 3.3, 3.6) * (1 - V.ep(T, 4.0, 4.4));
      const e2 = V.ep(T, 4.1, 5.05, 'inOut');
      const cam = {
        x: V.lerp(1372, 1395, e1) + 70 * e2,
        y: V.lerp(530, 518, e1) + 26 * dip - 14 * e2,
        zoom: V.lerp(1.72, 1.98, e1) + 0.38 * e2,
      };
      BA(ctx, {
        t: T,
        hour: 7.7,
        cam,
        fog: 0.8,
        wipe: { x: 1525, y: 505, rx: 150, ry: 190, rot: 0.1 },
        brushInCup: false,
        faucet: V.ep(T, T_TAP[0], T_TAP[1]) * (1 - V.ep(T, T_TAP[2], T_TAP[3])),
        mirror: MIR,
        reflect: (c) => drawHero(c, T, h),
      });
      ctx.save();
      BA.cam(ctx, cam);
      splat(ctx, T);
      brushOnCounter(ctx, T);
      drawHero(ctx, T, h);
      spitAndSplash(ctx, T);
      waterSplash(ctx, T);
      BA.steam(ctx, { t: T, amount: 0.35, x0: 900, x1: 1700, y: 360, rise: 420, n: 10, seed: 5 });
      ctx.restore();
      BA.light(ctx, { cam, hour: 7.7, t: T, steam: 0.4 });
    },
  });
})();
