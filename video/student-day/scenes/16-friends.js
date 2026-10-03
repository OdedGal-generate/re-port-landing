// Scene 16-friends (9 s, 21:00 -> 01:30) — night out with the gang. Set + lighting: env/night.js.
//  Shot 1 (0–3.2)  night street corner (רחוב הדקל) under a warm street lamp, 21:00. The hero (green
//                  hoodie) strides in from the left: passing fist bump with Itay (buzz cut, spinning a
//                  basketball) 0.62, another with Noam (blond skater) 1.12; Dani (curly hair, red jacket)
//                  throws his arms open 1.0, big high five 1.9 -> fist bump 2.25 -> everyone cracks up.
//  Shot 2 (3.2–9.0) the seaside promenade: pizza on a bench (Dani tells a joke, punchline 4.0), Noam drops
//                  his board 4.47 and skates into the open floor: pop 4.97, kickflip, land 5.27, friends
//                  cheer. Then the night fast-forwards (the stamp + the hero's phone race 21:00 -> 01:30
//                  between 3.2 and 7.8): passers-by zip past as time-lapse ghosts, the moon crosses the
//                  sky, string lights / menu / shutter (5.7) / kiosk light go out one by one, the
//                  plaza empties. 5.9 the phone pops up in the hero's hand (push-in close-up); Dani nods
//                  off; 7.5 "01:30?!"; pull back to the empty plaza while the neon, the last light,
//                  flickers out on camera (7.9); 7.7 Itay yawns, 8.0 they stand, 8.42 parting high five,
//                  Dani heads home waving, the others wave goodbye.
//  Raised near arms (high fives, "Ayy!") are drawn with nightPerson {headOver} so they pass
//  behind the head instead of across the face.
(function () {
  const B = V.boy, P = B.pose, E = V.env;
  const F = E.NIGHT_FRIENDS;
  const C = E.NIGHT.corner, PZ = E.NIGHT.plaza;
  const mix = E.nightPoseMix, IK = E.nightArmIK;
  const INK = V.pal.ink;

  const CUT = 3.2, TW0 = 3.2, TW1 = 7.8;
  const kNight = (t) => V.ease.inOut(V.seg(t, TW0, TW1));
  const stamp = (t) => (t < TW0 ? '21:00' : V.lerpTime('21:00', '01:30', kNight(t)));

  // envelope: rises over [a,b], falls over [c,d]
  const env = (t, a, b, c, d, e1 = 'inOut', e2 = 'inOut') => {
    const v = V.ep(t, a, b, e1) * (1 - V.ep(t, c, d, e2));
    return Math.abs(v) < 1e-4 ? 0 : v;
  };
  const setArm = (p, side, ang, w) => {
    if (w <= 0) return;
    p[side] = { sh: V.lerp(p[side].sh, ang.sh, w), el: V.lerp(p[side].el, ang.el, w) };
  };
  // keyframes with per-segment easing: [[t, v, ease], ...] (ease of the segment ending at that key)
  const kfE = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1];
        return V.lerp(v0, v1, V.ease[e || 'inOut'](V.seg(t, t0, t1)));
      }
    }
    return keys[keys.length - 1][1];
  };
  const wear = (who, o) => Object.assign({ look: F[who].look, outfit: F[who].outfit }, o);

  // ---------------------------------------------------------------- impact FX
  function impactStar(ctx, x, y, k, size = 1) {
    if (k <= 0 || k >= 1) return;
    // pops big, then shrinks away (a half-transparent pale star over the night sky reads as a
    // grey blob, so it stays opaque and only fades at the very end)
    const r = (16 + 44 * V.ease.out(V.seg(k, 0, 0.35))) * (1 - V.ease.in(V.seg(k, 0.45, 1))) * size;
    if (r < 2) return;
    ctx.save();
    ctx.globalAlpha = 1 - V.seg(k, 0.8, 1);
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff3a8';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.55;
      V.line(ctx, x + Math.cos(a) * (r + 8), y + Math.sin(a) * (r + 8), x + Math.cos(a) * (r + 26 * size), y + Math.sin(a) * (r + 26 * size), INK, 4);
    }
    ctx.restore();
  }
  // "boom" fingers: short rays around an opened hand
  function boomRays(ctx, x, y, k, dir) {
    if (k <= 0 || k >= 1) return;
    ctx.save();
    ctx.globalAlpha = 1 - k * k;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + dir * (-0.9 + i * 0.45);
      const r0 = 18 + 20 * k, r1 = r0 + 16;
      V.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, '#ffe48a', 5);
    }
    ctx.restore();
  }

  // ================================================================= SHOT 1 — street corner
  const S1 = {
    s: 1.05, gy: C.GY,
    // decelerates to a stop at x 880 at t 1.75. The distance (1161 px = 3.5 walk cycles at s 1.05)
    // makes him stop at walk phase 0.5 (legs together, back foot mid-swing), so the last foot just
    // plants when he settles into the stand pose instead of gliding along the ground.
    x0: -281, v: 774, tD: 1.25, T: 0.5,
    buzz: { x: 418, gy: 836, s: 0.96 },
    blond: { x: 777, gy: 862, s: 0.96 },
    curly: { x: 1080, gy: 890, s: 1.05 },
  };
  const heroX1 = (t) => {
    if (t < S1.tD) return S1.x0 + S1.v * t;
    const u = Math.min(t - S1.tD, S1.T);
    return S1.x0 + S1.v * S1.tD + S1.v * u - (S1.v * u * u) / (2 * S1.T);
  };
  const heroSpeed1 = (t) => (t < S1.tD ? S1.v : S1.v * Math.max(0, 1 - (t - S1.tD) / S1.T));

  function heroBase1(t) {
    const s = S1.s;
    const x = heroX1(t);
    const amp = 1 - V.ep(t, 1.68, 1.86); // full stride until he has stopped, then settle
    const walk = P.walk(B.walkPhase(x - S1.x0, s), { outfit: 'evening', facing: 1 });
    const p = mix(P.stand({ outfit: 'evening', facing: 1, armNear: { sh: 8, el: 14 }, armFar: { sh: -8, el: 14 } }), walk, amp);
    p.torso = V.lerp(2, 5, amp);
    return { x, p, hip: B.standY(S1.gy, s, p) };
  }
  // fist-bump meeting points (between the shoulders, a bit lower)
  let Q1 = null, Q2 = null;
  function bumpPoints() {
    if (Q1) return;
    const h1 = heroBase1(0.62), h2 = heroBase1(1.12);
    const jh1 = B.joints(h1.x, h1.hip, S1.s, h1.p), jh2 = B.joints(h2.x, h2.hip, S1.s, h2.p);
    const bp = P.stand(wear('buzz', { facing: -1 })), lp = P.stand(wear('blond', { facing: -1 }));
    const jb = B.joints(S1.buzz.x, B.standY(S1.buzz.gy, S1.buzz.s, bp), S1.buzz.s, bp);
    const jl = B.joints(S1.blond.x, B.standY(S1.blond.gy, S1.blond.s, lp), S1.blond.s, lp);
    Q1 = [(jh1.shoulder[0] + jb.shoulder[0]) / 2, Math.max(jh1.shoulder[1], jb.shoulder[1]) + 48];
    Q2 = [(jh2.shoulder[0] + jl.shoulder[0]) / 2, Math.max(jh2.shoulder[1], jl.shoulder[1]) + 48];
  }
  const HF = 1.9, FB = 2.25, BOOM = 2.33;
  const HFX = 980;
  // hero's near-hand path through the high five -> fist bump -> boom. The raised arm is drawn
  // BEHIND the head (nightPerson headOver) so it never covers the faces.
  // (wind-up: hand raised high above the FRONT of the head, so forearm + hand show above the hair)
  const HKX = [[1.5, 880], [1.68, 918], [1.78, 914, 'out'], [HF, HFX - 2, 'in'], [1.97, HFX, 'out'], [2.1, 945], [FB, HFX - 4, 'in'], [2.3, HFX - 4], [2.46, 925, 'out']];
  const HKY = [[1.5, 470], [1.68, 402], [1.78, 396, 'out'], [HF, 444, 'in'], [1.97, 440, 'out'], [2.1, 562], [FB, 594, 'in'], [2.3, 594], [2.46, 628, 'out']];
  const mirrorX = (keys) => keys.map(([t, x, e]) => [t, 2 * HFX - x, e]);
  const CKX = mirrorX(HKX), CKY = HKY;
  const hfW = (t) => V.ep(t, 1.48, 1.66) * (1 - V.ep(t, 2.46, 2.72));
  // anticipation: lean back on the wind-up, lunge forward into the slap
  const hfLean = (t) => 6 * V.ep(t, 1.78, HF, 'in') * (1 - V.ep(t, HF, 2.1)) - 6 * env(t, 1.5, 1.72, 1.78, 1.88);
  // when the raised near arm must pass behind the head
  const headOver1 = (t) => t > 0.95 && t < 2.2;
  // laughing: clutching their own bellies (not grabbing each other's chests)
  const BELLY_H = { sh: -28, el: 110 }, BELLY_C = { sh: -26, el: 108 };
  const laughK1 = (t) => V.ep(t, 2.4, 2.62);
  const shake = (t, k, hz = 5.5) => Math.sin(t * hz * Math.PI * 2) * k;

  function hero1(t) {
    bumpPoints();
    const s = S1.s;
    const b = heroBase1(t);
    const p = b.p;
    p.eyes = B.blink(t, 'open', 1);
    p.mouth = 'grin';
    p.brows = 0.3;
    // passing fist bumps
    const b1 = env(t, 0.47, 0.62, 0.64, 0.8, 'out', 'inOut');
    setArm(p, 'armNear', IK(p, b.x, b.hip, s, 'near', Q1), b1);
    const b2 = env(t, 0.97, 1.12, 1.14, 1.3, 'out', 'inOut');
    setArm(p, 'armNear', IK(p, b.x, b.hip, s, 'near', Q2), b2);
    if (b1 > 0.3 || b2 > 0.3) p.eyes = 'happy';
    // high five / fist bump / boom
    const w = hfW(t);
    if (w > 0) {
      p.torso += hfLean(t);
      const tgt = [kfE(t, HKX), kfE(t, HKY)];
      setArm(p, 'armNear', IK(p, b.x, b.hip, s, 'near', tgt), w);
      p.brows = 0.8;
      p.mouth = t > 1.86 && t < 2.05 ? 'open' : 'grin';
      if (t > 1.88 && t < 2.0) p.eyes = 'happy';
    }
    // laughing
    const L = laughK1(t);
    if (L > 0) {
      p.torso = V.lerp(p.torso, 12 + shake(t, 2.5), L);
      p.head = V.lerp(p.head, 8 + shake(t + 0.1, 2), L);
      setArm(p, 'armNear', BELLY_H, L * (1 - w));
      setArm(p, 'armFar', { sh: -22, el: 104 }, L);
      p.eyes = L > 0.4 ? 'happy' : p.eyes;
      p.mouth = L > 0.3 ? 'open' : p.mouth;
      p.brows = 0.6;
    }
    return { x: b.x, gy: S1.gy, s, p };
  }

  function curly1(t) {
    const s = S1.curly.s;
    const x = S1.curly.x;
    const notice = V.ep(t, 0.82, 1.0);
    const open = env(t, 0.98, 1.22, 1.38, 1.56, 'outBack', 'inOut');
    const p = P.stand(wear('curly', {
      facing: -1,
      armNear: { sh: -16, el: 40 },
      armFar: { sh: -22, el: 42 },
      eyes: B.blink(t, 'open', 4),
      mouth: 'smile',
      torso: -2 + Math.sin(t * 3) * 1.2,
      head: Math.sin(t * 3 + 1) * 2,
    }));
    if (notice > 0) {
      p.brows = notice;
      p.mouth = t < 1.45 ? 'open' : 'grin';
      p.head = V.lerp(p.head, -6, notice);
    }
    setArm(p, 'armNear', { sh: 118, el: 26 }, open);
    setArm(p, 'armFar', { sh: 142, el: 22 }, open);
    const w = hfW(t + 0.02);
    if (w > 0) p.torso += hfLean(t);
    const hip = B.standY(S1.curly.gy, s, p);
    if (w > 0) {
      const tgt = [kfE(t, CKX), kfE(t, CKY)];
      setArm(p, 'armNear', IK(p, x, hip, s, 'near', tgt), w);
      p.mouth = t > 1.86 && t < 2.05 ? 'open' : 'grin';
      if (t > 1.88 && t < 2.0) p.eyes = 'happy';
      p.brows = 0.8;
    }
    const L = laughK1(t);
    if (L > 0) {
      p.torso = V.lerp(p.torso, -7 + shake(t + 0.3, 2.5), L);
      p.head = V.lerp(p.head, -14 + shake(t + 0.2, 2), L);
      setArm(p, 'armNear', BELLY_C, L * (1 - w));
      setArm(p, 'armFar', { sh: -20, el: 100 }, L);
      p.eyes = L > 0.4 ? 'happy' : p.eyes;
      p.mouth = L > 0.3 ? 'open' : p.mouth;
    }
    return { x, gy: S1.curly.gy, s, p };
  }

  function buzz1(t) {
    bumpPoints();
    const s = S1.buzz.s;
    // turns to follow the hero, then strolls over to the group
    const facing = E.nightTurn(t, 0.86, 0.16, -1, 1);
    const walkK = V.ep(t, 1.3, 2.3);
    const x = V.lerp(S1.buzz.x, 610, walkK);
    const moving = env(t, 1.3, 1.45, 2.12, 2.32);
    const walk = P.walk(B.walkPhase(x - S1.buzz.x, s), {});
    const p = P.stand(wear('buzz', {
      facing,
      eyes: B.blink(t, 'open', 2),
      mouth: 'smile',
      armFar: { sh: 168, el: 22 },
      armNear: { sh: 6, el: 18 },
    }));
    ['legNear', 'legFar'].forEach((l) => (p[l] = { hip: V.lerp(p[l].hip, walk[l].hip, moving), knee: V.lerp(p[l].knee, walk[l].knee, moving), foot: 0 }));
    setArm(p, 'armNear', walk.armNear, moving * 0.8);
    const hip = B.standY(S1.buzz.gy, s, p);
    const b1 = env(t, 0.44, 0.62, 0.64, 0.84, 'out', 'inOut');
    if (b1 > 0) {
      setArm(p, 'armNear', IK(p, x, hip, s, 'near', Q1), b1);
      p.mouth = 'grin';
      p.brows = 0.5;
    }
    const L = laughK1(t + 0.08);
    if (L > 0) {
      p.torso = V.lerp(p.torso, 8 + shake(t + 0.6, 2.4), L);
      p.mouth = 'open';
      p.eyes = 'happy';
      setArm(p, 'armNear', { sh: 26, el: 90 }, L);
    }
    return { x, gy: S1.buzz.gy, s, p, ball: true };
  }

  function blond1(t) {
    bumpPoints();
    const s = S1.blond.s;
    const x = S1.blond.x;
    const facing = E.nightTurn(t, 1.4, 0.16, -1, 1);
    const p = P.stand(wear('blond', {
      facing,
      eyes: B.blink(t, 'open', 6),
      mouth: 'smile',
      armNear: { sh: 4, el: 16 },
      head: 2,
    }));
    const hip = B.standY(S1.blond.gy, s, p);
    // far hand rests on the nose of the skateboard standing on its tail beside him
    const top = [x + 46, S1.blond.gy - 196 * 0.86 - 6];
    if (Math.abs(facing) > 0.5) setArm(p, 'armFar', IK(p, x, hip, s, 'far', top), 1);
    const b2 = env(t, 0.95, 1.12, 1.14, 1.34, 'out', 'inOut');
    if (b2 > 0) {
      setArm(p, 'armNear', IK(p, x, hip, s, 'near', Q2), b2);
      p.mouth = 'grin';
      p.brows = 0.5;
    }
    const L = laughK1(t + 0.04);
    if (L > 0) {
      p.torso = V.lerp(p.torso, 6 + shake(t + 0.9, 2.2), L);
      p.head = V.lerp(p.head, -6, L);
      p.mouth = 'open';
      p.eyes = 'happy';
      setArm(p, 'armNear', { sh: 30, el: 95 }, L);
    }
    return { x, gy: S1.blond.gy, s, p, board: top };
  }

  function drawShot1(ctx, t) {
    const z = kfE(t, [[0, 1.0], [1.4, 1.04, 'sine'], [1.9, 1.075, 'sine'], [3.6, 1.22, 'sine']]) + 0.012 * V.seg(t, HF, HF + 0.04) * (1 - V.ep(t, HF + 0.04, HF + 0.3));
    const cam = {
      x: kfE(t, [[0, 690], [1.0, 760, 'sine'], [1.9, 905, 'sine'], [3.6, 965, 'sine']]),
      y: kfE(t, [[0, 468], [1.5, 584, 'inOut'], [3.6, 604, 'sine']]),
      zoom: z,
    };
    const bz = buzz1(t), bl = blond1(t), cu = curly1(t), he = hero1(t);
    let jHero = null, jCurly = null;
    E.nightCorner(ctx, {
      cam,
      t,
      moon: [300, 176, 44],
      actors: (c) => {
        // back row: buzz (ball spinner) and blond (skateboard)
        const jb = E.nightPerson(c, bz.x, bz.gy, bz.s, bz.p);
        const spin = t * 14;
        const fh = jb.farHand;
        E.basketball(c, fh[0] + 2, fh[1] - 27 * bz.s - 4, 25 * bz.s, spin);
        V.line(c, fh[0], fh[1] - 6, fh[0] + 2, fh[1] - 14, bz.p.look ? F.buzz.look.skin : '#c98d62', 6);
        E.skateboard(c, bl.board[0], bl.gy - 100 * 0.86 - 4, 0.86, { rot: -Math.PI / 2 });
        V.groundShadow(c, bl.board[0], bl.gy, 24, 0.25);
        E.nightPerson(c, bl.x, bl.gy, bl.s, bl.p);
        // front row
        jCurly = E.nightPerson(c, cu.x, cu.gy, cu.s, cu.p, { headOver: headOver1(t) });
        jHero = E.nightPerson(c, he.x, he.gy, he.s, he.p, { headOver: headOver1(t) });
      },
      glow: (c) => {
        impactStar(c, HFX, 420, V.seg(t, HF - 0.01, HF + 0.22), 0.8);
        impactStar(c, HFX - 4, 590, V.seg(t, FB - 0.01, FB + 0.2), 0.6);
        if (jHero && jCurly) {
          const bk = V.seg(t, BOOM, BOOM + 0.32);
          boomRays(c, jHero.nearHand[0], jHero.nearHand[1], bk, -1);
          boomRays(c, jCurly.nearHand[0], jCurly.nearHand[1], bk, 1);
        }
      },
    });
  }

  // ================================================================= SHOT 2 — the promenade
  const S2 = PZ.heroScale; // 0.92
  const FEET = PZ.bench.feetY; // 895 — feet of the people sitting on the bench
  const SEAT_TOP = PZ.bench.seatY;
  const SEAT = { buzz: 340, hero: 470, curly: 780 };
  const BOX_X = 625;
  const BALL_R = 24 * S2;
  const BALL_REST = [PZ.bench.x0 - 2, SEAT_TOP - 4 - BALL_R];
  const SB = 0.86; // skateboard scale
  const LAND = 5.27, POP = 4.97, PHONE = 5.9;
  // the parting high five (bookends the greeting in shot 1)
  const HF2 = 8.42, H2 = [625, 498];
  const hf2W = (t) => V.ep(t, HF2 - 0.2, HF2 - 0.08) * (1 - V.ep(t, HF2 + 0.08, HF2 + 0.24));
  const hf2Target = (t, side) => {
    const dx = side * 1; // -1 = hero (left of the point), +1 = Dani
    const T = (d) => HF2 + d;
    return [
      // after the slap the hand drops down in front of the own chest (never into the own face)
      kfE(t, [[T(-0.2), H2[0] + dx * 70], [T(-0.06), H2[0] + dx * 52, 'out'], [HF2, H2[0] + dx * 2, 'in'], [T(0.05), H2[0] + dx * 4], [T(0.2), H2[0] + dx * 25, 'out']]),
      kfE(t, [[T(-0.2), H2[1] + 90], [T(-0.06), H2[1] - 46, 'out'], [HF2, H2[1], 'in'], [T(0.05), H2[1] - 2], [T(0.2), H2[1] + 200, 'out']]),
    ];
  };

  // bites at the given times -> {w: hand-to-mouth weight, n: bites so far, chew}
  function eating(t, bites) {
    let w = 0, n = 0, chew = false;
    for (const b of bites) {
      w = Math.max(w, env(t, b - 0.24, b - 0.03, b + 0.08, b + 0.34, 'out', 'inOut'));
      if (t >= b) n++;
      if (t > b + 0.04 && t < b + 0.7) chew = true;
    }
    return { w, n, chew };
  }
  const chewMouth = (t) => (Math.sin(t * 38) > 0 ? 'chew' : 'neutral');
  const talkMouth = (t, seed = 0) => (Math.sin(t * 31 + seed) + Math.sin(t * 17 + seed * 2) > 0.2 ? 'open' : 'smile');
  const biteTarget = (p, x, hip, s) => {
    const j0 = B.joints(x, hip, s, p);
    return [j0.mouth[0] + Math.sign(p.facing || 1) * 44 * s, j0.mouth[1] + 10 * s];
  };

  // sit -> stand blend with the feet kept planted
  function sitStand(sitP, standP, k, seatX) {
    const fk = B.fk(sitP);
    const feetX = seatX + (sitP.facing || 1) * S2 * (fk.legNear.a[0] + fk.legFar.a[0]) / 2;
    const p = mix(sitP, standP, k);
    p.facing = sitP.facing;
    return { p, x: E.nightHipForFeet(p, S2, feetX), hip: B.standY(FEET, S2, p) };
  }
  // a slice held in the near hand: tip up, aimed at the mouth while biting
  function sliceDraw(c, j, f, w, bite) {
    if (bite >= 0.98) return;
    const hand = j.nearHand, mouth = j.mouth;
    let dx = mouth[0] - hand[0], dy = mouth[1] - hand[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const ang = Math.atan2(V.lerp(-0.9, dy, w), V.lerp(Math.sign(f) * 0.42, dx, w));
    E.pizzaSlice(c, hand[0], hand[1], 0.5, ang, bite);
  }
  // goodbye wave: hand up in front of the face (never across it), forearm swinging
  const waveArm = (t, ph = 0) => ({ sh: 124 + 4 * Math.sin(t * 7 + ph), el: 46 + 18 * Math.sin(t * 15 + ph) });

  // ---------------------------------------------------------------- the hero
  function hero2(t) {
    const f = 1;
    const sitP = P.sit({ outfit: 'evening', facing: f, torso: -2, armNear: { sh: 40, el: 76 }, armFar: { sh: 28, el: 44 } });
    const up = V.ep(t, 7.98, 8.3);
    const st = up > 0 ? sitStand(sitP, P.stand({ outfit: 'evening', facing: f, armNear: { sh: 10, el: 20 }, armFar: { sh: -6, el: 16 } }), up, SEAT.hero) : { p: sitP, x: SEAT.hero, hip: B.standY(FEET, S2, sitP) };
    const p = st.p, x = st.x, hip = st.hip;
    p.eyes = B.blink(t, 'open', 1);
    p.mouth = 'smile';
    const ea = eating(t, [3.55, 4.5, 5.48]);
    const bite = ea.n / 3;
    if (ea.w > 0) {
      setArm(p, 'armNear', IK(p, x, hip, S2, 'near', biteTarget(p, x, hip, S2)), ea.w);
      p.head = -3 * ea.w;
    }
    if (ea.chew) p.mouth = chewMouth(t);
    // Dani's punchline -> laugh
    const L = env(t, 4.02, 4.14, 4.4, 4.6);
    if (L > 0) {
      p.torso = V.lerp(p.torso, 8 + shake(t, 2.2), L);
      p.head = V.lerp(p.head, -10, L);
      p.eyes = 'happy';
      p.mouth = 'open';
    }
    // the kickflip: wow -> cheer
    if (t > 4.88 && t < LAND) {
      p.brows = 0.9;
      p.mouth = 'o';
      p.eyes = 'wide';
    }
    const cheer = env(t, LAND - 0.02, LAND + 0.12, 5.5, 5.7, 'outBack');
    if (cheer > 0) {
      setArm(p, 'armFar', { sh: 160, el: 30 + 10 * Math.sin(t * 20) }, cheer);
      p.mouth = 'open';
      p.eyes = 'happy';
      p.brows = 0.8;
      p.torso -= 4 * cheer;
    }
    // phone: hand to the hoodie pocket, up in front of him, pops on
    const toPocket = env(t, 5.62, 5.74, 5.76, 5.86) + env(t, 7.86, 7.98, 8.02, 8.12);
    const holdK = env(t, 5.76, 5.92, 7.84, 7.98, 'out', 'inOut');
    if (toPocket > 0) setArm(p, 'armNear', IK(p, x, hip, S2, 'near', [x + 26, hip - 36]), toPocket);
    if (holdK > 0) {
      const tgt = [x + 100, hip - 116 + Math.sin(t * 2.2) * 2];
      setArm(p, 'armNear', IK(p, x, hip, S2, 'near', tgt), holdK);
      p.head = V.lerp(p.head, 10, holdK);
      p.torso = V.lerp(p.torso, 3, holdK);
      if (t > 7.45 && t < 8.0) {
        p.eyes = 'wide';
        p.brows = 1;
        p.mouth = 'o';
      }
    }
    const pop = V.ease.outBack(V.seg(t, 5.84, 6.02)) * (1 - V.ease.in(V.seg(t, 7.84, 7.98)));
    // goodbye: high five with Dani, then a wave
    const hw = hf2W(t);
    if (hw > 0) {
      setArm(p, 'armNear', IK(p, x, hip, S2, 'near', hf2Target(t, -1)), hw);
      p.mouth = t > HF2 - 0.04 && t < HF2 + 0.1 ? 'open' : 'grin';
      p.eyes = t > HF2 - 0.02 && t < HF2 + 0.08 ? 'happy' : B.blink(t, 'open', 1);
      p.brows = 0.6;
    }
    // ...then waves after Dani with the far hand held high above his own head (Dani is right
    // next to him, a forward wave would land in Dani's hair)
    const wave = V.ep(t, 8.5, 8.66, 'out');
    if (wave > 0) {
      // (sh -215 == 145: the blend swings the arm up from BEHIND him instead of forward into Dani,
      // and it ends above his brow so the waving hand reads, not as a knob on top of his head)
      setArm(p, 'armFar', { sh: -215 + 4 * Math.sin(t * 7), el: 22 + 16 * Math.sin(t * 15) }, wave);
      p.mouth = 'grin';
      p.brows = 0.4;
    }
    return { x, hip, p, bite, eatW: ea.w, pop };
  }

  // ---------------------------------------------------------------- Itay (buzz cut, basketball)
  function buzz2(t) {
    const f = 1, x = SEAT.buzz;
    const p = P.sit(wear('buzz', { facing: f, torso: -3, armNear: { sh: 38, el: 72 }, armFar: { sh: 24, el: 40 } }));
    const hip = B.standY(FEET, S2, p);
    p.eyes = B.blink(t, 'open', 2);
    p.mouth = 'smile';
    const ea = eating(t, [3.86, 4.74, 5.46]);
    const bite = 1 / 3 + (ea.n / 3) * (2 / 3);
    if (ea.w > 0) setArm(p, 'armNear', IK(p, x, hip, S2, 'near', biteTarget(p, x, hip, S2)), ea.w);
    if (ea.chew) p.mouth = chewMouth(t + 0.3);
    const L = env(t, 4.04, 4.16, 4.42, 4.62);
    if (L > 0) {
      p.torso = V.lerp(p.torso, -8 + shake(t + 0.4, 2.2), L);
      p.head = V.lerp(p.head, -14, L);
      p.eyes = 'happy';
      p.mouth = 'open';
      setArm(p, 'armFar', { sh: 40, el: 100 }, L);
    }
    if (t > 4.92 && t < LAND) {
      p.eyes = 'wide';
      p.mouth = 'o';
      p.brows = 1;
    }
    const cheer = env(t, LAND, LAND + 0.14, 5.46, 5.62, 'outBack');
    if (cheer > 0) {
      setArm(p, 'armFar', { sh: 172, el: 20 }, cheer);
      p.mouth = 'open';
      p.eyes = 'happy';
    }
    // basketball: the far hand fetches it from the bench, spins it on a finger above his head
    // through the time-lapse, then puts it back
    let ball = BALL_REST.slice();
    let spinning = false;
    const grab = env(t, 5.6, 5.72, 7.42, 7.56);
    const spinUp = env(t, 5.74, 5.92, 7.28, 7.42, 'outBack', 'inOut');
    if (grab > 0) {
      setArm(p, 'armFar', IK(p, x, hip, S2, 'far', [BALL_REST[0] + 6, BALL_REST[1] + BALL_R * 0.5]), grab * (1 - spinUp));
      setArm(p, 'armFar', { sh: 176, el: 12 }, spinUp);
      const j = B.joints(x, hip, S2, p);
      const held = V.clamp(spinUp * 2.5);
      const inHand = [j.farHand[0], j.farHand[1] - BALL_R * 0.55];
      const onTip = [j.farHand[0] + 2, j.farHand[1] - 14 - BALL_R];
      const at = V.ep(t, 5.68, 5.72) * (1 - V.ep(t, 7.5, 7.56));
      ball = [V.lerp(V.lerp(BALL_REST[0], inHand[0], at), onTip[0], held), V.lerp(V.lerp(BALL_REST[1], inHand[1], at), onTip[1], held)];
      spinning = spinUp > 0.6;
      p.head = -8 * spinUp;
      p.brows = 0.4 * spinUp;
      if (spinUp > 0.5) p.mouth = 'grin';
    }
    // big yawn + stretch, then a sleepy wave
    const yawn = env(t, 7.62, 7.92, 8.22, 8.46, 'out', 'inOut');
    if (yawn > 0) {
      setArm(p, 'armNear', { sh: 168, el: 14 }, yawn);
      setArm(p, 'armFar', { sh: 196, el: 10 }, yawn);
      p.torso = V.lerp(p.torso, -9, yawn);
      p.head = V.lerp(p.head, -16, yawn);
      if (yawn > 0.3) {
        p.mouth = 'yawn';
        p.eyes = 'closed';
      }
    }
    const wave = V.ep(t, 8.44, 8.62);
    if (wave > 0) {
      setArm(p, 'armNear', waveArm(t, 1.3), wave);
      p.eyes = 'half';
      p.mouth = 'smile';
    }
    if (t > 6.8 && yawn < 0.3 && wave < 0.5) p.eyes = B.blink(t, 'half', 2);
    return { x, hip, p, bite, eatW: ea.w, ball, spin: spinning ? t * 26 : 0.4, held: grab > 0 };
  }

  // ---------------------------------------------------------------- Dani (curly hair, red jacket)
  function curly2(t) {
    // swivels round on the bench to watch Noam's trick, then back
    const facing = t < 5.0 ? E.nightTurn(t, 4.84, 0.14, -1, 1) : E.nightTurn(t, 5.58, 0.14, 1, -1);
    const sitP = P.sit(wear('curly', { facing, torso: -2, armNear: { sh: 40, el: 76 }, armFar: { sh: 26, el: 44 } }));
    const up = V.ep(t, 7.94, 8.28);
    const standP = P.stand(wear('curly', { facing, armNear: { sh: 8, el: 18 }, armFar: { sh: -6, el: 16 } }));
    const st = up > 0 ? sitStand(sitP, standP, up, SEAT.curly) : { p: sitP, x: SEAT.curly, hip: B.standY(FEET, S2, sitP) };
    let { p, x, hip } = st;
    p.eyes = B.blink(t, 'open', 4);
    p.mouth = 'smile';
    // telling the story (gesturing with the slice), punchline at 4.0
    const talk = 1 - V.ep(t, 3.92, 4.04);
    if (talk > 0) {
      setArm(p, 'armNear', { sh: 62 + 22 * Math.sin(t * 8.5), el: 70 + 22 * Math.sin(t * 6.1 + 1) }, talk);
      p.mouth = talkMouth(t);
      p.brows = 0.4 + 0.4 * Math.sin(t * 5);
      p.head = 3 * Math.sin(t * 4);
    }
    const L = env(t, 4.0, 4.1, 4.44, 4.66);
    if (L > 0) {
      p.torso = V.lerp(p.torso, -10 + shake(t + 0.2, 2.4), L);
      p.head = V.lerp(p.head, -18, L);
      p.eyes = 'happy';
      p.mouth = 'open';
      setArm(p, 'armFar', { sh: 50, el: 10 }, L);
    }
    const ea = eating(t, [4.56, 5.86]);
    const bite = 1 / 3 + ea.n / 3;
    if (ea.w > 0 && Math.abs(facing) > 0.95) setArm(p, 'armNear', IK(p, x, hip, S2, 'near', biteTarget(p, x, hip, S2)), ea.w);
    if (ea.chew) p.mouth = chewMouth(t + 0.7);
    if (t > 4.9 && t < LAND) {
      p.eyes = 'wide';
      p.mouth = 'o';
      p.brows = 1;
    }
    const cheer = env(t, LAND + 0.03, LAND + 0.16, 5.44, 5.6, 'outBack');
    if (cheer > 0) {
      setArm(p, 'armFar', { sh: 165, el: 24 }, cheer);
      setArm(p, 'armNear', { sh: 150, el: 26 }, cheer);
      p.mouth = 'open';
      p.eyes = 'happy';
    }
    // chill: far hand behind the head, near hand on his knee, leaning back; getting sleepy
    const chill = env(t, 6.0, 6.24, 7.8, 8.0);
    if (chill > 0) {
      setArm(p, 'armFar', { sh: 162, el: 128 }, chill);
      setArm(p, 'armNear', { sh: 62, el: 8 }, chill);
      p.torso = V.lerp(p.torso, -9, chill);
      p.head = V.lerp(p.head, -5, chill);
      if (t > 6.9) p.eyes = B.blink(t, 'half', 4);
      // nods off... and jerks awake
      const nod = V.ep(t, 6.75, 7.2, 'in') * (1 - V.ep(t, 7.2, 7.3, 'out'));
      p.head += 20 * nod;
      if (nod > 0.5) p.eyes = 'closed';
      if (t > 7.24 && t < 7.5) {
        p.eyes = 'wide';
        p.brows = 1;
      }
    }
    // goodbye: high five with the hero, then turn and walk off to the right, waving back
    const hw = hf2W(t);
    if (hw > 0 && t < 8.58) {
      setArm(p, 'armNear', IK(p, x, hip, S2, 'near', hf2Target(t, 1)), hw);
      p.mouth = t > HF2 - 0.04 && t < HF2 + 0.1 ? 'open' : 'grin';
      p.eyes = t > HF2 - 0.02 && t < HF2 + 0.08 ? 'happy' : B.blink(t, 'open', 4);
      p.brows = 0.6;
    }
    if (t >= 8.54) {
      const turnF = E.nightTurn(t, 8.56, 0.14, -1, 1);
      // accelerates into a brisk walk home
      const W0 = 8.68, WR = 0.18, WV = 360;
      const u = Math.max(0, t - W0);
      const d = u < WR ? (0.5 * WV * u * u) / WR : 0.5 * WV * WR + WV * (u - WR);
      const w = P.walk(B.walkPhase(d, S2), wear('curly', { facing: turnF, eyes: B.blink(t, 'open', 4), mouth: 'grin' }));
      const amp = V.ep(t, 8.66, 8.8);
      const base = Object.assign({}, p, { facing: turnF });
      base.armNear = { sh: 8, el: 18 };
      p = mix(base, w, amp);
      p.facing = turnF;
      p.mouth = 'grin';
      // waves back over his head; the target angle is > 180 so the blend raises the arm up in
      // front instead of swinging it backwards through the hero standing behind him
      setArm(p, 'armFar', { sh: 190 + 8 * Math.sin(t * 12), el: 12 + 14 * Math.sin(t * 15) }, V.ep(t, 8.72, 8.9));
      x = st.x + d;
      hip = B.standY(FEET, S2, p);
    }
    return { x, hip, p, bite, eatW: ea.w };
  }

  // ---------------------------------------------------------------- Noam (blond skater)
  const SL = 0.98; // Noam is a bit closer to the camera than the bench
  const FR2 = 985; // his ground line, in front of the bench
  const NOAM_X = 905;
  const PIVOT_X = NOAM_X + 40; // the board stands on its tail in front of him
  const DECK_C = FR2 - 33 * SB; // deck centre height when the board rolls on the ground
  const FLAT_X = PIVOT_X + 100 * SB;
  const RV = 300, R0 = 4.62, R1 = 4.8, R2 = 5.36, R3 = 5.7;
  // board x while riding (to the RIGHT, into the open floor): accelerate, cruise, brake
  const rideX = (t) => {
    if (t <= R0) return FLAT_X;
    if (t <= R1) return FLAT_X + (0.5 * RV * (t - R0) * (t - R0)) / (R1 - R0);
    const xa = FLAT_X + 0.5 * RV * (R1 - R0);
    if (t <= R2) return xa + RV * (t - R1);
    const xb = xa + RV * (R2 - R1);
    const u = Math.min(t, R3) - R2;
    return xb + RV * u - (0.5 * RV * u * u) / (R3 - R2);
  };
  const STOP_X = rideX(R3);
  const REST_X = STOP_X - 50; // where he stands after hopping off
  const BACK_X = 1085; // where he rejoins the group
  // blend only the angle fields of src into p
  const blendAngles = (p, src, k) => {
    if (k <= 0) return p;
    ['torso', 'head'].forEach((f) => src[f] !== undefined && (p[f] = V.lerp(p[f] || 0, src[f], k)));
    ['armNear', 'armFar'].forEach((l) => src[l] && (p[l] = { sh: V.lerp(p[l].sh, src[l].sh, k), el: V.lerp(p[l].el, src[l].el, k) }));
    ['legNear', 'legFar'].forEach((l) => src[l] && (p[l] = { hip: V.lerp(p[l].hip, src[l].hip, k), knee: V.lerp(p[l].knee, src[l].knee, k), foot: 0 }));
    return p;
  };
  // hip y that puts the NEAR foot on yFoot (the far foot may push off the ground)
  const hipForNearFoot = (p, s, yFoot) => {
    const j = B.fk(Object.assign(P.stand(), p));
    return yFoot - (Math.max(j.legNear.a[1], j.legNear.toe[1]) + 11) * s;
  };
  const RIDE = { torso: 8, head: -2, legNear: { hip: 18, knee: -16 }, legFar: { hip: -20, knee: -12 }, armNear: { sh: 72, el: 26 }, armFar: { sh: -58, el: 22 } };
  const CROUCH = { torso: 22, head: 4, legNear: { hip: 52, knee: -92 }, legFar: { hip: 30, knee: -88 }, armNear: { sh: 52, el: 30 }, armFar: { sh: -70, el: 24 } };
  const TUCK = { torso: 14, head: 0, legNear: { hip: 64, knee: -108 }, legFar: { hip: 44, knee: -104 }, armNear: { sh: 116, el: 30 }, armFar: { sh: -112, el: 30 } };
  const IDLE = { torso: 0, head: 2, legNear: { hip: 4, knee: -3 }, legFar: { hip: -4, knee: -3 }, armNear: { sh: -14, el: 40 } };

  function blond2(t) {
    let facing = 1;
    let x = NOAM_X;
    const p = P.stand(wear('blond', { facing, armNear: { sh: 38, el: 76 }, eyes: B.blink(t, 'open', 6), mouth: 'smile' }));
    let feetY = FR2, lift = 0, riding = false;
    // eats, then stuffs the rest of the slice in before skating
    const ea = eating(t, [3.62, 4.1, 4.26]);
    const sliceBite = ea.n / 3;
    if (ea.w > 0 && t < 4.4) {
      const hip0 = B.standY(FR2, SL, p);
      setArm(p, 'armNear', IK(p, x, hip0, SL, 'near', biteTarget(p, x, hip0, SL)), ea.w);
    }
    if (ea.chew || (t > 4.26 && t < 4.95)) p.mouth = chewMouth(t + 1.1);
    if (t > 4.26 && t < 4.95) p.blush = 0.6;
    const L = env(t, 4.03, 4.15, 4.4, 4.58);
    if (L > 0 && t < 4.26) {
      p.torso = 5 + shake(t + 0.7, 2.2) * L;
      p.eyes = 'happy';
      p.mouth = 'open';
    }
    // ---- board: standing on its tail in front of him -> tips over flat to the right (4.3-4.47)
    let board = { rot: -Math.PI / 2, x: PIVOT_X, y: FR2 - 4 - 100 * SB, flip: 0 };
    if (t < 4.34) {
      const hip0 = B.standY(FR2, SL, p);
      setArm(p, 'armFar', IK(p, x, hip0, SL, 'far', [PIVOT_X + 2, FR2 - 200 * SB - 8]), 1 - V.ep(t, 4.26, 4.34));
    }
    if (t >= 4.3) {
      const fall = V.ease.in(V.seg(t, 4.3, 4.47));
      const rot = (-Math.PI / 2) * (1 - fall) + 0.07 * env(t, 4.47, 4.5, 4.5, 4.6);
      board = { rot, x: PIVOT_X + 100 * SB * Math.cos(rot), y: FR2 - 4 + 100 * SB * Math.sin(rot) - 25 * SB * fall, flip: 0 };
    }
    if (t >= 4.5 && t < 6.0) {
      riding = t < 5.84;
      const bx = rideX(t);
      const onK = V.ep(t, 4.5, 4.62);
      x = V.lerp(NOAM_X, bx - 8, onK);
      if (t >= R0) x = bx - 8;
      const deckTop = DECK_C - 6 * SB;
      feetY = V.lerp(FR2, deckTop, onK) - 20 * Math.sin(Math.PI * onK);
      const air = V.seg(t, POP, LAND);
      lift = air > 0 && air < 1 ? 110 * 4 * air * (1 - air) : 0;
      const rp = JSON.parse(JSON.stringify(RIDE));
      const push = env(t, 4.62, 4.7, 4.74, 4.84);
      rp.legFar = { hip: V.lerp(-20, -40, push), knee: V.lerp(-12, -4, push) };
      blendAngles(rp, CROUCH, env(t, 4.85, 4.96, 4.97, 5.02, 'out', 'out') + env(t, LAND - 0.02, LAND + 0.04, LAND + 0.1, LAND + 0.3, 'out', 'inOut'));
      blendAngles(rp, TUCK, env(t, 4.99, 5.08, 5.16, LAND, 'out', 'inOut'));
      const stopK = env(t, 5.34, 5.46, 5.66, 5.8);
      rp.torso -= 16 * stopK;
      rp.armNear.sh += 30 * stopK;
      blendAngles(p, rp, V.ep(t, 4.5, 4.6) * (1 - V.ep(t, 5.74, 5.86)));
      p.mouth = t < POP ? 'chew' : t < LAND + 0.25 ? 'open' : 'grin';
      p.blush = 0;
      if (t >= POP - 0.12 && t < LAND) p.brows = 1;
      p.eyes = t > LAND - 0.02 && t < 5.6 ? 'happy' : B.blink(t, 'open', 6);
      // board under the feet: pop (nose up), kickflip, level, tail-drag stop
      const flip = V.ep(t, 5.01, 5.21, 'inOut');
      const rot = -0.42 * env(t, 4.94, 4.98, 5.0, 5.12, 'out', 'inOut') + 0.08 * env(t, 5.12, 5.18, 5.2, 5.26) + 0.2 * stopK;
      if (t >= 4.47) board = { rot, x: bx, y: DECK_C - lift, flip };
      // hop off backwards (to the left), turn toward the friends
      const off = V.ep(t, 5.74, 5.86);
      if (off > 0) {
        x = V.lerp(bx - 8, REST_X, off);
        feetY = V.lerp(deckTop, FR2, off) - 16 * Math.sin(Math.PI * off);
      }
    }
    if (t >= 5.86) {
      // ...then strolls back toward the bench (board carried in the far hand) while the night flies by
      const wk = V.ep(t, 6.15, 7.15, 'inOut');
      const dist = (REST_X - BACK_X) * wk;
      x = REST_X - dist;
      feetY = FR2;
      facing = E.nightTurn(t, 5.9, 0.16, 1, -1);
      p.facing = facing;
      // kick the board up into his far hand (it stands on its tail in front of him)
      const kick = V.ease.outBack(V.seg(t, 5.86, 6.06));
      const carry = 12 * env(t, 6.1, 6.24, 7.06, 7.2);
      const vx = x - 42;
      board = { rot: (Math.PI / 2) * kick, x: V.lerp(STOP_X, vx, kick), y: V.lerp(DECK_C, FR2 - 4 - 100 * SB, kick) - carry, flip: 0 };
      blendAngles(p, IDLE, 1);
      const moving = env(t, 6.13, 6.27, 7.03, 7.17);
      if (moving > 0) {
        const w = P.walk(B.walkPhase(dist, SL), {});
        blendAngles(p, { legNear: w.legNear, legFar: w.legFar, armNear: w.armNear, torso: 3 }, moving);
      }
      const hip0 = B.standY(FR2, SL, p);
      if (Math.abs(facing) > 0.5) setArm(p, 'armFar', IK(p, x, hip0, SL, 'far', [vx - 2, FR2 - 200 * SB - 8 - carry]), V.ep(t, 6.02, 6.16));
      p.mouth = 'grin';
      p.eyes = B.blink(t, 'open', 6);
      if (t > 6.6) p.mouth = 'smile';
      if (t > 6.9) p.eyes = B.blink(t, 'half', 6);
      const wave = V.ep(t, 8.28, 8.46);
      if (wave > 0) {
        setArm(p, 'armNear', waveArm(t, 0.6), wave);
        p.mouth = 'grin';
        p.eyes = B.blink(t, 'open', 6);
      }
    }
    const hip = t >= 4.5 && t < 5.86 ? hipForNearFoot(p, SL, feetY) - lift : B.standY(feetY, SL, p);
    return { x, hip, p, feetY, lift, board, riding, sliceBite, eatW: ea.w };
  }

  function drawShot2(ctx, t) {
    const k = kNight(t);
    const cam = {
      // (close-up framed a little right of the hero so Noam, back from his trick, stays in shot)
      x: kfE(t, [[3.2, 900], [4.5, 860, 'sine'], [5.4, 900, 'sine'], [6.08, 622, 'inOut'], [7.1, 634, 'sine'], [8.1, 800, 'inOut'], [9.4, 800, 'sine']]),
      y: kfE(t, [[3.2, 560], [4.5, 590, 'sine'], [5.4, 600, 'sine'], [6.08, 636, 'inOut'], [7.1, 632, 'sine'], [8.1, 590, 'inOut'], [9.4, 586, 'sine']]),
      zoom: kfE(t, [[3.2, 1.0], [4.5, 1.07, 'sine'], [5.4, 1.1, 'sine'], [6.08, 1.48, 'inOut'], [7.1, 1.54, 'sine'], [8.1, 1.1, 'inOut'], [9.4, 1.08, 'sine']]),
    };
    // fast-forward clock for the crowd / sea
    const tau = t - CUT + 22 * k;
    const rate = 1 + 22 * ((kNight(t + 0.01) - kNight(t - 0.01)) / 0.02);
    const moonX = V.lerp(560, 1480, k), moonY = V.lerp(362, 320, k) - 190 * Math.sin(Math.PI * k);
    const hero = hero2(t), buzz = buzz2(t), curly = curly2(t), blond = blond2(t);
    const slices = 4 * (1 - V.seg(k, 0.12, 0.62));
    let jHero = null;
    const phonePos = () => [jHero.nearHand[0] + 4, jHero.nearHand[1] - 42];
    E.nightPlaza(ctx, {
      cam,
      t,
      k,
      tau,
      ff: V.clamp((rate - 1.5) / 5),
      // the neon is the last light: it stays on through the close-up and flickers out on camera
      // just as the pull-back reveals the empty, shuttered plaza
      neon: t < 7.86 ? 1 : t > 8.08 ? 0 : Math.sin(t * 47) + Math.sin(t * 31.7) > 0.4 ? 1 : 0.15,
      moon: [moonX, moonY, 42],
      starSpin: k * 0.32,
      lights: hero.pop > 0.01 ? [{ x: SEAT.hero + 80, y: 640, r: 260, a: 0.5 * hero.pop, tint: 0.3, color: '#8fa8ff' }] : [],
      actors: (c) => {
        E.nightBench(c, PZ.bench.x0, PZ.bench.x1, SEAT_TOP, FEET);
        // Itay + ball (the ball is behind him while it rests on the bench / is held up by the far hand)
        E.basketball(c, buzz.ball[0], buzz.ball[1], BALL_R, buzz.spin);
        const jb = E.nightPerson(c, buzz.x, FEET, S2, buzz.p, { hipY: buzz.hip });
        sliceDraw(c, jb, 1, buzz.eatW, buzz.bite);
        // hero
        const ho2 = t > 8.1 && t < 8.75; // parting: raised arms pass behind the heads
        jHero = E.nightPerson(c, hero.x, FEET, S2, hero.p, { hipY: hero.hip, headOver: ho2 });
        sliceDraw(c, jHero, 1, hero.eatW, hero.bite);
        // pizza box on the bench
        E.pizzaBox(c, BOX_X, SEAT_TOP + 4, 0.62, slices);
        // Dani
        const jc = E.nightPerson(c, curly.x, FEET, S2, curly.p, { hipY: curly.hip, headOver: ho2 });
        if (Math.abs(curly.p.facing) > 0.5) sliceDraw(c, jc, curly.p.facing, curly.eatW, curly.bite);
        // Noam + board
        const bd = blond.board;
        if (blond.riding) V.groundShadow(c, bd.x, FR2, 82 * SB * (1 - Math.min(0.5, blond.lift / 220)), 0.3);
        else V.groundShadow(c, bd.x, FR2, Math.abs(Math.sin(bd.rot)) > 0.5 ? 22 : 80 * SB, 0.25);
        const boardFirst = !blond.riding;
        if (boardFirst && t < 4.3) E.skateboard(c, bd.x, bd.y, SB, { rot: bd.rot, flip: bd.flip });
        if (blond.riding || t >= 4.3) E.skateboard(c, bd.x, bd.y, SB, { rot: bd.rot, flip: bd.flip });
        const jl = E.nightPerson(c, blond.x, FR2, SL, blond.p, { hipY: blond.hip, shadow: !blond.riding });
        if (t < 4.3) sliceDraw(c, jl, 1, blond.eatW, blond.sliceBite);
        // phone in the hero's hand
        if (hero.pop > 0.001) {
          const [px, py] = phonePos();
          E.nightPhone(c, px, py, 0.27, stamp(t), { pop: hero.pop });
          V.circle(c, jHero.nearHand[0], jHero.nearHand[1], 11 * S2, V.boy.HERO.skin, INK, 3.5 * S2);
        }
      },
      glow: (c) => {
        impactStar(c, H2[0], H2[1] - 26, V.seg(t, HF2 - 0.01, HF2 + 0.16), 0.55);
        if (hero.pop > 0.01 && jHero) {
          const [px, py] = phonePos();
          c.save();
          c.globalCompositeOperation = 'lighter';
          const g = c.createRadialGradient(px, py, 0, px, py, 150);
          g.addColorStop(0, `rgba(140,160,255,${0.3 * hero.pop})`);
          g.addColorStop(1, 'rgba(140,160,255,0)');
          c.fillStyle = g;
          c.fillRect(px - 150, py - 150, 300, 300);
          c.restore();
          // pop burst
          const bk = V.seg(t, PHONE - 0.04, PHONE + 0.26);
          if (bk > 0 && bk < 1) {
            c.save();
            c.globalAlpha = 1 - bk;
            // rays only above / right of the phone, so they never cross the hero's face
            for (let i = 0; i < 6; i++) {
              const a = V.deg(-125 + i * 34);
              const r0 = 50 + 26 * V.ease.out(bk), r1 = r0 + 16;
              V.line(c, px + Math.cos(a) * r0, py + Math.sin(a) * r0 * 1.35, px + Math.cos(a) * r1, py + Math.sin(a) * r1 * 1.35, '#ffffff', 4);
            }
            c.restore();
          }
        }
      },
    });
  }

  V.registerScene('16-friends', {
    sfx: [
      { t: 0, type: 'crickets', dur: 9.4, vol: 0.5 },
      { t: 0.1, type: 'footsteps', dur: 1.4, rate: 4.55 }, // hero strides in: plants 0.13 .. 1.47
      { t: 1.79, type: 'footsteps', dur: 0.1, rate: 5, vol: 0.6 }, // ...far foot closes as he stops
      { t: 1.76, type: 'footsteps', dur: 0.55, rate: 2.1, vol: 0.3 }, // Itay strolls over (plants 1.79, 2.25)
      { t: 0.62, type: 'clap', vol: 0.2 },
      { t: 1.12, type: 'clap', vol: 0.2 },
      { t: 1.9, type: 'clap' },
      { t: 2.25, type: 'clap', vol: 0.25 },
      { t: 3.4, type: 'timewarp', dur: 4.2 },
      { t: 3.2, type: 'crowd', dur: 2.2, vol: 0.25 },
      { t: 4.47, type: 'clap', vol: 0.35 },
      { t: 4.64, type: 'whoosh', vol: 0.3 },
      { t: 4.97, type: 'clap', vol: 0.3 },
      { t: 5.27, type: 'clap', vol: 0.45 },
      { t: 5.3, type: 'cheer', dur: 0.8, vol: 0.35 },
      { t: 5.69, type: 'creak', dur: 0.3, vol: 0.25 }, // shutter rolls down 5.70-5.92
      { t: 5.9, type: 'pop' },
      { t: 6.69, type: 'footsteps', dur: 0.5, rate: 2.35, vol: 0.25 }, // Noam walks back, board in hand (plants 6.71, 7.13)
      { t: 7.86, type: 'tick', dur: 0.2, vol: 0.6 }, // the neon flickers out
      { t: 7.965, type: 'tick', dur: 0.2, vol: 0.5 },
      { t: 8.42, type: 'clap', vol: 0.8 },
      { t: 8.9, type: 'footsteps', dur: 0.1, vol: 0.25 }, // Dani heads home (first plant, into the dip to black)
    ],
    stampTime: stamp,
    draw(ctx, t) {
      if (t < CUT) drawShot1(ctx, t);
      else drawShot2(ctx, t);
    },
  });
})();
