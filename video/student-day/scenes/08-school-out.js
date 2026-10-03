// Scene 08-school-out (5 s, 15:00) — the last bell. Warm afternoon light, same school.
//  0.0  medium shot on the entrance: clock reads 3:00, doors shut, silhouettes gathering behind
//       the glass.  0.3 the bell rings.  0.5 the doors burst open and kids pour out.
//  0.85 the hero dashes out; the camera eases back/down to the gate as the crowd spills onto the
//       sidewalk (most turn RIGHT; the hero's side, LEFT, stays clear).
//  2.05 on the sidewalk the hero dips and throws both arms up in a joyful "freedom!" stretch.
//  2.8  high-five with his best friend (who waited by the fence), then they part ways:
//  3.15 the friend walks off right, the hero heads LEFT, toward home, bouncing along.
(function () {
  const B = V.boy, P = B.pose, E = V.env;
  const K = E.SCHOOL_KIDS;
  const BELL = 0.3, BURST = 0.5, FIVE = 2.8;
  const DOOR_Y = E.SCHOOL.facadeY;
  const T1 = 6;

  const OUT = [[1060, 552], [1060, 600], [1036, 642], [955, 716], [868, 796]];
  const LEFT = (y) => [...OUT, [815, 846], [762, 878], [700, y], [-500, y]];
  const RIGHT = (y) => [...OUT, [905, 842], [1000, y - 4], [2600, y]];

  // ---------------------------------------------------------------- movers
  const plan = (pts, t0, segs, l0 = 0) => E.schoolPlan(pts, 1.8, t0, l0, segs);
  const HERO_PTS = LEFT(884);
  // hero: second out of the doors, dashes down the path, brakes on the sidewalk left of the gate
  const hero = E.schoolMover({
    pts: HERO_PTS,
    at: plan(HERO_PTS, 0.64, [
      { to: [1060, 604], v: 780, ease: 'in' },
      { to: [800, 852], v: 780 },
      { to: [700, 882], v: 780, ease: 'out2' },
      { hold: 0.62 },
      { to: [670, 884], v: 200, ease: 'inOut', dur: 0.2 },
      { hold: 0.42 }, // walk-off starts ~3.18 (footsteps cue 3.2)
      { to: [600, 885], v: 340, ease: 'in2' },
      { to: [-400, 885], v: 340 },
    ], 10),
    run: [[0.6, 0.75], [1.6, 0.75], [1.95, 0]],
    t1: T1,
  });
  // best friend: first out, runs ahead to the left, turns and waits by the fence
  const FR_PTS = [...OUT, [815, 846], [740, 868], [535, 868]];
  const friendOut = E.schoolMover({
    pts: FR_PTS,
    at: plan(FR_PTS, 0.5, [
      { to: [1060, 604], v: 900, ease: 'in' },
      { to: [640, 868], v: 900 },
      { to: [535, 868], v: 900, ease: 'out2' },
    ], 24),
    run: [[0, 0.8], [1.45, 0.8], [1.7, 0]],
    size: K.friend.size,
    t1: T1,
  });
  const FA_PTS = [[535, 868], [1200, 866], [2400, 864]];
  const friendAway = E.schoolMover({
    pts: FA_PTS,
    at: plan(FA_PTS, 3.12, [{ to: 60, v: 270, ease: 'in2' }, { to: 1800, v: 270 }]),
    size: K.friend.size,
    t1: T1,
  });
  // everyone else spills out and turns RIGHT (keeps the hero's side clear)
  const rightKid = (k, t0, y, v, extra = {}) => {
    const pts = RIGHT(y);
    const m = E.schoolMover({ pts, at: plan(pts, t0, [{ to: [1060, 604], v, ease: 'in' }, { to: 3000, v }]), run: [[0, extra.g || 0]], size: k.size, t1: T1 });
    // the moment the kid rounds the gate (left-most point) -> quick squash-turn from facing left to right
    let tTurn = t0, xMin = Infinity;
    for (let tt = t0; tt < t0 + 4; tt += 1 / 60) {
      const x = m.at(tt).x;
      if (x < xMin) {
        xMin = x;
        tTurn = tt;
      }
    }
    return Object.assign({ k, m, tTurn }, extra);
  };
  // Yoni trails the hero by ~0.3 s so his cheering arms never sprout from the hero's head
  const kids = [
    rightKid(K.yoni, 0.97, 896, 840, { g: 1, cheer: true, seed: 1 }),
    rightKid(K.maya, 1.08, 874, 520, { g: 0.3, seed: 2 }),
    rightKid(K.daniel, 1.22, 890, 430, { seed: 3 }),
    rightKid(K.noa, 1.46, 880, 420, { strap: true, seed: 4 }),
    rightKid(K.shira, 1.72, 870, 400, { talk: true, seed: 5 }),
    rightKid(K.tamar, 1.88, 888, 410, { talk: true, seed: 6 }),
    rightKid(K.ori, 2.3, 878, 820, { g: 0.85, cheer: true, seed: 7 }),
  ];

  // ---------------------------------------------------------------- helpers
  const layerOf = (y) => (y >= 805 ? 'street' : y >= DOOR_Y ? 'yard' : 'door');
  const doorDark = (y) => V.clamp((DOOR_Y - y) / 40);

  // where the two palms meet
  const FIVE_PT = [603, 550];

  function heroPose(t, m) {
    let facing = -1;
    const p = E.schoolGait(m, { outfit: 'school', backpack: true, facing });
    p.eyes = B.blink(t, 'open', 3);
    p.mouth = m.g > 0.3 ? 'grin' : 'smile';
    if (t < 2.0 && m.g > 0.3) p.brows = 0.6;
    let lift = 0;
    // "freedom!" stretch: dip (anticipation) -> both arms shoot up -> hold & wiggle -> release
    if (t >= 1.98 && t < 2.78) {
      const dip = V.ep(t, 1.98, 2.12) * (1 - V.ep(t, 2.12, 2.24));
      const up = V.ep(t, 2.12, 2.3, 'outBack') * (1 - V.ep(t, 2.56, 2.74));
      const wig = Math.sin((t - 2.3) * 26) * 4 * V.seg(t, 2.3, 2.38) * (1 - V.seg(t, 2.5, 2.56));
      const st = P.stand({ outfit: 'school', backpack: true, facing });
      const crouch = {
        torso: 10,
        head: 6,
        legNear: { hip: 22, knee: -44, foot: 0 },
        legFar: { hip: 16, knee: -40, foot: 0 },
        armNear: { sh: -28, el: 30 },
        armFar: { sh: -34, el: 28 },
      };
      const reach = {
        torso: -8,
        head: -18,
        legNear: { hip: 2, knee: -2, foot: 0 },
        legFar: { hip: -4, knee: -2, foot: 0 },
        armNear: { sh: 140 + wig, el: 8 },
        armFar: { sh: 208 - wig, el: 6 },
      };
      let q = E.schoolPoseMix(E.schoolPoseMix(p, st, V.ep(t, 1.98, 2.06)), Object.assign({}, st, crouch), dip);
      q = E.schoolPoseMix(q, Object.assign({}, st, reach), up);
      Object.assign(p, q);
      p.eyes = up > 0.5 ? 'closed' : dip > 0.5 ? 'happy' : p.eyes;
      p.mouth = up > 0.3 ? 'open' : 'grin';
      p.brows = up > 0.3 ? 1 : 0.3;
      lift = 8 * up;
    }
    // high-five: near arm rises to the meeting point, slap at FIVE, bounce back, down
    const hf = V.ep(t, 2.58, 2.8, 'out') * (1 - V.ep(t, 2.95, 3.2));
    if (hf > 0) {
      const hip = B.standY(m.y, m.s, p);
      const bounce = V.seg(t, FIVE, FIVE + 0.08) * (1 - V.seg(t, FIVE + 0.08, FIVE + 0.2));
      const tgt = [FIVE_PT[0] + 10 * bounce, FIVE_PT[1] - 6 * bounce];
      const ik = E.schoolArmIK(Object.assign({}, p), m.x, hip, m.s, 'near', tgt);
      p.armNear = { sh: V.lerp(p.armNear.sh, ik.armNear.sh, hf), el: V.lerp(p.armNear.el, ik.armNear.el, hf) };
      p.mouth = t > 2.74 && t < 3.1 ? 'grin' : p.mouth;
      p.eyes = t > 2.8 && t < 3.05 ? 'happy' : 'open';
      p.brows = 0.6;
    }
    if (t >= 3.1) {
      p.mouth = 'smile';
      p.eyes = B.blink(t, 'open', 3);
      // happy bounce: swinging arms a bit wider
      p.armNear.sh *= 1.25;
      p.armFar.sh *= 1.25;
    }
    return { pose: p, lift };
  }

  function friendPose(t) {
    const k = K.friend;
    const look = { look: k.look, outfit: k.outfit, backpack: k.backpack };
    if (t < 3.12) {
      const m = friendOut.at(t);
      const facing = E.schoolTurn(t, 1.72, 0.14, -1, 1);
      const p = E.schoolGait(m, Object.assign({ facing }, look));
      p.eyes = B.blink(t, 'open', 7);
      p.mouth = m.g > 0.3 ? 'grin' : 'smile';
      if (t > 1.9 && t < 2.6) {
        // watching the hero's big stretch: laughs
        p.mouth = t > 2.2 ? 'grin' : 'smile';
        p.eyes = t > 2.3 ? 'happy' : p.eyes;
        p.armFar = { sh: -10, el: 112 };
      }
      const hf = V.ep(t, 2.56, 2.8, 'out') * (1 - V.ep(t, 2.95, 3.2));
      if (hf > 0) {
        const hip = B.standY(m.y, m.s, p);
        const bounce = V.seg(t, FIVE, FIVE + 0.08) * (1 - V.seg(t, FIVE + 0.08, FIVE + 0.2));
        const tgt = [FIVE_PT[0] - 10 * bounce, FIVE_PT[1] - 6 * bounce];
        const ik = E.schoolArmIK(Object.assign({}, p), m.x, hip, m.s, 'near', tgt);
        p.armNear = { sh: V.lerp(p.armNear.sh, ik.armNear.sh, hf), el: V.lerp(p.armNear.el, ik.armNear.el, hf) };
        p.mouth = 'grin';
        p.eyes = t > 2.8 && t < 3.05 ? 'happy' : 'open';
      }
      return { m, pose: p };
    }
    const m = friendAway.at(t);
    const p = E.schoolGait(m, Object.assign({ facing: 1 }, look));
    p.eyes = B.blink(t, 'open', 7);
    // waves goodbye over his shoulder with the far arm
    const wv = V.ep(t, 3.25, 3.45) * (1 - V.ep(t, 4.1, 4.35));
    if (wv > 0) {
      p.armFar = { sh: V.lerp(p.armFar.sh, -150 + 12 * V.osc(t, 3), wv), el: V.lerp(p.armFar.el, -20, wv) };
      p.head = -4 * wv;
      p.mouth = 'open';
    }
    return { m, pose: p };
  }

  function kidPose(kid, t, m) {
    const k = kid.k;
    const facing = E.schoolTurn(t, kid.tTurn - 0.07, 0.14, -1, 1);
    const p = E.schoolGait(m, { look: k.look, outfit: k.outfit, backpack: k.backpack, facing, headProp: k.prop ? k.prop() : null });
    p.eyes = B.blink(t, 'open', kid.seed);
    p.mouth = 'grin';
    if (kid.cheer && m.v > 200) {
      // V-shaped cheer: near arm forward-up (clear of the face), far arm up-back
      p.armNear = { sh: 132 + 8 * Math.sin(t * 13), el: 12 };
      p.armFar = { sh: 204 - 8 * Math.sin(t * 13), el: 8 };
      p.mouth = 'open';
      p.eyes = 'happy';
    }
    if (kid.strap) p.armFar = { sh: -10, el: 112 };
    if (kid.talk) {
      p.mouth = V.osc(t + kid.seed, 2.4) > 0.1 ? 'open' : 'smile';
      p.head = -3;
    }
    return p;
  }

  let heroJ = null;
  function cast(t) {
    const out = [];
    const add = (m, pose, lift = 0, hero = false) => {
      const dark = doorDark(m.y);
      if (dark >= 0.99) return;
      out.push({ x: m.x, y: m.y, s: m.s, pose, layer: layerOf(m.y), dark, lift, hero });
    };
    kids.forEach((kid) => {
      const m = kid.m.at(t);
      if (m.x > 2000 || m.x < -300) return;
      add(m, kidPose(kid, t, m));
    });
    const f = friendPose(t);
    add(f.m, f.pose);
    const hm = hero.at(t);
    const h = heroPose(t, hm);
    add(hm, h.pose, h.lift, true);
    heroJ = B.joints(hm.x, B.standY(hm.y, hm.s, h.pose) - h.lift, hm.s, h.pose);
    out.sort((a, b) => a.y - b.y);
    return out;
  }

  function drawPeople(ctx, list, layer, t) {
    list.forEach((c) => {
      if (c.layer !== layer) return;
      if (layer === 'door') {
        E.schoolLayer(ctx, (x) => E.schoolPerson(x, c.x, c.y, c.s, c.pose, { lift: c.lift, contact: c.dark < 0.3 }), { shade: '#191924', shadeAlpha: c.dark * 0.92 });
      } else {
        E.schoolPerson(ctx, c.x, c.y, c.s, c.pose, { lift: c.lift });
      }
    });
    if (layer === 'street') {
      // "freedom!" burst lines around the raised hands
      const fk = V.seg(t, 2.2, 2.62);
      if (fk > 0 && fk < 1) {
        const cx = heroJ.head[0], cy = heroJ.head[1] - 20;
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.42;
          const r0 = 92 + 46 * V.ease.out(fk), r1 = r0 + 30 * (1 - fk) + 14;
          const p0 = [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.85], p1 = [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.85];
          V.line(ctx, p0[0], p0[1], p1[0], p1[1], V.rgba(V.pal.ink, 0.9 * (1 - fk * fk)), 7);
          V.line(ctx, p0[0], p0[1], p1[0], p1[1], V.rgba('#ffd34d', 1 - fk * fk), 3.5);
        }
        ctx.restore();
      }
      // high-five impact star
      const ik = V.seg(t, FIVE - 0.01, FIVE + 0.22);
      if (ik > 0 && ik < 1) {
        const [x, y] = FIVE_PT;
        const r = 18 + 46 * V.ease.out(ik);
        ctx.save();
        ctx.globalAlpha = 1 - ik;
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const rr = i % 2 ? r * 0.45 : r;
          ctx.lineTo(x + Math.cos(a) * rr, y - 6 + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#fff3a8';
        ctx.fill();
        ctx.strokeStyle = V.pal.ink;
        ctx.lineWidth = 3;
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i - 2.5) * 0.5;
          V.line(ctx, x + Math.cos(a) * (r + 8), y - 6 + Math.sin(a) * (r + 8), x + Math.cos(a) * (r + 26), y - 6 + Math.sin(a) * (r + 26), V.pal.ink, 4);
        }
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------- scene
  V.registerScene('08-school-out', {
    sfx: [
      { t: 0.3, type: 'school_bell', dur: 1.4 },
      { t: 0.5, type: 'door_open', vol: 0.9 },
      { t: 0.6, type: 'crowd', dur: 4.2, vol: 0.6 },
      { t: 0.9, type: 'run_steps', dur: 1.1, vol: 0.6 },
      { t: 2.8, type: 'clap' },
      { t: 3.2, type: 'footsteps', dur: 1.8, rate: 3.2 },
    ],
    draw(ctx, t, info) {
      const pull = V.ep(t, 0.75, 2.25);
      const drift = V.ease.sine(V.seg(t, 2.25, info.dur + 0.4));
      const cam = {
        x: V.lerp(V.lerp(1040, 860, pull), 935, drift),
        y: V.lerp(V.lerp(410, 598, pull), 604, drift),
        zoom: V.lerp(V.lerp(1.5 + 0.03 * V.seg(t, 0, 0.75), 1.2, pull), 1.22, drift),
      };
      const list = cast(t);
      const bell = V.seg(t, BELL, BELL + 0.05) * (1 - V.seg(t, BELL + 1.25, BELL + 1.45));
      const door = V.ease.outBack(V.seg(t, BURST, BURST + 0.28));
      E.school(ctx, {
        hour: 15,
        t,
        cam,
        clockH: 15,
        clockM: 0,
        bellRing: bell,
        doorOpen: Math.max(0, door),
        actors: {
          door: (c) => drawPeople(c, list, 'door', t),
          yard: (c) => drawPeople(c, list, 'yard', t),
          street: (c) => drawPeople(c, list, 'street', t),
          shadows: (s, api) => list.forEach((p) => p.layer !== 'door' && api.person(p.x, p.y, p.s, p.pose)),
        },
      });
    },
  });
})();
