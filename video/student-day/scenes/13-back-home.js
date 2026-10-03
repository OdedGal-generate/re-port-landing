// Scene 13-back-home (4 s, 18:00, dusk) — back from football practice, exhausted.
//  0.0  wide dusk shot (whole house, roof in frame): orange-purple sky, the house windows glow
//       warm. The hero enters from frame-RIGHT walking LEFT, slumped: red #10 sport kit, muddy
//       knee, sweat drops, black/red sports bag over his shoulder, football tucked under his arm
//       against the hip, far arm hanging limp. The camera drifts toward him, then pushes in; his
//       walk line stays above the time-stamp corner while he is on the right of the frame.
//  0.45 the street lamp by the house flickers on (the far one at 0.9)
//  1.45 he trudges up the two steps, stops at the door (2.3), lets out a sigh
//  2.2  reaches for the lever (far hand), door_open 2.4: the door swings in, warm light spills out
//  2.6  he steps over the threshold (3.0) and trudges up the warm hallway (smaller, deeper)
//  3.28 the door swings shut (door_close 3.6). Camera eases back; a light goes on upstairs (3.7).
(function () {
  const B = V.boy, P = B.pose, ST = V.env.STREET;
  const S = ST.heroScale;
  const INK = V.pal.ink;
  const SPEED = 380; // tired: 2.4 steps/s
  const T_DEC = 1.9, T_STOP = 2.3, X_STOP = 172;
  const X_DEC = X_STOP + (SPEED * (T_STOP - T_DEC)) / 2;
  const X_START = X_DEC + SPEED * T_DEC;
  const IN0 = 2.6, IN1 = 3.5; // walking into the doorway
  const X_SWITCH = 14, X_IN = 8;

  function heroDist(t) {
    if (t < T_DEC) return SPEED * t;
    const u = Math.min(t, T_STOP) - T_DEC, D = T_STOP - T_DEC;
    return SPEED * T_DEC + SPEED * (u - (u * u) / (2 * D));
  }

  // Wide dusk shot (whole house, roof in frame) that pans toward him as it fades in, then pushes
  // in on the door. The walk line stays ABOVE the time-stamp corner (screen y < ~845) while he is
  // on the right of the frame: the push-in (zoom + tilt) only starts in earnest once he is clear.
  function camAt(t) {
    const p = Math.pow(V.ease.inOut(V.seg(t, 0, 2.6)), 1.8); // push-in: slow start, settles at 2.6
    const kx = V.seg(t, 0, 2.6);
    const px = 1 - Math.pow(1 - kx, 2.2); // pan: already drifting as the shot fades in, eases to rest
    const b = V.ep(t, 2.9, 3.8, 'inOut'); // ease back once he is inside
    return {
      x: V.lerp(V.lerp(-380, 120, px), 30, b),
      y: V.lerp(V.lerp(410, 560, p), 405, b),
      zoom: V.lerp(V.lerp(0.6, 1.14, p), 0.97, b),
    };
  }

  // street-lamp flicker: off, then a few stuttering blinks, then on (with a faint hum)
  function flick(t, t0, seed) {
    if (t < t0) return 0;
    const u = t - t0;
    if (u > 0.5) return 0.96 + 0.04 * Math.sin(t * 40 + seed);
    const f = Math.floor(t * 24);
    const on = V.rand(f * 1.37 + seed) < 0.25 + u * 1.4;
    return on ? 0.5 + u : 0.05;
  }

  function heroState(t) {
    const d = heroDist(t);
    let x = X_START - d;
    const pant = Math.floor(t * 3.2) % 2 === 0;
    const eyes = (t % 2.6) > 2.45 ? 'closed' : 'half';
    const walking = t < T_STOP;
    const ph = B.walkPhase(d, S);
    const walk = P.walk(ph, {
      outfit: 'sport', facing: -1, torso: 13, head: 9,
      eyes, mouth: pant ? 'open' : 'neutral', brows: -0.25,
    });
    // heavy, dragging steps: smaller arm swing, a little extra bob
    const stand = P.stand({ outfit: 'sport', facing: -1, torso: 10, head: 7, eyes, mouth: 'open', brows: -0.25 });
    let pose = V.env.poseMix(walk, stand, V.seg(t, T_STOP - 0.32, T_STOP));
    pose.facing = -1;
    // ball tucked in the crook of the NEAR arm (forearm under it, hand cupping the front);
    // the far arm just hangs and swings limply — he is spent
    const sw = Math.sin(ph * Math.PI * 2);
    pose.armNear = { sh: -10 + 2 * sw, el: 40 };
    pose.armFar = { sh: walking ? 4 + 9 * sw : 2, el: 14 + 4 * Math.max(0, sw) };
    let s = S, feet = null, inside = false, sighK = 0;
    // sigh at the door: shoulders drop, head down
    sighK = Math.sin(Math.PI * V.seg(t, 2.05, 2.55));
    pose.torso += 4 * sighK;
    pose.head += 6 * sighK;
    // reach for the lever with the far hand, push the door
    const doorOpen = V.ep(t, 2.45, 2.95, 'inOut') * (1 - V.ep(t, 3.28, 3.6, 'in'));
    const reach = V.ep(t, 2.15, 2.4, 'inOut') * (1 - V.ep(t, 2.66, 2.86, 'inOut'));
    // walking in (2.62 -> 3.4): depth move 822 -> 812 (threshold) -> 800, scale 1 -> 0.9
    const k = V.ep(t, IN0, IN1, 'inOut');
    if (k > 0) {
      // left to the threshold, then mostly INTO depth (up the hallway, getting smaller)
      const kx = V.ep(t, IN0, 3.02, 'inOut'), kd = V.ep(t, 2.94, 3.3, 'inOut'), kd2 = V.ep(t, 3.3, 3.7, 'out');
      x = V.lerp(V.lerp(X_STOP, X_SWITCH, kx), X_IN, kd) - 10 * kd2;
      const wk = P.walk(B.walkPhase((X_STOP - x) * 1.1 + 40 + kd * 120, S), { outfit: 'sport', facing: -1, torso: 11, head: 6, eyes: 'half', mouth: 'neutral', brows: -0.2 });
      wk.armNear = pose.armNear;
      wk.armFar = pose.armFar;
      pose = V.env.poseMix(pose, wk, V.seg(t, IN0, IN0 + 0.15));
      pose.facing = -1;
      feet = kd <= 0 ? V.lerp(822, 812, kx) : V.lerp(812, 786, kd) - 8 * kd2;
      s = S * (feet >= 812 ? 1 : V.lerp(0.83, 1, (feet - 786) / 26));
      // switch behind the door frame once he fits inside the opening (bag < right jamb, ball clear
      // of the open leaf) — exactly when the door starts to swing shut over him
      inside = t >= 3.29;
    }
    let y = feet === null ? V.env.streetHipY(x, s, pose) : B.standY(feet, s, pose);
    if (reach > 0) {
      const ik = V.env.streetIK.arm(Object.assign({}, pose), x, y, s, 'far', V.env.streetDoorHandle(doorOpen));
      pose.armFar = { sh: V.lerp(pose.armFar.sh, ik.armFar.sh, reach), el: V.lerp(pose.armFar.el, ik.armFar.el, reach) };
    }
    // heavy steps: hip dips a little more at each footfall
    if (walking) y += 5 * Math.abs(Math.sin(ph * Math.PI * 2));
    return { x, y, s, pose, inside, doorOpen, squeeze: V.ep(t, 2.75, 3.2, 'inOut'), ground: feet === null ? V.env.streetGroundY(x) : feet, walking, ph };
  }

  // ---- props ----------------------------------------------------------------
  function football(c, r) {
    V.circle(c, 0, 0, r, '#fbfbf7', INK, 3);
    c.save();
    c.beginPath();
    c.arc(0, 0, r - 1.5, 0, Math.PI * 2);
    c.clip();
    const pent = (px, py, pr, rot) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i * Math.PI * 2) / 5;
        c.lineTo(px + Math.cos(a) * pr, py + Math.sin(a) * pr);
      }
      c.closePath();
      c.fillStyle = '#1f1f27';
      c.fill();
    };
    pent(2, -2, r * 0.32, -0.3);
    [[-r * 0.9, -r * 0.5], [r * 0.85, -r * 0.6], [-r * 0.75, r * 0.75], [r * 0.7, r * 0.8], [0, -r * 1.1]].forEach(([px, py], i) => pent(px, py, r * 0.3, i));
    V.ellipse(c, -r * 0.35, -r * 0.4, r * 0.25, r * 0.15, 'rgba(255,255,255,0.6)', -0.6);
    // mud smear on the ball
    V.ellipse(c, r * 0.3, r * 0.55, r * 0.35, r * 0.18, 'rgba(110,75,40,0.55)', 0.3);
    c.restore();
  }

  // body-local position of the ball (facing +x, unscaled): pinned against his hip under the near
  // arm — the forearm wraps over its outer side, ball visible above and below it
  function ballLocal(pose) {
    const j = B.fk(pose);
    const e = j.armNear.e, h = j.armNear.h;
    const dx = h[0] - e[0], dy = h[1] - e[1], L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L; // normal pointing back / in toward the hip
    return [e[0] + dx * 0.5 + nx * 12, e[1] + dy * 0.5 + ny * 12];
  }

  function sportsBag(c, h) {
    // duffel bag hanging behind his back from the far shoulder, swinging with the steps
    const j = B.joints(h.x, h.y, h.s, h.pose);
    const f = h.pose.facing;
    const s = h.s;
    const sw = h.walking ? Math.sin(h.ph * Math.PI * 2 + 0.6) * 4 : 0;
    const bx = j.hip[0] - f * (58 - 12 * (h.squeeze || 0)) * s, by = j.hip[1] - 4 * s;
    // strap from the shoulder to both bag ends
    const shx = j.shoulder[0] - f * 10 * s, shy = j.shoulder[1] - 6 * s;
    c.save();
    c.lineCap = 'round';
    [[-40, -18], [44, -18]].forEach(([ex, ey]) => {
      const rx = bx + (ex * Math.cos(V.deg(sw)) - ey * Math.sin(V.deg(sw))) * s * -f;
      const ry = by + (ex * Math.sin(V.deg(sw)) + ey * Math.cos(V.deg(sw))) * s;
      V.line(c, shx, shy, rx, ry, INK, 10 * s);
      V.line(c, shx, shy, rx, ry, '#2b2b33', 5 * s);
    });
    c.translate(bx, by);
    c.rotate(V.deg(sw) * -f);
    c.scale(s * -f, s);
    V.fillRound(c, -66, -34, 132, 70, 30, '#22222a', INK, 3.5);
    V.fillRound(c, -66, -6, 132, 14, 4, '#e2463c');
    V.fillRound(c, -66, -34, 132, 70, 30, null, INK, 3.5);
    V.ellipse(c, -58, 1, 9, 30, '#34343e');
    V.ellipse(c, 58, 1, 9, 30, '#34343e');
    V.line(c, -40, -30, 40, -30, '#8a8a96', 3);
    // little white swoosh
    c.beginPath();
    c.moveTo(-20, 22);
    c.quadraticCurveTo(0, 30, 26, 14);
    c.lineWidth = 4;
    c.strokeStyle = '#f4f4f0';
    c.stroke();
    c.restore();
  }

  function mud(c, h) {
    const j = B.joints(h.x, h.y, h.s, h.pose);
    const s = h.s;
    const col = 'rgba(112,76,42,0.9)';
    const k = j.nearKnee;
    c.save();
    c.translate(k[0], k[1]);
    c.scale(s, s);
    [[0, 0, 13], [-6, 9, 9], [7, 12, 7], [3, -9, 6], [-9, -4, 5]].forEach(([x, y, r]) => V.circle(c, x, y, r, col));
    V.circle(c, 4, 24, 4, col);
    V.circle(c, -3, 34, 3, col);
    c.restore();
    // splashes on the near sock
    const a = j.nearAnkle;
    V.circle(c, a[0] + 4 * s, a[1] - 18 * s, 5 * s, 'rgba(112,76,42,0.75)');
    V.circle(c, a[0] - 6 * s, a[1] - 8 * s, 3.5 * s, 'rgba(112,76,42,0.75)');
  }

  function sweat(c, h, t) {
    const j = B.joints(h.x, h.y, h.s, h.pose);
    const f = h.pose.facing, s = h.s;
    const drop = (x, y, r, a) => {
      c.save();
      c.globalAlpha = a;
      c.translate(x, y);
      c.scale(s, s);
      c.beginPath();
      c.moveTo(0, -r * 1.8);
      c.quadraticCurveTo(r * 1.1, 0, 0, r);
      c.quadraticCurveTo(-r * 1.1, 0, 0, -r * 1.8);
      c.fillStyle = '#bfe6ff';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = '#2d6fa8';
      c.stroke();
      V.circle(c, -r * 0.25, -r * 0.2, r * 0.25, '#ffffff');
      c.restore();
    };
    // static drops on the temple / back of the head
    drop(j.head[0] - f * 26 * s, j.head[1] - 6 * s, 6, 1);
    drop(j.head[0] + f * 30 * s, j.head[1] - 34 * s, 5, 0.95);
    // drops flicking off the head as he trudges
    for (let i = 0; i < 3; i++) {
      const p = ((t * 1.25 + i / 3) % 1);
      const x = j.head[0] - f * (40 + p * 50) * s + (i - 1) * 6;
      const y = j.head[1] - (20 - p * 70 + p * p * 120) * s;
      drop(x, y, 4.5, Math.sin(Math.PI * p));
    }
  }

  function drawHero(c, h, t, full = true) {
    sportsBag(c, h);
    const pose = Object.assign({}, h.pose);
    const bl = ballLocal(pose);
    pose.headProp = (cc) => {
      const j = B.fk(pose);
      cc.rotate(-V.deg((pose.torso || 0) + (pose.head || 0)));
      cc.translate(bl[0] - j.head[0], bl[1] - j.head[1]);
      football(cc, 31);
    };
    B.draw(c, h.x, h.y, h.s, pose);
    if (full) {
      mud(c, h);
      sweat(c, h, t);
    }
  }

  V.registerScene('13-back-home', {
    sfx: [
      { t: 0, type: 'crickets', dur: 4.4, vol: 0.4 },
      { t: 0, type: 'footsteps', dur: 2.2, rate: 2.4 },
      { t: 2.4, type: 'door_open' },
      { t: 2.68, type: 'footsteps', dur: 0.75, rate: 2.4, vol: 0.55 }, // over the threshold, up the hall
      { t: 3.6, type: 'door_close' },
    ],
    draw(ctx, t) {
      const hour = 18.0;
      const cam = camAt(t);
      const h = heroState(t);
      const upstairs = V.ep(t, 3.7, 3.76, 'out');
      const o = {
        cam, hour, t, windowsLit: 1, interiorLit: 1, doorOpen: h.doorOpen,
        windows: { ul: upstairs },
        lamps: (i, x) => (i === -1 ? 1 : x === 780 ? flick(t, 0.45, 3) : x === -560 ? flick(t, 0.9, 7) : flick(t, 0.2 + V.rand(i) * 0.8, i)),
        inside(c) {
          if (!h.inside) return;
          V.groundShadow(c, h.x, h.ground, 52 * h.s, 0.25);
          drawHero(c, h, t);
        },
        actors(c) {
          if (h.inside) return;
          V.groundShadow(c, h.x, h.ground, 52 * h.s, 0.25);
          drawHero(c, h, t);
        },
      };
      V.env.street(ctx, o);
    },
  });
})();
