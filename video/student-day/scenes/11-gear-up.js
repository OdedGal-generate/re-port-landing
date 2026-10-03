// Scene 11-gear-up (5 s, 16:40) — getting ready for 17:00 football practice, in the hallway.
// An energetic prep montage in four shots:
//  SHOT 1 0.00-1.20  medium-wide hallway. The hero (school tee + jeans) reads the sticky note on the
//                    mirror "אימון 17:00" -> "!" (0.15) -> anticipation crouch -> 0.42 cartoon QUICK-CHANGE:
//                    a spinning dust cloud (whoosh 0.4), the school tee / jeans / sneakers fly out onto the
//                    bench -> 0.95 the cloud bursts: red #10 sport kit, "ta-da" fist pump
//  SHOT 2 1.20-2.20  close-up: sitting on the bench, boot propped on it, tongue out, he laces the cleat;
//                    1.82 bow appears, 1.88 pulled tight, 2.0 pats the boot
//  SHOT 3 2.20-2.95  close-up on the black/red sports bag: water bottle in (2.3), towel in (2.5),
//                    zips it shut 2.58-2.84 (zipper 2.6), pat
//  SHOT 4 2.95-5.45  wide: swings the bag onto his shoulder, grabs the football from the cabinet,
//                    bounces it once (floor 3.40, kick sfx), tucks it under his arm, strides to the front
//                    door, pulls it open (door_open 4.4) — sunlight floods in — and heads out (4.55+)
(function () {
  const B = V.boy, P = B.pose, E = V.env, H = E.HALLWAY;
  const INK = V.pal.ink;
  const SOCKS = Object.assign({}, B.OUTFITS.sport, { shoes: 'socks', shoeColor: '#e2463c' });
  const T2 = 1.2, T3 = 2.2, T4 = 2.95;
  const FEET = H.FEET;
  const S0 = E.hallwayScale(FEET);
  const SEAT = 738;
  const BAG = { x: 965, y: 696, s: 1.15 };
  const BOTTLE = { x: 805, y: 700 };
  const TOWEL = { x: 862, y: 718, s: 1.05 };
  const BALL = { x: 1112, y: 696, r: 34 };
  const dirA = (a) => [Math.cos(a), Math.sin(a)];

  // ------------------------------------------------------------------ small props
  function cleat(c, x, y, s, flip) {
    c.save();
    c.translate(x, y);
    c.scale(s * (flip ? -1 : 1), s);
    V.fillRound(c, -22, -26, 58, 26, 11, '#1f1f27', INK, 3.5);
    V.fillRound(c, -22, -7, 58, 7, 3, '#111');
    V.line(c, -4, -16, 18, -18, '#f6c945', 5);
    for (let i = 0; i < 4; i++) V.fillRound(c, -18 + i * 14, -1, 6, 6, 2, '#777');
    V.line(c, -14, -24, -8, -34, '#f4f4f0', 3);
    V.line(c, -8, -24, -14, -34, '#f4f4f0', 3);
    c.restore();
  }
  function sneaker(c, x, y, s, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    c.scale(s, s);
    V.fillRound(c, -26, -14, 56, 26, 11, '#f4f4f4', INK, 3.5);
    V.fillRound(c, -26, 5, 56, 7, 3, '#cfcfcf');
    V.line(c, -6, -2, 14, -4, '#e2463c', 5);
    c.restore();
  }
  function flyingTee(c, x, y, s, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    E.kfPoly(c, [[-26, -40], [-8, -46], [8, -46], [26, -40], [50, -22], [38, -6], [26, -16], [26, 40], [-26, 40], [-26, -16], [-38, -6], [-50, -22]], '#fbfbf7', INK, 3.5);
    V.circle(c, 8, -16, 8, V.pal.navy);
    V.circle(c, 8, -16, 3.5, V.pal.yellow);
    c.restore();
  }
  function flyingJeans(c, x, y, s, rot) {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(s, s);
    E.kfPoly(c, [[-26, -44], [26, -44], [30, 50], [8, 50], [0, -6], [-8, 50], [-30, 50]], '#2f4f86', INK, 3.5);
    V.line(c, -24, -36, 24, -36, '#24406e', 4);
    c.restore();
  }
  // union of capsules along polylines (positive winding so 'nonzero' clip unions them)
  function capsulePath(c, chains, w) {
    c.beginPath();
    chains.forEach((pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
        const L = Math.hypot(bx - ax, by - ay) || 1;
        const nx = (-(by - ay) / L) * w, ny = ((bx - ax) / L) * w;
        let q = [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]];
        let area = 0;
        for (let k = 0; k < 4; k++) area += q[k][0] * q[(k + 1) % 4][1] - q[(k + 1) % 4][0] * q[k][1];
        if (area < 0) q = q.reverse();
        q.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
      }
      pts.forEach(([x, y]) => {
        c.moveTo(x + w, y);
        c.arc(x, y, w, 0, Math.PI * 2, false);
        c.closePath();
      });
    });
  }
  const arc = (k, p0, p1, h) => [V.lerp(p0[0], p1[0], k), V.lerp(p0[1], p1[1], k) - h * 4 * k * (1 - k)];

  // body-frame ball under the near arm
  function ballUnderArm(pose, r, spin) {
    return E.kfBodyProp(pose, (c, j) => {
      const e = j.armNear.e, h = j.armNear.h;
      E.football(c, V.lerp(e[0], h[0], 0.5) - 4, V.lerp(e[1], h[1], 0.5) - r * 0.95, r, spin || 0);
    }, pose.headProp);
  }

  // duffel carried behind the back from the far shoulder (cf. 13-back-home)
  function carriedBag(c, x, y, s, pose, swing) {
    const j = B.joints(x, y, s, pose);
    const f = pose.facing || 1;
    const bx = j.hip[0] - f * 58 * s, by = j.hip[1] - 2 * s;
    const shx = j.shoulder[0] - f * 10 * s, shy = j.shoulder[1] - 6 * s;
    const a = V.deg(swing || 0);
    c.save();
    c.lineCap = 'round';
    [[-40, -18], [44, -18]].forEach(([ex, ey]) => {
      const rx = bx + (ex * Math.cos(a) - ey * Math.sin(a)) * s * -f;
      const ry = by + (ex * Math.sin(a) + ey * Math.cos(a)) * s;
      V.line(c, shx, shy, rx, ry, INK, 10 * s);
      V.line(c, shx, shy, rx, ry, '#2b2b33', 5 * s);
    });
    c.restore();
    E.sportsBag(c, bx, by, s, { handles: false, rot: a * -f, flip: f > 0 });
  }

  // ------------------------------------------------------------------ SHOT 1: the quick change
  function shot1(ctx, t) {
    const k = V.ep(t, 0, T2, 'inOut');
    const shake = V.seg(t, 0.42, 0.5) * (1 - V.seg(t, 0.88, 0.98));
    const cam = {
      x: V.lerp(700, 640, k) + Math.sin(t * 71) * 5 * shake,
      y: V.lerp(565, 590, k) + Math.cos(t * 63) * 4 * shake,
      zoom: V.lerp(1.14, 1.42, k),
    };
    const X = 610;
    const standP = P.stand({ outfit: 'school' });
    const hip0 = B.standY(FEET, S0, standP);
    const cx = X, cy = hip0 - 70 * S0;
    let pose = null, hipY = hip0, show = true;
    if (t < 0.32) {
      const sur = t > 0.15;
      pose = P.stand({
        outfit: 'school', facing: -1, torso: 4, head: sur ? -10 : -6,
        eyes: sur ? 'wide' : B.blink(t, 'open', 1), mouth: sur ? 'o' : 'neutral', brows: sur ? 1 : 0.1,
        armNear: { sh: sur ? 30 : 8, el: sur ? 40 : 14 }, armFar: { sh: -8, el: 14 },
      });
    } else if (t < 0.42) {
      const c = V.ep(t, 0.32, 0.4, 'out');
      pose = P.stand({
        outfit: 'school', facing: 1, torso: 10 * c, head: 4,
        legNear: { hip: 22 * c, knee: -46 * c, foot: 24 * c }, legFar: { hip: 16 * c, knee: -40 * c, foot: 24 * c },
        armNear: { sh: -30 * c, el: 120 * c }, armFar: { sh: -40 * c, el: 120 * c },
        eyes: 'open', mouth: 'grin', brows: -0.6,
      });
      hipY = B.standY(FEET, S0, pose);
    } else if (t < 0.95) {
      show = false;
    } else {
      const r = V.ep(t, 0.95, 1.15, 'outBack');
      pose = P.stand({
        outfit: SOCKS, facing: 1, torso: -4, head: -6,
        armFar: { sh: V.lerp(60, 172, r), el: V.lerp(60, 18, r) }, armNear: { sh: -32, el: 72 },
        legNear: { hip: 8, knee: -2, foot: 0 }, legFar: { hip: -6, knee: -2, foot: 0 },
        eyes: 'happy', mouth: 'grin', brows: 0.6, blush: 0.3,
      });
      hipY = B.standY(FEET, S0, pose) - 26 * Math.sin(Math.PI * V.seg(t, 0.95, 1.18));
    }
    const sneakersDown = t > 0.92;
    E.hallway(ctx, {
      t, cam, clothes: V.seg(t, 0.85, 0.95),
      back(c) {
        backProps(c, t, { bagOpen: 1, bottle: true, towel: true, ball: true, cleatsFloor: true });
        if (sneakersDown) {
          sneaker(c, 470, 902, 1.1, 0.1);
          sneaker(c, 520, 908, 1.1, -0.05);
        }
      },
      actors(c) {
        if (show) {
          V.groundShadow(c, X, FEET, 62 * S0);
          B.draw(c, X, hipY, S0, pose);
        }
        // the "!" of realisation
        if (t > 0.15 && t < 0.42) {
          const p = V.ep(t, 0.15, 0.24, 'outBack') * (1 - V.ep(t, 0.36, 0.42));
          c.save();
          c.translate(X - 20, hip0 - 330 * S0);
          c.scale(p, p);
          V.text(c, '!', 0, 0, { size: 96, weight: 900, color: '#e2463c', stroke: INK, strokeWidth: 8, rtl: false });
          c.restore();
        }
        if (t > 0.29 && t < 0.41) whipLines(c, t, X, hip0);
        if (t >= 0.4 && t < 1.2) dustCloud(c, t, cx, cy);
        // flying clothes
        if (t > 0.5 && t < 0.88) {
          const q = V.seg(t, 0.5, 0.88);
          const [fx, fy] = arc(q, [cx + 30, cy - 40], [H.bench.x0 + 52, H.bench.top - 24], 260);
          flyingTee(c, fx, fy, V.lerp(1.3, 0.9, q), q * 9);
        }
        if (t > 0.56 && t < 0.9) {
          const q = V.seg(t, 0.56, 0.9);
          const [fx, fy] = arc(q, [cx + 10, cy + 20], [H.bench.x0 + 40, H.bench.top - 10], 200);
          flyingJeans(c, fx, fy, V.lerp(1.3, 0.8, q), -q * 8);
        }
        if (t > 0.6 && t <= 0.92) {
          const q = V.seg(t, 0.6, 0.92);
          let [fx, fy] = arc(q, [cx - 20, cy + 60], [470, 902], 220);
          sneaker(c, fx, fy, 1.1, q * 10);
          [fx, fy] = arc(q, [cx + 20, cy + 40], [520, 908], 300);
          sneaker(c, fx, fy, 1.1, -q * 12);
        }
        if (t > 0.95 && t < 1.2) {
          // ta-da sparkles
          const j = B.joints(X, hipY, S0, pose);
          [[-90, -60, 0], [110, -120, 0.08], [60, 40, 0.15], [-120, 80, 0.05]].forEach(([dx, dy, d]) => {
            const g = Math.sin(Math.PI * V.seg(t, 0.97 + d, 1.2 + d));
            if (g <= 0) return;
            c.save();
            c.translate(j.head[0] + dx, j.head[1] + 60 + dy);
            c.rotate(t * 3);
            c.scale(g, g);
            V.text(c, '✦', 0, 0, { size: 46, color: '#f6c945', stroke: INK, strokeWidth: 4, rtl: false });
            c.restore();
          });
        }
      },
    });
  }

  // spin smears for the whip-turn from the mirror to the camera (sells the facing flip at 0.32)
  function whipLines(c, t, x, hipY) {
    const a = Math.sin(Math.PI * V.seg(t, 0.29, 0.41));
    if (a <= 0) return;
    c.save();
    c.lineCap = 'round';
    c.globalAlpha = a;
    [[-250, 105, 0.0], [-150, 125, 0.6], [-40, 105, 1.2]].forEach(([dy, rx, ph]) => {
      const y = hipY + dy * S0;
      const sweep = 0.4 + 0.5 * V.seg(t, 0.29, 0.38);
      c.beginPath();
      c.ellipse(x, y, rx, rx * 0.22, 0, Math.PI * (0.1 + ph * 0.1), Math.PI * (0.1 + ph * 0.1 + sweep));
      c.strokeStyle = 'rgba(31,26,36,0.7)';
      c.lineWidth = 6;
      c.stroke();
    });
    c.restore();
  }

  function dustCloud(c, t, cx, cy) {
    const grow = V.ep(t, 0.4, 0.5, 'outBack');
    const burst = V.ep(t, 0.92, 1.18, 'out');
    if (grow <= 0) return;
    const rot = t * 16;
    const R = 120 * grow;
    c.save();
    c.lineJoin = 'round';
    // swirl speed lines behind
    if (burst < 0.6) {
      c.save();
      c.globalAlpha = 1 - burst / 0.6;
      c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a0 = rot * 1.3 + (i * Math.PI) / 3;
        c.beginPath();
        c.arc(cx, cy, R * 1.55, a0, a0 + 0.8);
        c.strokeStyle = 'rgba(31,26,36,0.55)';
        c.lineWidth = 5;
        c.stroke();
      }
      c.restore();
    }
    // limbs flashing out of the cloud while spinning
    if (t > 0.5 && t < 0.9) {
      const limbs = [['#e9b48f', '#e2463c', 0], ['#e9b48f', '#e2463c', 2.1], ['#e2463c', '#1f1f27', 4.2]];
      limbs.forEach(([a, b, ph], i) => {
        const ang = rot * 1.1 + ph;
        const L0 = R * 0.6, L1 = R * 1.25 + 20 * Math.sin(t * 30 + i);
        const p0 = [cx + Math.cos(ang) * L0, cy + Math.sin(ang) * L0];
        const p1 = [cx + Math.cos(ang) * L1, cy + Math.sin(ang) * L1];
        V.line(c, p0[0], p0[1], p1[0], p1[1], INK, 34);
        V.line(c, p0[0], p0[1], p1[0], p1[1], a, 27);
        V.circle(c, p1[0], p1[1], 15, b, INK, 3.5);
      });
    }
    // puffs
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = rot + (i / N) * Math.PI * 2;
      const rr = R * (0.72 + 0.18 * Math.sin(i * 2.3 + t * 9)) * (1 + burst * 1.4);
      const pr = (52 + 18 * V.rand(i * 3.1)) * grow * (1 - burst * 0.7);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 1.25;
      c.globalAlpha = 1 - burst;
      V.circle(c, px, py, pr, i % 3 ? '#efe7da' : '#e2d7c6', INK, 4);
    }
    if (burst < 0.5) {
      c.globalAlpha = 1 - burst * 2;
      V.circle(c, cx, cy, R * 0.95, '#f4eee4');
      // inner swirl marks
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a0 = -rot * 1.6 + i * 2.1;
        c.beginPath();
        c.arc(cx, cy, R * (0.35 + i * 0.18), a0, a0 + 1.6);
        c.strokeStyle = 'rgba(160,140,115,0.8)';
        c.lineWidth = 5;
        c.stroke();
      }
    }
    // stars popping
    for (let i = 0; i < 4; i++) {
      const ph = (t * 3 + i / 4) % 1;
      const a = i * 1.7 + 0.5;
      c.globalAlpha = Math.sin(Math.PI * ph) * (1 - burst);
      V.text(c, '✦', cx + Math.cos(a) * (R + 40 + ph * 50), cy + Math.sin(a) * (R + 30 + ph * 40), { size: 30, color: '#f6c945', stroke: INK, strokeWidth: 3, rtl: false });
    }
    c.restore();
  }

  // props that live on the bench / cabinet (state depends on the time)
  function backProps(c, t, o) {
    if (o.cleatsFloor) {
      cleat(c, 760, 906, 1.15, false);
      cleat(c, 828, 910, 1.15, false);
    }
    if (o.bottle) E.waterBottle(c, BOTTLE.x, BOTTLE.y, 1.0, 0);
    if (o.towel) E.towelRoll(c, TOWEL.x, TOWEL.y, TOWEL.s, 0);
    if (o.bag !== false) E.sportsBag(c, BAG.x, BAG.y, BAG.s, { open: o.bagOpen, contents: o.contents });
    if (o.ball) E.football(c, BALL.x, BALL.y, BALL.r, 0.3);
  }

  // ------------------------------------------------------------------ SHOT 2: lacing the cleats
  function shot2(ctx, t) {
    const u = t - T2;
    const s = S0;
    const X = 596;
    // standing on the far leg, the near boot propped on the bench, bent over the laces
    let pose = P.stand({ outfit: 'sport', torso: 30 + 2 * Math.sin(u * 7), head: 22, legFar: { hip: -6, knee: -4, foot: 0 } });
    const ankleN = [X + 122, H.bench.front - 11 * s - 2];
    pose = E.kfLegIK(pose, X, 0, s, 'near', [ankleN[0], ankleN[1] - 1000]);
    const hipY = B.standY(FEET, s, Object.assign({}, pose, { legNear: { hip: 0, knee: 0, foot: 0 } }));
    pose = E.kfLegIK(pose, X, hipY, s, 'near', ankleN);
    const knot = [ankleN[0] + 14 * s, ankleN[1] - 13 * s];
    const tying = u < 0.62;
    const pull = V.ep(t, T2 + 0.64, T2 + 0.76, 'out');
    let nh, fh;
    if (tying) {
      const w = V.ep(t, T2, T2 + 0.12);
      nh = [knot[0] + 16 + 8 * Math.sin(u * 40) * w, knot[1] - 12 + 6 * Math.cos(u * 43) * w];
      fh = [knot[0] - 12 + 7 * Math.sin(u * 37 + 2) * w, knot[1] - 14 + 5 * Math.cos(u * 35) * w];
    } else if (u < 0.8) {
      nh = [knot[0] + V.lerp(16, 24, pull), knot[1] + V.lerp(-12, -66, pull)];
      fh = [knot[0] + V.lerp(-12, -30, pull), knot[1] + V.lerp(-14, -58, pull)];
    } else {
      const k = V.ep(t, T2 + 0.8, T2 + 0.9);
      const pat = Math.abs(Math.sin((u - 0.8) * Math.PI * 9)) * 16 * (u < 1.0 ? 1 : 0);
      nh = [knot[0] + V.lerp(24, 18, k), knot[1] + V.lerp(-66, -8, k) - pat];
      fh = [knot[0] + V.lerp(-30, -46, k), knot[1] + V.lerp(-58, -64, k)];
    }
    pose = E.kfArmIK(pose, X, hipY, s, 'near', nh);
    pose = E.kfArmIK(pose, X, hipY, s, 'far', fh);
    const done = u > 0.78;
    Object.assign(pose, {
      eyes: done ? 'happy' : 'open', mouth: done ? 'grin' : 'neutral', brows: done ? 0.5 : -0.5,
      headProp: done ? null : (c) => {
        // tongue poking out in concentration
        c.save();
        c.translate(33, 29);
        c.rotate(0.5);
        V.fillRound(c, -4, -3, 12, 9, 4.5, '#e86a75', INK, 2.4);
        c.restore();
      },
    });
    const z = V.lerp(1.9, 2.05, V.ep(t, T2, T3, 'sine'));
    const cam = { x: knot[0] - 70, y: knot[1] - 120, zoom: z };
    E.hallway(ctx, {
      t, cam, clothes: 1,
      back(c) {
        backProps(c, t, { bagOpen: 1, bottle: true, towel: true, ball: true });
      },
      actors(c) {
        V.groundShadow(c, X, FEET, 62 * s);
        B.draw(c, X, hipY, s, pose);
        laces(c, knot, s, u, pull);
      },
    });
  }

  function laces(c, k, s, u, pull) {
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const white = '#f6f4ee';
    const strand = (pts, w) => {
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = INK;
      c.lineWidth = (w + 3) * s;
      c.stroke();
      c.strokeStyle = white;
      c.lineWidth = w * s;
      c.stroke();
    };
    if (u < 0.62) {
      // loose laces, wiggling while the fingers work
      const wig = Math.sin(u * 30);
      strand([k, [k[0] + 14 * s, k[1] + 10 * s], [k[0] + 8 * s + wig * 4, k[1] + 26 * s], [k[0] + 16 * s, k[1] + 38 * s]], 3.5);
      strand([k, [k[0] - 10 * s, k[1] + 8 * s], [k[0] - 18 * s - wig * 4, k[1] + 24 * s], [k[0] - 12 * s, k[1] + 34 * s]], 3.5);
      if (u > 0.3) {
        // first loop forming
        const g = V.seg(u, 0.3, 0.6);
        c.beginPath();
        c.ellipse(k[0] + 8 * s, k[1] - 6 * s, 9 * s * g, 6 * s * g, -0.5, 0, Math.PI * 2);
        c.strokeStyle = INK;
        c.lineWidth = 6.5 * s;
        c.stroke();
        c.strokeStyle = white;
        c.lineWidth = 3.5 * s;
        c.stroke();
      }
    } else {
      // the bow: loops shrink as it is pulled tight
      const L = V.lerp(15, 10, pull);
      [[-1, -0.4], [1, 0.4]].forEach(([sd, a]) => {
        c.beginPath();
        c.ellipse(k[0] + sd * L * 0.8 * s, k[1] - 5 * s, L * s, L * 0.55 * s, a, 0, Math.PI * 2);
        c.strokeStyle = INK;
        c.lineWidth = 6.5 * s;
        c.stroke();
        c.strokeStyle = white;
        c.lineWidth = 3.5 * s;
        c.stroke();
      });
      strand([k, [k[0] + 6 * s, k[1] + 14 * s], [k[0] + 12 * s, k[1] + V.lerp(18, 24, pull) * s]], 3.5);
      strand([k, [k[0] - 6 * s, k[1] + 12 * s], [k[0] - 10 * s, k[1] + V.lerp(16, 22, pull) * s]], 3.5);
      V.circle(c, k[0], k[1] - 2 * s, 4 * s, white, INK, 2.5 * s);
      // "tink" star when it is tight
      const g = Math.sin(Math.PI * V.seg(u, 0.74, 0.98));
      if (g > 0) {
        c.translate(k[0] + 30 * s, k[1] - 40 * s);
        c.scale(g, g);
        V.text(c, '✦', 0, 0, { size: 40, color: '#f6c945', stroke: INK, strokeWidth: 4, rtl: false });
      }
    }
    c.restore();
  }

  // ------------------------------------------------------------------ SHOT 3: packing the bag
  function shot3(ctx, t) {
    const X = 832;
    const s = S0;
    const bagMouthL = [BAG.x - 46 * BAG.s, BAG.y - 31 * BAG.s];
    const zipOpen = 1 - V.ep(t, 2.58, 2.84, 'inOut');
    const tab = [BAG.x + (-44 + 88 * zipOpen) * BAG.s, BAG.y - 30 * BAG.s];
    let pose = P.stand({ outfit: 'sport', torso: 24 + 2 * Math.sin(t * 6), head: 16, eyes: B.blink(t, 'open', 5), mouth: 'grin', brows: -0.25 });
    const hipY = B.standY(FEET, s, pose);
    // near hand keyframes
    const pts = {
      bottleHi: [BAG.x - 20, BAG.y - 130],
      bottleIn: [BAG.x - 14, BAG.y - 66],
      towel: [TOWEL.x + 4, TOWEL.y - 6],
      towelIn: [BAG.x + 14, BAG.y - 62],
      tabR: [tab[0] + 2, tab[1] - 6],
    };
    const lerp2 = (a, b, k) => [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)];
    let nh, holding = null;
    if (t < 2.34) {
      nh = lerp2(pts.bottleHi, pts.bottleIn, V.ep(t, 2.2, 2.32, 'in'));
      holding = t < 2.31 ? 'bottle' : null;
    } else if (t < 2.42) nh = lerp2(pts.bottleIn, pts.towel, V.ep(t, 2.34, 2.42));
    else if (t < 2.54) {
      const k = V.ep(t, 2.42, 2.54);
      nh = arc(k, pts.towel, pts.towelIn, 40);
      holding = 'towel';
    } else if (t < 2.6) nh = lerp2(pts.towelIn, [BAG.x + 44 * BAG.s + 2, BAG.y - 36 * BAG.s], V.ep(t, 2.54, 2.6));
    else if (t < 2.85) nh = pts.tabR;
    else {
      const pat = Math.abs(Math.sin((t - 2.85) * Math.PI * 10)) * 14;
      nh = [BAG.x - 10, BAG.y - 46 * BAG.s - pat];
    }
    pose = E.kfArmIK(pose, X, hipY, s, 'near', nh);
    pose = E.kfArmIK(pose, X, hipY, s, 'far', [bagMouthL[0] + 4, bagMouthL[1] + 18]);
    if (holding === 'bottle') pose.propNear = (c) => {
      E.kfAim(c, V.deg(-80));
      c.rotate(Math.PI / 2);
      E.waterBottle(c, 0, 12, 1 / 1, 0);
      E.kfAim(c, 0);
      E.kfHand(c);
    };
    if (holding === 'towel') pose.propNear = (c) => {
      E.kfAim(c, 0.2);
      E.towelRoll(c, 6, 4, 1, 0);
      E.kfAim(c, 0);
      E.kfHand(c);
    };
    if (t > 2.84) Object.assign(pose, { eyes: 'happy', mouth: 'grin', brows: 0.4 });
    const bottleIn = t >= 2.31, towelIn = t >= 2.54;
    const contents = (c, zx) => {
      const sink = (1 - zipOpen) * 26;
      if (bottleIn) {
        const d = V.ep(t, 2.31, 2.42, 'out') * 14;
        c.save();
        c.translate(-22, -40 + d + sink);
        c.rotate(-0.25);
        E.waterBottle(c, 0, 0, 0.85, 0);
        c.restore();
      }
      if (towelIn) E.towelRoll(c, 14, -36 + V.ep(t, 2.54, 2.6) * 6 + sink, 0.9, -0.1);
    };
    const cam = { x: 905 + 10 * V.ep(t, T3, T4), y: 574, zoom: V.lerp(1.98, 2.1, V.ep(t, T3, T4, 'sine')) };
    E.hallway(ctx, {
      t, cam, clothes: 1,
      back(c) {
        backProps(c, t, { bagOpen: zipOpen, contents, bottle: false, towel: t < 2.42, ball: true });
      },
      actors(c) {
        V.groundShadow(c, X, FEET, 62 * s);
        B.draw(c, X, hipY, s, pose);
        // zip motion lines
        if (t > 2.6 && t < 2.86) {
          c.save();
          c.globalAlpha = Math.sin(Math.PI * V.seg(t, 2.6, 2.86));
          for (let i = 0; i < 3; i++) V.line(c, tab[0] + 18 + i * 14, tab[1] - 14 + i * 9, tab[0] + 40 + i * 18, tab[1] - 14 + i * 9, INK, 3);
          c.restore();
        }
      },
    });
  }

  // ------------------------------------------------------------------ SHOT 4: ball, door, out
  // walk distance travelled (for foot-locked walk cycles)
  function heroX(t) {
    if (t < 3.0) return 900;
    if (t < 3.22) return V.lerp(900, 1040, V.ep(t, 3.0, 3.22, 'inOut'));
    if (t < 3.62) return 1040;
    if (t < 4.06) return V.lerp(1040, 1215, V.ep(t, 3.62, 4.06, 'inOut'));
    return 1215;
  }
  // exit path through the doorway: [x, feetY]. Accelerates from rest (0.2 s) to a steady 600 px/s
  // walk, crosses the threshold at the middle of the opening (feet 863 at x 1432, ~4.96) and keeps
  // walking right and slightly away until the right jamb hides him (~5.3, during the cross-fade).
  const EXIT_V = 600;
  function exitPath(t) {
    const u = Math.max(0, t - 4.5);
    const x = 1215 + EXIT_V * (u < 0.2 ? (u * u) / 0.4 : u - 0.1);
    const f = x <= 1432 ? V.lerp(FEET, 863, (x - 1215) / 217) : 863 - 22 * V.clamp((x - 1432) / 260);
    return [x, f];
  }
  function doorOpenAt(t) {
    const a = V.ep(t, 4.3, 4.5, 'inOut') * 0.36;
    return a + V.ep(t, 4.5, 4.85, 'out') * (1 - 0.36);
  }
  function ballAt(t) {
    // returns {state, x, y, spin, squash}
    if (t < 3.2) return { state: 'cabinet' };
    if (t < 3.3) return { state: 'hand' };
    const g = 3000, v0 = 2640, x0 = 1122, y0 = 600, yF = FEET - 36;
    if (t < 3.4) {
      const u = t - 3.3;
      return { state: 'free', x: V.lerp(x0, 1136, u / 0.1), y: Math.min(yF, y0 + v0 * u + 0.5 * g * u * u), spin: u * 8 };
    }
    if (t < 3.56) {
      const u = t - 3.4;
      const v1 = -0.75 * (v0 + g * 0.1);
      return { state: 'free', x: V.lerp(1136, 1146, u / 0.16), y: yF + v1 * u + 0.5 * g * u * u, spin: 0.8 + u * 6, squash: u < 0.035 ? 1 - u / 0.035 : 0 };
    }
    return { state: 'arm' };
  }

  function shot4(ctx, t) {
    const hx = heroX(t);
    const walking1 = t > 3.0 && t < 3.22, walking2 = t > 3.62 && t < 4.06, exiting = t >= 4.5;
    let x = hx, feet = FEET;
    if (exiting) [x, feet] = exitPath(t);
    const s = E.hallwayScale(feet);
    const dist = (hx - 900) + (exiting ? (x - 1215) * (S0 / s) : 0);
    const ph = B.walkPhase(dist, S0);
    const ball = ballAt(t);
    const facing = 1;
    const isWalking = walking1 || walking2 || exiting;
    const r = (a, b) => V.ep(t, a, b, 'inOut');
    const wWalk = Math.max(r(3.0, 3.06) * (1 - r(3.13, 3.24)), r(3.62, 3.7) * (1 - r(3.94, 4.08)), r(4.5, 4.6));
    const face = { outfit: 'sport', facing, eyes: B.blink(t, 'open', 7), mouth: 'grin', brows: 0.3 };
    let pose = E.kfPoseMix(P.stand(Object.assign({}, face, { armFar: { sh: -10, el: 24 } })), P.walk(ph, face), wWalk);
    pose.facing = facing;
    // lean to grab the ball / brace while pulling the door
    pose.torso += V.kf(t, [[3.08, 0], [3.2, 34], [3.3, 6], [3.4, 14], [3.58, 4], [3.7, 3]]);
    if (t > 4.2 && t < 4.6) pose.torso -= 8 * Math.sin(Math.PI * V.seg(t, 4.3, 4.6));
    let hipY = B.standY(feet, s, pose);
    // bag: on the bench, swung onto the back 2.95-3.12, then carried
    const swingK = V.ep(t, 2.95, 3.12, 'inOut');
    // near arm choreography
    const lerp2 = (a, b, k) => [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k)];
    const j0 = B.joints(x, hipY, s, pose);
    let nh = null;
    const bagHandle = [BAG.x - 4, BAG.y - 54 * BAG.s];
    if (t < 3.1) nh = lerp2(bagHandle, [j0.shoulder[0] - 10, j0.shoulder[1] - 10], swingK);
    else if (t < 3.2) nh = lerp2([j0.shoulder[0] + 30, j0.shoulder[1] + 40], [BALL.x - 26, BALL.y - 6], V.ep(t, 3.1, 3.2));
    else if (t < 3.3) nh = lerp2([BALL.x - 26, BALL.y - 6], [1094, 612], V.ep(t, 3.2, 3.3, 'inOut'));
    else if (t < 3.56) {
      const bl = ballAt(t);
      const wait = [1124, 640];
      nh = lerp2([1094, 612], wait, V.ep(t, 3.3, 3.4));
      if (t > 3.48) nh = lerp2(wait, [bl.x - 30, bl.y + 4], V.ep(t, 3.48, 3.56));
    }
    if (nh) pose = E.kfArmIK(pose, x, hipY, s, 'near', nh);
    const tucked = t >= 3.56;
    const tuckK = V.ep(t, 3.56, 3.72, 'out');
    if (tucked) {
      const ua = { sh: -22 + (isWalking ? 3 * Math.sin(ph * Math.PI * 2) : 0), el: 116 };
      const from = E.kfArmIK(Object.assign({}, pose), x, hipY, s, 'near', [ballAt(3.559).x - 30, ballAt(3.559).y + 4]).armNear;
      pose.armNear = { sh: V.lerp(from.sh, ua.sh, tuckK), el: V.lerp(from.el, ua.el, tuckK) };
    }
    // far arm: door handle
    const open = doorOpenAt(t);
    if (t > 4.0 && t < 4.66) {
      const handle = E.hallwayDoorHandle(Math.min(open, 0.36));
      const reach = V.ep(t, 4.0, 4.24) * (1 - V.ep(t, 4.5, 4.66));
      const ik = E.kfArmIK(Object.assign({}, pose), x, hipY, s, 'far', handle).armFar;
      pose.armFar = { sh: V.lerp(pose.armFar.sh, ik.sh, reach), el: V.lerp(pose.armFar.el, ik.el, reach) };
    }
    if (t > 4.3 && t < 4.6) pose.mouth = 'open';
    // ball drawing modes
    if (ball.state === 'hand') {
      pose.propNear = (c) => {
        E.kfAim(c, 0);
        E.football(c, 22, -10, BALL.r / s, 0.3);
        E.kfHand(c);
      };
    }
    if (tucked) {
      const r = BALL.r / s;
      const ballP = (c) => {
        const jj = B.fk(Object.assign(P.stand(), pose));
        const e = jj.armNear.e, h = jj.armNear.h;
        const tx = V.lerp(e[0], h[0], 0.5) - 4, ty = V.lerp(e[1], h[1], 0.5) - r * 0.95;
        if (tuckK < 1) {
          // blend from the catch point (world) to the tuck point (body frame)
          const c0 = ballAt(3.559);
          const lx = (c0.x - x) / (s * pose.facing), ly = (c0.y - hipY) / s;
          E.football(c, V.lerp(lx, tx, tuckK), V.lerp(ly, ty, tuckK), r, 1.2 + tuckK);
        } else E.football(c, tx, ty, r, 2.2 + dist * 0.002);
      };
      pose.headProp = E.kfBodyProp(pose, ballP);
    }
    const inside = exiting && feet < 863;
    // camera
    const pan = V.ep(t, 3.55, 4.25, 'inOut');
    const push = V.ep(t, 4.3, 5.4, 'inOut');
    const cam = {
      x: V.lerp(V.lerp(1040, 1260, pan), 1340, push),
      y: V.lerp(V.lerp(600, 585, pan), 568, push),
      zoom: V.lerp(V.lerp(1.28, 1.26, pan), 1.36, push),
    };
    const drawHero = (c) => {
      if (swingK >= 1) carriedBag(c, x, hipY, s, pose, isWalking ? 6 * Math.sin(ph * Math.PI * 2 + 0.6) : 0);
      V.groundShadow(c, x, feet, 62 * s);
      B.draw(c, x, hipY, s, pose);
    };
    E.hallway(ctx, {
      t, cam, clothes: 1, doorOpen: open,
      back(c) {
        backProps(c, t, { bag: swingK <= 0, bagOpen: 0, ball: ball.state === 'cabinet' });
        sneaker(c, 470, 902, 1.1, 0.1);
        sneaker(c, 520, 908, 1.1, -0.05);
        if (swingK > 0 && swingK < 1) {
          // bag in flight from the bench onto the shoulder
          const jb = B.joints(x, hipY, s, pose);
          const dst = [jb.hip[0] - 58 * s, jb.hip[1] - 2 * s];
          const [bx, by] = arc(swingK, [BAG.x, BAG.y], dst, 150);
          E.sportsBag(c, bx, by, V.lerp(BAG.s, s, swingK), { handles: swingK < 0.5, rot: -swingK * 2.4 + Math.sin(Math.PI * swingK) * 0.6 });
        }
      },
      actors(c) {
        if (inside) {
          // past the threshold: clip him to the door opening (the jambs and the open leaf hide him),
          // but draw him here, after the sunlight flood, so he does not suddenly bleach out
          const d = H.door;
          c.save();
          c.beginPath();
          c.rect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top + 2);
          c.clip();
          drawHero(c);
          c.restore();
        } else drawHero(c);
        if (ball.state === 'free') {
          const sq = ball.squash || 0;
          // floor shadow grows as the ball falls
          const hgt = FEET - 36 - ball.y;
          V.ellipse(c, ball.x, FEET - 2, BALL.r * (1.1 - Math.min(0.5, hgt / 600)), BALL.r * 0.22, `rgba(60,30,10,${0.3 - Math.min(0.2, hgt / 1500)})`);
          c.save();
          c.translate(ball.x, ball.y + sq * 6);
          c.scale(1 + 0.18 * sq, 1 - 0.2 * sq);
          E.football(c, 0, 0, BALL.r, ball.spin);
          c.restore();
          if (t > 3.39 && t < 3.47) {
            // impact lines
            c.save();
            c.globalAlpha = 1 - V.seg(t, 3.39, 3.47);
            [[-1, -0.5], [-1, 0.2], [1, -0.5], [1, 0.2]].forEach(([sd, dy]) => V.line(c, ball.x + sd * 50, FEET - 20 + dy * 40, ball.x + sd * 74, FEET - 30 + dy * 56, INK, 4));
            c.restore();
          }
        }
      },
    });
  }

  V.registerScene('11-gear-up', {
    sfx: [
      { t: 0.15, type: 'pop', vol: 0.5 },
      { t: 0.4, type: 'whoosh' },
      { t: 0.95, type: 'sparkle', vol: 0.6 },
      { t: 1.88, type: 'ding', vol: 0.35 },
      { t: 2.6, type: 'zipper' },
      { t: 2.97, type: 'whoosh', vol: 0.3 },
      { t: 3.0, type: 'footsteps', dur: 0.24, rate: 5 },
      { t: 3.4, type: 'kick', vol: 0.4 },
      { t: 3.62, type: 'footsteps', dur: 0.44, rate: 4.5 },
      { t: 4.4, type: 'door_open' },
      { t: 4.5, type: 'footsteps', dur: 0.9, rate: 4 },
      { t: 4.6, type: 'birds', dur: 0.9, vol: 0.35 },
    ],
    draw(ctx, t) {
      if (t < T2) shot1(ctx, t);
      else if (t < T3) shot2(ctx, t);
      else if (t < T4) shot3(ctx, t);
      else shot4(ctx, t);
    },
  });
})();
