// Character rig: a flat-cartoon puppet in 3/4 side view.
//
//   V.boy.draw(ctx, x, y, s, pose)   (x, y) = HIP position in canvas px, s = scale
//   V.boy.standY(groundY, s, pose)   -> hip y so the lowest foot rests on groundY
//   V.boy.joints(x, y, s, pose)      -> world positions of joints (for attaching props)
//   V.boy.pose.stand() / walk(p) / run(p) / sit() / lie() / kick(k)  -> pose objects
//
// At s = 1 a standing character is ~445 px tall (hip is ~190 px above the ground).
// Angles are in DEGREES. Limb angles are measured from "straight down"; positive rotates
// toward the direction the character faces. Knees bend with NEGATIVE values, elbows with
// POSITIVE values. pose.facing = 1 faces right, -1 faces left.
(function () {
  const V = window.V;
  const D = {
    TORSO: 134, NECK: 12, HEAD_RX: 42, HEAD_RY: 46,
    UA: 74, FA: 70, HAND: 12,
    TH: 98, SH: 96, FOOT: 42,
    ARM_W: 25, LEG_W: 31, OUT: 3.5,
  };
  const rad = V.deg;
  const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))]; // from straight down
  const up = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))]; // from straight up

  const HERO = {
    skin: '#e9b48f',
    skinShade: '#cf9672',
    hair: '#4a2e1c',
    hairStyle: 'messy',
    eye: '#1f1a24',
    brow: '#3a2416',
  };

  // Outfits. Any field can be overridden by passing an object instead of a name.
  const OUTFITS = {
    pajamas: { shirt: '#8fb4e6', shirtDots: '#ffffff', sleeves: 'long', pants: '#7aa2d8', pantsLen: 'long', shoes: 'bare' },
    towel: { shirt: null, towel: '#4fb3a9', pants: null, pantsLen: 'none', shoes: 'bare' },
    school: { shirt: '#fbfbf7', logo: true, sleeves: 'short', pants: '#2f4f86', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#e2463c' },
    sport: { shirt: '#e2463c', number: '10', sleeves: 'short', trim: '#ffffff', pants: '#1f1f27', pantsLen: 'shorts', socks: '#e2463c', shoes: 'cleats', shoeColor: '#1f1f27', shoeAccent: '#f6c945' },
    home: { shirt: '#8a96a8', sleeves: 'short', pants: '#4b5a74', pantsLen: 'shorts', shoes: 'socks', shoeColor: '#efefef' },
    evening: { shirt: '#2f5d50', hoodie: true, sleeves: 'long', pants: '#34405a', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#1f1f27', shoeAccent: '#ffffff' },
  };
  const resolveOutfit = (o) => Object.assign({}, OUTFITS.school, typeof o === 'string' ? OUTFITS[o] : o || {});

  // ---------- poses ----------
  const base = () => ({
    facing: 1,
    rot: 0, // whole body rotation around the hip
    torso: 0, // lean (+ forward)
    head: 0, // head tilt (+ forward / nodding down)
    armNear: { sh: 6, el: 10 },
    armFar: { sh: -6, el: 10 },
    legNear: { hip: 3, knee: -2, foot: 0 },
    legFar: { hip: -3, knee: -2, foot: 0 },
    eyes: 'open', // open | closed | sleep | half | wide | happy
    mouth: 'smile', // smile | neutral | open | o | grin | yawn | chew | frown | teeth
    brows: 0, // + raised, - frown
    blush: 0,
    outfit: 'school',
    look: null, // override HERO look (skin, hair, hairStyle ...)
    backpack: false, // false | colour string
    propNear: null, // fn(ctx) drawn in the NEAR hand frame (+x along forearm direction)
    propFar: null, // fn(ctx) drawn in the FAR hand frame
  });
  const P = {
    stand: (o = {}) => Object.assign(base(), o),
    // walking cycle, phase p in [0,1)
    walk: (p, o = {}) => {
      const s = Math.sin(p * Math.PI * 2), c = Math.cos(p * Math.PI * 2);
      return Object.assign(base(), {
        torso: 3,
        legNear: { hip: 24 * s, knee: -6 - 42 * Math.max(0, c), foot: 0 },
        legFar: { hip: -24 * s, knee: -6 - 42 * Math.max(0, -c), foot: 0 },
        armNear: { sh: -24 * s, el: 16 + 8 * Math.max(0, -s) },
        armFar: { sh: 24 * s, el: 16 + 8 * Math.max(0, s) },
      }, o);
    },
    run: (p, o = {}) => {
      const s = Math.sin(p * Math.PI * 2), c = Math.cos(p * Math.PI * 2);
      return Object.assign(base(), {
        torso: 12,
        legNear: { hip: 42 * s + 8, knee: -20 - 70 * Math.max(0, c), foot: 0 },
        legFar: { hip: -42 * s + 8, knee: -20 - 70 * Math.max(0, -c), foot: 0 },
        armNear: { sh: -45 * s, el: 75 },
        armFar: { sh: 45 * s, el: 75 },
        mouth: 'open',
      }, o);
    },
    // sitting on a chair: hip sits on the seat, shins hang down
    sit: (o = {}) => Object.assign(base(), {
      torso: -3,
      legNear: { hip: 86, knee: -84, foot: 0 },
      legFar: { hip: 80, knee: -80, foot: 0 },
      armNear: { sh: 35, el: 45 },
      armFar: { sh: 30, el: 45 },
    }, o),
    // lying on the back; rot -90 puts the head on the side opposite to `facing`
    lie: (o = {}) => Object.assign(base(), {
      rot: -90,
      legNear: { hip: 2, knee: -4, foot: -60 },
      legFar: { hip: -2, knee: -4, foot: -60 },
      armNear: { sh: 10, el: 10 },
      armFar: { sh: -5, el: 10 },
      eyes: 'sleep',
      mouth: 'neutral',
    }, o),
    // kick: k 0..1 (wind-up -> strike -> follow through)
    kick: (k, o = {}) => {
      const hip = V.kf(k, [[0, 0], [0.35, -40], [0.6, 70], [1, 40]]);
      const knee = V.kf(k, [[0, -5], [0.35, -95], [0.6, -5], [1, -20]]);
      return Object.assign(base(), {
        torso: V.kf(k, [[0, 4], [0.35, -4], [0.6, -12], [1, -6]]),
        legNear: { hip, knee, foot: 0 },
        legFar: { hip: -6, knee: -6, foot: 0 },
        armNear: { sh: V.kf(k, [[0, 10], [0.6, -50], [1, -30]]), el: 30 },
        armFar: { sh: V.kf(k, [[0, -10], [0.6, 60], [1, 40]]), el: 30 },
        mouth: 'grin',
      }, o);
    },
  };
  // blink helper: returns 'closed' for ~0.12s every ~3s, else `open`
  const blink = (t, open = 'open', seed = 0) => {
    const k = (t + seed * 1.7) % 3.1;
    return k > 2.95 ? 'closed' : open;
  };

  // ---------- forward kinematics (local, unscaled, facing +x, before rot) ----------
  function fk(pose) {
    const hip = [0, 0];
    const u = up(pose.torso);
    const shoulder = [hip[0] + u[0] * (D.TORSO - 16), hip[1] + u[1] * (D.TORSO - 16)];
    const neck = [hip[0] + u[0] * D.TORSO, hip[1] + u[1] * D.TORSO];
    const hu = up(pose.torso + pose.head);
    const head = [neck[0] + hu[0] * (D.NECK + D.HEAD_RY - 6), neck[1] + hu[1] * (D.NECK + D.HEAD_RY - 6)];
    const arm = (a, dx) => {
      const ua = pose.torso + a.sh, fa = ua + a.el;
      const s0 = [shoulder[0] + dx, shoulder[1]];
      const e = [s0[0] + dir(ua)[0] * D.UA, s0[1] + dir(ua)[1] * D.UA];
      const h = [e[0] + dir(fa)[0] * D.FA, e[1] + dir(fa)[1] * D.FA];
      return { s: s0, e, h, ua, fa };
    };
    const leg = (l, dx) => {
      const ta = l.hip, sa = l.hip + l.knee, fa = sa + 90 + (l.foot || 0);
      const h0 = [hip[0] + dx, hip[1]];
      const k = [h0[0] + dir(ta)[0] * D.TH, h0[1] + dir(ta)[1] * D.TH];
      const a = [k[0] + dir(sa)[0] * D.SH, k[1] + dir(sa)[1] * D.SH];
      const toe = [a[0] + dir(fa)[0] * (D.FOOT - 6), a[1] + dir(fa)[1] * (D.FOOT - 6)];
      return { h: h0, k, a, toe, ta, sa, fa };
    };
    return {
      hip, shoulder, neck, head,
      armNear: arm(pose.armNear, 4), armFar: arm(pose.armFar, -6),
      legNear: leg(pose.legNear, 5), legFar: leg(pose.legFar, -5),
    };
  }

  const toWorld = (x, y, s, pose) => (p) => {
    const r = rad(pose.rot || 0);
    const px = p[0] * Math.cos(r) - p[1] * Math.sin(r);
    const py = p[0] * Math.sin(r) + p[1] * Math.cos(r);
    return [x + (pose.facing || 1) * s * px, y + s * py];
  };

  function joints(x, y, s, pose) {
    pose = Object.assign(base(), pose);
    const j = fk(pose);
    const w = toWorld(x, y, s, pose);
    return {
      hip: w(j.hip), shoulder: w(j.shoulder), neck: w(j.neck), head: w(j.head),
      // mouth position (useful for toothbrush / food)
      mouth: w([j.head[0] + 26, j.head[1] + 20]),
      eye: w([j.head[0] + 22, j.head[1] - 5]),
      nearElbow: w(j.armNear.e), nearHand: w(j.armNear.h),
      farElbow: w(j.armFar.e), farHand: w(j.armFar.h),
      nearKnee: w(j.legNear.k), nearAnkle: w(j.legNear.a), nearToe: w(j.legNear.toe),
      farKnee: w(j.legFar.k), farAnkle: w(j.legFar.a), farToe: w(j.legFar.toe),
    };
  }

  // hip y that puts the lowest point of the feet on groundY
  function standY(groundY, s, pose) {
    pose = Object.assign(base(), pose);
    const j = fk(pose);
    const w = toWorld(0, 0, s, pose);
    let maxY = -Infinity;
    for (const l of [j.legNear, j.legFar]) {
      for (const p of [l.a, l.toe]) maxY = Math.max(maxY, w(p)[1] + 11 * s);
    }
    return groundY - maxY;
  }

  // ---------- drawing ----------
  const capsule = (ctx, a, b, w, color, out) => {
    ctx.lineCap = 'round';
    if (out) {
      ctx.strokeStyle = out;
      ctx.lineWidth = w + D.OUT * 2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const butt = (ctx, a, b, w, color) => {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  };
  const along = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  function drawArm(ctx, arm, look, outfit, shade, prop) {
    const ink = V.pal.ink;
    const skin = shade ? look.skinShade : look.skin;
    const sh = outfit.shirt ? (shade ? V.shade(outfit.shirt, -0.18) : outfit.shirt) : null;
    // outline pass
    capsule(ctx, arm.s, arm.e, D.ARM_W + D.OUT * 2, ink);
    capsule(ctx, arm.e, arm.h, D.ARM_W - 2 + D.OUT * 2, ink);
    // skin
    capsule(ctx, arm.s, arm.e, D.ARM_W, skin);
    capsule(ctx, arm.e, arm.h, D.ARM_W - 2, skin);
    // sleeves
    if (sh && outfit.sleeves === 'long') {
      const cuff = along(arm.e, arm.h, 0.78);
      capsule(ctx, arm.s, arm.e, D.ARM_W + 4 + D.OUT * 2, ink);
      capsule(ctx, arm.e, cuff, D.ARM_W + 2 + D.OUT * 2, ink);
      capsule(ctx, arm.s, arm.e, D.ARM_W + 4, sh);
      capsule(ctx, arm.e, cuff, D.ARM_W + 2, sh);
      if (outfit.hoodie) butt(ctx, along(arm.e, arm.h, 0.66), along(arm.e, arm.h, 0.76), D.ARM_W + 3, V.shade(sh, -0.15));
    } else if (sh && outfit.sleeves === 'short') {
      const end = along(arm.s, arm.e, 0.55);
      capsule(ctx, arm.s, end, D.ARM_W + 6 + D.OUT * 2, ink);
      capsule(ctx, arm.s, end, D.ARM_W + 6, sh);
      if (outfit.trim) butt(ctx, along(arm.s, arm.e, 0.5), along(arm.s, arm.e, 0.62), D.ARM_W + 7, outfit.trim);
    }
    // hand
    V.circle(ctx, arm.h[0], arm.h[1], D.HAND, skin, ink, D.OUT);
    if (prop) {
      ctx.save();
      ctx.translate(arm.h[0], arm.h[1]);
      ctx.rotate(-rad(arm.fa) + Math.PI / 2); // +x points along the forearm direction
      prop(ctx);
      ctx.restore();
    }
  }

  function drawLeg(ctx, leg, look, outfit, shade) {
    const ink = V.pal.ink;
    const k = shade ? -0.18 : 0;
    const skin = shade ? look.skinShade : look.skin;
    const pants = outfit.pants ? V.shade(outfit.pants, k) : null;
    capsule(ctx, leg.h, leg.k, D.LEG_W + D.OUT * 2, ink);
    capsule(ctx, leg.k, leg.a, D.LEG_W - 3 + D.OUT * 2, ink);
    capsule(ctx, leg.h, leg.k, D.LEG_W, skin);
    capsule(ctx, leg.k, leg.a, D.LEG_W - 3, skin);
    if (pants && outfit.pantsLen === 'long') {
      capsule(ctx, leg.h, leg.k, D.LEG_W + 3, pants);
      capsule(ctx, leg.k, along(leg.k, leg.a, 0.92), D.LEG_W + 1, pants);
    } else if (pants && outfit.pantsLen === 'shorts') {
      capsule(ctx, leg.h, along(leg.h, leg.k, 0.72), D.LEG_W + 5, pants);
    }
    if (outfit.socks) capsule(ctx, along(leg.k, leg.a, 0.35), leg.a, D.LEG_W - 1, V.shade(outfit.socks, k));
    // foot / shoe
    const shoes = outfit.shoes;
    ctx.save();
    ctx.translate(leg.a[0], leg.a[1]);
    ctx.rotate(-rad(leg.fa) + Math.PI / 2);
    if (shoes === 'bare') {
      V.fillRound(ctx, -10, -9, D.FOOT + 6, 20, 10, skin, ink, D.OUT);
    } else if (shoes === 'socks') {
      V.fillRound(ctx, -11, -10, D.FOOT + 8, 22, 11, V.shade(outfit.shoeColor || '#eeeeee', k), ink, D.OUT);
    } else {
      const c = V.shade(outfit.shoeColor || '#f4f4f4', k);
      V.fillRound(ctx, -14, -12, D.FOOT + 14, 26, 11, c, ink, D.OUT);
      V.fillRound(ctx, -14, 7, D.FOOT + 14, 7, 3, shoes === 'cleats' ? '#111' : V.shade(c, -0.25));
      if (outfit.shoeAccent) V.line(ctx, 2, -2, 22, -4, V.shade(outfit.shoeAccent, k), 5);
      if (shoes === 'cleats') {
        for (let i = 0; i < 4; i++) V.fillRound(ctx, -10 + i * 14, 12, 6, 6, 2, '#777');
      }
    }
    ctx.restore();
  }

  function drawHair(ctx, look, behind) {
    const ink = V.pal.ink;
    const c = look.hair;
    ctx.save();
    ctx.fillStyle = c;
    ctx.strokeStyle = ink;
    ctx.lineWidth = D.OUT;
    ctx.lineJoin = 'round';
    const st = look.hairStyle;
    if (behind) {
      // shapes that sit behind the head (long hair, ponytail)
      if (st === 'long') {
        ctx.beginPath();
        ctx.moveTo(-30, -30);
        ctx.quadraticCurveTo(-62, 30, -40, 70);
        ctx.lineTo(-6, 60);
        ctx.quadraticCurveTo(-10, 10, -30, -30);
        ctx.fill();
        ctx.stroke();
      }
      if (st === 'ponytail') {
        ctx.beginPath();
        ctx.ellipse(-50, -10, 16, 34, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.beginPath();
    if (st === 'messy') {
      ctx.moveTo(38, -18);
      ctx.quadraticCurveTo(36, -42, 14, -50);
      ctx.lineTo(22, -62);
      ctx.lineTo(2, -55);
      ctx.lineTo(4, -70);
      ctx.lineTo(-14, -56);
      ctx.lineTo(-24, -66);
      ctx.lineTo(-30, -48);
      ctx.lineTo(-48, -46);
      ctx.lineTo(-42, -30);
      ctx.quadraticCurveTo(-52, -6, -40, 22);
      ctx.lineTo(-26, 16);
      ctx.quadraticCurveTo(-24, -4, -10, -14);
      ctx.quadraticCurveTo(10, -26, 24, -20);
      ctx.lineTo(30, -26);
      ctx.quadraticCurveTo(34, -20, 38, -18);
    } else if (st === 'curly') {
      const blobs = [[22, -38, 16], [6, -50, 18], [-12, -52, 18], [-30, -42, 18], [-42, -24, 16], [-44, -4, 14], [-36, 12, 12], [32, -26, 12]];
      blobs.forEach(([bx, by, r]) => {
        ctx.moveTo(bx + r, by);
        ctx.arc(bx, by, r, 0, Math.PI * 2);
      });
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-8, -30, 40, 24, 0, 0, Math.PI * 2);
    } else if (st === 'buzz') {
      ctx.moveTo(36, -20);
      ctx.quadraticCurveTo(20, -50, -12, -46);
      ctx.quadraticCurveTo(-46, -36, -40, 16);
      ctx.lineTo(-28, 14);
      ctx.quadraticCurveTo(-24, -10, 6, -22);
      ctx.quadraticCurveTo(24, -24, 36, -20);
    } else if (st === 'cap') {
      // baseball cap
      ctx.fillStyle = look.capColor || V.pal.red;
      ctx.moveTo(-42, -10);
      ctx.quadraticCurveTo(-40, -58, 4, -54);
      ctx.quadraticCurveTo(40, -48, 40, -18);
      ctx.lineTo(70, -14);
      ctx.quadraticCurveTo(64, -6, 36, -8);
      ctx.lineTo(-42, -10);
    } else if (st === 'long' || st === 'ponytail') {
      ctx.moveTo(38, -16);
      ctx.quadraticCurveTo(34, -52, -6, -54);
      ctx.quadraticCurveTo(-46, -50, -46, -8);
      ctx.quadraticCurveTo(-46, 16, -36, 30);
      ctx.lineTo(-26, 20);
      ctx.quadraticCurveTo(-22, -6, -8, -16);
      ctx.quadraticCurveTo(14, -30, 38, -16);
    } else {
      // 'short' tidy
      ctx.moveTo(38, -20);
      ctx.quadraticCurveTo(30, -54, -6, -54);
      ctx.quadraticCurveTo(-48, -48, -44, -6);
      ctx.quadraticCurveTo(-42, 14, -36, 20);
      ctx.lineTo(-26, 14);
      ctx.quadraticCurveTo(-24, -8, -6, -16);
      ctx.quadraticCurveTo(16, -26, 38, -20);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawHead(ctx, pose, look, facing) {
    const ink = V.pal.ink;
    drawHair(ctx, look, true);
    // head shape
    ctx.beginPath();
    ctx.ellipse(0, 0, D.HEAD_RX, D.HEAD_RY, 0, 0, Math.PI * 2);
    ctx.fillStyle = look.skin;
    ctx.fill();
    ctx.lineWidth = D.OUT;
    ctx.strokeStyle = ink;
    ctx.stroke();
    // jaw / chin bulge toward the front
    V.ellipse(ctx, 18, 22, 22, 20, look.skin);
    ctx.beginPath();
    ctx.ellipse(18, 22, 22, 20, 0, -0.2, Math.PI * 0.75);
    ctx.stroke();
    // nose
    ctx.beginPath();
    ctx.moveTo(38, -6);
    ctx.quadraticCurveTo(50, 8, 39, 12);
    ctx.fillStyle = look.skin;
    ctx.fill();
    ctx.stroke();
    // ear
    V.ellipse(ctx, -12, 6, 8, 11, look.skinShade);
    ctx.beginPath();
    ctx.ellipse(-12, 6, 8, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    // blush
    if (pose.blush) V.ellipse(ctx, 22, 12, 9, 6, `rgba(240,110,110,${0.45 * pose.blush})`);
    // eyes
    const eyes = [[18, -6, 1], [33, -6, 0.72]];
    const brY = -20 - (pose.brows || 0) * 6;
    eyes.forEach(([ex, ey, k]) => {
      ctx.save();
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = ink;
      ctx.lineCap = 'round';
      const e = pose.eyes;
      if (e === 'closed' || e === 'sleep') {
        ctx.beginPath();
        if (e === 'closed') ctx.arc(ex, ey - 2, 6 * k, 0.15 * Math.PI, 0.85 * Math.PI);
        else {
          ctx.moveTo(ex - 6 * k, ey + 1);
          ctx.lineTo(ex + 6 * k, ey + 1);
        }
        ctx.stroke();
      } else if (e === 'happy') {
        ctx.beginPath();
        ctx.arc(ex, ey + 3, 6 * k, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
      } else {
        const wide = e === 'wide';
        if (wide) V.ellipse(ctx, ex, ey, 8 * k, 11, '#ffffff');
        V.ellipse(ctx, ex + (wide ? 1 : 0), ey, (wide ? 5 : 5.2) * k, wide ? 7 : 8, look.eye);
        V.circle(ctx, ex + 1.5 * k, ey - 3, 1.8, '#ffffff');
        if (e === 'half') {
          // heavy lids: cover the top half with skin and draw the lid line
          ctx.fillStyle = look.skin;
          ctx.fillRect(ex - 9 * k, ey - 14, 18 * k, 13);
          ctx.beginPath();
          ctx.moveTo(ex - 7 * k, ey - 1);
          ctx.lineTo(ex + 7 * k, ey - 1);
          ctx.stroke();
        }
      }
      // brow
      ctx.lineWidth = 4;
      ctx.strokeStyle = look.brow || ink;
      ctx.beginPath();
      const tiltIn = (pose.brows || 0) < 0 ? 3 : 0;
      ctx.moveTo(ex - 7 * k, brY + (k < 1 ? 0 : 0));
      ctx.lineTo(ex + 7 * k, brY - 1 + tiltIn * (k < 1 ? -1 : 1));
      ctx.stroke();
      ctx.restore();
    });
    // mouth
    const mx = 27, my = 25;
    ctx.save();
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    const m = pose.mouth;
    const dark = '#5a1f22';
    if (m === 'smile') {
      ctx.beginPath();
      ctx.arc(mx, my - 6, 9, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    } else if (m === 'neutral') {
      V.line(ctx, mx - 6, my, mx + 7, my - 1, ink, 3.4);
    } else if (m === 'frown') {
      ctx.beginPath();
      ctx.arc(mx, my + 7, 8, 1.2 * Math.PI, 1.8 * Math.PI);
      ctx.stroke();
    } else if (m === 'o') {
      V.ellipse(ctx, mx + 2, my, 5, 6, dark);
    } else if (m === 'open' || m === 'chew') {
      V.ellipse(ctx, mx + 1, my, 9, m === 'chew' ? 4 : 7, dark);
    } else if (m === 'yawn') {
      V.ellipse(ctx, mx, my + 2, 9, 13, dark);
      V.ellipse(ctx, mx, my + 9, 6, 4, '#d9686a');
    } else if (m === 'grin' || m === 'teeth') {
      ctx.beginPath();
      ctx.moveTo(mx - 10, my - 5);
      ctx.quadraticCurveTo(mx + 2, my - 2, mx + 13, my - 7);
      ctx.quadraticCurveTo(mx + 6, my + 14, mx - 10, my - 5);
      ctx.fillStyle = m === 'teeth' ? '#ffffff' : dark;
      ctx.fill();
      if (m === 'grin') {
        ctx.save();
        ctx.clip();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 12, my - 9, 26, 6);
        ctx.restore();
      }
      ctx.stroke();
    }
    ctx.restore();
    drawHair(ctx, look, false);
  }

  function torsoPath(ctx, top) {
    ctx.beginPath();
    ctx.moveTo(-31, 16);
    ctx.lineTo(-35, top + 34);
    ctx.quadraticCurveTo(-37, top - 1, -6, top - 2);
    ctx.lineTo(16, top - 2);
    ctx.quadraticCurveTo(46, top, 45, top + 36);
    ctx.lineTo(38, 16);
    ctx.quadraticCurveTo(4, 24, -31, 16);
    ctx.closePath();
  }

  function drawTorso(ctx, j, pose, look, outfit, facing) {
    const ink = V.pal.ink;
    ctx.save();
    ctx.translate(j.hip[0], j.hip[1]);
    ctx.rotate(rad(pose.torso));
    const top = -D.TORSO - 4;
    const bare = !outfit.shirt;
    const fill = bare ? look.skin : outfit.shirt;
    // neck
    capsule(ctx, [2, top + 6], [2, top - 12], 24 + D.OUT * 2, ink);
    capsule(ctx, [2, top + 6], [2, top - 12], 24, look.skin);
    // body (3/4 view: rounded shoulders, slightly narrower waist)
    torsoPath(ctx, top);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = D.OUT;
    ctx.strokeStyle = ink;
    ctx.stroke();
    if (outfit.shirtDots) {
      ctx.save();
      torsoPath(ctx, top);
      ctx.clip();
      for (let i = 0; i < 14; i++) V.circle(ctx, -28 + (i % 4) * 22 + (Math.floor(i / 4) % 2) * 11, top + 22 + Math.floor(i / 4) * 34, 4, outfit.shirtDots);
      ctx.restore();
    }
    if (!bare) {
      // collar
      ctx.beginPath();
      ctx.moveTo(-8, top + 2);
      ctx.quadraticCurveTo(8, top + 18, 24, top + 4);
      ctx.strokeStyle = V.shade(fill, -0.3);
      ctx.lineWidth = 4;
      ctx.stroke();
      if (outfit.hoodie) {
        // hood behind the neck + front pocket
        V.fillRound(ctx, -46, top - 14, 40, 44, 18, V.shade(fill, -0.12), ink, D.OUT);
        V.fillRound(ctx, -10, -58, 46, 34, 10, V.shade(fill, -0.1));
        V.line(ctx, 0, top + 14, 2, top + 48, '#dddddd', 3);
      }
      if (outfit.logo) {
        V.circle(ctx, 18, top + 46, 11, V.pal.navy);
        V.circle(ctx, 18, top + 46, 5, V.pal.yellow);
      }
      if (outfit.number) {
        ctx.save();
        ctx.translate(12, top + 70);
        ctx.scale(facing, 1);
        V.text(ctx, outfit.number, 0, 0, { size: 38, weight: 900, color: outfit.trim || '#fff', rtl: false });
        ctx.restore();
      }
    } else {
      // bare chest details: shoulder line + belly button
      V.circle(ctx, 22, -40, 2.5, look.skinShade);
    }
    ctx.restore();
  }

  function drawPantsSeat(ctx, j, pose, outfit) {
    const ink = V.pal.ink;
    if (outfit.towel) return;
    if (!outfit.pants) return;
    ctx.save();
    ctx.translate(j.hip[0], j.hip[1]);
    ctx.rotate(rad(pose.torso) * 0.5);
    V.fillRound(ctx, -32, -18, 68, 40, 18, outfit.pants, ink, D.OUT);
    ctx.restore();
  }

  function drawTowel(ctx, j, pose, outfit) {
    if (!outfit.towel) return;
    const ink = V.pal.ink;
    const kneeY = Math.max(j.legNear.k[1], j.legFar.k[1]);
    ctx.save();
    ctx.translate(j.hip[0], j.hip[1]);
    V.roundRect(ctx, -40, -26, 84, Math.max(70, kneeY + 10), 14);
    ctx.fillStyle = outfit.towel;
    ctx.fill();
    ctx.lineWidth = D.OUT;
    ctx.strokeStyle = ink;
    ctx.stroke();
    for (let i = 0; i < 3; i++) V.line(ctx, -32, -10 + i * 22, 36, -10 + i * 22, V.shade(outfit.towel, 0.25), 4);
    ctx.restore();
  }

  function drawBackpack(ctx, j, pose, color) {
    const ink = V.pal.ink;
    ctx.save();
    ctx.translate(j.hip[0], j.hip[1]);
    ctx.rotate(rad(pose.torso));
    V.fillRound(ctx, -78, -D.TORSO + 18, 54, 112, 18, color, ink, D.OUT);
    V.fillRound(ctx, -84, -D.TORSO + 64, 26, 52, 10, V.shade(color, -0.15), ink, D.OUT);
    ctx.restore();
  }
  function drawBackpackStrap(ctx, j, pose, color) {
    ctx.save();
    ctx.translate(j.hip[0], j.hip[1]);
    ctx.rotate(rad(pose.torso));
    ctx.beginPath();
    ctx.moveTo(-10, -D.TORSO + 2);
    ctx.quadraticCurveTo(26, -D.TORSO + 40, -6, -D.TORSO + 96);
    ctx.strokeStyle = V.pal.ink;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = V.shade(color, -0.2);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.restore();
  }

  function draw(ctx, x, y, s, poseIn) {
    const pose = Object.assign(base(), poseIn);
    const look = Object.assign({}, HERO, pose.look || {});
    if (!look.skinShade || (pose.look && pose.look.skin && !pose.look.skinShade)) look.skinShade = V.shade(look.skin, -0.12);
    const outfit = resolveOutfit(pose.outfit);
    const facing = pose.facing || 1;
    const j = fk(pose);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    ctx.rotate(rad(pose.rot || 0));
    ctx.lineJoin = 'round';
    // far side
    drawArm(ctx, j.armFar, look, outfit, true, pose.propFar);
    drawLeg(ctx, j.legFar, look, outfit, true);
    if (pose.backpack) drawBackpack(ctx, j, pose, pose.backpack === true ? '#3b7dd8' : pose.backpack);
    drawLeg(ctx, j.legNear, look, outfit, false);
    drawPantsSeat(ctx, j, pose, outfit);
    drawTowel(ctx, j, pose, outfit);
    drawTorso(ctx, j, pose, look, outfit, facing);
    if (pose.backpack) drawBackpackStrap(ctx, j, pose, pose.backpack === true ? '#3b7dd8' : pose.backpack);
    // head
    ctx.save();
    ctx.translate(j.head[0], j.head[1]);
    ctx.rotate(rad(pose.torso + pose.head));
    drawHead(ctx, pose, look, facing);
    if (pose.headProp) pose.headProp(ctx); // drawn in head frame (origin = head centre)
    ctx.restore();
    drawArm(ctx, j.armNear, look, outfit, false, pose.propNear);
    ctx.restore();
  }

  // walk-cycle phase for a character that has travelled `dist` px at scale s (no foot sliding):
  // one full cycle (two steps) covers ~316*s px. Running: ~520*s px per cycle.
  const walkPhase = (dist, s = 1) => dist / (316 * s);
  const runPhase = (dist, s = 1) => dist / (520 * s);

  V.boy = { D, HERO, OUTFITS, pose: P, blink, draw, joints, standY, fk, walkPhase, runPhase };
})();
