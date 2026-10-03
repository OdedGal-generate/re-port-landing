// Scene 09-walk-home (5 s, 15:00 -> 15:15, afternoon) — walking home along the street.
//  0.0  tracking side-view: the hero (school outfit + blue backpack) walks LEFT along the sidewalk,
//       parallax city / trees / houses scroll behind him. A ginger cat sits on a garden wall ahead.
//  0.3  the cat's head follows him; he notices it, grins and waves to it (0.3-1.1) — the cat
//       answers with a slow blink and a little heart (1.05)
//  2.9  a car whooshes past in the foreground (car_pass cue: closest approach at t+1.4)
//  2.5  the camera stops tracking and eases back: the family house comes into view on the left
//  3.75 he climbs the two steps, crosses the porch and stops at the door (4.45)
//  4.45 hand on the lever, door_open at 4.5, he pushes the door open and leans in (to 5.0)
(function () {
  const B = V.boy, P = B.pose, ST = V.env.STREET;
  const S = ST.heroScale;
  const SPEED = 505; // 3.2 steps/s
  const T_DEC = 4.0, T_STOP = 4.48, X_STOP = 168;
  const X_DEC = X_STOP + (SPEED * (T_STOP - T_DEC)) / 2;
  const X_START = X_DEC + SPEED * T_DEC;
  const CAT_X = 1760, CAT_Y = ST.walkBack - 62 - 4; // sitting on the wall cap
  const CAR_T = 2.9;

  function heroDist(t) {
    // distance travelled (to the left)
    if (t < T_DEC) return SPEED * t;
    const u = Math.min(t, T_STOP) - T_DEC, D = T_STOP - T_DEC;
    return SPEED * T_DEC + SPEED * (u - (u * u) / (2 * D));
  }
  const heroX = (t) => X_START - heroDist(t);

  function trackCam(t) {
    const x = heroX(t);
    return { x: x - 150 / 1.32, y: 622, zoom: 1.32 };
  }
  function camAt(t) {
    const tr = trackCam(t);
    const k = V.ep(t, 2.35, 4.2, 'inOut');
    // the end framing: house reveal, then a gentle push toward the door
    const z = V.kf(t, [[2.35, 1.32], [3.75, 0.88], [5.4, 1.0]], 'sine');
    const endX = V.kf(t, [[3.0, 210], [5.4, 170]], 'sine');
    const endY = V.kf(t, [[3.0, 470], [5.4, 540]], 'sine');
    return { x: V.lerp(tr.x, endX, k), y: V.lerp(tr.y, endY, k), zoom: t < 2.35 ? 1.32 : z };
  }

  function heroState(t) {
    const x = heroX(t);
    const d = heroDist(t);
    const blinkE = B.blink(t, 'open', 4);
    // wave to the cat
    const w = V.seg(t, 0.3, 0.46) * (1 - V.seg(t, 0.98, 1.16));
    const osc = Math.sin((t - 0.3) * Math.PI * 2 * 2.8);
    const walk = P.walk(B.walkPhase(d, S), {
      outfit: 'school', backpack: true, facing: -1,
      eyes: w > 0.3 ? 'happy' : blinkE, mouth: w > 0.3 ? 'grin' : 'smile',
      head: -5 * w, brows: 0.4 * w,
    });
    // hand raised beside / in front of the face (the upper arm stays below the jaw), swaying
    if (w > 0) walk.armNear = { sh: V.lerp(walk.armNear.sh, 100 + 4 * osc, w), el: V.lerp(walk.armNear.el, 52 + 18 * osc, w) + 25 * Math.sin(Math.PI * w) };
    // stopping at the door -> stand, then reach for the lever and push
    const stop = V.seg(t, T_STOP - 0.3, T_STOP);
    let pose = V.env.poseMix(walk, P.stand({ outfit: 'school', backpack: true, facing: -1, eyes: blinkE, mouth: 'smile' }), stop);
    pose.facing = -1;
    const doorOpen = V.ep(t, 4.55, 5.08, 'inOut') * 0.78;
    let hx = x;
    if (t > T_STOP - 0.2) {
      // lean in as the door opens, then step forward into the doorway
      const lean = V.ep(t, 4.6, 5.0, 'inOut');
      pose.torso = V.lerp(pose.torso, 9, lean);
      pose.head = -4;
      const step = V.ep(t, 4.85, 5.4, 'inOut');
      hx = x - 34 * step;
      if (step > 0) {
        pose.legNear = { hip: 14 * Math.sin(Math.PI * step), knee: -30 * Math.sin(Math.PI * step), foot: 0 };
      }
      const reach = V.ep(t, T_STOP - 0.15, T_STOP + 0.08, 'inOut');
      const target = V.env.streetDoorHandle(doorOpen);
      const y0 = V.env.streetHipY(hx, S, pose);
      const ik = V.env.streetIK.arm(Object.assign({}, pose), hx, y0, S, 'near', target);
      pose.armNear = { sh: V.lerp(pose.armNear.sh, ik.armNear.sh, reach), el: V.lerp(pose.armNear.el, ik.armNear.el, reach) };
      pose.eyes = blinkE;
    }
    const y = V.env.streetHipY(hx, S, pose);
    return { x: hx, y, pose, ground: V.env.streetGroundY(hx), doorOpen };
  }

  // a little heart that floats up from the cat
  function heart(c, x, y, s, a) {
    c.save();
    c.globalAlpha = a;
    c.translate(x, y);
    c.scale(s, s);
    c.beginPath();
    c.moveTo(0, 8);
    c.bezierCurveTo(-16, -4, -12, -18, 0, -9);
    c.bezierCurveTo(12, -18, 16, -4, 0, 8);
    c.fillStyle = '#ff5a7a';
    c.fill();
    c.lineWidth = 2.5;
    c.strokeStyle = V.pal.ink;
    c.stroke();
    c.restore();
  }

  V.registerScene('09-walk-home', {
    sfx: [
      { t: 0, type: 'footsteps', dur: 4.3, rate: 3.2 },
      { t: 0, type: 'birds', dur: 5.4, vol: 0.4 },
      { t: 1.5, type: 'car_pass', dir: 1 },
      { t: 4.5, type: 'door_open' },
    ],
    draw(ctx, t) {
      const hour = 15.1;
      const cam = camAt(t);
      const h = heroState(t);
      const carX = cam.x + (t - CAR_T) * 3400;
      const o = {
        cam, hour, t, windowsLit: 0, interiorLit: 0.35, lamps: 0, doorOpen: h.doorOpen,
        props(c) {
          // the cat on the garden wall, head following the hero
          const look = V.clamp((h.x - CAT_X) / 260, -1, 1);
          const blink = (t % 2.3) > 2.15 || (t > 0.98 && t < 1.12);
          V.env.cat(c, CAT_X, CAT_Y, 1.05, { look, tail: t * 3.2, blink });
          const hk = V.seg(t, 1.05, 1.95);
          if (hk > 0 && hk < 1) heart(c, CAT_X + 10 + Math.sin(hk * 7) * 8, CAT_Y - 120 - hk * 90, 1.3 + hk * 0.4, Math.min(1, hk * 6) * (1 - V.seg(hk, 0.7, 1)));
        },
        actors(c) {
          V.env.streetCastShadow(c, o, h.ground, (cc) => B.draw(cc, h.x, h.y, S, h.pose));
          V.groundShadow(c, h.x, h.ground, 52 * S, 0.18);
          B.draw(c, h.x, h.y, S, h.pose);
        },
        front(c) {
          if (Math.abs(t - CAR_T) < 0.75) V.env.car(c, carX, 1112, 1.3, { color: '#f6c945', dir: 1, dist: t * 3400, blur: 0.8 });
        },
      };
      V.env.street(ctx, o);
    },
  });
})();
