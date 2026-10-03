// Scene 06-school-in (6 s, 08:00) — arriving at school.
//  One continuous establishing shot of the high school with a slow eased push-in toward the
//  entrance and the big facade clock (8:00).
//  0.0  the hero (school tee + blue backpack) walks in from frame-left along the sidewalk (moving
//       RIGHT); classmates stream through the gate and up the path into the building.
//  1.25 his best friend, waiting in the yard, spots him and waves; 1.55 the hero waves back.
//  3.8  the school bell rings (shakes, sound lines). Hero startles (hop, wide eyes), friend turns
//       and runs in; 4.05 the hero jogs through the gate and up the path, gone inside by ~5.2.
//  5.45 the glass doors swing shut (5.9 thud). Clock still reads 8:00.
(function () {
  const B = V.boy, P = B.pose, E = V.env;
  const K = E.SCHOOL_KIDS;
  const BELL = 3.8;
  const GATE_PATH = [[850, 806], [948, 736], [1034, 664], [1062, 628], [1060, 604], [1060, 552]];
  const DOOR_Y = E.SCHOOL.facadeY; // 600
  const T1 = 7;

  // ---------------------------------------------------------------- movers
  const hero = E.schoolMover({
    pts: [[-250, 882], [380, 881], [640, 877], [770, 850], ...GATE_PATH],
    v: [[0, 330], [3.74, 330], [3.88, 60], [4.02, 60], [4.26, 930]],
    run: [[3.96, 0], [4.18, 1]],
    t1: T1,
  });
  // the best friend waits left of the entrance landing (right under the bell), facing the street
  const friend = E.schoolMover({
    pts: [[916, 648], [985, 628], [1040, 610], [1060, 594], [1060, 552]],
    v: [[0, 0], [4.12, 0], [4.26, 800]],
    run: [[0, 0], [4.12, 0], [4.28, 0.85]],
    size: K.friend.size,
    t1: T1,
  });
  const kids = [
    // Maya: already on the path, first one in
    { k: K.maya, facing: 1, m: E.schoolMover({ pts: GATE_PATH, l0: 230, v: [[0, 300]], size: K.maya.size, t1: T1 }), seed: 1 },
    // Daniel: half-way up the path
    { k: K.daniel, facing: 1, m: E.schoolMover({ pts: GATE_PATH, l0: 90, v: [[0, 290]], size: K.daniel.size, t1: T1 }), seed: 2, swing: true },
    // Ori: turning in at the gate
    { k: K.ori, facing: 1, m: E.schoolMover({ pts: [[640, 878], [770, 850], ...GATE_PATH], l0: 0, v: [[0, 300], [3.9, 300], [4.1, 560]], size: K.ori.size, t1: T1 }), seed: 3, swing: true },
    // Shira + Tamar: chatting on the sidewalk ahead of the hero, hurry after the bell
    { k: K.shira, facing: 1, m: E.schoolMover({ pts: [[585, 883], [640, 878], [770, 850], ...GATE_PATH], v: [[0, 285], [3.85, 285], [4.05, 620]], run: [[3.9, 0], [4.15, 0.7]], size: K.shira.size, t1: T1 }), seed: 4, strap: true },
    { k: K.tamar, facing: 1, m: E.schoolMover({ pts: [[488, 886], [640, 879], [770, 851], ...GATE_PATH], v: [[0, 288], [3.85, 288], [4.05, 660]], run: [[3.9, 0], [4.15, 0.8]], size: K.tamar.size, t1: T1 }), seed: 5, talk: true },
  ];

  // ---------------------------------------------------------------- helpers
  const layerOf = (y) => (y >= 805 ? 'street' : y >= DOOR_Y ? 'yard' : 'door');
  const doorDark = (y) => V.clamp((DOOR_Y - y) / 40);

  function heroPose(t, m) {
    const p = E.schoolGait(m, { outfit: 'school', backpack: true, facing: 1 });
    // wave back to the friend
    // (upper arm forward-up, hand raised AHEAD of the face so the face stays readable)
    const wv = V.ep(t, 1.5, 1.78) * (1 - V.ep(t, 2.55, 2.85));
    if (wv > 0) {
      const w = { sh: 112 + 6 * V.osc(t, 3.3), el: 58 + 20 * V.osc(t, 3.3, 0.22) };
      p.armNear = { sh: V.lerp(p.armNear.sh, w.sh, wv), el: V.lerp(p.armNear.el, w.el, wv) };
      p.head = -6 * wv;
    }
    p.eyes = B.blink(t, 'open', 2);
    p.mouth = 'smile';
    if (t > 1.55 && t < 2.05) p.mouth = 'open';
    if (t >= 2.05 && t < 2.7) {
      p.mouth = 'grin';
      p.eyes = 'happy';
    }
    // bell: startle, look up at the bell, then hurry
    if (t >= BELL) {
      const look = V.ep(t, BELL, BELL + 0.1) * (1 - V.ep(t, 4.05, 4.25));
      p.head = -14 * look;
      p.eyes = t < 4.12 ? 'wide' : 'open';
      p.mouth = t < 4.1 ? 'o' : 'open';
      p.brows = t < 4.12 ? 1.3 : 0.5;
      // startle: arms flinch up a little
      const fl = V.ep(t, BELL, BELL + 0.08) * (1 - V.ep(t, 3.98, 4.12));
      p.armNear = { sh: V.lerp(p.armNear.sh, 30, fl), el: V.lerp(p.armNear.el, 70, fl) };
      p.armFar = { sh: V.lerp(p.armFar.sh, -20, fl), el: V.lerp(p.armFar.el, 60, fl) };
    }
    return p;
  }

  function friendPose(t, m) {
    const k = K.friend;
    const facing = E.schoolTurn(t, 4.06, 0.12, -1, 1);
    const p = E.schoolGait(m, { look: k.look, outfit: k.outfit, backpack: k.backpack, facing });
    p.eyes = B.blink(t, 'open', 5);
    const idle = { sh: -12, el: 115 }; // thumbs in the backpack straps
    const calm = 1 - V.ep(t, 4.1, 4.26);
    p.armNear = { sh: V.lerp(p.armNear.sh, idle.sh, calm), el: V.lerp(p.armNear.el, idle.el, calm) };
    p.armFar = { sh: V.lerp(p.armFar.sh, -8, calm), el: V.lerp(p.armFar.el, 110, calm) };
    p.head = 4 * Math.sin(t * 2.2) * (1 - V.ep(t, 1.0, 1.25));
    p.torso = 1.5 * Math.sin(t * 1.6) * (1 - V.ep(t, 1.0, 1.25));
    // spots the hero and waves (hand raised ahead of the face)
    const wv = V.ep(t, 1.2, 1.42) * (1 - V.ep(t, 2.55, 2.85));
    if (wv > 0) {
      const w = { sh: 112 + 6 * V.osc(t, 3.0), el: 58 + 20 * V.osc(t, 3.0, 0.25) };
      p.armNear = { sh: V.lerp(idle.sh, w.sh, wv), el: V.lerp(idle.el, w.el, wv) };
      p.mouth = t < 1.9 ? 'open' : 'grin';
      if (t > 1.9 && t < 2.45) p.eyes = 'happy';
      p.brows = 0.8 * wv;
      p.head = -5 * wv;
    }
    // the bell: jolt, a "come on!" beckon toward the hero, then a quick turn and dash inside
    if (t >= BELL) {
      const jolt = V.ep(t, BELL, BELL + 0.08);
      p.eyes = t < 4.0 ? 'wide' : 'open';
      p.mouth = t < 3.98 ? 'o' : 'open';
      p.brows = 1.1;
      p.head = -10 * jolt * (1 - V.ep(t, 3.95, 4.05));
      // the bell rings right above his head: he flinches, shoulders up
      const fl = jolt * (1 - V.ep(t, 3.86, 3.94));
      p.torso -= 6 * fl;
      p.armFar = { sh: V.lerp(p.armFar.sh, 40, fl), el: V.lerp(p.armFar.el, 120, fl) };
      const bk = V.ep(t, 3.86, 3.93) * (1 - V.ep(t, 4.04, 4.12));
      if (bk > 0) {
        const sw = 0.5 + 0.5 * Math.sin((t - 3.86) * Math.PI * 2 * 5 - Math.PI / 2);
        // high "come on!" wave: forearm flicks from forward-up to vertical, the hand stays above the
        // hero's head (a horizontal beckon landed right on his hair and read as a head pat)
        const b = { sh: V.lerp(110, 118, sw), el: V.lerp(18, 78, sw) };
        // on release the elbow folds in so the hand drops back to his chest, not forward over the hero
        if (t > 4.0) b.el = V.lerp(b.el, 150, 1 - bk);
        p.armNear = { sh: V.lerp(p.armNear.sh, b.sh, bk), el: V.lerp(p.armNear.el, b.el, bk) };
      }
    }
    return p;
  }

  function kidPose(kid, t, m) {
    const k = kid.k;
    const p = E.schoolGait(m, { look: k.look, outfit: k.outfit, backpack: k.backpack, facing: kid.facing, headProp: k.prop ? k.prop() : null });
    p.eyes = B.blink(t, 'open', kid.seed);
    if (kid.strap) p.armFar = { sh: -10, el: 112 };
    if (kid.talk && t < BELL) {
      p.mouth = V.osc(t, 2.6) > 0.1 ? 'open' : 'smile';
      p.head = -3;
    }
    if (t >= BELL && t < BELL + 0.5) p.eyes = 'wide';
    if (t >= BELL + 0.2 && m.v > 400) p.mouth = 'open';
    return p;
  }

  // everyone at time t -> [{x, y, s, pose, layer, dark}]
  function cast(t) {
    const out = [];
    const add = (m, pose, lift = 0) => {
      const st = m;
      const dark = doorDark(st.y);
      if (dark >= 0.99) return;
      out.push({ x: st.x, y: st.y, s: st.s, pose, layer: layerOf(st.y), dark, lift });
    };
    kids.forEach((kid) => {
      const m = kid.m.at(t);
      add(m, kidPose(kid, t, m));
    });
    const fm = friend.at(t);
    add(fm, friendPose(t, fm), 9 * Math.sin(Math.PI * V.seg(t, BELL + 0.01, BELL + 0.15)));
    const hm = hero.at(t);
    add(hm, heroPose(t, hm), 11 * Math.sin(Math.PI * V.seg(t, BELL + 0.02, BELL + 0.2)));
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
    // dust puffs when the hero launches into his jog
    if (layer === 'street' || layer === 'yard') {
      const k = V.seg(t, 4.02, 4.6);
      if (k > 0 && k < 1) {
        const hm = hero.at(4.05);
        if (layerOf(hm.y) === layer) {
          for (let i = 0; i < 3; i++) {
            const r = (10 + 22 * k) * (1 - i * 0.2);
            V.circle(ctx, hm.x - 28 - i * 22 - k * 30, hm.y - 6 - i * 4 - k * 10, r, `rgba(235,228,214,${0.75 * (1 - k)})`, `rgba(120,110,100,${0.5 * (1 - k)})`, 2);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------- scene
  V.registerScene('06-school-in', {
    sfx: [
      { t: 0.0, type: 'crowd', dur: 5.5, vol: 0.5 },
      { t: 0.0, type: 'birds', dur: 6, vol: 0.3 },
      { t: 0.4, type: 'footsteps', dur: 3.2, rate: 3.2 },
      { t: 3.8, type: 'school_bell', dur: 1.6 },
      { t: 4.0, type: 'run_steps', dur: 1.2 },
      { t: 5.9, type: 'door_close', vol: 0.8 },
    ],
    draw(ctx, t, info) {
      const k = V.ease.inOut(V.seg(t, 0, info.dur));
      const cam = { x: V.lerp(870, 1004, k), y: V.lerp(566, 452, k), zoom: V.lerp(1.0, 1.3, k) };
      const list = cast(t);
      const bell = V.seg(t, BELL, BELL + 0.06) * (1 - V.seg(t, BELL + 1.45, BELL + 1.65));
      // doors: held open, swing shut after the hero is in (slight bounce)
      const close = V.ep(t, 5.42, 5.88, 'in');
      const doorOpen = t < 5.88 ? 1 - close : 0.035 * Math.sin(V.seg(t, 5.88, 6.2) * Math.PI * 2) * (1 - V.seg(t, 5.88, 6.2));
      E.school(ctx, {
        hour: 8,
        t,
        cam,
        clockH: 8,
        clockM: 0,
        bellRing: bell,
        doorOpen: Math.max(0, doorOpen),
        birds: true,
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
