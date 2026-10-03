// Scene 10-lunch (7 s, 15:20, afternoon) — SCHNITZEL AND FRENCH FRIES.
//  0.00  appetising close-up of the plate: golden breaded schnitzel (crumb texture, lemon wedge),
//        a heap of golden fries, ketchup, steam rising; slow push-in, a glint on the schnitzel
//  1.20  CUT to the medium shot in the kitchen (wall clock 15:20): the hero (school tee) sits at the
//        table and rubs his hands in anticipation (1.2-1.46)
//  1.46  grabs the fork, 1.60 stabs the schnitzel (clink) -> 1.80 into the mouth, chewing (1.8-3.0)
//  2.28  spears a fry, dips it in the ketchup (2.38), eats it (2.62)
//  3.00  stabs the schnitzel again (clink) -> 3.20 mouth; 3.30-4.10 cartoon speed-eating: the fork
//        blurs plate<->mouth, the schnitzel vanishes bite by bite, fries pile empties, cheeks bulge
//  4.20  fork down on the empty plate, grabs the juice, 4.45-4.85 drinks (gulp 4.6), 5.20 sets the
//        glass down (clink), "ahh"
//  5.55  pushes the chair back, leans back, 6.05-7.0 pats his belly, satisfied
(function () {
  const B = V.boy, P = B.pose, E = V.env, K = E.KITCHEN;
  const INK = V.pal.ink;
  const SKIN = B.HERO.skin;
  const CUT = 1.2;
  const S = K.hero.s;
  const PL = K.plate;
  const FL = 50; // fork grip -> food (rig units)
  const dirA = (a) => [Math.cos(V.deg(a)), Math.sin(V.deg(a))];

  // ------------------------------------------------------------------ food state
  const step = (t, t0, a, b) => V.lerp(a, b, V.ep(t, t0, t0 + 0.07, 'out'));
  function biteAt(t) {
    let b = 0;
    b = step(t, 1.6, b, 1);
    b = step(t, 3.0, b, 2);
    b = step(t, 3.56, b, 4);
    b = step(t, 3.96, b, 6);
    return b;
  }
  function friesAt(t) {
    let f = 1;
    f = step(t, 2.28, f, 21 / 22);
    f = step(t, 3.36, f, 0.55);
    f = step(t, 3.76, f, 0);
    return f;
  }
  function ketchupAt(t) {
    let k = 1;
    k = step(t, 2.4, k, 0.72);
    k = step(t, 3.4, k, 0.5);
    k = step(t, 3.8, k, 0.3);
    return k;
  }
  const FORKFULS = [
    { ts: 1.6, tm: 1.8, food: 'schnitzel' },
    { ts: 2.28, tm: 2.62, food: 'fry', dip: true },
    { ts: 3.0, tm: 3.2, food: 'schnitzel' },
    { ts: 3.36, tm: 3.46, food: 'fries', fast: true },
    { ts: 3.56, tm: 3.66, food: 'schnitzel', fast: true },
    { ts: 3.76, tm: 3.86, food: 'fries', fast: true },
    { ts: 3.96, tm: 4.08, food: 'schnitzel', fast: true },
  ];

  // ------------------------------------------------------------------ hero body (no arms yet)
  function chairDX(t) {
    return 28 * V.ep(t, 5.55, 5.85, 'out');
  }
  function bodyAt(t) {
    // torso lean / head tilt keyframes
    const torso = V.kf(t, [[1.2, 6], [1.45, 7], [1.58, 15], [1.75, 8], [2.0, 6], [2.25, 15], [2.5, 9], [2.7, 6], [2.95, 15], [3.15, 9], [3.3, 13], [4.1, 13], [4.3, 8], [4.5, 0], [4.85, -2], [5.2, 4], [5.5, 0], [6.0, -13], [7.5, -13]]);
    const head = V.kf(t, [[1.2, 4], [1.5, 10], [1.62, 12], [1.78, 0], [2.0, -6], [2.3, 10], [2.55, 2], [2.75, -5], [3.0, 10], [3.2, 0], [3.3, 6], [4.15, 6], [4.4, 2], [4.55, -16], [4.85, -18], [5.15, -2], [5.3, -6], [5.6, -2], [6.0, -8], [7.5, -8]]);
    let tor = torso;
    // speed-eating jitter
    if (t > 3.28 && t < 4.12) tor += 2.5 * Math.sin(t * 60);
    // belly-pat breathing
    if (t > 6.0) tor += 1.2 * Math.sin((t - 6) * 6);
    const x = K.hero.x - chairDX(t);
    const y = K.hero.y;
    return { x, y, torso: tor, head };
  }
  function basePose(bd) {
    return P.sit({ outfit: 'school', torso: bd.torso, head: bd.head });
  }
  function mouthAt(bd) {
    return B.joints(bd.x, bd.y, S, basePose(bd)).mouth;
  }

  // ------------------------------------------------------------------ near hand choreography
  // returns {p: [x, y], a: fork/glass angle (deg), hold: 'fork'|'glass'|null}
  function handAt(t, bd) {
    const m = mouthAt(bd);
    const tilt = PL.tilt;
    const bite = biteAt(t), fries = friesAt(t);
    const stabPt = (food) => (food === 'schnitzel' ? E.lunchPlatePoint('schnitzel', PL.x, PL.y, PL.s, tilt, Math.floor(bite + 0.001)) : E.lunchPlatePoint('fries', PL.x, PL.y, PL.s, tilt, 0, Math.max(0.2, fries)));
    const atPlate = (pt, a) => ({ p: [pt[0] - FL * S * dirA(a)[0], pt[1] - FL * S * dirA(a)[1]], a });
    const atMouth = (a = 194) => ({ p: [m[0] + 4 - FL * S * dirA(a)[0], m[1] + 2 - FL * S * dirA(a)[1]], a });
    const mouthOut = () => {
      const q = atMouth(190);
      return { p: [q.p[0] + 34, q.p[1] + 10], a: 186 };
    };
    const hover = () => ({ p: [PL.x - 26, PL.y - 92], a: 96 });
    const forkTable = { p: [K.fork.x - 20, K.fork.y], a: -4 };
    const ketchup = E.lunchPlatePoint('ketchup', PL.x, PL.y, PL.s, tilt);
    const glassMid = [K.glass.x, K.glass.y - 34];
    const glassUp = (ang) => ({ p: [m[0] + 10 - 35 * S * dirA(ang)[0], m[1] + 6 - 35 * S * dirA(ang)[1]], a: ang });
    const forkPlate = { p: [PL.x + 64, PL.y + 6], a: 196 };
    const rest = { p: [806, 700], a: 0 };
    const bellyPt = () => {
      const a = V.deg(bd.torso);
      const bx = 38 + 12 * V.ep(t, 4.15, 4.9), by = -30;
      return [bd.x + (bx * Math.cos(a) - by * Math.sin(a)) * S, bd.y + (bx * Math.sin(a) + by * Math.cos(a)) * S];
    };
    const seg = (t0, t1, A, Bq, e = 'inOut', arc = 0) => {
      const k = V.ep(t, t0, t1, e);
      return {
        p: [V.lerp(A.p[0], Bq.p[0], k), V.lerp(A.p[1], Bq.p[1], k) - arc * Math.sin(Math.PI * k)],
        a: V.lerp(A.a, Bq.a, k),
      };
    };
    // rubbing hands (1.2 - 1.46): the hands slide against each other
    const rub = { p: [812 + 14 * Math.sin(t * 34), 632 + 5 * Math.cos(t * 34)], a: 0 };
    if (t < 1.46) return Object.assign(rub, { hold: null, rub: true });
    if (t < 1.53) return Object.assign(seg(1.46, 1.53, { p: [812 + 14 * Math.sin(1.46 * 34), 632 + 5 * Math.cos(1.46 * 34)], a: 0 }, forkTable), { hold: null });
    if (t < 1.6) return Object.assign(seg(1.53, 1.6, forkTable, atPlate(stabPt('schnitzel'), 70), 'in'), { hold: 'fork' });
    // regular forkfuls
    const lift = (f, a0) => seg(f.ts, f.tm, atPlate(stabPt(f.food), a0), atMouth(), 'inOut', f.fast ? 10 : 34);
    if (t < 1.8) return Object.assign(lift(FORKFULS[0], 70), { hold: 'fork', food: 'schnitzel' });
    if (t < 1.92) return Object.assign(seg(1.8, 1.92, atMouth(), mouthOut(), 'out'), { hold: 'fork' });
    if (t < 2.18) return Object.assign(seg(1.92, 2.18, mouthOut(), hover()), { hold: 'fork' });
    if (t < 2.28) return Object.assign(seg(2.18, 2.28, hover(), atPlate(stabPt('fry'), 74), 'in'), { hold: 'fork' });
    if (t < 2.46) {
      const kp = atPlate(ketchup, 78);
      const fp = atPlate(stabPt('fry'), 74);
      const r = t < 2.38 ? seg(2.28, 2.38, fp, kp, 'inOut', 14) : { p: [kp.p[0], kp.p[1] + 5 * Math.sin(Math.PI * V.seg(t, 2.38, 2.46))], a: 78 };
      return Object.assign(r, { hold: 'fork', food: 'fry', dip: t > 2.39 });
    }
    if (t < 2.62) return Object.assign(seg(2.46, 2.62, atPlate(ketchup, 78), atMouth(), 'inOut', 30), { hold: 'fork', food: 'fry', dip: true });
    if (t < 2.74) return Object.assign(seg(2.62, 2.74, atMouth(), mouthOut(), 'out'), { hold: 'fork' });
    if (t < 2.92) return Object.assign(seg(2.74, 2.92, mouthOut(), hover()), { hold: 'fork' });
    if (t < 3.0) return Object.assign(seg(2.92, 3.0, hover(), atPlate(stabPt('schnitzel'), 70), 'in'), { hold: 'fork' });
    if (t < 3.2) return Object.assign(lift(FORKFULS[2], 70), { hold: 'fork', food: 'schnitzel' });
    if (t < 4.08) {
      // speed eating: mouth -> stab -> mouth ...
      for (let i = 3; i < FORKFULS.length; i++) {
        const f = FORKFULS[i];
        const prevTm = FORKFULS[i - 1].tm;
        if (t < f.ts) return Object.assign(seg(prevTm, f.ts, atMouth(), atPlate(stabPt(f.food), 72), 'inOut', 8), { hold: 'fork', fast: true });
        if (t < f.tm) return Object.assign(lift(f, 72), { hold: 'fork', food: f.food, fast: true });
      }
    }
    if (t < 4.2) return Object.assign(seg(4.08, 4.2, atMouth(), forkPlate, 'inOut', 6), { hold: 'fork' });
    const gg = { p: glassMid, a: -90 };
    if (t < 4.38) return Object.assign(seg(4.2, 4.38, forkPlate, gg), { hold: null });
    if (t < 4.55) return Object.assign(seg(4.38, 4.55, gg, glassUp(-128)), { hold: 'glass' });
    if (t < 4.85) return Object.assign(seg(4.55, 4.85, glassUp(-128), glassUp(-158), 'sine'), { hold: 'glass' });
    if (t < 5.2) return Object.assign(seg(4.85, 5.2, glassUp(-158), gg, 'inOut', 20), { hold: 'glass' });
    if (t < 5.45) return Object.assign(seg(5.2, 5.45, gg, rest), { hold: null });
    if (t < 5.75) return Object.assign({ p: [rest.p[0] - chairDX(t), rest.p[1] - 10 * V.ep(t, 5.45, 5.75)], a: 0 }, { hold: null });
    const bp = bellyPt();
    if (t < 6.05) return Object.assign(seg(5.75, 6.05, { p: [rest.p[0] - chairDX(t), rest.p[1] - 10], a: 0 }, { p: bp, a: 0 }), { hold: null });
    // pats: quick lift and drop
    const ph = ((t - 6.05) / 0.3) % 1;
    const lifted = t < 6.95 ? Math.pow(Math.sin(Math.PI * ph), 2) * 22 : 0;
    const ta = V.deg(bd.torso - 35);
    return { p: [bp[0] + Math.cos(ta) * lifted, bp[1] + Math.sin(ta) * lifted], a: 0, hold: null, pat: true };
  }

  function farHandAt(t, bd) {
    // rubs against the near hand: slides the opposite way
    const rubAt = (tt) => [820 - 9 * Math.sin(tt * 34), 646 + 3 * Math.sin(tt * 34 + 1)];
    const rub = rubAt(Math.min(t, 1.46));
    const restF = [826, 694];
    if (t < 1.46) return rub;
    if (t < 1.64) {
      const k = V.ep(t, 1.46, 1.64);
      return [V.lerp(rub[0], restF[0], k), V.lerp(rub[1], restF[1], k)];
    }
    return restF;
  }

  // ------------------------------------------------------------------ face
  function faceAt(t, h) {
    let eyes = B.blink(t, 'open', 2), mouth = 'smile', brows = 0, blush = 0, cheek = 0;
    const chewing = (t > 1.8 && t < 3.0) || (t > 3.2 && t < 4.45);
    // jaw in step with the chew cues (1.7 crunches/s from 1.8 and from 3.2)
    const chewOn = Math.sin((t - (t < 3.2 ? 1.8 : 3.2)) * Math.PI * 2 * 1.7) > 0;
    if (t < 1.46) {
      eyes = 'happy';
      mouth = 'grin';
      brows = 0.6;
      blush = 0.3;
    } else if (t < 1.8) {
      eyes = B.blink(t, 'open', 3);
      mouth = t > 1.66 ? 'open' : 'grin';
      brows = 0.8;
    }
    if (chewing) {
      mouth = chewOn ? 'chew' : 'neutral';
      cheek = 6 + 2 * Math.sin(t * 28);
      eyes = t < 2.25 ? 'happy' : B.blink(t, 'open', 4);
      blush = t < 2.3 ? 0.4 : 0;
    }
    // mouth opens for each incoming forkful
    FORKFULS.forEach((f, i) => {
      if (i === 0) return;
      if (t > f.tm - (f.fast ? 0.06 : 0.11) && t < f.tm) mouth = f.fast ? 'o' : 'open';
    });
    if (t > 3.26 && t < 4.15) {
      eyes = 'wide';
      brows = -0.2;
      cheek = V.lerp(8, 16, V.seg(t, 3.3, 4.1)) + 1.5 * Math.sin(t * 40);
    }
    if (t >= 4.15 && t < 4.45) {
      eyes = 'wide';
      cheek = 16 + Math.sin(t * 30);
      mouth = 'neutral';
      brows = 0.3;
    }
    if (t >= 4.45 && t < 4.9) {
      eyes = 'closed';
      mouth = 'neutral';
      cheek = V.lerp(16, 0, V.ep(t, 4.5, 4.66));
    }
    if (t >= 4.9 && t < 5.6) {
      eyes = 'happy';
      mouth = t < 5.45 ? 'open' : 'grin';
      blush = 0.4;
    }
    if (t >= 5.6) {
      eyes = t > 6.0 ? 'happy' : B.blink(t, 'open', 1);
      mouth = 'grin';
      blush = 0.55;
      brows = 0.3;
    }
    return { eyes, mouth, brows, blush, cheek };
  }

  // ------------------------------------------------------------------ props in hand
  function forkProp(h) {
    return (c) => {
      E.kfAim(c, V.deg(h.a));
      E.fork(c, { food: h.food || null, dip: !!h.dip });
      E.kfAim(c, 0);
      E.kfHand(c);
    };
  }
  function glassLevel(t) {
    return V.lerp(0.82, 0.12, V.ep(t, 4.52, 4.86, 'inOut'));
  }
  function glassProp(h, t) {
    return (c) => {
      const up = h.a;
      E.kfAim(c, V.deg(up + 90));
      E.juiceGlass(c, 0, 35, 1, { level: glassLevel(t), liquidTilt: up + 90 });
      E.kfAim(c, 0);
      E.kfHand(c);
    };
  }
  function cheekProp(amount, prev) {
    return (c) => {
      if (prev) prev(c);
      if (amount <= 0.5) return;
      c.save();
      c.beginPath();
      c.arc(16, 14, amount, -0.4, Math.PI * 1.15);
      c.fillStyle = SKIN;
      c.fill();
      c.lineWidth = 3;
      c.strokeStyle = INK;
      c.stroke();
      V.ellipse(c, 18, 14, amount * 0.55, amount * 0.35, 'rgba(240,110,110,0.35)');
      c.restore();
    };
  }

  // "food baby": the tee bulges over a full belly
  function bellyBulge(c, k, t) {
    if (k <= 0.01) return;
    const pat = t > 6.05 && t < 6.95 ? Math.pow(Math.sin(Math.PI * (((t - 6.05) / 0.3) % 1)), 2) : 0;
    const out = 28 * k - 5 * pat;
    c.save();
    c.beginPath();
    c.moveTo(42, -96);
    c.bezierCurveTo(42 + out * 1.1, -80, 42 + out * 1.5, -30, 36, 4);
    c.lineTo(31, 4);
    c.lineTo(31, -96);
    c.closePath();
    c.fillStyle = '#fbfbf7';
    c.fill();
    c.beginPath();
    c.moveTo(42, -96);
    c.bezierCurveTo(42 + out * 1.1, -80, 42 + out * 1.5, -30, 36, 4);
    c.lineWidth = 3.5;
    c.strokeStyle = INK;
    c.stroke();
    c.beginPath();
    c.moveTo(36, -70);
    c.quadraticCurveTo(36 + out * 0.9, -45, 34, -20);
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(31,26,36,0.18)';
    c.stroke();
    c.restore();
  }

  function heroState(t) {
    const bd = bodyAt(t);
    const h = handAt(t, bd);
    const face = faceAt(t, h);
    let pose = basePose(bd);
    pose = Object.assign(pose, { eyes: face.eyes, mouth: face.mouth, brows: face.brows, blush: face.blush });
    pose = E.kfArmIK(pose, bd.x, bd.y, S, 'near', h.p);
    pose = E.kfArmIK(pose, bd.x, bd.y, S, 'far', farHandAt(t, bd));
    if (t > 5.5) {
      // relax: far arm drops to rest on the chair seat
      const k = V.ep(t, 5.5, 6.0);
      pose.armFar = { sh: V.lerp(pose.armFar.sh, 10, k), el: V.lerp(pose.armFar.el, 8, k) };
    }
    if (h.hold === 'fork') pose.propNear = forkProp(h);
    if (h.hold === 'glass') pose.propNear = glassProp(h, t);
    const fullK = V.ep(t, 4.15, 4.9, 'outBack') * (1 + 0.04 * Math.sin(t * 9) * V.seg(t, 6.0, 6.2));
    pose.headProp = E.kfTorsoProp(pose, (c) => bellyBulge(c, fullK, t), cheekProp(face.cheek));
    return { bd, h, pose, face };
  }

  // ------------------------------------------------------------------ table items + effects
  function drawTable(c, t, st) {
    const bite = biteAt(t);
    if (st.h.hold !== 'glass') E.juiceGlass(c, K.glass.x, K.glass.y, S * 0.95, { level: glassLevel(t) });
    E.lunchPlate(c, PL.x, PL.y, PL.s, {
      tilt: PL.tilt, t, bite, fries: friesAt(t), ketchup: ketchupAt(t),
      steam: V.lerp(1, 0, V.ep(t, 3.3, 4.2)) * 0.8,
    });
    // fork on the cloth (before pickup) / on the empty plate (after)
    if (t < 1.53) {
      c.save();
      c.translate(K.fork.x - 20, K.fork.y);
      c.rotate(V.deg(-4));
      c.scale(S, S);
      E.fork(c, {});
      c.restore();
    } else if (t >= 4.2) {
      c.save();
      c.translate(PL.x + 64, PL.y + 6);
      c.rotate(V.deg(196));
      c.scale(S, S);
      E.fork(c, {});
      c.restore();
    }
    E.ketchupBottle(c, K.ketchup.x, K.ketchup.y, 1.05);
  }

  function speedFx(c, t, st) {
    if (t < 3.24 || t > 4.16) return;
    const a = Math.sin(Math.PI * V.seg(t, 3.24, 4.16));
    const m = mouthAt(st.bd);
    const p0 = [PL.x - 20, PL.y - 30];
    c.save();
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const off = (i - 1) * 18;
      c.beginPath();
      c.moveTo(p0[0] + off, p0[1]);
      c.quadraticCurveTo((p0[0] + m[0]) / 2 + 60 + off, (p0[1] + m[1]) / 2 - 10, m[0] + 46, m[1] + 10 + off * 0.4);
      c.strokeStyle = `rgba(255,255,255,${0.75 * a})`;
      c.lineWidth = 6 - i;
      c.setLineDash([22, 16]);
      c.lineDashOffset = -t * 600;
      c.stroke();
    }
    c.setLineDash([]);
    // flying crumbs
    for (let i = 0; i < 14; i++) {
      const ph = (t * 3.2 + V.rand(i * 3.3)) % 1;
      c.globalAlpha = a;
      const ang = -Math.PI / 2 + (V.rand(i * 7.1) - 0.5) * 2.4;
      const sp = 70 + V.rand(i * 5.9) * 80;
      const x = PL.x - 10 + Math.cos(ang) * sp * ph;
      const y = PL.y - 14 + Math.sin(ang) * sp * ph + 150 * ph * ph;
      if (y > PL.y + 30) continue;
      V.circle(c, x, y, 2.5 + V.rand(i) * 2, i % 3 ? '#e3a23c' : '#f8cf55');
    }
    c.restore();
  }

  function yumFx(c, t, st) {
    const j = B.joints(st.bd.x, st.bd.y, S, st.pose);
    // rub-rub lines around the hands
    if (t < 1.48) {
      const hx = j.nearHand[0], hy = j.nearHand[1];
      const on = Math.floor(t * 12) % 2;
      c.save();
      c.lineCap = 'round';
      [[-1, on], [1, 1 - on]].forEach(([sd, vis]) => {
        if (!vis) return;
        c.beginPath();
        c.arc(hx + sd * 6, hy - 4, 34, sd < 0 ? Math.PI * 0.82 : -Math.PI * 0.18, sd < 0 ? Math.PI * 1.18 : Math.PI * 0.18);
        c.strokeStyle = 'rgba(31,26,36,0.75)';
        c.lineWidth = 3.5;
        c.stroke();
      });
      c.restore();
    }
    // little hearts after the first bite
    if (t > 1.85 && t < 2.7) V.floaters(c, j.head[0] + 40, j.head[1] - 60, t - 1.85, { char: '♥', n: 3, size: 30, color: '#e2463c', rise: 90, dx: 40, period: 0.85, alpha: Math.sin(Math.PI * V.seg(t, 1.85, 2.7)) });
    // "ahh" puff after the drink
    if (t > 5.2 && t < 5.9) {
      const k = V.seg(t, 5.2, 5.9);
      c.save();
      c.globalAlpha = Math.sin(Math.PI * k) * 0.8;
      for (let i = 0; i < 3; i++) V.circle(c, j.mouth[0] + 24 + k * 50 + i * 16, j.mouth[1] - 6 - k * 30 - i * 6, 8 + i * 3 + k * 6, '#ffffff');
      c.restore();
    }
    // contented sparkles while patting the belly
    if (t > 6.15) {
      const k = V.seg(t, 6.15, 7.0);
      [[-30, -120, 0], [70, -100, 0.33], [30, -150, 0.66]].forEach(([dx, dy, ph], i) => {
        const tw = Math.max(0, Math.sin((k * 2.2 + ph) * Math.PI * 2));
        if (tw <= 0) return;
        c.save();
        c.translate(j.head[0] + dx, j.head[1] + dy);
        c.scale(tw, tw);
        V.text(c, '✦', 0, 0, { size: 34, color: '#f6c945', rtl: false, stroke: 'rgba(31,26,36,0.6)', strokeWidth: 3 });
        c.restore();
      });
    }
  }

  function camAt(t) {
    const a = V.ep(t, CUT, 3.0, 'inOut');
    const b = V.ep(t, 4.2, 5.0, 'inOut');
    const c = V.ep(t, 5.4, 6.6, 'inOut');
    let x = V.lerp(980, 878, a), y = V.lerp(560, 598, a), zoom = V.lerp(1.32, 1.72, a);
    x = V.lerp(x, 860, b);
    y = V.lerp(y, 590, b);
    zoom = V.lerp(zoom, 1.66, b);
    x = V.lerp(x, 830, c);
    y = V.lerp(y, 596, c);
    zoom = V.lerp(zoom, 1.62, c);
    return { x, y, zoom };
  }

  // ------------------------------------------------------------------ the close-up (0 - 1.2 s)
  function closeUp(ctx, t) {
    const k = V.ep(t, 0, CUT, 'sine');
    // background: soft-focus kitchen
    const bg = ctx.createLinearGradient(0, 0, 0, 420);
    bg.addColorStop(0, '#f2d7ad');
    bg.addColorStop(1, '#e6c393');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, V.W, V.H);
    ctx.save();
    ctx.translate(960, 600);
    ctx.scale(1 + 0.1 * k, 1 + 0.1 * k);
    ctx.translate(-960, -600 + 14 * k);
    // blurred window glow + bokeh
    const wg = ctx.createRadialGradient(1380, 140, 20, 1380, 140, 520);
    wg.addColorStop(0, 'rgba(255,250,225,0.95)');
    wg.addColorStop(0.5, 'rgba(255,236,190,0.45)');
    wg.addColorStop(1, 'rgba(255,236,190,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(700, -400, 1400, 1000);
    [[300, 140, 70, '#fff1c8'], [520, 90, 44, '#ffe2a8'], [1640, 230, 60, '#fff6dc'], [1150, 70, 38, '#ffe9b8'], [820, 180, 30, '#fff1c8'], [120, 260, 50, '#9fd3c2']].forEach(([x, y, r, c], i) => {
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 2 + i);
      V.circle(ctx, x, y, r, c);
    });
    ctx.globalAlpha = 1;
    // a blurry red pendant shade + mint fridge edge
    const pg = ctx.createRadialGradient(1050, -10, 10, 1050, -10, 160);
    pg.addColorStop(0, 'rgba(226,70,60,0.55)');
    pg.addColorStop(1, 'rgba(226,70,60,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(850, -200, 400, 360);
    // table cloth in perspective (vanishing far above)
    const TY = 300;
    ctx.fillStyle = '#f6f8fc';
    ctx.fillRect(-200, TY, 2400, 1200);
    const VPy = -1400;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, TY, 2400, 1200);
    ctx.clip();
    ctx.fillStyle = 'rgba(96,146,214,0.3)';
    for (let i = -30; i < 30; i++) {
      const xa = 960 + i * 64, xb = xa + 32;
      const sc = (1300 - VPy) / (TY - VPy);
      ctx.beginPath();
      ctx.moveTo(xa, TY);
      ctx.lineTo(xb, TY);
      ctx.lineTo(960 + (xb - 960) * sc, 1300);
      ctx.lineTo(960 + (xa - 960) * sc, 1300);
      ctx.closePath();
      ctx.fill();
    }
    let yy = TY, hgt = 26;
    while (yy < 1300) {
      ctx.fillRect(-200, yy, 2400, hgt / 2);
      yy += hgt;
      hgt *= 1.12;
    }
    // depth haze toward the back edge
    const hz = ctx.createLinearGradient(0, TY, 0, TY + 260);
    hz.addColorStop(0, 'rgba(242,215,173,0.7)');
    hz.addColorStop(1, 'rgba(242,215,173,0)');
    ctx.fillStyle = hz;
    ctx.fillRect(-200, TY, 2400, 260);
    // warm window light pool on the cloth
    const lp = ctx.createRadialGradient(1100, 520, 40, 1100, 520, 900);
    lp.addColorStop(0, 'rgba(255,236,180,0.35)');
    lp.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = lp;
    ctx.fillRect(0, TY, 2400, 1200);
    ctx.restore();
    V.line(ctx, -200, TY, 2200, TY, 'rgba(31,26,36,0.25)', 3);
    // out-of-focus glass + ketchup at the back
    ctx.save();
    ctx.globalAlpha = 0.85;
    E.juiceGlass(ctx, 360, 470, 3.6, { level: 0.82 });
    E.ketchupBottle(ctx, 1580, 430, 3.0);
    ctx.restore();
    const fog = ctx.createLinearGradient(0, 120, 0, 520);
    fog.addColorStop(0, 'rgba(240,214,172,0.55)');
    fog.addColorStop(1, 'rgba(240,214,172,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 100, V.W, 420);
    // napkin + fork on the left
    ctx.save();
    ctx.translate(250, 800);
    ctx.rotate(-0.18);
    rrPoly(ctx);
    ctx.scale(3.4, 3.4);
    E.fork(ctx, {});
    ctx.restore();
    // the plate, big
    E.lunchPlate(ctx, 1000, 660, 5.3, { tilt: 0.5, t, steam: 1, lw: 0.55 });
    // glints
    const glint = (x, y, t0, t1, size) => {
      const g = Math.sin(Math.PI * V.seg(t, t0, t1));
      if (g <= 0) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 1.5);
      ctx.scale(g, g);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? size * 0.22 : size;
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    glint(820, 560, 0.35, 0.8, 50);
    glint(1250, 540, 0.7, 1.1, 38);
    ctx.restore();
    // warm grade
    V.tint(ctx, '#fff0d8', 0.2, 'multiply');
    V.lightPool(ctx, 1300, 200, 900, '#ffd890', 0.14);
  }
  function rrPoly(ctx) {
    // folded paper napkin (red) under the fork
    V.fillRound(ctx, -150, -70, 330, 150, 14, '#e2463c', INK, 4);
    V.fillRound(ctx, -150, -70, 330, 150, 14, null, 'rgba(255,255,255,0.4)', 2);
    V.line(ctx, -150, 5, 180, 5, 'rgba(120,20,20,0.35)', 4);
  }

  V.registerScene('10-lunch', {
    sfx: [
      { t: 1.6, type: 'clink' },
      { t: 1.8, type: 'chew', dur: 1.2 },
      { t: 2.28, type: 'clink', vol: 0.25 }, // spears a fry
      { t: 3.0, type: 'clink' },
      { t: 3.2, type: 'chew', dur: 1.0 },
      { t: 3.3, type: 'whoosh', vol: 0.3 },
      // speed-eating stabs (FORKFULS ts)
      { t: 3.36, type: 'clink', vol: 0.3 },
      { t: 3.56, type: 'clink', vol: 0.3 },
      { t: 3.76, type: 'clink', vol: 0.3 },
      { t: 3.96, type: 'clink', vol: 0.3 },
      { t: 4.2, type: 'clink', vol: 0.4 },
      { t: 4.6, type: 'gulp' },
      { t: 5.2, type: 'clink' },
      { t: 5.6, type: 'creak', vol: 0.3 },
      // belly pats (the hand drops back onto the belly every 0.3 s from 6.05)
      { t: 6.35, type: 'clap', vol: 0.15 },
      { t: 6.65, type: 'clap', vol: 0.15 },
      { t: 6.95, type: 'clap', vol: 0.15 },
    ],
    draw(ctx, t) {
      if (t < CUT) {
        closeUp(ctx, t);
        return;
      }
      const st = heroState(t);
      const cam = camAt(t);
      E.kitchen(ctx, {
        t, cam, hour: 15.33, clock: '15:20', chairDX: chairDX(t),
        table: (c) => drawTable(c, t, st),
        actors(c) {
          B.draw(c, st.bd.x, st.bd.y, S, st.pose);
          speedFx(c, t, st);
          yumFx(c, t, st);
        },
      });
    },
  });
})();
