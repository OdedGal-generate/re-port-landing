// Shared helpers for the 'school' location group (scenes 06-school-in, 07-timelapse, 08-school-out).
//
// =============================================================================================
//  THE HIGH SCHOOL ("בית הספר התיכון") — API
// =============================================================================================
//
//  Everything lives in fixed WORLD coordinates (px) mapped to the screen by a camera
//     cam = { x, y, zoom }   world point (x, y) lands on the screen centre (default 960, 540, 1).
//  The sky is painted in screen space. Building + ground run from world x -700 to 2700, so any cam
//  with zoom >= 0.85 and x in [300, 1700] never shows an edge.
//
//  One call paints the whole frame:
//     V.env.school(ctx, o)
//        o.hour        0..24 (8 = morning, 15 = afternoon) -> sky, sun position, cast-shadow
//                      length/direction, facade side-shading and the colour grade.
//        o.t           seconds (cloud drift, flag waving, palm sway, bell shake)
//        o.cam         {x, y, zoom}
//        o.clockH, o.clockM   the big facade clock (V.wallClock). Minutes may be fractional.
//        o.clockBlur   radians the minute hand swept during the last frame (time-lapse smear)
//        o.bellRing    0..1  the red wall bell shakes + sound lines
//        o.doorOpen    0..1  double glass doors (0 closed .. 1 wide open; they swing OUT toward the
//                      camera; values slightly > 1 give an overshoot bounce)
//        o.flagPhase   flag wave phase (default t * 2.4);  o.wind  palm/ficus sway phase (default t)
//        o.cloudShift  px the clouds have drifted (default t * 12);  o.cloudStreak  px of smear
//        o.birds       true -> a few birds cross the morning sky
//        o.sunTrail    [h0, h1] faint dotted arc of the sun path between two hours (time-lapse)
//        o.flicker     0..1 subtle exposure flicker (time-lapse)
//        o.grade       false -> skip the time-of-day colour grade
//        o.shadowBoost multiply cast-shadow opacity (default 1)
//        o.actors = {             all callbacks get ctx in WORLD coords (camera applied)
//          door(ctx)              inside the open doorway, CLIPPED to it, over the dark corridor.
//                                 Fade people into the dark with V.env.schoolDoorDark(ctx, 0..1).
//          yard(ctx)              courtyard layer: in front of building/trees/flag, BEHIND the fence
//          street(ctx)            sidewalk layer: in front of the fence
//          front(ctx)             last world layer
//          shadows(sctx, api)     extra CAST SHADOWS drawn into the shared shadow layer:
//                                 api.person(x, groundY, s, pose)  (sun-projected silhouette)
//        }
//
//  LAYOUT  V.env.SCHOOL (world px)
//     facadeY 600          building base = door threshold. Wings: 2 storeys (top 280), central
//                          block x 840..1280 (top 120), clock tower x 975..1145 (top 84)
//     door                 x 985..1135 (centre 1060), top 365, bottom 600 — double glass doors
//     landing              x 950..1170, y 600..614 (entrance step)
//     canopy               x 935..1185, y 340..358
//     sign                 centre (1060, 306) 330 x 54, "בית הספר התיכון" + school emblem
//     clock                centre (1060, 178), r 56 (rim ~63)
//     bell                 centre (951, 398), r 21 (left of the door, under the canopy line)
//     courtyard            y 600..805 (paved, lawns); path from the gate (850, 805) to the landing
//     fence                base y 805, top 640 (green metal bars); GATE opening x 770..930 (centre 850)
//                          stone pillars x 744..770 and 930..956
//     sidewalk             y 805..940, walking line walkY = 880; curb 940..958 (red/white); road below
//     flag pole            base (1430, 715), top y 150, Israeli flag
//     ficus                base (380, 745) with a round bench;  palms at x 40, 1650, 1890
//     depth scale          V.env.schoolScale(groundY): 0.46 at the door .. 0.80 on the sidewalk
//                          (hero ~0.8 on the sidewalk). Horizon ~ y 242.
//
//  Other helpers
//     V.env.schoolSun(hour)             -> {x, y (world), side -1 left..+1 right, el, dx, dy (shadow
//                                          vector per px of height), strength, warm, morning}
//     V.env.schoolCam(ctx, cam) / V.env.schoolToScreen(cam, x, y)
//     V.env.schoolDoorDark(ctx, k)      darken the doorway by k (call inside actors.door)
//     V.env.schoolPerson(ctx, x, groundY, s, pose, {lift})  contact shadow + B.draw; returns hipY
//     V.env.schoolMover(spec)           smooth path walker with foot-locked walk/run phase:
//         spec = { pts: [[x, y], ...], v: [[t, speed], ...] (px/s at scale 1; walk ~300, run ~750),
//                  run: [[t, 0..1]] gait blend, l0: start offset, size: body-size factor, W: depth weight,
//                  at: [[t, [x, y] | arcLength, ease], ...]  (instead of v: keyframed positions) }
//         .at(t) -> {x, y, s, phase, v, g, dir, done}
//     V.env.schoolGait(m, overrides)    walk/run/stand pose blended from a mover state
//     V.env.schoolPoseMix(a, b, k)      blend two poses (angles lerp)
//     V.env.schoolArmIK(pose, x, hipY, s, 'near'|'far', [tx, ty])  put a hand on a world point
//     V.env.schoolTurn(t, t0, dur, from, to)  facing value for a quick squash-turn (from -> to)
//     V.env.schoolPlan(pts, W, t0, l0, [{to, v, ease} | {hold}])  -> `at` keys for schoolMover, planned from
//                                       speeds so velocity stays continuous through starts / stops
//     V.env.schoolLayer(ctx, fn, {alpha, shade, shadeAlpha, blur})  draw fn through an offscreen layer
//                                       (fade/darken a person as ONE image; used for the doorway + ghosts)
//     V.env.SCHOOL_KIDS                 the recurring classmates {friend, maya, ori, shira, tamar, daniel,
//                                       yoni, noa}: {look, outfit, backpack, size, prop()}
//     V.env.schoolProps.glasses / lashes / bow / combine   headProp painters for classmates
// =============================================================================================
(function () {
  const V = window.V;
  V.env = V.env || {};
  const INK = V.pal.ink;
  const B = V.boy, P = B.pose;

  const L = {
    x0: -700, x1: 2700,
    facadeY: 600, wingTop: 280, blockTop: 120, towerTop: 84, storey: 160,
    block: { x0: 840, x1: 1280 },
    bay: { x0: 930, x1: 1190 },
    tower: { x0: 975, x1: 1145 },
    door: { x: 1060, x0: 985, x1: 1135, top: 365, bottom: 600 },
    landing: { x0: 950, x1: 1170, y0: 600, y1: 614 },
    canopy: { x0: 935, x1: 1185, y0: 340, y1: 358 },
    sign: { x: 1060, y: 306, w: 330, h: 54 },
    clock: { x: 1060, y: 178, r: 56 },
    bell: { x: 951, y: 398, r: 21 },
    fence: { y: 805, top: 640 },
    gate: { x0: 770, x1: 930, x: 850, y: 805 },
    walkY: 880, curbY: 940, roadY: 958,
    flag: { x: 1430, y: 715, top: 150, w: 150, h: 106 },
    ficus: { x: 380, y: 745 },
    palms: [[40, 772, 0.95], [1650, 742, 1.0], [1890, 772, 1.08]],
    zoneSign: { x: 1580, y: 902 },
    horizonY: 242,
  };
  V.env.SCHOOL = L;

  const scaleAt = (y) => 0.46 + 0.34 * ((y - 600) / 280);
  V.env.schoolScale = scaleAt;

  // ------------------------------------------------------------------ sun & light
  function sunInfo(hour) {
    const u = V.clamp((hour - 6) / 12.5, 0.02, 0.98);
    const arc = Math.sin(Math.PI * u);
    const el = Math.max(6, 58 * arc);
    const side = -Math.cos(Math.PI * u); // -1: sun on the LEFT (morning) .. +1 right (evening)
    const cot = Math.min(2.6, 1 / Math.tan(V.deg(el)));
    return {
      hour, u, side, el, cot,
      x: V.lerp(-200, 2150, u),
      y: 320 - arc * 400,
      dx: -side * cot * 0.62, // ground shadow per px of object height (screen px)
      dy: 0.16 + 0.06 * cot,
      strength: 0.3 * V.clamp((el - 4) / 14),
      warm: V.seg(hour, 12, 16.2), // 15:00 -> ~0.7: a clearly golden afternoon
      morning: 1 - V.seg(hour, 8.4, 11),
      color: V.mixColor('#ffe68c', '#ffc65a', V.seg(hour, 12.5, 17)),
    };
  }
  V.env.schoolSun = sunInfo;

  // ------------------------------------------------------------------ camera
  const camOf = (c) => Object.assign({ x: 960, y: 540, zoom: 1 }, c || {});
  function applyCam(ctx, c) {
    c = camOf(c);
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);
  }
  V.env.schoolCam = applyCam;
  V.env.schoolToScreen = (c, x, y) => {
    c = camOf(c);
    return [V.W / 2 + (x - c.x) * c.zoom, V.H / 2 + (y - c.y) * c.zoom];
  };

  // ------------------------------------------------------------------ offscreen canvases
  const canvases = {};
  const offscreen = (name, w, h) => {
    if (!canvases[name]) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      canvases[name] = c;
    }
    return canvases[name];
  };

  // Israeli flag texture (drawn once)
  function flagTexture() {
    const W = 300, H = 212;
    if (canvases.flag) return canvases.flag;
    const c = offscreen('flag', W, H);
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, W, H);
    const blue = '#1446b8';
    x.fillStyle = blue;
    x.fillRect(0, H * 0.094, W, H * 0.156);
    x.fillRect(0, H * 0.75, W, H * 0.156);
    // Star of David (two outlined triangles)
    const cx = W / 2, cy = H / 2, R = H * 0.2;
    x.strokeStyle = blue;
    x.lineWidth = H * 0.034;
    x.lineJoin = 'miter';
    for (const rot of [0, Math.PI]) {
      x.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / 3;
        const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
        if (i) x.lineTo(px, py);
        else x.moveTo(px, py);
      }
      x.closePath();
      x.stroke();
    }
    return c;
  }

  // ------------------------------------------------------------------ small painters
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };
  const fillPoly = (ctx, pts, fill, stroke, lw = 3) => {
    poly(ctx, pts);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  // visible world rect for the current frame (set by V.env.school) — used to cull detail
  const VIEW = { x0: -1e9, x1: 1e9, y0: -1e9, y1: 1e9 };
  const CHUNK = 48; // long multi-segment paths rasterise super-linearly: stroke in short batches

  // stone courses (Jerusalem-stone look) inside a rect: culled to the view, batched strokes
  function stone(ctx, x0, y0, x1, y1, base, seed, course = 20, blockW = 64) {
    ctx.fillStyle = base;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const vx0 = Math.max(x0, VIEW.x0), vx1 = Math.min(x1, VIEW.x1);
    const vy0 = Math.max(y0, VIEW.y0), vy1 = Math.min(y1, VIEW.y1);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    const r0 = Math.max(0, Math.floor((y1 - vy1) / course)), r1 = Math.ceil((y1 - vy0) / course);
    const light = V.shade(base, 0.12), dark = V.shade(base, -0.05);
    for (let r = r0; r < r1; r++) {
      const yb = y1 - r * course, yt = Math.max(y0, yb - course);
      const off = (r % 2) * (blockW / 2);
      const b0 = Math.floor((vx0 - x0 - off) / blockW) - 1, b1 = Math.ceil((vx1 - x0 - off) / blockW);
      for (let b = b0; b <= b1; b++) {
        const rr = V.rand(seed + r * 31.7 + b * 7.3);
        if (rr > 0.83) {
          const bx0 = Math.max(x0, x0 + off + b * blockW + 1), bx1 = Math.min(x1, x0 + off + (b + 1) * blockW - 1);
          if (bx1 <= bx0 || yb - yt < 3) continue;
          ctx.fillStyle = rr > 0.92 ? light : dark;
          ctx.fillRect(bx0, yt + 1, bx1 - bx0, yb - yt - 2);
        }
      }
    }
    ctx.strokeStyle = V.rgba(V.shade(base, -0.42), 0.2);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let n = 0;
    const flush = () => {
      if (++n >= CHUNK) {
        ctx.stroke();
        ctx.beginPath();
        n = 0;
      }
    };
    for (let r = r0; r < r1; r++) {
      const yb = y1 - r * course, yt = Math.max(y0, yb - course);
      if (yb - course > y0) {
        ctx.moveTo(vx0, yb - course);
        ctx.lineTo(vx1, yb - course);
        flush();
      }
      const off = (r % 2) * (blockW / 2);
      const b0 = Math.floor((vx0 - x0 - off) / blockW), b1 = Math.ceil((vx1 - x0 - off) / blockW);
      for (let b = b0; b <= b1; b++) {
        const jx = x0 + off + b * blockW;
        if (jx <= x0 || jx >= x1) continue;
        ctx.moveTo(jx, yt);
        ctx.lineTo(jx, yb);
        flush();
      }
    }
    ctx.stroke();
  }

  // ------------------------------------------------------------------ windows
  const WINDOWS = [];
  (function buildWindows() {
    let id = 0;
    for (let st = 0; st < 2; st++) {
      const top = L.facadeY - (st + 1) * L.storey + 30;
      for (let i = 0; i < 10; i++) WINDOWS.push({ x: 745 - i * 150 - 46, y: top, w: 92, h: 98, st, id: id++ });
      for (let i = 0; i < 9; i++) WINDOWS.push({ x: 1375 + i * 150 - 46, y: top, w: 92, h: 98, st, id: id++ });
    }
    for (let st = 0; st < 3; st++) {
      const top = L.facadeY - (st + 1) * L.storey + 26;
      WINDOWS.push({ x: 885 - 27, y: top, w: 54, h: 106, st, id: id++, narrow: true });
      WINDOWS.push({ x: 1235 - 27, y: top, w: 54, h: 106, st, id: id++, narrow: true });
    }
    WINDOWS.forEach((w) => {
      const r = V.rand(w.id * 3.7 + 1);
      w.shutter = r < 0.45 ? 0.12 + V.rand(w.id * 5.1) * 0.45 : 0; // Israeli roller shutter part-way down
      w.ac = !w.narrow && V.rand(w.id * 9.3 + 2) < 0.32;
      w.deco = !w.narrow && w.st === 0 && V.rand(w.id * 2.9 + 4) < 0.45;
      w.lit = V.rand(w.id * 1.9 + 7);
    });
  })();

  function drawWindow(ctx, w, sun, glassTop, glassBot) {
    const { x, y } = w, ww = w.w, hh = w.h;
    if (x + ww + 70 < VIEW.x0 || x - 20 > VIEW.x1 || y + hh + 20 < VIEW.y0 || y - 20 > VIEW.y1) return;
    // stone sill + surround
    V.fillRound(ctx, x - 8, y + hh + 2, ww + 16, 10, 2, '#fbf1da', INK, 2.2);
    V.fillRound(ctx, x - 5, y - 5, ww + 10, hh + 10, 3, '#eef0ee', INK, 2.6);
    // glass (sky reflection, darker interior at the bottom)
    ctx.fillStyle = glassTop;
    ctx.fillRect(x, y, ww, hh);
    ctx.fillStyle = glassBot;
    ctx.fillRect(x, y + hh * 0.52, ww, hh * 0.48);
    // reflection streak (stays inside the glass, no clip needed)
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.moveTo(x + ww * 0.15, y + hh);
    ctx.lineTo(x + ww * 0.5, y);
    ctx.lineTo(x + ww * 0.68, y);
    ctx.lineTo(x + ww * 0.33, y + hh);
    ctx.fill();
    // roller shutter
    if (w.shutter > 0) {
      const sh = hh * w.shutter;
      ctx.fillStyle = '#e9dcc0';
      ctx.fillRect(x, y, ww, sh);
      ctx.strokeStyle = 'rgba(120,100,70,0.35)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = 6; k < sh; k += 7) {
        ctx.moveTo(x, y + k);
        ctx.lineTo(x + ww, y + k);
      }
      ctx.stroke();
      ctx.fillStyle = '#cbb894';
      ctx.fillRect(x, y + sh - 4, ww, 4);
    }
    // recess shadow: top + the sun side
    const sideW = 3 + 9 * Math.abs(sun.side) * Math.min(1.4, sun.cot);
    ctx.fillStyle = 'rgba(40,30,60,0.22)';
    ctx.fillRect(x, y, ww, 5 + 5 * (1 - sun.el / 60));
    if (sun.side < 0) ctx.fillRect(x, y, sideW, hh);
    else ctx.fillRect(x + ww - sideW, y, sideW, hh);
    // mullions
    ctx.strokeStyle = '#eef0ee';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (!w.narrow) {
      ctx.moveTo(x + ww / 2, y);
      ctx.lineTo(x + ww / 2, y + hh);
    }
    ctx.moveTo(x, y + hh * 0.36);
    ctx.lineTo(x + ww, y + hh * 0.36);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(x, y, ww, hh);
    // kids' paper decorations on ground-floor classrooms
    if (w.deco) {
      const cols = ['#e2463c', '#f6c945', '#3b7dd8', '#5aa35a', '#f39a3d'];
      for (let k = 0; k < 3; k++) {
        const dx = x + 14 + k * 26, dy = y + hh * 0.62 + (k % 2) * 12;
        const c = cols[Math.floor(V.rand(w.id * 4 + k) * cols.length)];
        star(ctx, dx, dy, 7, c);
      }
    }
    // AC unit (very local!)
    if (w.ac) {
      const ax = x + ww + 14, ay = y + hh - 40;
      V.fillRound(ctx, ax, ay, 46, 34, 4, '#f4f4f0', INK, 2.2);
      V.circle(ctx, ax + 18, ay + 17, 11, '#d8dad6', '#9a9c98', 1.5);
      ctx.strokeStyle = '#9a9c98';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        ctx.moveTo(ax + 33, ay + 7 + k * 6);
        ctx.lineTo(ax + 42, ay + 7 + k * 6);
      }
      ctx.stroke();
      V.line(ctx, ax + 40, ay + 34, ax + 40, ay + 46, '#9a9c98', 2);
    }
  }
  function star(ctx, x, y, r, c) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
  }

  // ------------------------------------------------------------------ sky, sun, clouds, skyline
  const CLOUDS = [
    [-420, 150, 0.85], [180, -40, 0.7], [620, 180, 0.62], [1150, -70, 0.95], [1500, 120, 0.75],
    [2050, 10, 0.9], [2550, 190, 0.7], [3000, -30, 0.8],
  ];
  function drawSkyWorld(ctx, o, sun) {
    const t = o.t || 0;
    // sun path trail (time-lapse)
    if (o.sunTrail) {
      const [h0, h1] = o.sunTrail;
      ctx.save();
      ctx.fillStyle = 'rgba(255,248,215,0.55)';
      for (let h = h0; h <= h1 + 1e-6; h += 0.18) {
        const s = sunInfo(h);
        V.circle(ctx, s.x, s.y, 3.2, 'rgba(255,248,215,0.5)');
      }
      ctx.restore();
    }
    V.sun(ctx, sun.x, sun.y, 44, sun.color);
    // clouds
    const shift = o.cloudShift === undefined ? t * 12 : o.cloudShift;
    const streak = o.cloudStreak || 0;
    const span = 3800;
    CLOUDS.forEach(([cx, cy, cs], i) => {
      const par = 0.75 + 0.25 * cs;
      let x = cx + shift * par;
      x = ((((x - L.x0 + 600) % span) + span) % span) + L.x0 - 600;
      if (streak > 2) {
        for (let k = 4; k >= 1; k--) V.cloud(ctx, x - (streak * par * k) / 4, cy, cs, `rgba(255,255,255,${0.16 / k + 0.06})`);
      }
      V.cloud(ctx, x, cy, cs, `rgba(255,255,255,${streak > 2 ? 0.7 : 0.9})`);
      void i;
    });
    // birds
    if (o.birds) {
      for (let i = 0; i < 4; i++) {
        const bx = -200 + ((t * 120 + i * 95) % 2600), by = 150 + i * 18 + Math.sin(t * 2 + i) * 8;
        const fl = Math.sin(t * 14 + i * 2) * 6;
        ctx.strokeStyle = 'rgba(40,40,60,0.75)';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 9, by - fl);
        ctx.quadraticCurveTo(bx - 4, by - 4, bx, by);
        ctx.quadraticCurveTo(bx + 4, by - 4, bx + 9, by - fl);
        ctx.stroke();
      }
    }
  }
  // distant town / hills above the roofline (low contrast)
  function drawSkyline(ctx, sun, skyBot) {
    const haze = V.mixColor(skyBot, '#9fb2c6', 0.45);
    ctx.fillStyle = V.mixColor(haze, '#ffffff', 0.15);
    ctx.beginPath();
    ctx.moveTo(L.x0, 290);
    for (let x = L.x0; x <= L.x1; x += 100) ctx.lineTo(x, 236 + Math.sin(x * 0.004) * 16 + Math.sin(x * 0.011) * 7);
    ctx.lineTo(L.x1, 290);
    ctx.fill();
    const blocks = [[-640, 70, 120], [-380, 50, 90], [-120, 92, 110], [140, 60, 80], [420, 84, 120], [1460, 76, 100], [1720, 104, 120], [1990, 58, 90], [2240, 88, 130], [2520, 66, 100]];
    blocks.forEach(([bx, bh, bw]) => {
      ctx.fillStyle = haze;
      ctx.fillRect(bx, 280 - bh, bw, bh + 10);
      ctx.fillStyle = V.mixColor(haze, '#ffffff', 0.35);
      for (let r = 0; r < Math.floor(bh / 18); r++) {
        for (let c = 0; c < Math.floor(bw / 22); c++) ctx.fillRect(bx + 8 + c * 22, 280 - bh + 8 + r * 18, 9, 7);
      }
    });
  }

  // ------------------------------------------------------------------ building
  function drawBuilding(ctx, o, sun, sky) {
    const fy = L.facadeY;
    const wall = '#efd5a5', blockC = '#f4e0b8', bayC = '#f7e8c6';
    const glassTop = V.mixColor(sky[0], '#ffffff', 0.25);
    const glassBot = V.mixColor(sky[0], '#21364d', 0.55);

    // roof furniture behind the parapets: solar water heaters ("dud shemesh")
    [[120, 1], [330, 1], [1560, 1], [2160, 1]].forEach(([sx]) => {
      V.fillRound(ctx, sx - 6, 208, 112, 26, 13, '#f2f2ee', INK, 2.6); // tank
      V.line(ctx, sx + 4, 234, sx + 4, 276, '#7a7f88', 4);
      V.line(ctx, sx + 92, 234, sx + 92, 276, '#7a7f88', 4);
      fillPoly(ctx, [[sx - 10, 278], [sx + 6, 238], [sx + 110, 238], [sx + 96, 278]], '#2c4f86', INK, 2.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 1; k < 4; k++) {
        ctx.moveTo(sx - 10 + k * 26 + 4, 278);
        ctx.lineTo(sx + 6 + k * 26, 238);
      }
      ctx.stroke();
    });
    // antenna on the block roof
    V.line(ctx, 1230, 120, 1230, 62, '#5b606b', 3);
    V.line(ctx, 1214, 76, 1246, 76, '#5b606b', 3);
    V.line(ctx, 1218, 90, 1242, 90, '#5b606b', 3);

    // wings
    stone(ctx, L.x0, L.wingTop, L.block.x0, fy, wall, 11);
    stone(ctx, L.block.x1, L.wingTop, L.x1, fy, wall, 23);
    // string courses + plinth + parapet coping (wings)
    [[L.x0, L.block.x0], [L.block.x1, L.x1]].forEach(([a, b]) => {
      ctx.fillStyle = '#e4c592';
      ctx.fillRect(a, fy - L.storey - 6, b - a, 10);
      ctx.fillStyle = '#d6b884';
      ctx.fillRect(a, fy - 22, b - a, 22);
      V.fillRound(ctx, a - 6, L.wingTop - 10, b - a + 12, 14, 2, '#fbf0d8', INK, 2.6);
      V.line(ctx, a, fy - 22, b, fy - 22, V.rgba(INK, 0.35), 2);
    });
    // central block
    stone(ctx, L.block.x0, L.blockTop, L.block.x1, fy, blockC, 37);
    // protruding bay + tower
    stone(ctx, L.bay.x0, L.blockTop, L.bay.x1, fy, bayC, 41, 20, 52);
    stone(ctx, L.tower.x0, L.towerTop, L.tower.x1, L.blockTop + 2, bayC, 43, 20, 52);
    ctx.fillStyle = '#e4c592';
    ctx.fillRect(L.block.x0, fy - L.storey - 6, L.bay.x0 - L.block.x0, 10);
    ctx.fillRect(L.bay.x1, fy - L.storey - 6, L.block.x1 - L.bay.x1, 10);
    ctx.fillRect(L.block.x0, fy - 2 * L.storey - 6, L.bay.x0 - L.block.x0, 10);
    ctx.fillRect(L.bay.x1, fy - 2 * L.storey - 6, L.block.x1 - L.bay.x1, 10);
    ctx.fillStyle = '#d6b884';
    ctx.fillRect(L.block.x0, fy - 22, L.block.x1 - L.block.x0, 22);
    // outlines
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(L.block.x0, L.blockTop, L.block.x1 - L.block.x0, fy - L.blockTop);
    ctx.strokeRect(L.bay.x0, L.blockTop, L.bay.x1 - L.bay.x0, fy - L.blockTop);
    // parapet copings (block + tower)
    V.fillRound(ctx, L.block.x0 - 8, L.blockTop - 10, L.block.x1 - L.block.x0 + 16, 14, 2, '#fbf0d8', INK, 2.6);
    V.fillRound(ctx, L.tower.x0, L.towerTop, L.tower.x1 - L.tower.x0, L.blockTop - L.towerTop, 2, null, INK, 3);
    V.fillRound(ctx, L.tower.x0 - 10, L.towerTop - 10, L.tower.x1 - L.tower.x0 + 20, 14, 2, '#fbf0d8', INK, 2.6);
    // protrusion side shading: the block casts a shadow strip onto the wing away from the sun
    const sw = 10 + 46 * Math.abs(sun.side) * Math.min(1.5, sun.cot);
    ctx.fillStyle = 'rgba(60,40,80,0.16)';
    if (sun.side < 0) {
      ctx.fillRect(L.block.x1 + 1.5, L.wingTop + 4, sw, fy - L.wingTop - 4);
      ctx.fillRect(L.bay.x1 + 1.5, L.blockTop, sw * 0.4, fy - L.blockTop);
    } else {
      ctx.fillRect(L.block.x0 - sw - 1.5, L.wingTop + 4, sw, fy - L.wingTop - 4);
      ctx.fillRect(L.bay.x0 - sw * 0.4 - 1.5, L.blockTop, sw * 0.4, fy - L.blockTop);
    }
    // windows
    WINDOWS.forEach((w) => drawWindow(ctx, w, sun, glassTop, glassBot));
    // decorative vertical slit windows in the bay between clock and sign
    for (const sx of [990, 1110]) {
      V.fillRound(ctx, sx, 250, 20, 16, 3, glassBot, INK, 2);
    }
  }

  function drawClock(ctx, o) {
    const C = L.clock;
    V.circle(ctx, C.x, C.y, C.r + 19, '#fbf0d6', INK, 3);
    V.circle(ctx, C.x, C.y, C.r + 13, null, 'rgba(170,135,80,0.55)', 2);
    const hh = o.clockH === undefined ? 8 : o.clockH;
    const mm = o.clockM === undefined ? 0 : o.clockM;
    V.wallClock(ctx, C.x, C.y, C.r, Math.floor(hh), mm, { rim: '#2d3550', face: '#fffaf0', hand: INK, accent: V.pal.red });
    const blur = o.clockBlur || 0;
    if (blur > 0.04) {
      const ma = (mm / 60) * Math.PI * 2 - Math.PI / 2;
      const R = C.r * 0.76;
      const b = Math.min(blur, Math.PI * 2);
      ctx.save();
      [[1, 0.1], [0.55, 0.12], [0.22, 0.16]].forEach(([f, a]) => {
        ctx.beginPath();
        ctx.moveTo(C.x, C.y);
        ctx.arc(C.x, C.y, R, ma - b * f, ma);
        ctx.closePath();
        ctx.fillStyle = `rgba(31,26,36,${a})`;
        ctx.fill();
      });
      // hour hand smear
      const tm = ((Math.floor(hh) % 12) * 60 + mm) / 720;
      const ha = tm * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(C.x, C.y);
      ctx.arc(C.x, C.y, C.r * 0.52, ha - b / 12 - 0.04, ha);
      ctx.closePath();
      ctx.fillStyle = 'rgba(31,26,36,0.14)';
      ctx.fill();
      ctx.restore();
      V.circle(ctx, C.x, C.y, C.r * 0.08, V.pal.red);
    }
  }

  function drawSign(ctx) {
    const S = L.sign;
    const x = S.x - S.w / 2, y = S.y - S.h / 2;
    V.fillRound(ctx, x + 4, y + 5, S.w, S.h, 8, 'rgba(40,30,50,0.25)');
    V.fillRound(ctx, x, y, S.w, S.h, 8, V.pal.navy, INK, 3);
    V.fillRound(ctx, x + 5, y + 5, S.w - 10, S.h - 10, 5, null, V.pal.yellow, 2);
    // emblem (same as the school-shirt logo) on the right = start of the Hebrew line
    const ex = x + S.w - 30;
    V.circle(ctx, ex, S.y, 17, '#ffffff', INK, 2);
    V.circle(ctx, ex, S.y, 12, V.pal.navy);
    V.circle(ctx, ex, S.y, 5.5, V.pal.yellow);
    V.text(ctx, 'בית הספר התיכון', S.x - 14, S.y + 2, { size: 33, weight: 800, color: '#ffffff' });
  }

  function drawCanopy(ctx, sun) {
    const C = L.canopy;
    // shadow on the wall below the canopy
    const sh = 18 + 16 * Math.min(1.6, sun.cot) * 0.5;
    const sx = -sun.side * 12;
    ctx.fillStyle = 'rgba(50,35,70,0.2)';
    ctx.fillRect(C.x0 + 6 + sx, C.y1, C.x1 - C.x0 - 12, sh);
    V.fillRound(ctx, C.x0, C.y0, C.x1 - C.x0, C.y1 - C.y0, 3, '#f1e6d2', INK, 3);
    V.line(ctx, C.x0 + 4, C.y1 - 5, C.x1 - 4, C.y1 - 5, 'rgba(120,100,80,0.35)', 2);
  }

  function drawBell(ctx, o) {
    const b = L.bell, ring = V.clamp(o.bellRing || 0, 0, 1), t = o.t || 0;
    V.fillRound(ctx, b.x - 10, b.y - b.r - 16, 20, 15, 3, '#5b5f6b', INK, 2.4);
    ctx.save();
    ctx.translate(b.x, b.y - b.r - 6);
    if (ring > 0) {
      ctx.rotate(Math.sin(t * 92) * 0.17 * ring);
      ctx.translate(Math.sin(t * 131) * 1.6 * ring, 0);
    }
    ctx.translate(0, b.r + 6);
    V.circle(ctx, 0, 0, b.r, '#d8382c', INK, 3);
    V.circle(ctx, 0, 0, b.r * 0.72, null, 'rgba(120,20,15,0.45)', 2);
    ctx.beginPath();
    ctx.arc(0, 0, b.r * 0.78, Math.PI * 1.1, Math.PI * 1.45);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    V.circle(ctx, 0, 0, 4.5, '#7a1810');
    const sx = ring > 0 ? Math.sin(t * 92 + 1.4) * 6 * ring : 0;
    V.line(ctx, 0, b.r - 2, sx, b.r + 5, '#3a3a44', 3);
    V.circle(ctx, sx, b.r + 6, 4.5, '#3a3a44', INK, 1.8);
    ctx.restore();
    if (ring > 0) {
      ctx.save();
      ctx.strokeStyle = V.rgba(INK, 0.9 * ring);
      ctx.lineWidth = 5.5;
      ctx.lineCap = 'round';
      const ph = (t * 5) % 1;
      for (const side of [-1, 1]) {
        for (let k = 0; k < 2; k++) {
          const r = b.r + 10 + ((ph + k * 0.5) % 1) * 30;
          const a = 1 - ((ph + k * 0.5) % 1) * 0.6;
          ctx.globalAlpha = a;
          ctx.beginPath();
          if (side < 0) ctx.arc(b.x, b.y, r, Math.PI * 0.72, Math.PI * 1.28);
          else ctx.arc(b.x, b.y, r, -Math.PI * 0.28, Math.PI * 0.28);
          ctx.stroke();
        }
        // spiky "ring" lines
        ctx.globalAlpha = 1;
        for (let k = -1; k <= 1; k++) {
          const ang = side < 0 ? Math.PI + k * 0.55 : k * 0.55;
          const r0 = b.r + 46 + Math.sin(t * 40 + k) * 4, r1 = r0 + 20;
          ctx.beginPath();
          ctx.moveTo(b.x + Math.cos(ang) * r0, b.y + Math.sin(ang) * r0);
          ctx.lineTo(b.x + Math.cos(ang) * r1, b.y + Math.sin(ang) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  // doorway: interior, actors, frame, glass leaves
  function drawDoorway(ctx, o) {
    const D = L.door;
    const w = D.x1 - D.x0, h = D.bottom - D.top;
    // stone surround
    V.fillRound(ctx, D.x0 - 16, D.top - 14, w + 32, h + 14, 3, '#e8d2a4', INK, 3);
    // interior corridor
    const g = ctx.createLinearGradient(0, D.top, 0, D.bottom);
    g.addColorStop(0, '#1b1c26');
    g.addColorStop(1, '#2f2d38');
    ctx.fillStyle = g;
    ctx.fillRect(D.x0, D.top, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(D.x0, D.top, w, h);
    ctx.clip();
    fillPoly(ctx, [[D.x0, D.bottom], [D.x1, D.bottom], [1078, 486], [1042, 486]], '#45414c');
    fillPoly(ctx, [[1042, 486], [1078, 486], [1078, 432], [1042, 432]], 'rgba(250,232,190,0.55)');
    V.lightPool(ctx, 1060, 470, 70, '#ffe7b0', 0.12);
    // lockers on the left wall
    fillPoly(ctx, [[D.x0 + 6, 430], [1036, 452], [1036, 488], [D.x0 + 6, 560]], 'rgba(70,110,170,0.35)');
    ctx.restore();
    if (o.actors && o.actors.door) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(D.x0, D.top, w, h);
      ctx.clip();
      o.actors.door(ctx);
      ctx.restore();
    }
    // aluminium frame
    ctx.strokeStyle = '#7d8592';
    ctx.lineWidth = 7;
    ctx.strokeRect(D.x0 - 3, D.top - 3, w + 6, h + 3);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(D.x0 - 6.5, D.top - 6.5, w + 13, h + 6.5);
    // leaves
    const open = o.doorOpen || 0;
    leaf(ctx, D.x0, 1, open);
    leaf(ctx, D.x1, -1, open);
  }
  function leaf(ctx, hinge, dir, open) {
    const D = L.door;
    const A = V.deg(100) * open;
    const lw = (D.x1 - D.x0) / 2;
    const fx = hinge + dir * lw * Math.cos(A);
    const gr = Math.sin(A);
    const yt = D.top + 1 - 9 * gr, yb = D.bottom + 15 * gr;
    const pts = [[hinge, D.top + 1], [fx, yt], [fx, yb], [hinge, D.bottom]];
    fillPoly(ctx, pts, 'rgba(165,200,230,0.42)');
    // reflection streak
    if (Math.abs(fx - hinge) > 12) {
      const k0 = 0.25, k1 = 0.45;
      const pa = (k) => [V.lerp(hinge, fx, k), V.lerp(D.top + 1, yt, k)];
      const pb = (k) => [V.lerp(hinge, fx, k), V.lerp(D.bottom, yb, k)];
      fillPoly(ctx, [pa(k0 + 0.25), pa(k1 + 0.25), pb(k1), pb(k0)], 'rgba(255,255,255,0.28)');
      // push bar
      const ym = (k) => V.lerp(V.lerp(D.top + 1, yt, k), V.lerp(D.bottom, yb, k), 0.55);
      ctx.strokeStyle = '#b8bec8';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(V.lerp(hinge, fx, 0.15), ym(0.15));
      ctx.lineTo(V.lerp(hinge, fx, 0.85), ym(0.85));
      ctx.stroke();
    }
    poly(ctx, pts);
    ctx.strokeStyle = '#7d8592';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  V.env.schoolDoorDark = (ctx, k) => {
    if (k <= 0) return;
    const D = L.door;
    ctx.fillStyle = `rgba(22,22,32,${V.clamp(k)})`;
    ctx.fillRect(D.x0 - 2, D.top - 2, D.x1 - D.x0 + 4, D.bottom - D.top + 4);
  };

  // ------------------------------------------------------------------ ground
  function drawGround(ctx, o, sun) {
    const fy = L.facadeY, F = L.fence.y;
    // courtyard paving
    ctx.fillStyle = '#e6dac4';
    ctx.fillRect(L.x0, fy, L.x1 - L.x0, F - fy + 2);
    ctx.strokeStyle = 'rgba(150,125,95,0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 1; i < 7; i++) {
      const y = fy + (F - fy) * Math.pow(i / 7, 1.25);
      ctx.moveTo(L.x0, y);
      ctx.lineTo(L.x1, y);
    }
    const vx = 1060, vy = L.horizonY, kf = (fy - vy) / (F - vy);
    ctx.stroke();
    ctx.beginPath();
    for (let x = L.x0 - 400; x <= L.x1 + 400; x += 70) {
      if (x < VIEW.x0 - 400 || x > VIEW.x1 + 400) continue;
      ctx.moveTo(vx + (x - vx) * kf, fy);
      ctx.lineTo(x, F);
    }
    ctx.stroke();
    // lawns
    const lawn = '#86c46a', lawnD = '#5f9f4c';
    fillPoly(ctx, [[L.x0, 640], [600, 640], [660, 790], [L.x0, 790]], lawn);
    fillPoly(ctx, [[1300, 632], [L.x1, 632], [L.x1, 792], [1260, 792]], lawn);
    ctx.strokeStyle = lawnD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const gx = L.x0 + V.rand(i * 3.3) * (L.x1 - L.x0), gy = 650 + V.rand(i * 7.1) * 135;
      const inL = gx < 600 + (gy - 640) * 0.4, inR = gx > 1300 - (gy - 632) * 0.25;
      if ((!inL && !inR) || gx < VIEW.x0 || gx > VIEW.x1) continue;
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx - 2, gy - 7);
      ctx.moveTo(gx + 4, gy);
      ctx.lineTo(gx + 5, gy - 6);
    }
    ctx.stroke();
    // path gate -> entrance (terracotta pavers)
    const G = L.gate, D = L.landing;
    fillPoly(ctx, [[G.x0 + 8, F + 2], [G.x1 - 8, F + 2], [D.x1 - 14, D.y1], [D.x0 + 14, D.y1]], '#d9b79b');
    ctx.save();
    poly(ctx, [[G.x0 + 8, F + 2], [G.x1 - 8, F + 2], [D.x1 - 14, D.y1], [D.x0 + 14, D.y1]]);
    ctx.clip();
    ctx.strokeStyle = 'rgba(150,100,70,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 1; i < 9; i++) {
      const y = D.y1 + (F - D.y1) * Math.pow(i / 9, 1.15);
      ctx.moveTo(L.x0, y);
      ctx.lineTo(L.x1, y);
    }
    ctx.stroke();
    ctx.restore();
    poly(ctx, [[G.x0 + 8, F + 2], [G.x1 - 8, F + 2], [D.x1 - 14, D.y1], [D.x0 + 14, D.y1]]);
    ctx.strokeStyle = 'rgba(140,95,70,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // entrance landing + doormat
    V.fillRound(ctx, D.x0, D.y0 - 2, D.x1 - D.x0, D.y1 - D.y0 + 4, 3, '#f3e8d4', INK, 2.6);
    V.fillRound(ctx, L.door.x0 + 18, D.y0 + 1, L.door.x1 - L.door.x0 - 36, 9, 3, '#8a5a4a');
    // sidewalk
    ctx.fillStyle = '#d3cdc2';
    ctx.fillRect(L.x0, F, L.x1 - L.x0, L.curbY - F);
    ctx.strokeStyle = 'rgba(120,110,100,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const rows = [F, 838, 872, 906, L.curbY];
    for (let r = 1; r < rows.length - 1; r++) {
      ctx.moveTo(L.x0, rows[r]);
      ctx.lineTo(L.x1, rows[r]);
    }
    ctx.stroke();
    for (let r = 0; r < rows.length - 1; r++) {
      const off = (r % 2) * 32;
      ctx.beginPath();
      for (let x = L.x0 + off; x < L.x1; x += 64) {
        if (x < VIEW.x0 - 70 || x > VIEW.x1 + 70) continue;
        ctx.moveTo(x, rows[r]);
        ctx.lineTo(x - 6 + r * 3, rows[r + 1]);
      }
      ctx.stroke();
    }
    // curb: red / white (no stopping by the school)
    ctx.fillStyle = '#ece8e0';
    ctx.fillRect(L.x0, L.curbY, L.x1 - L.x0, 6);
    for (let x = L.x0, i = 0; x < L.x1; x += 64, i++) {
      ctx.fillStyle = i % 2 ? '#f4f2ee' : '#d8433a';
      ctx.fillRect(x, L.curbY + 6, 64, L.roadY - L.curbY - 6);
    }
    V.line(ctx, L.x0, L.curbY, L.x1, L.curbY, V.rgba(INK, 0.5), 2);
    V.line(ctx, L.x0, L.roadY, L.x1, L.roadY, V.rgba(INK, 0.5), 2);
    // road + crosswalk
    ctx.fillStyle = '#5d6470';
    ctx.fillRect(L.x0, L.roadY, L.x1 - L.x0, 500);
    ctx.fillStyle = '#eef0f2';
    for (let i = 0; i < 6; i++) {
      const x = 720 + i * 46;
      fillPoly(ctx, [[x, L.roadY + 10], [x + 26, L.roadY + 10], [x + 30 + (x - 850) * 0.12, L.roadY + 140], [x + (x - 850) * 0.12, L.roadY + 140]], '#eef0f2');
    }
  }

  // ------------------------------------------------------------------ yard props
  function hedges(ctx) {
    const y = L.facadeY + 6;
    const runs = [[L.x0, L.block.x0 - 20], [L.block.x1 + 20, L.x1]];
    runs.forEach(([a, b], ri) => {
      for (let x = a, i = 0; x < b; x += 58, i++) {
        const r = 30 + V.rand(ri * 50 + i) * 10;
        V.circle(ctx, x, y - 14, r, '#4f9a4c', INK, 2.6);
      }
      for (let x = a, i = 0; x < b; x += 58, i++) {
        const r = 30 + V.rand(ri * 50 + i) * 10;
        V.circle(ctx, x - 4, y - 18, r * 0.7, '#62ad57');
        // bougainvillea
        if (V.rand(ri * 77 + i * 1.7) < 0.55) {
          for (let k = 0; k < 5; k++) V.circle(ctx, x - 16 + V.rand(i * 9 + k) * 34, y - 30 + V.rand(i * 5 + k * 3) * 24, 4.2, '#d9408f');
        }
      }
    });
  }

  function ficus(ctx, o) {
    const { x, y } = L.ficus;
    const sway = Math.sin((o.wind === undefined ? o.t || 0 : o.wind) * 1.1) * 3;
    // round bench (back half)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y - 30, 120, 26, 0, Math.PI, Math.PI * 2);
    ctx.lineWidth = 16;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#b07a4a';
    ctx.stroke();
    ctx.restore();
    // trunk + roots
    fillPoly(ctx, [[x - 30, y - 14], [x - 20, y - 160], [x - 46, y - 250], [x - 10, y - 220], [x + 4, y - 270], [x + 18, y - 210], [x + 50, y - 240], [x + 24, y - 150], [x + 32, y - 14]], '#8e8578', INK, 3);
    V.line(ctx, x - 6, y - 30, x - 2, y - 150, 'rgba(60,50,40,0.35)', 3);
    V.line(ctx, x + 12, y - 24, x + 10, y - 120, 'rgba(60,50,40,0.35)', 3);
    // canopy
    const C = [[-150, -300, 95], [-60, -360, 115], [70, -365, 115], [160, -300, 92], [-110, -230, 80], [110, -232, 84], [0, -270, 110]];
    ctx.save();
    ctx.translate(sway, 0);
    ctx.beginPath();
    C.forEach(([cx, cy, r]) => {
      ctx.moveTo(x + cx + r + 4, y + cy);
      ctx.arc(x + cx, y + cy, r + 3.5, 0, Math.PI * 2);
    });
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.beginPath();
    C.forEach(([cx, cy, r]) => {
      ctx.moveTo(x + cx + r, y + cy);
      ctx.arc(x + cx, y + cy, r, 0, Math.PI * 2);
    });
    ctx.fillStyle = '#3e7f45';
    ctx.fill();
    [[-70, -380, 70], [60, -385, 70], [-150, -320, 50], [150, -320, 50], [0, -310, 60]].forEach(([cx, cy, r]) => V.circle(ctx, x + cx, y + cy, r, '#4f9653'));
    [[-50, -405, 32], [80, -405, 30], [-140, -345, 22]].forEach(([cx, cy, r]) => V.circle(ctx, x + cx, y + cy, r, '#66ad62'));
    ctx.restore();
    // round bench (front half)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y - 30, 120, 26, 0, 0, Math.PI);
    ctx.lineWidth = 18;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 13;
    ctx.strokeStyle = '#c48a55';
    ctx.stroke();
    ctx.restore();
    for (const lx of [-90, -30, 30, 90]) {
      const ly = y - 30 + Math.sqrt(Math.max(0, 1 - (lx / 120) ** 2)) * 26;
      V.fillRound(ctx, x + lx - 4, ly + 6, 8, 22, 2, '#6b4a30', INK, 2);
    }
  }

  function palm(ctx, px, gy, s, phase, idx) {
    const H = 470 * s;
    const lean = (idx % 2 ? -1 : 1) * 26 * s;
    const sway = Math.sin(phase * 1.3 + idx) * 5 * s;
    const top = [px + lean + sway, gy - H];
    // trunk
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 30 * s + 6;
    ctx.beginPath();
    ctx.moveTo(px, gy);
    ctx.quadraticCurveTo(px + lean * 0.2, gy - H * 0.55, top[0], top[1]);
    ctx.stroke();
    ctx.strokeStyle = '#a67c52';
    ctx.lineWidth = 30 * s;
    ctx.stroke();
    // trunk rings
    ctx.strokeStyle = 'rgba(80,55,30,0.55)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let k = 0.06; k < 0.96; k += 0.07) {
      const ix = (1 - k) * (1 - k) * px + 2 * (1 - k) * k * (px + lean * 0.2) + k * k * top[0];
      const iy = (1 - k) * (1 - k) * gy + 2 * (1 - k) * k * (gy - H * 0.55) + k * k * top[1];
      ctx.moveTo(ix - 14 * s, iy + 3);
      ctx.quadraticCurveTo(ix, iy - 4, ix + 14 * s, iy + 3);
    }
    ctx.stroke();
    ctx.restore();
    // dates
    for (let k = 0; k < 7; k++) V.circle(ctx, top[0] - 14 * s + (k % 4) * 9 * s, top[1] + 18 * s + Math.floor(k / 4) * 9 * s, 6 * s, k % 2 ? '#e08a2e' : '#c9681f', INK, 1.5);
    // fronds
    const F = [-168, -140, -112, -80, -48, -20, 8, 34, 200, 228];
    F.forEach((deg, i) => {
      const a = V.deg(deg + Math.sin(phase * 1.7 + i * 0.9 + idx) * 4);
      const len = (150 + (i % 3) * 18) * s;
      const droop = 70 * s * (0.6 + 0.4 * Math.abs(Math.cos(a)));
      const ex = top[0] + Math.cos(a) * len, ey = top[1] + Math.sin(a) * len * 0.55 + droop;
      const mx = top[0] + Math.cos(a) * len * 0.5, my = top[1] + Math.sin(a) * len * 0.5 - 20 * s;
      frond(ctx, top, [mx, my], [ex, ey], s, i % 2 ? '#3f8a46' : '#4f9e4a');
    });
    V.circle(ctx, top[0], top[1], 12 * s, '#7a5a34', INK, 2);
  }
  function frond(ctx, p0, c, p1, s, color) {
    const N = 10;
    const up = [], dn = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0];
      const y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1];
      const tx = 2 * (1 - u) * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0]);
      const ty = 2 * (1 - u) * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1]);
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const w = 20 * s * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.8) + 1;
      const zig = i % 2 ? 1.35 : 0.8;
      up.push([x + nx * w * 0.6, y + ny * w * 0.6]);
      dn.push([x - nx * w * zig, y - ny * w * zig]);
    }
    fillPoly(ctx, up.concat(dn.reverse()), color, INK, 2.4);
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
    ctx.strokeStyle = 'rgba(30,60,30,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function flagpole(ctx, o) {
    const F = L.flag;
    V.fillRound(ctx, F.x - 26, F.y - 18, 52, 22, 4, '#d9cdb5', INK, 2.6);
    V.line(ctx, F.x, F.y - 16, F.x, F.top, INK, 10);
    V.line(ctx, F.x, F.y - 16, F.x, F.top, '#e4e6ea', 6);
    V.line(ctx, F.x - 1.5, F.y - 16, F.x - 1.5, F.top, 'rgba(255,255,255,0.8)', 1.5);
    V.circle(ctx, F.x, F.top - 6, 8, '#e8b93a', INK, 2.4);
    // waving flag (texture slices)
    const tex = flagTexture();
    const ph = o.flagPhase === undefined ? (o.t || 0) * 2.4 : o.flagPhase;
    const N = 18, fx = F.x + 4, fyT = F.top + 4;
    const top = [], bot = [];
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      const wv = (u) => Math.sin(ph * Math.PI * 2 - u * 5.2) * 8 * u + u * 6;
      const x0 = fx + u0 * F.w * 0.97, x1 = fx + u1 * F.w * 0.97;
      const d0 = wv(u0);
      ctx.drawImage(tex, (u0 * tex.width), 0, tex.width / N + 1, tex.height, x0, fyT + d0, x1 - x0 + 0.8, F.h);
      const sl = Math.cos(ph * Math.PI * 2 - u0 * 5.2);
      ctx.fillStyle = sl > 0 ? `rgba(255,255,255,${0.12 * sl})` : `rgba(20,30,70,${-0.14 * sl})`;
      ctx.fillRect(x0, fyT + d0, x1 - x0 + 0.8, F.h);
      top.push([x0, fyT + d0]);
      bot.push([x0, fyT + d0 + F.h]);
      if (i === N - 1) {
        top.push([x1, fyT + wv(u1)]);
        bot.push([x1, fyT + wv(u1) + F.h]);
      }
    }
    poly(ctx, top.concat(bot.reverse()));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    // rope
    V.line(ctx, F.x + 4, F.top + 8, F.x + 5, F.y - 30, 'rgba(60,60,70,0.6)', 1.5);
  }

  // ------------------------------------------------------------------ fence + gate
  function fence(ctx) {
    const y = L.fence.y, top = L.fence.top;
    const green = '#3e8c58', dark = '#24563a';
    const G = L.gate;
    // sliding gate panel parked behind the left fence
    drawBars(ctx, G.x0 - 205, G.x0 - 22, y - 2, top + 8, '#357a4c', '#1f4c33', 11);
    drawBars(ctx, L.x0, G.x0 - 26, y, top, green, dark, 0);
    drawBars(ctx, G.x1 + 26, L.x1, y, top, green, dark, 0);
    // gate rail on the ground
    V.line(ctx, G.x0, y - 2, G.x1, y - 2, '#7d8592', 4);
    // pillars
    [[G.x0 - 26, G.x0], [G.x1, G.x1 + 26]].forEach(([a, b]) => {
      stone(ctx, a, top - 40, b, y, '#ead3a6', 91 + a, 18, 26);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.strokeRect(a, top - 40, b - a, y - top + 40);
      V.fillRound(ctx, a - 6, top - 50, b - a + 12, 12, 2, '#fbf0d8', INK, 2.6);
      V.circle(ctx, (a + b) / 2, top - 58, 8, '#fbf0d8', INK, 2.4);
    });
  }
  function drawBars(ctx, x0, x1, y, top, green, dark, off) {
    if (x1 <= x0) return;
    const first = x0 + 8 + off;
    const xs = [];
    for (let x = first; x < x1 - 4; x += 22) if (x > VIEW.x0 - 12 && x < VIEW.x1 + 12) xs.push(x);
    ctx.save();
    ctx.lineCap = 'butt';
    for (let i = 0; i < xs.length; i += CHUNK) {
      const part = xs.slice(i, i + CHUNK);
      ctx.beginPath();
      part.forEach((x) => {
        ctx.moveTo(x, y);
        ctx.lineTo(x, top + 6);
      });
      ctx.strokeStyle = INK;
      ctx.lineWidth = 7.5;
      ctx.stroke();
      ctx.strokeStyle = green;
      ctx.lineWidth = 4.5;
      ctx.stroke();
      ctx.beginPath();
      part.forEach((x) => {
        ctx.moveTo(x - 6, top + 8);
        ctx.lineTo(x, top - 6);
        ctx.lineTo(x + 6, top + 8);
        ctx.closePath();
      });
      ctx.fillStyle = green;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    // rails
    const rx0 = Math.max(x0, VIEW.x0 - 20), rx1 = Math.min(x1, VIEW.x1 + 20);
    if (rx1 > rx0) {
      V.fillRound(ctx, rx0, top + 12, rx1 - rx0, 9, 2, green, INK, 2.4);
      V.fillRound(ctx, rx0, y - 24, rx1 - rx0, 9, 2, green, INK, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(rx0, top + 13.5, rx1 - rx0, 2);
    }
    // posts
    for (let x = x0 + 120; x < x1 - 20; x += 240) {
      if (x < VIEW.x0 - 20 || x > VIEW.x1 + 20) continue;
      V.fillRound(ctx, x - 7, top - 4, 14, y - top + 4, 2, dark, INK, 2.4);
      V.circle(ctx, x, top - 8, 8, dark, INK, 2.2);
    }
  }

  function zoneSign(ctx) {
    const { x, y } = L.zoneSign;
    V.groundShadow(ctx, x, y, 18);
    V.line(ctx, x, y, x, y - 250, INK, 9);
    V.line(ctx, x, y, x, y - 250, '#aab0b8', 5);
    // red-bordered warning triangle with two kids
    const cy = y - 300;
    fillPoly(ctx, [[x, cy - 56], [x + 56, cy + 40], [x - 56, cy + 40]], '#ffffff', INK, 3);
    fillPoly(ctx, [[x, cy - 40], [x + 43, cy + 32], [x - 43, cy + 32]], null, '#d8382c', 9);
    V.circle(ctx, x - 9, cy - 6, 5, INK);
    V.circle(ctx, x + 10, cy - 1, 4, INK);
    V.line(ctx, x - 10, cy, x - 13, cy + 18, INK, 5);
    V.line(ctx, x - 13, cy + 18, x - 18, cy + 28, INK, 3);
    V.line(ctx, x - 13, cy + 18, x - 8, cy + 28, INK, 3);
    V.line(ctx, x + 9, cy + 4, x + 11, cy + 18, INK, 4.5);
    V.line(ctx, x + 11, cy + 18, x + 6, cy + 28, INK, 3);
    V.line(ctx, x + 11, cy + 18, x + 15, cy + 28, INK, 3);
    V.line(ctx, x - 10, cy + 6, x + 9, cy + 8, INK, 2.5);
  }

  // ------------------------------------------------------------------ cast shadows
  const SHADOW = '#2a2244';
  function projector(sctx, sun) {
    const proj = (x, y, fn) => {
      sctx.save();
      sctx.transform(1, 0, -sun.dx, -sun.dy, x, y);
      fn(sctx);
      sctx.restore();
    };
    const person = (x, gy, s, pose) => {
      const hy = B.standY(gy, s, pose);
      const j = B.joints(x, hy, s, pose);
      const rel = (p) => [p[0] - x, p[1] - gy];
      proj(x, gy, (c) => {
        c.lineCap = 'round';
        c.lineJoin = 'round';
        const seg = (pts, w) => {
          c.lineWidth = w;
          c.beginPath();
          pts.forEach((p, i) => {
            const q = rel(p);
            if (i) c.lineTo(q[0], q[1]);
            else c.moveTo(q[0], q[1]);
          });
          c.stroke();
        };
        seg([j.hip, j.nearKnee, j.nearAnkle, j.nearToe], 30 * s);
        seg([j.hip, j.farKnee, j.farAnkle, j.farToe], 30 * s);
        seg([j.hip, j.neck], 74 * s);
        seg([j.shoulder, j.nearElbow, j.nearHand], 24 * s);
        seg([j.shoulder, j.farElbow, j.farHand], 24 * s);
        const h = rel(j.head);
        c.beginPath();
        c.arc(h[0], h[1], 46 * s, 0, Math.PI * 2);
        c.fill();
      });
    };
    return { proj, person, sun };
  }

  function drawShadowLayer(ctx, o, sun, base) {
    if (sun.strength <= 0.01) return;
    // half-resolution layer: cheaper, and the upscale gives soft penumbra edges
    const c = offscreen('shadow', V.W / 2, V.H / 2);
    const s = c.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.clearRect(0, 0, c.width, c.height);
    s.scale(0.5, 0.5);
    s.transform(base.a, base.b, base.c, base.d, base.e, base.f);
    applyCam(s, o.cam);
    s.fillStyle = SHADOW;
    s.strokeStyle = SHADOW;
    const api = projector(s, sun);
    const { proj } = api;
    const fy = L.facadeY;
    // building
    proj(0, fy, (x) => {
      const hw = fy - L.wingTop, hb = fy - L.blockTop, ht = fy - L.towerTop;
      poly(x, [[L.x0, 0], [L.x0, -hw], [L.block.x0, -hw], [L.block.x0, -hb], [L.tower.x0, -hb], [L.tower.x0, -ht], [L.tower.x1, -ht], [L.tower.x1, -hb], [L.block.x1, -hb], [L.block.x1, -hw], [L.x1, -hw], [L.x1, 0]]);
      x.fill();
    });
    // hedges
    proj(0, fy + 6, (x) => x.fillRect(L.x0, -44, L.x1 - L.x0, 44));
    // ficus
    const fx = L.ficus.x;
    proj(fx, L.ficus.y, (x) => {
      x.fillRect(-28, -250, 56, 250);
      x.beginPath();
      [[-150, -300, 95], [-60, -360, 115], [70, -365, 115], [160, -300, 92], [0, -270, 110]].forEach(([cx, cy, r]) => {
        x.moveTo(cx + r, cy);
        x.arc(cx, cy, r, 0, Math.PI * 2);
      });
      x.fill();
    });
    // palms
    L.palms.forEach(([px, gy, ps], i) => {
      const H = 470 * ps, lean = (i % 2 ? -1 : 1) * 26 * ps;
      proj(px, gy, (x) => {
        x.lineWidth = 28 * ps;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(0, 0);
        x.quadraticCurveTo(lean * 0.2, -H * 0.55, lean, -H);
        x.stroke();
        x.beginPath();
        x.ellipse(lean, -H + 30 * ps, 150 * ps, 60 * ps, 0, 0, Math.PI * 2);
        x.fill();
      });
    });
    // flag pole + flag
    const F = L.flag;
    proj(F.x, F.y, (x) => {
      x.fillRect(-4, F.top - F.y, 8, F.y - F.top);
      x.fillRect(4, F.top - F.y + 6, F.w, F.h);
    });
    // fence (bars + rails) and gate pillars
    proj(0, L.fence.y, (x) => {
      const hgt = L.fence.y - L.fence.top;
      const G = L.gate;
      for (const [a, b] of [[L.x0, G.x0 - 26], [G.x1 + 26, L.x1]]) {
        x.fillRect(a, -hgt + 12, b - a, 9);
        x.fillRect(a, -24, b - a, 9);
        for (let bx = a + 8; bx < b - 4; bx += 22) x.fillRect(bx - 2.5, -hgt + 2, 5, hgt - 2);
      }
      x.fillRect(G.x0 - 26, -hgt - 50, 26, hgt + 50);
      x.fillRect(G.x1, -hgt - 50, 26, hgt + 50);
    });
    // street sign
    proj(L.zoneSign.x, L.zoneSign.y, (x) => {
      x.fillRect(-3, -250, 6, 250);
      poly(x, [[0, -356], [56, -260], [-56, -260]]);
      x.fill();
    });
    if (o.actors && o.actors.shadows) o.actors.shadows(s, api);
    // composite (the layer already contains the base transform); shadows only exist below the
    // facade line, so only those rows are copied
    const y0 = Math.floor(V.clamp(V.env.schoolToScreen(o.cam, 0, L.facadeY)[1] / 2 - 1, 0, c.height - 2));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(0.6, sun.strength * (o.shadowBoost || 1));
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(c, 0, y0, c.width, c.height - y0, 0, y0 * 2, V.W, V.H - y0 * 2);
    ctx.restore();
  }

  // ------------------------------------------------------------------ colour grade
  function grade(ctx, o, sun, base) {
    ctx.save();
    ctx.setTransform(base);
    const m = sun.morning, w = sun.warm;
    const amt = 0.1 * m + 0.3 * w;
    if (amt > 0.004) V.tint(ctx, V.mixColor('#dfe9ff', '#ffd6a0', w / (m + w + 1e-6)), amt, 'multiply');
    const [sx, sy] = V.env.schoolToScreen(o.cam, sun.x, sun.y);
    const glow = 0.14 + 0.1 * Math.max(m, w);
    V.lightPool(ctx, sx, sy, 760, sun.color, glow);
    if (o.flicker) {
      const f = V.rand(Math.floor((o.t || 0) * 30) * 1.37) - 0.5;
      if (f > 0) V.tint(ctx, '#ffffff', 0.05 * f * o.flicker, 'screen');
      else V.tint(ctx, '#000000', -0.05 * f * o.flicker, 'source-over');
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ cached sprites
  const SPR = 1; // hedge sprite resolution (1:1 is the cheapest to blit)
  const sprites = {};
  function drawPalms(ctx, wind) {
    L.palms.forEach(([px, gy, ps], i) => {
      if (px + 260 * ps < VIEW.x0 || px - 260 * ps > VIEW.x1) return;
      palm(ctx, px, gy, ps, wind, i);
    });
  }
  function drawHedges(ctx) {
    if (!sprites.hedges) {
      const y0 = L.facadeY - 70, y1 = L.facadeY + 14;
      const c = document.createElement('canvas');
      c.width = Math.ceil((L.x1 - L.x0 + 80) * SPR);
      c.height = Math.ceil((y1 - y0) * SPR);
      const x = c.getContext('2d');
      x.scale(SPR, SPR);
      x.translate(-(L.x0 - 40), -y0);
      hedges(x);
      sprites.hedges = { c, x: L.x0 - 40, y: y0, w: L.x1 - L.x0 + 80, h: y1 - y0 };
    }
    const h = sprites.hedges;
    ctx.drawImage(h.c, h.x, h.y, h.w, h.h);
  }

  // ------------------------------------------------------------------ main entry
  V.env.school = (ctx, o = {}) => {
    o = Object.assign({ hour: 8, t: 0 }, o);
    o.cam = camOf(o.cam);
    const sun = sunInfo(o.hour);
    const sky = V.skyColors(o.hour);
    const hw = V.W / 2 / o.cam.zoom, hh = V.H / 2 / o.cam.zoom;
    VIEW.x0 = o.cam.x - hw - 40;
    VIEW.x1 = o.cam.x + hw + 40;
    VIEW.y0 = o.cam.y - hh - 40;
    VIEW.y1 = o.cam.y + hh + 40;
    const base = ctx.getTransform();
    ctx.save();
    // sky (screen space) — only the strip above the roofline is ever visible
    const skyBot = V.clamp(V.env.schoolToScreen(o.cam, 0, L.wingTop + 16)[1] + 2, 0, V.H);
    const sg = ctx.createLinearGradient(0, 0, 0, V.H);
    sg.addColorStop(0, sky[0]);
    sg.addColorStop(1, sky[1]);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, V.W, skyBot);
    ctx.save();
    applyCam(ctx, o.cam);
    drawSkyWorld(ctx, o, sun);
    drawSkyline(ctx, sun, sky[1]);
    drawBuilding(ctx, o, sun, sky);
    drawClock(ctx, o);
    drawSign(ctx);
    drawCanopy(ctx, sun);
    drawDoorway(ctx, o);
    drawBell(ctx, o);
    drawGround(ctx, o, sun);
    ctx.restore();
    drawShadowLayer(ctx, o, sun, base);
    ctx.save();
    applyCam(ctx, o.cam);
    drawHedges(ctx);
    ficus(ctx, o);
    drawPalms(ctx, o.wind === undefined ? o.t : o.wind);
    flagpole(ctx, o);
    if (o.actors && o.actors.yard) o.actors.yard(ctx);
    fence(ctx);
    if (o.actors && o.actors.street) o.actors.street(ctx);
    zoneSign(ctx);
    if (o.actors && o.actors.front) o.actors.front(ctx);
    ctx.restore();
    if (o.grade !== false) grade(ctx, o, sun, base);
    ctx.restore();
  };

  // ------------------------------------------------------------------ people helpers
  V.env.schoolPerson = (ctx, x, gy, s, pose, opts = {}) => {
    const hy = B.standY(gy, s, pose) - (opts.lift || 0);
    if (opts.contact !== false) V.groundShadow(ctx, x, gy, 50 * s, 0.24 * (opts.shadowAlpha === undefined ? 1 : opts.shadowAlpha));
    B.draw(ctx, x, hy, s, pose);
    return hy;
  };

  const NUM = ['rot', 'torso', 'head', 'brows', 'blush'];
  const LIMBS = [['armNear', ['sh', 'el']], ['armFar', ['sh', 'el']], ['legNear', ['hip', 'knee', 'foot']], ['legFar', ['hip', 'knee', 'foot']]];
  function mix(a, b, k) {
    const r = Object.assign({}, k < 0.5 ? a : b);
    NUM.forEach((f) => (r[f] = V.lerp(a[f] || 0, b[f] || 0, k)));
    LIMBS.forEach(([n, fs]) => {
      r[n] = {};
      fs.forEach((f) => (r[n][f] = V.lerp((a[n] || {})[f] || 0, (b[n] || {})[f] || 0, k)));
    });
    return r;
  }
  V.env.schoolPoseMix = mix;

  // smooth path (Catmull-Rom) with arc length where vertical (depth) motion counts W times
  function makePath(pts, W = 1.8) {
    const S = [];
    const n = pts.length;
    if (n === 1) S.push(pts[0].slice());
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      // Catmull-Rom as Hermite, with each tangent clamped to 2x the segment length: a short segment
      // next to a very long one would otherwise loop back on itself (walkers moonwalk + flip facing)
      const lim = 2 * Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const tan = (a, b) => {
        const tx = (b[0] - a[0]) / 2, ty = (b[1] - a[1]) / 2, m = Math.hypot(tx, ty);
        const k = m > lim && m > 0 ? lim / m : 1;
        return [tx * k, ty * k];
      };
      const m0 = tan(p0, p2), m1 = tan(p1, p3);
      for (let k = 0; k < 14; k++) {
        const u = k / 14, u2 = u * u, u3 = u2 * u;
        const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
        S.push([h00 * p1[0] + h10 * m0[0] + h01 * p2[0] + h11 * m1[0], h00 * p1[1] + h10 * m0[1] + h01 * p2[1] + h11 * m1[1]]);
      }
    }
    if (n > 1) S.push(pts[n - 1].slice());
    const cum = [0];
    for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], (S[i][1] - S[i - 1][1]) * W));
    const len = cum[cum.length - 1];
    const at = (l) => {
      l = V.clamp(l, 0, len);
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= l) lo = mid;
        else hi = mid;
      }
      const k = cum[hi] > cum[lo] ? (l - cum[lo]) / (cum[hi] - cum[lo]) : 0;
      const a = S[lo], b = S[hi] || a;
      return [V.lerp(a[0], b[0], k), V.lerp(a[1], b[1], k), Math.sign(b[0] - a[0])];
    };
    // arc length of the sample closest to (x, y)
    const lengthAt = (x, y) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < S.length; i++) {
        const d = (S[i][0] - x) ** 2 + (S[i][1] - y) ** 2;
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return cum[best];
    };
    return { len, at, lengthAt };
  }
  V.env.schoolPath = makePath;

  const EASE = Object.assign({}, V.ease, { in2: (k) => k * k, out2: (k) => 1 - (1 - k) * (1 - k) });

  // Plan mover keys from SPEEDS so velocity stays continuous through ramps / stops:
  //   V.env.schoolPlan(pts, W, t0, l0, [{to: [x, y] | arcLength, v, ease}, {hold: seconds}, ...])
  //   v = arc-length speed (px/s) at the fast end of the segment; ease: 'in' / 'in2' (ramp up from 0),
  //   'out' / 'out2' (ramp down to 0), 'linear'. Returns keys for schoolMover({ at }).
  V.env.schoolPlan = (pts, W, t0, l0, segs) => {
    const path = makePath(pts, W);
    const keys = [[t0, l0, 'linear']];
    let t = t0, l = l0;
    segs.forEach((sg) => {
      if (sg.hold) {
        t += sg.hold;
        keys.push([t, l, 'linear']);
        return;
      }
      const l1 = Array.isArray(sg.to) ? path.lengthAt(sg.to[0], sg.to[1]) : sg.to;
      const e = sg.ease || 'linear';
      const k = { in: 3, out: 3, inOut: 3, in2: 2, out2: 2, linear: 1 }[e];
      t += sg.dur || (k * Math.abs(l1 - l)) / sg.v;
      l = l1;
      keys.push([t, l, e]);
    });
    return keys;
  };

  V.env.schoolMover = (spec) => {
    const path = makePath(spec.pts, spec.W);
    const size = spec.size || 1;
    const dt = 1 / 120, t0 = spec.t0 === undefined ? -0.5 : spec.t0, t1 = spec.t1 === undefined ? 9 : spec.t1;
    const N = Math.ceil((t1 - t0) / dt) + 2;
    const Ls = new Float64Array(N), Ph = new Float64Array(N), Vs = new Float64Array(N), Gs = new Float64Array(N);
    // optional keyframed arc length: at: [[t, l | [x, y], ease?], ...] (ease of the segment ENDING at that key)
    let keys = null;
    if (spec.at) {
      keys = spec.at.map(([t, p, e]) => [t, Array.isArray(p) ? path.lengthAt(p[0], p[1]) : p, e || 'inOut']);
    }
    const lAt = (t) => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 0; i < keys.length - 1; i++) {
        if (t <= keys[i + 1][0]) return V.lerp(keys[i][1], keys[i + 1][1], EASE[keys[i + 1][2]](V.seg(t, keys[i][0], keys[i + 1][0])));
      }
      return keys[keys.length - 1][1];
    };
    let l = keys ? lAt(t0) : spec.l0 || 0, ph = spec.phase0 || 0;
    for (let i = 0; i < N; i++) {
      const t = t0 + i * dt;
      const g = spec.run ? V.kf(t, spec.run, 'inOut') : 0;
      const y = path.at(l)[1];
      const s = scaleAt(y) * size;
      let v, dl;
      if (keys) {
        dl = lAt(t + dt) - l;
        v = Math.abs(dl) / (s * dt);
      } else {
        v = V.kf(t, spec.v, 'inOut');
        if (l >= path.len - 0.01) v = 0;
        dl = Math.min(path.len - l, v * s * dt);
      }
      Ls[i] = l;
      Ph[i] = ph;
      Vs[i] = v;
      Gs[i] = g;
      l = V.clamp(l + dl, 0, path.len);
      ph += (v * dt) / V.lerp(316, 520, g);
    }
    const at = (t) => {
      const f = V.clamp((t - t0) / dt, 0, N - 1.001);
      const i = Math.floor(f), k = f - i;
      const l = V.lerp(Ls[i], Ls[i + 1], k);
      const [x, y, dir] = path.at(l);
      return {
        x, y, dir, l,
        s: scaleAt(y) * size,
        phase: V.lerp(Ph[i], Ph[i + 1], k),
        v: V.lerp(Vs[i], Vs[i + 1], k),
        g: V.lerp(Gs[i], Gs[i + 1], k),
        done: l >= path.len - 0.5,
      };
    };
    return { at, path, len: path.len };
  };

  // walk / run / stand blended from a mover state
  V.env.schoolGait = (m, o = {}) => {
    const moving = V.clamp(m.v / 140);
    let p = m.g > 0.001 ? mix(P.walk(m.phase), P.run(m.phase), m.g) : P.walk(m.phase);
    if (moving < 1) p = mix(P.stand(), p, V.ease.sine(moving));
    p.mouth = 'smile';
    return Object.assign(p, o);
  };

  // 2-bone IK: put the hand of `side` arm on world point target (rot 0 poses)
  V.env.schoolArmIK = (pose, x, hipY, s, side, target, flip) => {
    pose = Object.assign(P.stand(), pose);
    const f = pose.facing || 1;
    const j = B.fk(pose);
    const arm = side === 'far' ? j.armFar : j.armNear;
    const sx = x + f * s * arm.s[0], sy = hipY + s * arm.s[1];
    const dx = (target[0] - sx) / (f * s), dy = (target[1] - sy) / s;
    const UA = B.D.UA, FA = B.D.FA;
    const d = V.clamp(Math.hypot(dx, dy), 10, UA + FA - 0.5);
    const at = Math.atan2(dx, dy);
    const A = Math.acos(V.clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1));
    const ua = flip ? at + A : at - A;
    const ex = Math.sin(ua) * UA, ey = Math.cos(ua) * UA;
    const fa = Math.atan2(dx - ex, dy - ey);
    const out = { sh: (ua * 180) / Math.PI - pose.torso, el: ((fa - ua) * 180) / Math.PI };
    if (side === 'far') pose.armFar = out;
    else pose.armNear = out;
    return pose;
  };

  // facing for a quick "squash" turn from `from` (+1/-1) to `to` between t0 and t0+dur
  V.env.schoolTurn = (t, t0, dur, from, to) => {
    if (from === to) return from;
    const k = V.ease.inOut(V.seg(t, t0, t0 + dur));
    let f = V.lerp(from, to, (1 - Math.cos(Math.PI * k)) / 2);
    if (Math.abs(f) < 0.14) f = (k < 0.5 ? Math.sign(from) : Math.sign(to)) * 0.14;
    return f;
  };

  // Draw fn(ctx) through an offscreen layer so it can be faded / tinted as ONE image
  // (no see-through overlapping limbs).  o = {alpha, shade: '#rrggbb', shadeAlpha, blur: [dx, dy, n]}
  V.env.schoolLayer = (ctx, fn, o = {}) => {
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    const sa = o.shadeAlpha || 0;
    if (alpha >= 0.999 && sa <= 0.001 && !o.blur) {
      fn(ctx);
      return;
    }
    if (alpha <= 0.002) return;
    const c = offscreen('layer', V.W, V.H), x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, V.W, V.H);
    x.setTransform(ctx.getTransform());
    fn(x);
    x.setTransform(1, 0, 0, 1, 0, 0);
    if (sa > 0.001) {
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = V.rgba(o.shade || '#16161f', V.clamp(sa));
      x.fillRect(0, 0, V.W, V.H);
      x.globalCompositeOperation = 'source-over';
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.blur) {
      const [bx, by, n] = o.blur;
      for (let i = n; i >= 1; i--) {
        ctx.globalAlpha = (alpha * 0.45) / (i + 0.5);
        ctx.drawImage(c, -bx * (i / n), -by * (i / n));
      }
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  };

  // The recurring classmates (same faces in 06 and 08). Use with the rig:
  //   P.walk(ph, { look: K.friend.look, outfit: K.friend.outfit, backpack: K.friend.backpack, headProp: K.friend.prop })
  //   and multiply the depth scale by K.<name>.size (classmates are a touch smaller than the hero).
  const PR = () => V.env.schoolProps;
  V.env.SCHOOL_KIDS = {
    // the hero's best friend: curly hair, light-blue school tee, red backpack
    friend: { look: { skin: '#9a6243', hair: '#1b1411', hairStyle: 'curly' }, outfit: { shirt: '#8ec5ee', logo: true, sleeves: 'short', pants: '#34405a', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#2a2a33', shoeAccent: '#f6c945' }, backpack: '#e2463c', size: 0.97 },
    maya: { look: { skin: '#f1c4a2', hair: '#7a4426', hairStyle: 'ponytail' }, outfit: { shirt: '#2c3e66', logo: true, sleeves: 'short', pants: '#6b7fae', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#ffffff', shoeAccent: '#e86fa0' }, backpack: '#e86fa0', size: 0.92, prop: () => PR().combine(PR().lashes(), PR().bow('#e86fa0')) },
    ori: { look: { skin: '#f3d0b2', hair: '#d9b25c', hairStyle: 'short' }, outfit: { shirt: '#b9c0cb', logo: true, sleeves: 'short', pants: '#3b4a66', pantsLen: 'shorts', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#3b7dd8' }, backpack: '#f39a3d', size: 0.95 },
    shira: { look: { skin: '#c9926c', hair: '#1a1414', hairStyle: 'long' }, outfit: { shirt: '#9cc8ef', logo: true, sleeves: 'short', pants: '#2d3550', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#8a5cc7' }, backpack: '#8a5cc7', size: 0.93, prop: () => PR().lashes() },
    tamar: { look: { skin: '#f6d6bd', hair: '#e2bd6a', hairStyle: 'ponytail' }, outfit: { shirt: '#f2a8c0', logo: true, sleeves: 'short', pants: '#5b78b5', pantsLen: 'shorts', shoes: 'sneakers', shoeColor: '#ffffff', shoeAccent: '#2fa59a' }, backpack: '#2fa59a', size: 0.86, prop: () => PR().combine(PR().lashes(), PR().bow('#f6c945')) },
    daniel: { look: { skin: '#7a4b2f', hair: '#111111', hairStyle: 'buzz' }, outfit: { shirt: '#2c3e66', logo: true, sleeves: 'short', pants: '#3a3f4f', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#e9e9e9', shoeAccent: '#5aa35a' }, backpack: '#4f9e44', size: 0.96, prop: () => PR().glasses() },
    yoni: { look: { skin: '#e5b48c', hair: '#3a2a1e', hairStyle: 'cap', capColor: '#d8382c' }, outfit: { shirt: '#9b3b4a', logo: true, sleeves: 'short', pants: '#2f4f86', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#d8382c' }, backpack: '#f6c945', size: 0.94 },
    noa: { look: { skin: '#e0a882', hair: '#5a2e1a', hairStyle: 'long' }, outfit: { shirt: '#f6c945', logo: true, sleeves: 'short', pants: '#34405a', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#ffffff', shoeAccent: '#3b7dd8' }, backpack: '#3fb0a0', size: 0.9, prop: () => PR().lashes() },
  };

  // headProps for classmates (head frame: face toward +x, eyes at (18,-6) and (33,-6))
  V.env.schoolProps = {
    glasses: (color = '#2a2a33') => (ctx) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(17, -5, 10, 0, Math.PI * 2);
      ctx.moveTo(41, -5);
      ctx.arc(34, -5, 7.5, 0, Math.PI * 2);
      ctx.moveTo(26, -7);
      ctx.lineTo(27, -7);
      ctx.moveTo(7, -6);
      ctx.lineTo(-10, -2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.restore();
    },
    lashes: () => (ctx) => {
      V.line(ctx, 12, -11, 8, -15, INK, 2.6);
      V.line(ctx, 14, -13, 12, -18, INK, 2.2);
    },
    bow: (color = '#e2463c') => (ctx) => {
      ctx.save();
      ctx.translate(-22, -46);
      fillPoly(ctx, [[0, 0], [-14, -10], [-14, 10]], color, INK, 2);
      fillPoly(ctx, [[0, 0], [14, -10], [14, 10]], color, INK, 2);
      V.circle(ctx, 0, 0, 4, V.shade(color, -0.2), INK, 1.5);
      ctx.restore();
    },
    combine: (...fns) => (ctx) => fns.forEach((f) => f && f(ctx)),
  };
})();
