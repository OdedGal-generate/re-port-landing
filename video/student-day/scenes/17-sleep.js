// Scene 17-sleep (8 s, 01:30) — the film's last scene. Dark bedroom, moonlight + red LED glow.
//  Shot 1 (0–3.8): the door creaks open on a lit hallway, the hero (green hoodie) sneaks in on
//                  tiptoe, finger to lips, pulls the door shut behind him (click 2.6), winces,
//                  then scurries to the bed while the camera pans with him.
//  Shot 2 (3.8–6.0): he steps out of his sneakers, flops backwards onto the bed (plop 4.2),
//                  grabs the blanket, pulls it up to his chin and is instantly asleep (Zs, snore).
//  Shot 3 (6.0–8.0): slow push-in to the LED clock (01:30) glowing beside his sleeping face —
//                  the same movie-style clock shot that opened the film. "לילה טוב".
(function () {
  const B = V.boy, P = B.pose;
  const BR = V.env.BEDROOM, IK = V.env.bedroomIK;
  const S = BR.heroScale;
  const INK = V.pal.ink;
  const FLOOR = BR.floorY;
  const LIE = BR.bed.lie;
  const D = B.D;
  const PLOP = 4.2;
  const FRONT_UNTIL = 4.28; // hero is drawn in front of the blanket until he lands on the bed

  // ------------------------------------------------------------------ door
  const doorOpen = (t) => V.kf(t, [[0.3, 0], [0.42, 0.11], [0.54, 0.13], [0.8, 0.62], [1.52, 0.62], [2.6, 0]]);

  // ------------------------------------------------------------------ sneaking gait
  // [foot, liftTime, plantTime, fromX, toX, liftHeight]
  const STEPS = [
    ['near', 0.55, 0.9, 362, 410, 100],
    ['far', 1.0, 1.355, 335, 440, 118],
    ['near', 1.46, 1.81, 410, 480, 118],
    ['far', 1.92, 2.27, 440, 520, 108],
    ['near', 2.86, 3.05, 480, 640, 44],
    ['far', 3.02, 3.24, 520, 780, 46],
    ['near', 3.2, 3.44, 640, 920, 46],
    ['far', 3.4, 3.64, 780, 1028, 44],
    ['near', 3.6, 3.8, 920, 1050, 34],
  ];
  function feet(t) {
    const f = { near: { x: 362, lift: 0, k: 0, swing: false }, far: { x: 335, lift: 0, k: 0, swing: false } };
    for (const [ft, t0, t1, x0, x1, H] of STEPS) {
      if (t >= t1) f[ft] = { x: x1, lift: 0, k: 0, swing: false };
      else if (t > t0) {
        const k = V.seg(t, t0, t1);
        f[ft] = { x: V.lerp(x0, x1, V.ease.inOut(k)), lift: H * Math.sin(Math.PI * Math.pow(k, 0.8)), k, swing: true };
      }
    }
    return f;
  }
  // ankle target for a planted (tiptoe or flat) or swinging foot
  const ankleFor = (x, lift, fa) => [x, FLOOR - 11 * S - (D.FOOT - 6) * S * Math.cos(V.deg(fa)) - lift];

  const lerpArm = (a, b, k) => ({ sh: V.lerp(a.sh, b.sh, k), el: V.lerp(a.el, b.el, k) });
  const fingerProp = (c) => {
    // index finger raised to the lips
    V.line(c, 0, -3, 22, -4, INK, 8 + 7);
    V.line(c, 0, -3, 22, -4, '#e9b48f', 8);
  };

  // chest rise for the snore: up during the inhale (5.44-6.69), down on the whistled exhale
  const ASLEEP = 5.42; // back down under the blanket, out like a light
  const breath = (t) => V.kf(t, [[5.34, 0], [5.44, 0], [6.69, 1], [6.84, 1], [7.84, -0.3], [8.6, 0.4]], 'sine');

  // ------------------------------------------------------------------ the hero
  function hero(t) {
    const pose = P.stand({ outfit: 'evening', facing: 1 });
    let x, y;
    const f = feet(t);
    const stopK = V.ep(t, 3.78, 3.95);
    // ---- standing / sneaking phase
    const sneakBase = V.kf(t, [[0, 654], [2.75, 654], [2.95, 650], [3.7, 650], [3.95, 646]]);
    let bob = 0;
    ['near', 'far'].forEach((k) => {
      if (f[k].swing) bob += 9 * Math.sin(Math.PI * f[k].k);
    });
    x = (f.near.x + f.far.x) / 2 + 8;
    y = sneakBase - bob;
    pose.torso = V.kf(t, [[0, 10], [0.6, 15], [1.4, 14], [1.6, 4], [2.6, 4], [2.62, 20], [2.85, 16], [3.0, 19], [3.7, 18], [3.95, 2]]);
    pose.head = V.kf(t, [[0, 6], [0.7, 10], [2.6, 8], [2.65, -4], [2.85, 6], [3.7, 8], [3.95, 12]]);
    // feet: tiptoe while sneaking, flat once he stops at the bed
    const faPlant = V.lerp(60, 90, stopK), faSwing = 38;
    ['near', 'far'].forEach((k) => {
      const fa = f[k].swing ? V.lerp(faPlant, faSwing, Math.sin(Math.PI * f[k].k)) : faPlant;
      const a = ankleFor(f[k].x, f[k].lift, fa);
      IK.leg(pose, x, y, S, k, a, fa);
    });
    // face
    pose.eyes = B.blink(t + 0.6, 'wide', 3);
    pose.brows = 0.55;
    pose.mouth = 'neutral';
    if (t > 2.6 && t < 2.86) {
      pose.eyes = 'closed';
      pose.mouth = 'teeth';
      pose.brows = -0.8;
    } else if (t >= 2.86 && t < 3.0) {
      pose.mouth = 'o';
    }
    if (t >= 3.78) {
      pose.eyes = t < 3.88 ? 'half' : 'closed';
      pose.mouth = 'o';
      pose.brows = 0;
    }
    // arms: near hand finger-to-lips (IK onto the mouth), far hand a sneaky "paw"
    const j0 = B.joints(x, y, S, pose);
    const lips = [j0.mouth[0] + 10 * S, j0.mouth[1] + 16 * S];
    const nearLips = IK.arm(Object.assign({}, pose), x, y, S, 'near', lips).armNear;
    const paw = { sh: 62, el: 92 };
    const drop = { sh: 6, el: 14 }, dropF = { sh: -4, el: 16 };
    pose.armNear = lerpArm(nearLips, drop, stopK);
    pose.propNear = stopK < 0.5 ? fingerProp : null;
    // reach back for the handle and pull the door shut behind him
    const reach = V.ep(t, 1.28, 1.52) * (1 - V.ep(t, 2.64, 2.86));
    let farA = lerpArm(paw, dropF, stopK);
    if (reach > 0) {
      const hd = V.env.bedroomDoorHandle(doorOpen(t));
      const ikF = IK.arm(Object.assign({}, pose), x, y, S, 'far', [hd[0] + 4, hd[1]]).armFar;
      farA = lerpArm(farA, ikF, reach);
    }
    pose.armFar = farA;

    // ---- the flop (3.95 -> 4.2), bounce, blanket grab, sleep
    let fallK = 0, bedSquash = 0, blanketEdge = 1104, heap = 0.85, pillowDent = 10;
    if (t >= 3.95) {
      fallK = V.ep(t, 3.95, PLOP, 'in');
      const legsStand = { n: pose.legNear, f: pose.legFar };
      const sx = x, sy = y;
      const p2 = P.lie({ outfit: { ...B.OUTFITS.evening, shoes: 'socks', shoeColor: '#e9e9ef' }, facing: 1, head: 24, torso: 6 });
      p2.rot = -90 * fallK;
      // landing bounce
      const bounce = V.kf(t, [[PLOP, 0], [4.32, -26], [4.45, 0], [4.53, -8], [4.62, 0]], 'sine');
      bedSquash = V.kf(t, [[PLOP - 0.02, 0], [PLOP + 0.03, 14], [4.32, -3], [4.45, 7], [4.53, -1], [4.62, 0]], 'sine');
      x = V.lerp(sx, LIE.x, fallK);
      y = V.lerp(sy, LIE.y, fallK) - 40 * Math.sin(Math.PI * fallK) + (t > PLOP ? bounce + bedSquash : 0);
      // legs kick up during the fall, then settle flat on the mattress
      const lk = (key, a, mid, land, flat) => V.kf(t, [[3.95, a], [4.1, mid], [PLOP, land], [4.34, land * 0.8], [4.52, flat]]);
      p2.legNear = { hip: lk('h', legsStand.n.hip, 52, 44, 2), knee: lk('k', legsStand.n.knee, -78, -36, -4), foot: lk('f', legsStand.n.foot, -10, -40, -62) };
      p2.legFar = { hip: lk('h', legsStand.f.hip, 46, 38, -2), knee: lk('k', legsStand.f.knee, -70, -30, -4), foot: lk('f', legsStand.f.foot, -10, -40, -58) };
      // arms fly up, flop down
      // near arm flails up at the ceiling, then flops down onto his belly (never across his
      // face); the far arm is flung back over his head onto the pillow (drawn behind the head)
      p2.armNear = { sh: V.kf(t, [[3.95, 6], [4.1, 96], [4.24, 104], [4.42, 30], [4.6, 34]]), el: V.kf(t, [[3.95, 14], [4.1, 30], [4.24, 20], [4.42, 40], [4.6, 36]]) };
      p2.armFar = { sh: V.kf(t, [[3.95, -4], [4.1, 100], [4.24, 140], [4.42, 158], [4.6, 150]]), el: V.kf(t, [[3.95, 16], [4.1, 40], [4.24, 30], [4.42, 24], [4.6, 30]]) };
      p2.head = V.kf(t, [[3.95, 12], [4.12, -16], [PLOP, 34], [4.34, 20], [4.5, 24]]);
      p2.torso = 6;
      p2.eyes = 'closed';
      p2.mouth = t < 4.3 ? 'o' : 'neutral';
      p2.brows = 0.4;
      pillowDent = 10 + 14 * V.seg(t, PLOP, PLOP + 0.05);

      // crunch up (4.6-4.9), grab the blanket (hold 4.9-5.06), lie back pulling it to the chin
      if (t >= 4.6) {
        const up = V.kf(t, [[4.6, 0], [4.9, 0.66], [5.06, 0.66], [ASLEEP, 0]], 'inOut');
        p2.rot = -90 + 90 * up;
        p2.torso = 6 + 14 * up;
        p2.head = V.lerp(24, 18, up);
        x = LIE.x;
        y = V.lerp(LIE.y, BR.bed.sit.y, up);
        p2.legNear = { hip: 92 + p2.rot, knee: -4, foot: -62 };
        p2.legFar = { hip: 88 + p2.rot, knee: -4, foot: -58 };
        // reach for the blanket edge, grab it, then drag it up under the chin (elbow tucked)
        const hx = V.kf(t, [[4.6, 1040], [4.88, 1094]]);
        const hy = V.kf(t, [[4.6, 640], [4.88, 720]]);
        const reachIK = IK.arm(Object.assign({}, p2), x, y, S, 'near', [hx, hy]).armNear;
        const FOLD = { sh: -25, el: 158 };
        p2.armNear = lerpArm(lerpArm({ sh: 34, el: 36 }, reachIK, V.ep(t, 4.6, 4.8)), FOLD, V.ep(t, 5.06, ASLEEP + 0.02));
        p2.armFar = lerpArm({ sh: 150, el: 30 }, { sh: -12, el: 16 }, V.ep(t, 4.6, 4.95));
        p2.eyes = 'closed';
        p2.mouth = t < ASLEEP ? 'neutral' : 'smile';
        p2.brows = 0;
        // edge in his fist from 4.92; the heap pulls taut as he lies back with it (5.0 ->)
        const grab = V.seg(t, 5.0, ASLEEP + 0.02);
        if (t >= 4.92) blanketEdge = B.joints(x, y, S, p2).nearHand[0] + 8;
        heap = 0.85 * (1 - V.ease.out(grab));
        if (t >= ASLEEP) {
          // asleep: the mouth follows the snore sound (snore cue at 5.34 -> rattling inhale
          // 5.44-6.69, whistling exhale 6.84-7.84), then a contented sleepy smile
          p2.eyes = 'sleep';
          p2.mouth = t < 5.64 ? 'smile' : t < 6.74 ? 'open' : t < 7.84 ? 'o' : 'smile';
          p2.head = 24 + 1.5 * breath(t);
        }
      }
      return { x, y, pose: p2, bedSquash, blanketEdge, heap, pillowDent, fallK };
    }
    return { x, y, pose, bedSquash, blanketEdge, heap, pillowDent, fallK };
  }

  // a kicked-off sneaker lying on the floor
  function sneaker(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(S, S);
    V.fillRound(ctx, -22, -24, D.FOOT + 14, 26, 11, '#1f1f27', INK, 3.5);
    V.fillRound(ctx, -22, -5, D.FOOT + 14, 7, 3, '#3a3a44');
    V.line(ctx, -6, -14, 14, -16, '#ffffff', 5);
    V.ellipse(ctx, -8, -22, 10, 4, '#3a3a44');
    ctx.restore();
  }

  V.registerScene('17-sleep', {
    sfx: [
      { t: 0.3, type: 'creak' },
      { t: 0.9, type: 'footsteps', dur: 1.6, rate: 2.2, vol: 0.35 },
      { t: 2.6, type: 'door_close', vol: 0.5 },
      { t: 3.05, type: 'footsteps', dur: 0.8, rate: 5, vol: 0.18 },
      { t: 4.04, type: 'footsteps', dur: 0.1, vol: 0.2 }, // kicked-off sneakers land (~4.06)
      { t: PLOP, type: 'plop' },
      { t: 5.34, type: 'snore', dur: 3.4 },
    ],
    draw(ctx, tIn) {
      const t = Math.min(tIn, 8.6);
      const h = hero(t);
      const open = doorOpen(t);
      // camera: door -> pan with him to the bed -> slow push-in on the clock + sleeping face
      const cam = {
        x: V.kf(t, [[0, 466], [2.65, 498], [3.9, 902], [6.0, 888], [7.75, 652]]),
        y: V.kf(t, [[0, 600], [2.65, 604], [3.9, 614], [6.0, 638], [7.75, 702]]),
        zoom: V.kf(t, [[0, 1.3], [2.65, 1.32], [3.9, 1.33], [6.0, 1.42], [7.75, 3.25]]),
      };
      const j = B.joints(h.x, h.y, S, h.pose);
      const inBed = t >= FRONT_UNTIL;
      const breathe = t > ASLEEP ? 6 * breath(t) : 0;
      // the blanket only shapes itself over his legs once they have dropped onto the mattress
      const settle = V.ep(t, 4.4, 4.56);
      const lumps = inBed ? V.env.bedroomLumps(j, breathe).map(([lx, lh]) => [lx, 12 + (lh - 12) * settle]) : null;
      const drawHero = (c) => {
        // revealed by the opening door: clip away anything still behind the door panel
        if (t < 1.3) {
          // visible only through the door gap; the right jamb reveals him as he steps forward
          const g = V.env.bedroomParts.doorGeom(open);
          const x0 = g.xf + 10 * g.sn;
          // right edge = the door jamb while he is still in the hallway. It goes away in one frame
          // (0.867, mid-step) only once the door is wide open (0.62 at 0.8) and most of him already
          // shows in the gap, so just his face/hands step out from behind the jamb (no sliced frames)
          const x1 = BR.door.x1 + 4 + 900 * V.ep(t, 0.84, 0.88, 'inOut');
          c.save();
          c.beginPath();
          c.rect(x0, -2000, Math.max(0, x1 - x0), 6000);
          c.clip();
          B.draw(c, h.x, h.y, S, h.pose);
          c.restore();
        } else B.draw(c, h.x, h.y, S, h.pose);
      };
      const shoes = (c) => {
        if (t < 3.95) return;
        const k = V.ep(t, 3.95, 4.12, 'out');
        sneaker(c, 1052 + 10 * k, FLOOR - 2 - 14 * Math.sin(Math.PI * k), V.lerp(0, 0.18, k));
        sneaker(c, 1018 - 8 * k, FLOOR - 4 - 10 * Math.sin(Math.PI * k), V.lerp(0, -0.12, k));
      };
      V.env.bedroomScene(
        ctx,
        {
          cam, hour: 1.5, light: 0, actorLight: 0.2, t, clockTime: '01:30',
          doorOpen: open, hallLight: 1,
          bedSquash: h.bedSquash, pillowDent: h.pillowDent,
          blanket: { edge: h.blanketEdge, lumps: lumps, heap: h.heap },
        },
        inBed ? (c) => B.draw(c, h.x, h.y, S, h.pose) : null,
        (c) => {
          shoes(c);
          if (!inBed) drawHero(c);
        },
      );

      // overlays in screen space
      const toS = (wx, wy) => V.env.bedroomToScreen(cam, wx, wy);
      // door click marks
      const ck = V.seg(t, 2.6, 2.8);
      if (ck > 0 && ck < 1) {
        const [sx, sy] = toS(BR.door.x1 - 30, 560);
        ctx.save();
        ctx.globalAlpha = 1 - ck;
        for (let i = -1; i <= 1; i++) {
          const a = V.deg(i * 32);
          V.line(ctx, sx + Math.cos(a) * (20 + ck * 12), sy + Math.sin(a) * (20 + ck * 12), sx + Math.cos(a) * (40 + ck * 12), sy + Math.sin(a) * (40 + ck * 12), '#ffe7b0', 4);
        }
        ctx.restore();
      }
      // plop puff
      const pk = V.seg(t, PLOP, PLOP + 0.3);
      if (pk > 0 && pk < 1) {
        const [sx, sy] = toS(LIE.x - 40, BR.bed.mattressTop);
        ctx.save();
        ctx.globalAlpha = 0.7 * (1 - pk);
        for (let i = 0; i < 6; i++) {
          const a = V.deg(200 + i * 28);
          const r = (30 + pk * 70) * cam.zoom;
          V.circle(ctx, sx + Math.cos(a) * r * 1.6, sy + Math.sin(a) * r * 0.5, (8 + 6 * (1 - pk)) * cam.zoom * 0.6, '#c8d4ff');
        }
        ctx.restore();
      }
      // Zzz
      if (t > ASLEEP + 0.07) {
        const za = V.ep(t, ASLEEP + 0.07, ASLEEP + 0.52);
        const [hx, hy] = toS(j.head[0] + 10, j.head[1] - 50);
        const sz = 30 * Math.sqrt(cam.zoom);
        V.floaters(ctx, hx, hy, t - (ASLEEP + 0.07), { char: 'Z', n: 3, rise: 70 * Math.sqrt(cam.zoom), dx: 46 * Math.sqrt(cam.zoom), size: sz, color: '#e8eeff', alpha: za, period: 1.7 });
      }
      // closing caption
      const ca = Math.min(V.ep(t, 6.4, 6.75, 'out'), 1 - V.ep(t, 7.25, 7.6));
      if (ca > 0) {
        V.text(ctx, 'לילה טוב', V.W / 2, 150, { size: 62, weight: 700, color: '#eef1ff', alpha: ca, shadow: 'rgba(120,150,255,0.8)', shadowBlur: 22 });
      }
    },
  });
})();
