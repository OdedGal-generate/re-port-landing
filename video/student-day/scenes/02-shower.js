// Scene 02-shower — 07:35, morning shower (5 s).
// Head + shoulders above the curtain. 0–2.85 s he scrubs his hair with both hands, eyes closed and
// happy, while the shampoo foam piles up into a big cloud (soap bubbles float off). 2.85–3.3 arms
// swing down and he steps into the stream, face up. 3.4–4.6 rinse: the foam slides off the back of
// his head in chunks. 4.4–4.6 he wipes his face, 4.6+ clean grin + thumbs-up, sparkle on the hair.
// Camera: slow eased push-in from the whole stall to a medium close-up.
(function () {
  const V = window.V;
  const BA = V.env.bathroom, L = BA.L, K = BA.kit;
  const B = V.boy, P = B.pose;
  const S = 1.2;
  const HX = 492;
  const BARE = { shirt: null, towel: null, pants: null, pantsLen: 'none', shoes: 'bare', logo: false };
  const W2 = Math.PI * 2;
  const ink = V.pal.ink;

  // foam blob layout in the head frame (face toward +x; the hair covers angles -180..-35 deg)
  const FOAM = [];
  for (let i = 0; i < 28; i++) {
    const a = V.lerp(-178, -58, (i + V.rand(i * 3.7 + 1)) / 28) * (Math.PI / 180);
    const rr = 50 + V.rand(i * 5.3 + 2) * 14;
    FOAM.push({ x: Math.cos(a) * rr - 6, y: Math.sin(a) * rr - 8, r: 12 + V.rand(i * 2.1) * 9, k: V.rand(i * 7.7) * 0.45, i });
  }
  for (let i = 0; i < 18; i++) {
    // the pile on top grows later (and taller)
    const x = V.lerp(-50, 26, V.rand(i * 4.1 + 7));
    const h = V.rand(i * 6.7 + 3);
    FOAM.push({ x, y: -70 - h * 50 + Math.abs(x + 12) * 0.4, r: 13 + V.rand(i * 8.3) * 9, k: 0.42 + h * 0.5, i: 30 + i });
  }

  const foamAmt = (t) => V.ep(t, 0.0, 2.6, 'out');
  const REST_N = { sh: 8, el: 14 }, REST_F = { sh: -8, el: 14 };
  const mixArm = (a, b, k) => ({ sh: V.lerp(a.sh, b.sh, k), el: V.lerp(a.el, b.el, k) });

  function heroAt(t) {
    const scrub = 1 - V.ep(t, 2.75, 3.15);
    const up = V.ep(t, 2.85, 3.35) - V.ep(t, 4.3, 4.7); // face up into the water
    const beat = Math.sin(t * W2 * 1.2);
    const done = V.ep(t, 4.55, 4.95);
    const shake = Math.sin(t * W2 * 3) * V.seg(t, 3.4, 3.6) * (1 - V.seg(t, 4.1, 4.3));
    let eyes = 'happy', mouth = 'grin', brows = 0.3;
    if (t > 2.95 && t < 4.6) {
      eyes = 'closed';
      mouth = t > 3.25 ? 'o' : 'grin';
      brows = -0.3;
    } else if (t >= 4.6) {
      eyes = t < 4.68 ? 'closed' : 'open';
      mouth = 'grin';
      brows = 0.8;
    }
    const pose = P.stand({
      outfit: BARE,
      facing: 1,
      torso: 2 + 2.5 * beat * scrub - 5 * up,
      head: 7 * scrub + 4 * beat * scrub - 24 * up + 5 * shake + 3 * done,
      eyes, mouth, brows,
      blush: 0.35,
    });
    const bounce = Math.max(0, Math.sin(t * W2 * 2.4)) * scrub;
    pose.legNear = { hip: 4, knee: -4 - 8 * bounce, foot: 0 };
    pose.legFar = { hip: -2, knee: -4 - 8 * bounce, foot: 0 };
    // ---- arms
    const w = t * W2 * 2.3;
    const nT = [10 + 16 * Math.cos(w), -66 + 7 * Math.sin(w)];
    const fT = [-34 + 12 * Math.cos(w + Math.PI), -52 + 8 * Math.sin(w + Math.PI)];
    const nL = K.headPt(pose, nT[0], nT[1]);
    const fL = K.headPt(pose, fT[0], fT[1]);
    // ik() wraps sh at ±180: unwrap both arms near "up and a bit back" (200) so the swing below
    // always goes backwards by < 180 deg (the far arm used to windmill through a full circle)
    let an = K.wrapArm(K.ik(pose, 'near', nL[0], nL[1], -1), 200);
    let af = K.wrapArm(K.ik(pose, 'far', fL[0], fL[1], -1), 200);
    // swing down BEHIND the body (rest + 360 = the backward way round); elbows relax first
    const down = V.ep(t, 2.8, 3.3), relax = V.ep(t, 2.8, 3.08);
    const swing = (a, r) => ({ sh: V.lerp(a.sh, r.sh + 360, down), el: V.lerp(a.el, r.el, relax) });
    an = swing(an, REST_N);
    af = swing(af, REST_F);
    let thumbK = 0;
    if (t >= 4.3) {
      // wipe the face: hand up to the forehead, down over the face, then a thumbs-up held forward
      const pF = K.headPt(pose, 44, -34), pC = K.headPt(pose, 46, 34);
      const brow = K.wrapArm(K.ik(pose, 'near', pF[0], pF[1], 1), 90);
      const chin = K.wrapArm(K.ik(pose, 'near', pC[0], pC[1], 1), 90);
      const j0 = B.fk(K.full(pose));
      const thumb = K.wrapArm(K.ik(pose, 'near', j0.armNear.s[0] + 118, j0.armNear.s[1] - 10, 1), 90);
      an = REST_N;
      an = mixArm(an, brow, V.ep(t, 4.3, 4.44));
      an = mixArm(an, chin, V.ep(t, 4.44, 4.6));
      an = mixArm(an, thumb, V.ep(t, 4.6, 4.86, 'outBack'));
      thumbK = V.ep(t, 4.66, 4.8, 'outBack');
    }
    pose.armNear = an;
    pose.armFar = af;
    const y = B.standY(L.SHOWER_Y, S, pose);
    return { x: HX + 24 * V.ep(t, 2.85, 3.35) - 40 * V.ep(t, 4.45, 4.9), y, s: S, pose, scrub, up, done, thumbK };
  }

  // thumbs-up fist, drawn in world space ON TOP of the water so it reads clearly:
  // a chunky fist (finger creases toward the camera) with the thumb popping up (k 0..1)
  function thumbUp(ctx, h) {
    const k = h.thumbK;
    if (k <= 0) return;
    const j = B.joints(h.x, h.y, h.s, h.pose);
    const skin = B.HERO.skin;
    const g = V.clamp(k * 1.6); // fist grows from the plain round hand
    ctx.save();
    ctx.translate(j.nearHand[0], j.nearHand[1]);
    ctx.scale(h.s, h.s);
    ctx.lineJoin = 'round';
    // thumb (behind the fist top, pops up)
    if (k > 0.05) {
      ctx.save();
      ctx.translate(-3, -9);
      ctx.rotate(-0.12);
      ctx.scale(1, k);
      V.fillRound(ctx, -7, -26, 14, 30, 7, skin, ink, 3.5);
      V.line(ctx, -2, -20, 3, -20, 'rgba(200,120,90,0.55)', 2.5); // nail
      ctx.restore();
    }
    // fist
    const w = V.lerp(24, 32, g), hh = V.lerp(24, 27, g);
    V.fillRound(ctx, -w / 2, -hh / 2, w, hh, 11, skin, ink, 3.5);
    ctx.globalAlpha = g;
    for (let i = 0; i < 3; i++) V.line(ctx, w / 2 - 11, -6 + i * 7, w / 2 - 2, -6 + i * 7, ink, 2.5);
    ctx.restore();
  }

  function foamBlobs(t, h) {
    const f = foamAmt(t);
    const [gx, gy] = K.down(h.pose);
    const out = [];
    FOAM.forEach((b) => {
      let g = V.ease.outBack(V.seg(f, b.k, b.k + 0.25));
      if (g <= 0) return;
      let x = b.x + Math.sin(t * 13 + b.i) * 2.2 * h.scrub;
      let y = b.y + Math.cos(t * 11 + b.i * 1.3) * 2 * h.scrub;
      // rinse: each blob lets go and slides off the back of the head
      const rel = 3.38 + V.rand(b.i * 9.1) * 0.7 - (b.y < -80 ? 0.12 : 0);
      const d = t - rel;
      if (d > 0) {
        const fall = 1100 * d * d + 80 * d;
        x += gx * fall - 140 * d;
        y += gy * fall;
        g *= V.clamp(1 - d / 0.6);
      }
      if (g > 0.03) out.push({ x, y, r: b.r * g });
    });
    return out;
  }

  // soap bubbles floating off the foam while he scrubs
  function bubbles(ctx, t, h) {
    const top = K.headWorld(h.x, h.y, h.s, h.pose, -10, -90);
    for (let i = 0; i < 7; i++) {
      const per = 1.5 + V.rand(i * 3.1) * 0.6;
      const t0 = 0.5 + V.rand(i * 5.5) * per;
      if (t < t0) continue;
      const cyc = Math.floor((t - t0) / per);
      const ph = ((t - t0) / per) % 1;
      // only spawn while there is foam and he is scrubbing (a started bubble finishes its flight)
      const born = t0 + cyc * per;
      if (born > 3.0) continue;
      const sx = top[0] + (V.rand(i * 7 + cyc) - 0.5) * 120;
      const x = sx + Math.sin(ph * 5 + i) * 18 + (V.rand(i + cyc * 2.3) - 0.5) * 80 * ph;
      const y = top[1] + 20 - ph * 200;
      const r = (7 + V.rand(i * 2.2 + cyc) * 9) * Math.min(1, ph * 5);
      if (ph < 0.9) BA.bubble(ctx, x, y, r, 1);
      else BA.sparkle(ctx, x, y, r * 1.4 * (1 - (ph - 0.9) * 6), 0.4, 0.8);
    }
  }

  // water drops falling from the clean hair at the end
  function drips(ctx, t, h) {
    if (t < 4.4) return;
    for (let i = 0; i < 5; i++) {
      const per = 0.7;
      const ph = ((t - 4.4) / per + V.rand(i * 4.4)) % 1;
      const p = K.headWorld(h.x, h.y, h.s, h.pose, -44 + i * 15, -40 + Math.abs(i - 2) * 6);
      const y = p[1] + ph * ph * 160;
      V.ellipse(ctx, p[0] - ph * 6, y, 4, 6, 'rgba(120,190,235,0.9)');
      V.circle(ctx, p[0] - ph * 6 - 1.2, y - 2, 1.5, '#ffffff');
    }
  }

  V.registerScene('02-shower', {
    sfx: [{ t: 0, type: 'shower', dur: 5.4 }, { t: 4.78, type: 'sparkle', vol: 0.6 }],
    draw(ctx, t, info) {
      const T = Math.min(t, 5.45);
      const e = V.ep(T, 0, 4.9, 'sine');
      const cam = { x: V.lerp(610, 525, e), y: V.lerp(470, 395, e), zoom: V.lerp(1.12, 1.92, e) };
      const h = heroAt(T);
      BA(ctx, { t: T, hour: 7.6, cam, fog: 0.6 });
      ctx.save();
      BA.cam(ctx, cam);
      B.draw(ctx, h.x, h.y, h.s, h.pose);
      // foam on the head (covers the scrubbing hands)
      const blobs = foamBlobs(T, h);
      ctx.save();
      K.headFrame(ctx, h.x, h.y, h.s, h.pose);
      BA.foam(ctx, blobs);
      ctx.restore();
      drips(ctx, T, h);
      // water
      const left = foamAmt(T) * (1 - V.seg(T, 3.4, 4.3));
      const hc = K.headWorld(h.x, h.y, h.s, h.pose, -4, -16 - 18 * left);
      const j = B.joints(h.x, h.y, h.s, h.pose);
      BA.water(ctx, {
        t: T,
        hits: [
          { x: hc[0], y: hc[1], r: (54 + 22 * left) * S },
          { x: j.shoulder[0], y: j.shoulder[1] + 8, r: 36 * S },
        ].concat(T > 4.3 ? [{ x: j.nearHand[0] + 4, y: j.nearHand[1] - 10 * S, r: 24 * S }] : []),
      });
      BA.curtain(ctx, { t: T, wet: 0.7 });
      thumbUp(ctx, h);
      bubbles(ctx, T, h);
      BA.steam(ctx, { t: T, amount: 0.55 + 0.45 * V.seg(T, 0, 3), y: 600, rise: 620 });
      // "clean!" sparkles on the hair
      const sp = K.headWorld(h.x, h.y, h.s, h.pose, 6, -66);
      const sk = V.ep(T, 4.75, 4.95, 'outBack') * (1 - V.ep(T, 5.2, 5.45));
      BA.sparkle(ctx, sp[0], sp[1], 26 * sk, T * 2, 1);
      const sp2 = K.headWorld(h.x, h.y, h.s, h.pose, -34, -52);
      const sk2 = V.ep(T, 4.88, 5.05, 'outBack') * (1 - V.ep(T, 5.25, 5.45));
      BA.sparkle(ctx, sp2[0], sp2[1], 16 * sk2, -T * 2, 1);
      ctx.restore();
      BA.light(ctx, { cam, hour: 7.6, t: T, steam: 0.8 });
    },
  });
})();
