// Scene 07-timelapse (3 s, 08:00 -> 15:00) — the school day flies by.
//  Locked-off wide shot of the school facade (a very slow push), classic film time-lapse:
//  the facade clock spins from 8:00 to 3:00 (minute hand smeared), the sun arcs from the morning
//  side (left) over the clock tower to the afternoon side (right) leaving a faint trail, cast
//  shadows sweep across the yard and sidewalk, clouds streak past, the light warms up, the flag
//  flaps hard. Ghostly, motion-smeared students blip through the yard (late runner, recess,
//  a teacher crossing, lunch break) and the doors pop open/shut with them.
//  The clock uses EXACTLY the engine's stamp curve: k = ease.inOut(seg(t, 0.45, 2.55)).
(function () {
  const B = V.boy, P = B.pose, E = V.env;
  const K = E.SCHOOL_KIDS;
  const kOf = (t) => V.ease.inOut(V.seg(t, 0.45, 2.55));
  const minutesAt = (t) => 480 + 420 * kOf(t);
  const speedAt = (t) => (kOf(t + 1 / 60) - kOf(t - 1 / 60)) * 30 / 1.43; // 0..1 (1 = fastest)

  const TEACHER = {
    look: { skin: '#e3a77f', hair: '#8a5a33', hairStyle: 'long' },
    outfit: { shirt: '#c65b7c', sleeves: 'long', pants: '#3a3a46', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#2a2a33' },
    size: 1.1,
  };
  const who = (k, extra = {}) => Object.assign({ look: k.look, outfit: k.outfit, backpack: k.backpack, size: k.size || 1, prop: k.prop }, extra);

  // ghosts: [t0, t1, from, to, who, mode ('walk'|'run'|'sit'|'stand'), layer]
  const G = [
    [0.42, 0.74, [800, 822], [1062, 606], who(K.yoni), 'run', 'yard'],
    [0.62, 0.86, [-120, 884], [560, 882], who(K.noa, { backpack: false }), 'walk', 'street'],
    // recess
    [0.94, 1.36, [318, 718], [318, 718], who(K.maya, { backpack: false }), 'sit', 'yard'],
    [0.98, 1.38, [446, 722], [446, 722], who(K.shira, { backpack: false }), 'sit', 'yard'],
    [0.95, 1.22, [600, 770], [1330, 700], who(K.ori, { backpack: false }), 'run', 'yard'],
    [1.06, 1.34, [1420, 742], [760, 772], who(K.daniel, { backpack: false }), 'run', 'yard'],
    [1.0, 1.4, [1290, 744], [1290, 744], who(K.tamar, { backpack: false }), 'stand', 'yard'],
    [1.0, 1.4, [1196, 738], [1196, 738], who(K.friend, { backpack: false }), 'stand', 'yard'],
    // a teacher crosses
    [1.48, 1.84, [1062, 612], [860, 800], TEACHER, 'walk', 'yard'],
    [1.84, 2.02, [840, 880], [300, 884], TEACHER, 'walk', 'street'],
    // lunch break
    [1.9, 2.32, [330, 718], [330, 718], who(K.daniel, { backpack: false }), 'sit', 'yard'],
    [1.92, 2.3, [434, 722], [434, 722], who(K.ori, { backpack: false }), 'sit', 'yard'],
    [1.88, 2.24, [1150, 640], [1480, 760], who(K.noa, { backpack: false }), 'walk', 'yard'],
    [2.0, 2.3, [700, 772], [1250, 690], who(K.yoni, { backpack: false }), 'run', 'yard'],
    [2.36, 2.6, [1062, 612], [900, 760], who(K.maya, { backpack: false }), 'walk', 'yard'],
  ];

  function ghostPose(g, t, k) {
    const [t0, t1, a, b, w, mode] = g;
    const x = V.lerp(a[0], b[0], k), y = V.lerp(a[1], b[1], k);
    const facing = b[0] < a[0] - 2 ? -1 : 1;
    const s = E.schoolScale(y) * w.size;
    const base = { look: w.look, outfit: w.outfit, backpack: w.backpack, facing, headProp: w.prop ? w.prop() : null };
    let pose;
    const dist = Math.hypot(b[0] - a[0], (b[1] - a[1]) * 1.8) * k;
    if (mode === 'run') pose = P.run(B.runPhase(dist, s), base);
    else if (mode === 'walk') pose = P.walk(B.walkPhase(dist, s) * 0.6, base);
    else if (mode === 'sit') pose = P.sit(Object.assign(base, { mouth: 'chew', armNear: { sh: 50, el: 100 } }));
    else pose = P.stand(Object.assign(base, { mouth: V.osc(t, 5) > 0 ? 'open' : 'smile', facing: g[4] === K.tamar ? -1 : 1, armNear: { sh: 30 + 30 * Math.sin(t * 20), el: 60 } }));
    void t0;
    void t1;
    return { x, y, s, pose, sit: mode === 'sit' };
  }

  function drawGhosts(ctx, t, layer) {
    const vis = G.filter((g) => g[6] === layer && t > g[0] - 0.04 && t < g[1] + 0.04);
    if (!vis.length) return;
    const frame = Math.floor(t * 30);
    // one offscreen layer per depth layer: every ghost (with its smear trail) drawn opaque, then the
    // whole layer composited translucent -> no see-through limbs
    E.schoolLayer(
      ctx,
      (c) => {
        vis.forEach((g, gi) => {
          const life = V.seg(t, g[0], g[1]);
          const fade = Math.min(V.seg(t, g[0] - 0.04, g[0] + 0.03), 1 - V.seg(t, g[1] - 0.03, g[1] + 0.04));
          const steps = g[5] === 'sit' || g[5] === 'stand' ? [0] : [0.2, 0.1, 0];
          steps.forEach((back, si) => {
            const k = V.clamp(life - back * (0.5 / Math.max(0.2, g[1] - g[0])));
            const st = ghostPose(g, t, k);
            c.save();
            c.globalAlpha = fade * (steps.length > 1 ? [0.22, 0.45, 1][si] : 1);
            if (st.sit) {
              const hy = st.y - 46 * st.s; // bench seat
              B.draw(c, st.x, hy, st.s, st.pose);
            } else E.schoolPerson(c, st.x, st.y, st.s, st.pose, { contact: si === steps.length - 1 });
            c.restore();
          });
          void gi;
        });
      },
      {
        alpha: 0.5 * (0.75 + 0.25 * V.rand(frame * 1.7 + (layer === 'yard' ? 0 : 9))),
        shade: '#3a4a7a',
        shadeAlpha: 0.12,
      }
    );
  }

  V.registerScene('07-timelapse', {
    sfx: [
      { t: 0.0, type: 'timewarp', dur: 3 },
      { t: 0.45, type: 'clock_fast', dur: 2.1 }, // only while the hands move (kOf: 0.45 .. 2.55)
    ],
    draw(ctx, t, info) {
      const k = kOf(t);
      const M = minutesAt(t);
      const hour = M / 60;
      const sp = V.clamp(speedAt(t));
      const blur = ((M - minutesAt(t - 1 / 30)) / 60) * Math.PI * 2;
      const pk = V.ease.sine(V.seg(t, 0, info.dur + 0.4));
      const cam = { x: V.lerp(1045, 1056, pk), y: V.lerp(390, 372, pk), zoom: V.lerp(0.9, 1.02, pk) };
      const burst = (t > 0.92 && t < 1.38) || (t > 1.86 && t < 2.34) || (t > 1.46 && t < 1.6) || (t > 2.34 && t < 2.44);
      E.school(ctx, {
        hour,
        t,
        cam,
        clockH: Math.floor(M / 60),
        clockM: M % 60,
        clockBlur: blur,
        doorOpen: burst ? 1 : 0,
        flagPhase: t * 2.4 + 16 * k,
        wind: t + 9 * k,
        cloudShift: 30 * t + 2600 * k,
        cloudStreak: 320 * sp,
        sunTrail: [8, hour],
        flicker: sp,
        shadowBoost: 1.35,
        actors: {
          yard: (c) => drawGhosts(c, t, 'yard'),
          street: (c) => drawGhosts(c, t, 'street'),
        },
      });
    },
  });
})();
