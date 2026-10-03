// Scene 01-wake (8 s, 07:30) — the film's opening.
//  Shot 1 (0–3.0): extreme close-up of the bedside LED clock in the dark. 07:29 -> 07:30 at t=1.0,
//                  rings from 1.1, a sleepy pajama arm gropes in (~1.75) and SLAMS snooze at 2.35.
//                  Film title over the dark shot.
//  Shot 2 (3.0–8.0): wide morning bedroom with sunbeams. He groans, sits up, stretches + yawns,
//                  scratches his messy hair, swings his legs out and stands up. Clock stays visible.
(function () {
  const B = V.boy, P = B.pose;
  const BR = V.env.BEDROOM, IK = V.env.bedroomIK, PARTS = V.env.bedroomParts;
  const S = BR.heroScale;
  const CUT = 3.0, SLAM = 2.35;
  const INK = V.pal.ink;

  // ------------------------------------------------------------------ shot 1 helpers
  let lowC = null;
  const low = () => {
    if (!lowC) {
      lowC = document.createElement('canvas');
      lowC.width = 384;
      lowC.height = 216;
    }
    return lowC;
  };

  // world-space cartoon hand seen from above (back of the hand), fingers toward +x
  function drawHand(ctx, curl, spread, skin) {
    const lw = 3.4;
    const fingers = [[-0.34, 27, -12], [-0.11, 31, -4], [0.11, 30, 4], [0.32, 24, 12]];
    const tips = [];
    fingers.forEach(([a, len, y0], i) => {
      const an = a * (0.55 + spread * 0.9);
      const L = len * (1 - 0.38 * curl);
      const tip = [26 + Math.cos(an) * L, y0 + Math.sin(an) * L];
      tips.push([y0, tip, an]);
      V.line(ctx, 22, y0, tip[0], tip[1], INK, 11.5 + lw * 2);
      void i;
    });
    tips.forEach(([y0, tip]) => V.line(ctx, 22, y0, tip[0], tip[1], skin, 11.5));
    tips.forEach(([, tip, an]) => {
      // finger nails
      ctx.save();
      ctx.translate(tip[0] - Math.cos(an) * 2, tip[1] - Math.sin(an) * 2);
      ctx.rotate(an);
      V.ellipse(ctx, 0, 0, 3.6, 3, 'rgba(255,225,215,0.9)');
      ctx.restore();
    });
    // thumb
    ctx.save();
    ctx.translate(8, -15);
    ctx.rotate(-0.85 - spread * 0.25 + curl * 0.4);
    V.fillRound(ctx, -4, -6.5, 26, 13, 6.5, skin, INK, lw);
    ctx.restore();
    // back of the hand
    V.fillRound(ctx, -4, -18, 34, 36, 14, skin, INK, lw);
    // knuckle creases
    [-12, -4, 4, 12].forEach((y) => V.line(ctx, 21, y - 2.5, 24, y + 2.5, 'rgba(150,80,50,0.45)', 2));
  }

  // pajama arm: off-screen shoulder -> elbow (2-bone IK, elbow up) -> wrist, then the hand
  const ARM_U = 128, ARM_F = 122, HAND_S = 1.55;
  function drawCloseArm(ctx, sh, w, handAng, flat, curl, spread) {
    const sleeve = '#8fb4e6', cuff = '#6f95cf', skin = '#e9b48f';
    let dx = w[0] - sh[0], dy = w[1] - sh[1];
    let d = Math.hypot(dx, dy);
    const dirA = Math.atan2(dy, dx);
    d = V.clamp(d, 30, ARM_U + ARM_F - 0.5);
    const a = Math.acos(V.clamp((ARM_U * ARM_U + d * d - ARM_F * ARM_F) / (2 * ARM_U * d), -1, 1));
    const el = [sh[0] + Math.cos(dirA + a) * ARM_U, sh[1] + Math.sin(dirA + a) * ARM_U];
    const fx = w[0] - el[0], fy = w[1] - el[1], fl = Math.hypot(fx, fy);
    const ux = fx / fl, uy = fy / fl;
    const cuffP = [w[0] - ux * 10, w[1] - uy * 10];
    // wrist skin
    V.line(ctx, cuffP[0], cuffP[1], w[0], w[1], INK, 30 + 6.8);
    V.line(ctx, cuffP[0], cuffP[1], w[0], w[1], skin, 30);
    // hand
    ctx.save();
    ctx.translate(w[0], w[1]);
    ctx.scale(HAND_S, HAND_S * flat);
    ctx.rotate(V.deg(handAng));
    drawHand(ctx, curl, spread, skin);
    ctx.restore();
    // sleeve: upper arm + forearm
    const seg = (p, q, wd, c) => V.line(ctx, p[0], p[1], q[0], q[1], c, wd);
    seg(sh, el, 46 + 6.8, INK);
    seg(el, cuffP, 41 + 6.8, INK);
    seg(sh, el, 46, sleeve);
    seg(el, cuffP, 41, sleeve);
    V.line(ctx, el[0], el[1], V.lerp(el[0], cuffP[0], 0.12), V.lerp(el[1], cuffP[1], 0.12), V.shade(sleeve, -0.12), 30);
    // pajama dots
    const dots = (p, q, n, seed) => {
      const ox = -(q[1] - p[1]), oy = q[0] - p[0], ol = Math.hypot(ox, oy);
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        const off = (V.rand(seed + i) - 0.5) * 26;
        V.circle(ctx, V.lerp(p[0], q[0], k) + (ox / ol) * off, V.lerp(p[1], q[1], k) + (oy / ol) * off, 3, '#ffffff');
      }
    };
    dots(sh, el, 6, 3);
    dots(el, cuffP, 5, 9);
    // cuff band
    V.line(ctx, cuffP[0] - ux * 12, cuffP[1] - uy * 12, cuffP[0] + ux * 1, cuffP[1] + uy * 1, INK, 43 + 6.8, 'butt');
    V.line(ctx, cuffP[0] - ux * 11, cuffP[1] - uy * 11, cuffP[0], cuffP[1], cuff, 43, 'butt');
  }

  // groping arm keyframes (world coords; clock bottom-centre at 556,760, snooze button top ~688)
  const ARM = {
    t: [1.7, 1.98, 2.06, 2.13, 2.25, SLAM, 2.85, 3.0],
    w: [[770, 655], [702, 742], [698, 731], [692, 744], [648, 664], [576, 681], [578, 681], [600, 690]],
    ang: [196, 184, 188, 182, 214, 184, 182, 186],
    flat: [0.8, 0.62, 0.7, 0.6, 1.0, 0.5, 0.52, 0.58],
    curl: [0.5, 0.25, 0.65, 0.3, 0.0, -0.1, 0.3, 0.45],
    spread: [0.4, 0.5, 0.4, 0.55, 1.0, 1.0, 0.7, 0.6],
  };
  function armAt(t) {
    const T = ARM.t;
    let i = 0;
    while (i < T.length - 2 && t > T[i + 1]) i++;
    const raw = V.seg(t, T[i], T[i + 1]);
    const k = i === 4 ? V.ease.in(raw) : V.ease.inOut(raw); // the slam accelerates
    const L = (a) => V.lerp(a[i], a[i + 1], k);
    return { w: [L(ARM.w.map((p) => p[0])), L(ARM.w.map((p) => p[1]))], ang: L(ARM.ang), flat: L(ARM.flat), curl: L(ARM.curl), spread: L(ARM.spread) };
  }

  function shot1(ctx, t) {
    const ring = t >= 1.1 && t < SLAM ? 1 : 0;
    const time = t < 1.0 ? '07:29' : '07:30';
    const squash = V.kf(t, [[SLAM - 0.02, 0], [SLAM + 0.03, 1], [SLAM + 0.13, -0.35], [SLAM + 0.24, 0.12], [SLAM + 0.34, 0]], 'sine');
    // camera: slow push-in, impact shake
    const zoom = V.lerp(5.55, 6.2, V.ep(t, 0, CUT, 'sine'));
    const sh = t > SLAM ? Math.exp(-(t - SLAM) * 13) : 0;
    const cam = { x: 578 + Math.sin(t * 83) * 2 * sh, y: 716 + Math.cos(t * 71) * 2.2 * sh + 1.2 * sh, zoom };
    const light = 0.05;
    const o = { cam, hour: 7.4, light, t, clockTime: time, clockRing: ring, clockSquash: squash, curtain: 1, hide: { nightstand: true, clock: true } };
    const oo = Object.assign({ backpack: true, ball: true, doorOpen: 0, hallLight: 0, wardrobeOpen: 0, lamp: 0, bedSquash: 0 }, o);

    // 1) out-of-focus room behind the clock (rendered small, scaled up = soft blur)
    const lc = low(), lx = lc.getContext('2d');
    lx.save();
    lx.setTransform(lc.width / V.W, 0, 0, lc.height / V.H, 0, 0);
    lx.fillStyle = '#000';
    lx.fillRect(0, 0, V.W, V.H);
    V.env.bedroomCam(lx, cam);
    PARTS.drawRoom(lx, oo, false);
    lx.restore();
    PARTS.dimFill(lx, 1 - light);
    lx.fillStyle = 'rgba(0,0,0,0.38)';
    lx.fillRect(0, 0, lc.width, lc.height);
    lx.save();
    lx.setTransform(lc.width / V.W, 0, 0, lc.height / V.H, 0, 0);
    V.env.bedroomCam(lx, cam);
    V.lightPool(lx, 556, 722, 170, '#ff3a22', 0.2);
    lx.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(lc, 0, 0, V.W, V.H);
    ctx.restore();

    // 2) crisp nightstand + clock + arm
    ctx.save();
    V.env.bedroomCam(ctx, cam);
    V.env.bedroomDimLayer(ctx, 0.14, (c) => PARTS.drawNightstand(c));
    const glowPulse = 1 + 0.5 * Math.exp(-Math.max(0, t - 1.0) * 7) * (t >= 1 ? 1 : 0);
    PARTS.drawClockAt(ctx, oo, glowPulse);
    if (t > ARM.t[0]) {
      const a = armAt(t);
      const w = a.w.slice();
      if (t >= SLAM && t < 2.86) {
        // palm rides the squashing button
        const top = 760 - 172 * BR.clock.s * (1 - squash * 0.22);
        w[1] = top - 7;
      }
      const shoulder = [812 + 6 * Math.sin(t * 2), 642];
      V.env.bedroomDimLayer(ctx, 0.3, (c) => drawCloseArm(c, shoulder, w, a.ang, a.flat * (t >= SLAM && t < SLAM + 0.12 ? 0.85 : 1), a.curl, a.spread));
    }
    // LED light spill over everything near the clock
    V.lightPool(ctx, 556, 726, 130, '#ff3a22', 0.3);
    V.lightPool(ctx, 556, 726, 55, '#ff3a22', 0.2);
    // impact marks
    const ik = V.seg(t, SLAM, SLAM + 0.22);
    if (ik > 0 && ik < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - ik;
      for (let i = 0; i < 7; i++) {
        const an = V.deg(-180 + (i / 6) * 180);
        const r0 = 50 + ik * 20, r1 = r0 + 12 + (1 - ik) * 8;
        const cx = 556, cy = 686;
        V.line(ctx, cx + Math.cos(an) * r0 * 1.25, cy + Math.sin(an) * r0, cx + Math.cos(an) * r1 * 1.25, cy + Math.sin(an) * r1, '#fff1b0', 3.4);
      }
      ctx.restore();
    }
    ctx.restore();

    // 3) title over the dark shot
    const ta = Math.min(V.ep(t, 0.3, 0.75, 'out'), 1 - V.ep(t, 2.02, 2.42, 'inOut'));
    if (ta > 0) {
      const sc = 1 + 0.035 * V.seg(t, 0, 3);
      ctx.save();
      ctx.translate(V.W / 2, 205);
      ctx.scale(sc, sc);
      V.text(ctx, 'יום בחיים', 0, -18, { size: 132, weight: 900, color: '#fff6ea', alpha: ta, shadow: 'rgba(255,50,30,0.85)', shadowBlur: 34 });
      V.line(ctx, -230, 66, 230, 66, V.rgba('#ff3a22', 0.75 * ta), 3);
      V.text(ctx, 'של נער בן 15', 0, 108, { size: 54, weight: 500, color: '#ffd7a8', alpha: ta, shadow: 'rgba(0,0,0,0.8)', shadowBlur: 12 });
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------ shot 2 (hero in bed)
  const lerpArm = (a, b, k) => ({ sh: V.lerp(a.sh, b.sh, k), el: V.lerp(a.el, b.el, k) });
  const LIE = BR.bed.lie, SIT = BR.bed.sit;
  const FOOT_N = [1158, BR.floorY - 11 * S], FOOT_F = [1140, BR.floorY - 11 * S];
  const STAND_Y = B.standY(BR.floorY, S, P.stand()) + 3;

  function hero(t) {
    const pose = P.lie({ outfit: 'pajamas', facing: 1, head: 24, torso: 6 });
    let x = LIE.x, y = LIE.y;
    // sit-up progress
    const up = V.kf(t, [[3.62, 0], [3.74, -0.05], [4.32, 1]], 'inOut');
    pose.rot = -90 * (1 - up);
    pose.torso = V.kf(t, [[3.62, 6], [3.74, 2], [4.1, 22], [4.4, 8], [4.62, -2]]);
    pose.head = V.kf(t, [[3.0, 24], [3.6, 24], [3.72, 38], [4.1, 6], [4.4, 0]]);
    y = V.lerp(LIE.y, SIT.y, V.clamp(up));
    x = V.lerp(LIE.x, SIT.x, V.clamp(up));
    // legs: flat on the mattress while in bed
    pose.legNear = { hip: 92 + pose.rot, knee: -4, foot: -62 };
    pose.legFar = { hip: 88 + pose.rot, knee: -4, foot: -58 };
    // faces
    pose.eyes = 'sleep';
    pose.mouth = 'neutral';
    pose.brows = 0;
    if (t < 3.62) {
      pose.mouth = t > 3.12 && t < 3.55 ? (V.osc(t, 3) > -0.2 ? 'frown' : 'open') : 'frown';
      pose.brows = -0.7;
      pose.head += Math.sin(V.seg(t, 3.1, 3.55) * Math.PI * 2) * 5;
    } else if (t < 4.45) {
      pose.eyes = 'closed';
      pose.mouth = t < 4.15 ? 'frown' : 'neutral';
      pose.brows = -0.4;
    } else if (t < 6.05) {
      pose.eyes = t > 5.05 && t < 5.5 ? 'closed' : 'half';
      pose.mouth = t > 4.82 && t < 5.78 ? 'yawn' : 'neutral';
      pose.brows = t > 4.82 && t < 5.78 ? 0.6 : 0;
    } else {
      pose.eyes = B.blink(t, 'half', 2);
      pose.mouth = t < 6.6 ? (V.osc(t, 1.4) > 0 ? 'o' : 'neutral') : 'neutral';
      pose.brows = t < 6.6 ? -0.3 : 0;
    }

    // arms
    const rest = { sh: 34, el: 36 }, restF = { sh: 28, el: 40 };
    if (t < 3.62) {
      // dragging the snooze arm back from the nightstand, under the blanket
      const hx = V.kf(t, [[3.0, 676], [3.12, 690], [3.5, 960]]);
      const hy = V.kf(t, [[3.0, 748], [3.12, 744], [3.5, 712]]);
      IK.arm(pose, x, y, S, 'near', [hx, hy]);
      pose.armFar = { sh: -12, el: 16 };
    } else if (t < 4.62) {
      const k = V.ep(t, 3.62, 4.3);
      const base = { sh: -12, el: 16 };
      const ik = IK.arm(P.lie({ facing: 1, head: 24, torso: 6 }), LIE.x, LIE.y, S, 'near', [960, 712]).armNear;
      pose.armNear = lerpArm(ik, rest, k);
      pose.armFar = lerpArm(base, restF, k);
    } else if (t < 6.05) {
      // the big stretch
      const tr = V.osc(t, 9) * 2.5 * V.seg(t, 5.0, 5.15) * (1 - V.seg(t, 5.55, 5.7));
      pose.armNear = {
        sh: V.kf(t, [[4.62, 34], [4.98, 170], [5.6, 176], [6.0, 34]]) + tr,
        el: V.kf(t, [[4.62, 36], [4.98, 14], [5.6, 6], [6.0, 36]]),
      };
      pose.armFar = {
        sh: V.kf(t, [[4.66, 28], [5.02, 160], [5.62, 168], [6.0, 28]]) - tr,
        el: V.kf(t, [[4.66, 40], [5.02, 22], [5.62, 12], [6.0, 40]]),
      };
      pose.torso += V.kf(t, [[4.62, 0], [5.0, -10], [5.6, -13], [6.0, 0]]);
      pose.head += V.kf(t, [[4.62, 0], [5.0, -16], [5.6, -18], [6.0, 2]]);
    } else if (t < 6.62) {
      // scratching the messy hair
      const j0 = B.joints(x, y, S, pose);
      const sx = V.osc(t, 7) * 9;
      const tgt = [j0.head[0] - 6 + sx, j0.head[1] - 50];
      const ik = IK.arm(Object.assign({}, pose), x, y, S, 'near', tgt).armNear;
      const k = V.ep(t, 6.02, 6.2) * (1 - V.ep(t, 6.46, 6.62));
      pose.armNear = lerpArm(rest, ik, k);
      pose.armFar = restF;
      pose.head += 8 * k;
    } else {
      pose.armNear = { sh: V.kf(t, [[6.62, 34], [6.75, 64], [6.95, 40], [7.2, 52], [7.6, 10]]), el: V.kf(t, [[6.62, 36], [6.75, 10], [7.0, 30], [7.6, 14]]) };
      pose.armFar = { sh: V.kf(t, [[6.62, 28], [7.0, 26], [7.2, 46], [7.6, 6]]), el: V.kf(t, [[6.62, 40], [7.2, 34], [7.6, 16]]) };
    }

    // swing the legs out (6.62–7.0) then stand up (7.0–7.62) with the feet planted
    if (t >= 6.62) {
      const sitEdge = P.lie({ rot: 0, facing: 1, torso: 0 });
      IK.leg(sitEdge, SIT.x, SIT.y, S, 'near', FOOT_N, 90);
      IK.leg(sitEdge, SIT.x, SIT.y, S, 'far', FOOT_F, 90);
      if (t < 7.0) {
        const L = (a, m, b) => {
          const f = (key) => V.kf(t, [[6.62, a[key]], [6.82, m[key]], [7.0, b[key]]]);
          return { hip: f('hip'), knee: f('knee'), foot: f('foot') };
        };
        pose.legNear = L({ hip: 92, knee: -4, foot: -62 }, { hip: 128, knee: -122, foot: -10 }, sitEdge.legNear);
        pose.legFar = L({ hip: 88, knee: -4, foot: -58 }, { hip: 120, knee: -114, foot: -10 }, sitEdge.legFar);
        pose.torso = V.kf(t, [[6.62, -2], [6.8, 6], [7.0, 10]]);
      } else {
        const k1 = V.ep(t, 7.0, 7.18, 'inOut');
        const k2 = V.ep(t, 7.16, 7.62, 'inOut');
        x = V.lerp(SIT.x, SIT.x + 16, k1);
        y = SIT.y + 3 * k1;
        x = V.lerp(x, FOOT_N[0] - 14, k2);
        y = V.lerp(y, STAND_Y, k2);
        pose.torso = V.lerp(V.lerp(10, 30, k1), 5, k2);
        pose.head = V.lerp(-4, 10, k2);
        // settle + sleepy sway once up
        const sw = V.seg(t, 7.62, 8.0);
        pose.torso += sw * (2 + Math.sin((t - 7.62) * 2.4) * 2.5);
        x += sw * Math.sin((t - 7.62) * 2.4) * 3;
        y += V.kf(t, [[7.55, 0], [7.68, 6], [7.85, 0]], 'sine');
        IK.leg(pose, x, y, S, 'near', FOOT_N, 90);
        IK.leg(pose, x, y, S, 'far', FOOT_F, 90);
      }
    }
    return { x, y, pose, up };
  }

  function shot2(ctx, t) {
    const h = hero(t);
    const j = B.joints(h.x, h.y, S, h.pose);
    // camera: slow push-in while he wakes, then ease back + tilt as he stands
    const cx = V.kf(t, [[3.0, 862], [5.4, 936], [6.25, 940], [7.7, 1004]]);
    const cy = V.kf(t, [[3.0, 592], [5.4, 574], [6.25, 572], [7.7, 588]]);
    const cz = V.kf(t, [[3.0, 1.33], [5.4, 1.46], [6.25, 1.46], [7.7, 1.27]]);
    // blanket: covers to the chest, slides to the hips as he sits up, thrown back at 6.5
    const edgeLie = j.shoulder[0] + 12;
    let edge = V.lerp(LIE.x - 136, SIT.x - 8, V.clamp(h.up));
    if (h.up <= 0) edge = edgeLie;
    const throwK = V.ep(t, 6.48, 6.76, 'out');
    edge = V.lerp(edge, 1196, throwK);
    const breathe = t < 3.62 ? 3 * Math.sin(t * 3) : 0;
    let lumps = V.env.bedroomLumps(j, breathe);
    if (throwK > 0) lumps = lumps.map(([lx, lh]) => [lx, lh * (1 - throwK)]);
    const sky = (c, r) => {
      // two birds crossing the window
      for (let i = 0; i < 2; i++) {
        const k = V.seg(t, 3.15 + i * 0.25, 5.6 + i * 0.25);
        if (k <= 0 || k >= 1) continue;
        const bx = r.x - 30 + k * (r.w + 60), by = r.y + 70 + i * 30 - Math.sin(k * Math.PI) * 30;
        const fl = Math.sin(t * 16 + i) * 7;
        c.beginPath();
        c.moveTo(bx - 12, by - fl);
        c.quadraticCurveTo(bx - 5, by - 4, bx, by);
        c.quadraticCurveTo(bx + 5, by - 4, bx + 12, by - fl);
        c.strokeStyle = '#2a2f45';
        c.lineWidth = 3;
        c.stroke();
      }
    };
    V.env.bedroomScene(
      ctx,
      {
        cam: { x: cx, y: cy, zoom: cz },
        hour: 7.5, light: 1, t, clockTime: '07:30', sky,
        blanket: { edge, lumps, heap: throwK },
        pillowDent: 10 + 6 * (1 - V.clamp(h.up)),
      },
      // in bed he is under the blanket; once his legs are over the edge he is in front of it
      t < 7.0 ? (c) => B.draw(c, h.x, h.y, S, h.pose) : null,
      t >= 7.0 ? (c) => B.draw(c, h.x, h.y, S, h.pose) : null,
    );
    // little grumble scribble while he groans
    const gk = V.seg(t, 3.1, 3.62);
    if (gk > 0 && gk < 1) {
      ctx.save();
      V.env.bedroomCam(ctx, { x: cx, y: cy, zoom: cz });
      ctx.globalAlpha = Math.sin(gk * Math.PI);
      const hx = j.head[0] + 10, hy = j.head[1] - 96;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = i * 0.9 + t * 9;
        const px = hx + i * 2.2 - 26 + Math.cos(a) * 10;
        const py = hy + Math.sin(a) * 9;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  V.registerScene('01-wake', {
    sfx: [
      { t: 1.1, type: 'alarm', dur: 1.25 },
      { t: SLAM, type: 'slap' },
      { t: 3.0, type: 'birds', dur: 5.4, vol: 0.6 },
    ],
    stampTime: (t) => (t < 1.0 ? '07:29' : '07:30'),
    draw(ctx, t) {
      if (t < CUT) shot1(ctx, t);
      else shot2(ctx, Math.min(t, 8.6));
    },
  });
})();
