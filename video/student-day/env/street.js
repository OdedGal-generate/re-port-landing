// Shared helpers for the 'street' location group (scenes 05-leave, 09-walk-home, 13-back-home).
//
// ============================================================================================
//  THE HOUSE FRONT + STREET — API
// ============================================================================================
//
//  One side-scrolling WORLD (px). The family's house stands at x = 0 (door centre); the street
//  toward school continues to the RIGHT (+x). Going to school = moving right, going home = left.
//  A camera maps world -> screen:
//
//     cam = { x, y, zoom }   world point (x, y) lands on the screen centre. zoom 1 = 1:1.
//     e.g. {x: 100, y: 300, zoom: 0.7} = establishing shot of the whole house (roof to sidewalk)
//          {x: 150, y: 640, zoom: 1.2} = medium shot of the porch / door
//     Parallax layers are derived from the same camera (sky 0, far city 0.3, trees 0.55,
//     set-back neighbour houses 0.85, walk plane 1).
//
//  One call draws the whole frame (recommended):
//
//     V.env.street(ctx, o)
//        o.cam          {x, y, zoom}                       (o.camX alone also works)
//        o.hour         0..24  sky, sun/moon, colour grade, shadow length & direction
//                              (7.9 morning: low golden sun on the LEFT, long shadows to the right;
//                               15.1 afternoon: sun high on the right, short shadows to the left;
//                               18 dusk: no hard shadows, orange-purple; 21+ night)
//        o.t            seconds (clouds, birds, leaves, lamp flicker helpers)
//        o.windowsLit   0..1   house + neighbours + far city windows glow warm (default by hour)
//        o.windows      {gl, gr, ul, uc, ur} per-window override 0..1 for the family house
//                       (ground-left, ground-right/salon, upper-left, upper-centre balcony, upper-right)
//        o.doorOpen     0..1   front door swings INTO the house (hinge on the LEFT jamb)
//        o.interiorLit  0..1   warm hallway light behind the door (default = windowsLit);
//                              with doorOpen > 0 it spills onto the porch / steps / sidewalk
//        o.lamps        0..1 or fn(i, x) -> 0..1   street lamps (+ the porch wall lamp)
//        o.birds        bool   a little flock crossing the sky
//        o.house        bool   draw the family house (default true)
//        o.inside(ctx)  WORLD coords: people inside the doorway. Drawn after the hallway and
//                       BEFORE the door leaf + facade, so the door frame / closing door covers them.
//        o.props(ctx)   WORLD coords: extra scenery on the walk plane, drawn after garden walls /
//                       lamps and before the actors (e.g. V.env.cat on a wall).
//        o.actors(ctx)  WORLD coords: people on the porch / steps / sidewalk.
//        o.front(ctx)   WORLD coords: in front of everything on the walk plane (e.g. a passing car).
//        o.overlay(ctx) SCREEN coords, after the colour grade and lights.
//     The whole world (actors included) gets the hour's colour grade; window / lamp / door light
//     is re-added on top afterwards.
//
//  Lower-level pieces:
//     V.env.houseFront(ctx, o)        just the house (+ its garden, porch, steps, mailbox) in world
//                                     coords — the caller applies the camera (V.env.streetCam).
//                                     Same options as street (hour, windowsLit, doorOpen, inside ...)
//     V.env.streetCam(ctx, cam, f=1)  apply camera for a parallax factor (caller saves/restores)
//     V.env.streetToScreen(cam, x, y) -> [sx, sy]
//     V.env.streetLight(hour)         -> {wash, washA, shL, shK, shA, night, ...} colour grade
//     V.env.streetGroundY(x)          walkable ground under world x (porch 822, steps 848/874, 900)
//     V.env.streetHipY(x, s, pose)    hip y so each foot stands on the porch / step / sidewalk under
//                                     it (use instead of V.boy.standY on the stairs)
//     V.env.streetStep(x, s, pose)    -> {y, pose}: walking up/down the steps — hip follows the
//                                     supporting leg, the leg on the higher level bends (leg IK)
//     V.env.streetDoorHandle(open)    -> [x, y] outside door lever for a door opening 0..1
//     V.env.streetCastShadow(ctx, o, groundY, fn)  long cast shadow of fn(ctx) (world drawing, e.g.
//                                     the hero) onto the ground, direction/length from o.hour.
//                                     Call it inside o.actors BEFORE drawing the figure.
//     V.env.streetIK.arm(pose, x, y, s, 'near'|'far', [wx, wy])  2-bone IK: hand to a world point
//     V.env.cat(ctx, x, y, s, {look: -1..1, tail: phase, blink, t})  sitting ginger cat, (x,y) = paws
//     V.env.car(ctx, x, yWheels, s, {color, dir: ±1, dist, blur})    cartoon hatchback, side view
//
//  LAYOUT  V.env.STREET (world px) — hero scale on this set: heroScale 1 (standing ~430 px tall)
//     GY 900               the walk line: feet on the sidewalk (B.standY(900, 1, pose))
//     sidewalk             y 862 (back edge, garden walls / lamps / mailbox stand here) .. 940
//     curb                 y 940..960 (red-white painted), road below 960
//     house facade         x -440..640, ground floor y 232..800, upper floor -150..232,
//                          roof ridge y -335 (solar water heater on the right of the roof)
//     door                 x -110..110, top 292, threshold (sill) y 812; hinge on the LEFT,
//                          outside lever at (84, 560); mezuzah on the right post; number "12"
//     porch                x -190..300, top surface y 812 (threshold) .. 822 (front edge)
//                          -> stand on the porch with feet at y 822 (in the doorway: 812)
//     steps (to the RIGHT) step 1 x 300..360 top 848, step 2 x 360..420 top 874, then sidewalk 900
//     mailbox pillar       x 424..478 (right of the steps); lemon tree x 580 (right garden)
//     street lamps         x -560, 780, 2140, 3500, 4860 (back edge of the sidewalk)
//     interior (hallway)   visible through the open door: floor y ~800 (people inside: feet 800..812,
//                          scale ~0.9 of the hero to read as "further in")
// ============================================================================================
(function () {
  const V = window.V;
  V.env = V.env || {};
  const INK = V.pal.ink;
  const Y0 = 560; // default camera y (parallax anchor)

  const ST = {
    GY: 900,
    walkBack: 862,
    curbY: 940,
    roadY: 960,
    gardenY: 776,
    heroScale: 1,
    house: {
      x0: -440, x1: 640, base: 800, gfTop: 232, ufTop: -150, ridge: -335,
      door: { x0: -110, x1: 110, top: 292, sill: 812 },
      porch: { x0: -190, x1: 300, top: 822, back: 812 },
      steps: [{ x0: 300, x1: 360, top: 848 }, { x0: 360, x1: 420, top: 874 }],
      handle: { x: 84, y: 560 },
      mailbox: { x0: 424, x1: 478 },
      lemon: { x: 580, y: 846 },
    },
    lamps: [-560, 780, 2140, 3500, 4860, 6220, -1920],
    streetTrees: [1660, 2860, 4160, 5520, -1260],
  };
  V.env.STREET = ST;

  // ------------------------------------------------------------------ camera
  const camZ = (cam, f) => 1 + (cam.zoom - 1) * f;
  function camApply(ctx, cam, f = 1) {
    const z = camZ(cam, f);
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(z, z);
    ctx.translate(-cam.x * f, -(cam.y * f + Y0 * (1 - f)));
  }
  function toScreen(cam, x, y, f = 1) {
    const z = camZ(cam, f);
    return [(x - cam.x * f) * z + V.W / 2, (y - (cam.y * f + Y0 * (1 - f))) * z + V.H / 2];
  }
  function visRange(cam, f, pad = 0) {
    const z = camZ(cam, f);
    return [cam.x * f - V.W / 2 / z - pad, cam.x * f + V.W / 2 / z + pad];
  }
  const normCam = (o) => {
    const c = o.cam || {};
    return { x: c.x !== undefined ? c.x : o.camX || 0, y: c.y !== undefined ? c.y : Y0, zoom: c.zoom || 1 };
  };
  V.env.streetCam = camApply;
  V.env.streetToScreen = toScreen;

  // ------------------------------------------------------------------ light by hour
  // hour, wash colour, wash alpha, shadow L (+ = shadows fall to the right), shadow alpha
  const GRADE = [
    [0, '#0e1646', 0.5, 0, 0],
    [5.5, '#2a2a66', 0.42, 0, 0],
    [6.8, '#ff9a5a', 0.22, 1.8, 0.16],
    [7.9, '#ffa452', 0.16, 1.45, 0.32],
    [10, '#fff1d6', 0.04, 0.8, 0.28],
    [13, '#ffffff', 0.0, -0.2, 0.26],
    [15.1, '#ffe4b8', 0.05, -0.75, 0.27],
    [16.6, '#ff9e52', 0.12, -1.5, 0.22],
    [17.6, '#e46a6a', 0.22, -2, 0.07],
    [18.0, '#6a4790', 0.3, 0, 0],
    [18.6, '#45357e', 0.38, 0, 0],
    [19.6, '#1d2462', 0.48, 0, 0],
    [24, '#0e1646', 0.5, 0, 0],
  ];
  function light(hour) {
    const h = ((hour % 24) + 24) % 24;
    let i = 0;
    while (i < GRADE.length - 2 && h > GRADE[i + 1][0]) i++;
    const A = GRADE[i], B = GRADE[i + 1];
    const k = V.clamp((h - A[0]) / (B[0] - A[0]));
    const [skyTop, skyBottom] = V.skyColors(h);
    // 0 = full day, 1 = night (windows, lamps)
    const night = h >= 12 ? V.clamp((h - 17.2) / 2) : V.clamp((6.6 - h) / 1.2);
    const dusk = h >= 12 ? V.clamp(1 - Math.abs(h - 18.1) / 1.2) : V.clamp(1 - Math.abs(h - 6.3) / 1);
    return {
      hour: h,
      wash: V.mixColor(A[1], B[1], k),
      washA: V.lerp(A[2], B[2], k),
      shL: V.lerp(A[3], B[3], k),
      shK: h < 12 ? 0.2 : 0.16,
      shA: V.lerp(A[4], B[4], k),
      night, dusk, skyTop, skyBottom,
      morning: h < 12 ? V.clamp(1 - Math.abs(h - 7.8) / 1.6) : 0,
    };
  }
  V.env.streetLight = light;
  // emissive light colour for windows / lamps
  const WARM = '#ffd27a';

  // ------------------------------------------------------------------ ground / walking
  function groundAt(x) {
    const H = ST.house;
    if (x >= H.porch.x0 && x < H.porch.x1) return H.porch.top;
    for (const s of H.steps) if (x >= s.x0 && x < s.x1) return s.top;
    return ST.GY;
  }
  V.env.streetGroundY = groundAt;
  // hip y with each foot standing on whatever is under it (porch / step / sidewalk)
  V.env.streetHipY = (x, s, pose) => {
    const B = V.boy;
    const p = Object.assign(B.pose.stand(), pose);
    const j = B.fk(p);
    const f = p.facing || 1;
    let hip = Infinity;
    for (const l of [j.legNear, j.legFar]) {
      const low = Math.max(l.a[1], l.toe[1]) * s + 11 * s;
      // sample the ground under heel and toe; the foot must clear both
      const xs = [x + f * l.a[0] * s, x + f * (l.a[0] + l.toe[0]) * 0.5 * s, x + f * l.toe[0] * s];
      let g = Infinity;
      for (const fx of xs) g = Math.min(g, groundAt(fx));
      hip = Math.min(hip, g - low);
    }
    return hip;
  };
  // Walking up / down the porch steps. Like streetHipY, but when the two feet are over different
  // levels the hip follows the SUPPORTING leg (the straighter knee) instead of the higher foot, and
  // the leg over the higher level bends (2-bone leg IK) so its foot stays on its step. So a leading
  // foot reaches DOWN onto the lower step (the body lowers as it lands) rather than swinging out over
  // the steps at porch height, and a trailing foot no longer holds the hip up on the higher level.
  // On level ground it equals streetHipY. Returns { y: hip y, pose: copy with adjusted legs }.
  const legIK = (lp, l, dx, lift) => {
    const Dm = V.boy.D;
    const tx = l.a[0] - dx, ty = l.a[1] - lift; // ankle target, relative to the hip joint
    const d = V.clamp(Math.hypot(tx, ty), Math.abs(Dm.TH - Dm.SH) + 1, Dm.TH + Dm.SH - 0.01);
    const al = deg2(Math.acos(V.clamp((Dm.TH * Dm.TH + d * d - Dm.SH * Dm.SH) / (2 * Dm.TH * d), -1, 1)));
    const ta = deg2(Math.atan2(tx, ty)) + al; // knee forward
    const kx = dx + Math.sin(V.deg(ta)) * Dm.TH, ky = Math.cos(V.deg(ta)) * Dm.TH;
    const sa = deg2(Math.atan2(l.a[0] - kx, ty - ky));
    return Object.assign({}, lp, { hip: ta, knee: sa - ta, foot: l.fa - sa - 90 }); // foot keeps its angle
  };
  V.env.streetStep = (x, s, pose) => {
    const B = V.boy;
    const p = Object.assign(B.pose.stand(), pose);
    const j = B.fk(p);
    const f = p.facing || 1;
    const legs = [['legNear', j.legNear, 5], ['legFar', j.legFar, -5]].map(([key, l, dx]) => {
      const low = Math.max(l.a[1], l.toe[1]) * s + 11 * s;
      // ground under the shoe (heel just behind the ankle .. toe): the highest level wins
      const xs = [x + f * (l.a[0] - 10) * s, x + f * (l.a[0] + l.toe[0]) * 0.5 * s, x + f * l.toe[0] * s];
      let g = Infinity;
      for (const fx of xs) g = Math.min(g, groundAt(fx));
      const bend = -(p[key].knee || 0);
      return { key, l, dx, g, need: g - low, sup: 1 - V.clamp((bend - 6) / 42) };
    });
    const [a, b] = legs;
    const lo = Math.min(a.need, b.need);
    const y = a.g === b.g ? lo : lo + Math.max(a.sup * (a.need - lo), b.sup * (b.need - lo));
    const out = Object.assign({}, pose);
    for (const L of legs) {
      const pen = y - L.need; // > 0: this foot would sink into its step -> bend that leg
      if (pen > 0) out[L.key] = legIK(p[L.key], L.l, L.dx, pen / s);
    }
    return { y, pose: out };
  };
  // door lever (outside) for an opening 0..1
  const DOOR_MAX = 84; // degrees fully open
  function doorEdgeX(open) {
    const d = ST.house.door;
    return d.x0 + (d.x1 - d.x0) * Math.cos(V.deg(open * DOOR_MAX));
  }
  V.env.streetDoorHandle = (open = 0) => {
    const d = ST.house.door;
    const w = d.x1 - d.x0;
    const u = (ST.house.handle.x - d.x0) / w;
    const a = V.deg(open * DOOR_MAX);
    const x = d.x0 + w * u * Math.cos(a);
    const y = ST.house.handle.y + (ST.house.handle.y - (d.top + d.sill) / 2) * -0.06 * Math.sin(a) * u;
    return [x, y];
  };

  // ------------------------------------------------------------------ 2-bone IK
  const deg2 = (r) => (r * 180) / Math.PI;
  V.env.streetIK = {
    arm(pose, x, y, s, which, target, flip) {
      const B = V.boy, Dm = B.D;
      const full = B.pose.stand(pose);
      const j = B.fk(full);
      const f = full.facing || 1;
      const lx = (target[0] - x) / (s * f), ly = (target[1] - y) / s;
      const sx = j.shoulder[0] + (which === 'far' ? -6 : 4), sy = j.shoulder[1];
      const dx = lx - sx, dy = ly - sy;
      const d = V.clamp(Math.hypot(dx, dy), 8, Dm.UA + Dm.FA - 0.5);
      const base = deg2(Math.atan2(dx, dy)); // from straight down, + toward facing
      const al = deg2(Math.acos(V.clamp((Dm.UA * Dm.UA + d * d - Dm.FA * Dm.FA) / (2 * Dm.UA * d), -1, 1)));
      const ua = flip ? base + al : base - al;
      const ex = sx + Math.sin(V.deg(ua)) * Dm.UA, ey = sy + Math.cos(V.deg(ua)) * Dm.UA;
      const fa = deg2(Math.atan2(lx - ex, ly - ey));
      let el = fa - ua;
      while (el > 180) el -= 360;
      while (el < -180) el += 360;
      pose[which === 'far' ? 'armFar' : 'armNear'] = { sh: ua - (full.torso || 0), el };
      return pose;
    },
  };

  // ------------------------------------------------------------------ small drawing helpers
  const rr = (ctx, x, y, w, h, r, fill, stroke, lw = 3) => V.fillRound(ctx, x, y, w, h, r, fill, stroke, lw);
  const rect = (ctx, x, y, w, h, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  };
  const poly = (ctx, pts, fill, stroke, lw = 3) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };
  const blob = (ctx, pts, fill) => {
    ctx.beginPath();
    pts.forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    });
    ctx.fillStyle = fill;
    ctx.fill();
  };

  // ground-plane cast shadow transform (world coords): a point at height h above G lands at
  // (x + L*h, G + k*h)
  function shadowXf(ctx, G, L, k) {
    ctx.transform(1, 0, -L, -k, L * G, G * (1 + k));
  }
  function castShadow(ctx, Lt, G, fn, alpha = 1) {
    if (Lt.shA <= 0.01 || Math.abs(Lt.shL) < 0.02) return;
    ctx.save();
    shadowXf(ctx, G, Lt.shL, Lt.shK);
    ctx.globalAlpha = Lt.shA * alpha;
    ctx.fillStyle = '#2a1c3a';
    ctx.strokeStyle = '#2a1c3a';
    fn(ctx);
    ctx.restore();
  }
  // contact shadow blob for things at dusk / everywhere
  const contact = (ctx, x, y, rx, a = 0.18) => V.ellipse(ctx, x, y, rx, Math.max(3, rx * 0.14), `rgba(30,20,40,${a})`);

  // ------------------------------------------------------------------ windows
  // x,y top-left of the glass; o: {lit, shutter, curtain, mullion:'v'|'cross'|'none', box, sill,
  // flowers, L, glow, frame}
  function drawWindow(ctx, x, y, w, h, o) {
    const L = o.L;
    const frame = o.frame || '#fbf8f2';
    // casing
    rr(ctx, x - 12, y - 12, w + 24, h + 24, 5, frame, INK, 3);
    glassFill(ctx, x, y, w, h, o, false);
    if (o.lit > 0.02 && o.glow) {
      o.glow.push({ f: 1, fn: (c) => {
        c.save();
        c.globalAlpha = V.clamp(o.lit);
        glassFill(c, x, y, w, h, o, true);
        c.restore();
      } });
      o.glow.push({ f: 1, light: true, fn: (c) => V.lightPool(c, x + w / 2, y + h / 2, Math.max(w, h) * 1.05, '#ffb55a', 0.2 * o.lit) });
    }
    // roller-shutter box + sill
    if (o.box !== false) rr(ctx, x - 16, y - 40, w + 32, 26, 4, V.shade(frame, -0.04), INK, 3);
    if (o.sill !== false) {
      rr(ctx, x - 20, y + h + 8, w + 40, 13, 3, '#f4efe6', INK, 3);
      rect(ctx, x - 14, y + h + 21, w + 28, 7, 'rgba(40,30,50,0.18)');
    }
    if (o.flowers) {
      rr(ctx, x - 6, y + h + 21, w + 12, 30, 6, '#b8673f', INK, 3);
      const n = Math.floor(w / 26);
      for (let i = 0; i < n; i++) {
        const fx = x + 8 + (i + 0.5) * ((w - 16) / n);
        blob(ctx, [[fx - 8, y + h + 14, 11], [fx + 7, y + h + 12, 10]], V.pal.leafDark);
        V.circle(ctx, fx - 4, y + h + 8, 6, o.flowers);
        V.circle(ctx, fx + 6, y + h + 5, 5, V.shade(o.flowers, 0.2));
      }
    }
  }
  function glassFill(ctx, x, y, w, h, o, lit) {
    const L = o.L;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (lit) {
      g.addColorStop(0, '#ffe9b0');
      g.addColorStop(1, '#f3a957');
    } else {
      g.addColorStop(0, V.mixColor(L.skyTop, '#ffffff', 0.35));
      g.addColorStop(1, V.mixColor(L.skyBottom, '#5c7896', 0.45));
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // curtains (inside)
    const cc = o.curtain || '#f2d7c4';
    const cl = lit ? V.mixColor(cc, '#ff9a40', 0.35) : V.mixColor(cc, L.skyBottom, 0.25);
    ctx.fillStyle = cl;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.24, y);
    ctx.quadraticCurveTo(x + w * 0.12, y + h * 0.5, x + w * 0.2, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w * 0.76, y);
    ctx.quadraticCurveTo(x + w * 0.88, y + h * 0.5, x + w * 0.8, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
    if (lit && o.lamp) {
      // a little floor lamp silhouette inside
      V.line(ctx, x + w * 0.62, y + h, x + w * 0.62, y + h * 0.45, 'rgba(120,60,20,0.55)', 4);
      poly(ctx, [[x + w * 0.62 - 20, y + h * 0.47], [x + w * 0.62 + 20, y + h * 0.47], [x + w * 0.62 + 13, y + h * 0.3], [x + w * 0.62 - 13, y + h * 0.3]], '#fff2c8');
    }
    if (!lit) {
      // reflection streaks
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y);
      ctx.lineTo(x + w * 0.52, y);
      ctx.lineTo(x + w * 0.12, y + h);
      ctx.lineTo(x - w * 0.1, y + h);
      ctx.closePath();
      ctx.moveTo(x + w * 0.62, y);
      ctx.lineTo(x + w * 0.68, y);
      ctx.lineTo(x + w * 0.28, y + h);
      ctx.lineTo(x + w * 0.22, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // roller shutter (partly down)
    const sh = o.shutter || 0;
    if (sh > 0) {
      const sc = lit ? '#e9c58e' : '#e6e1d7';
      rect(ctx, x, y, w, h * sh, sc);
      ctx.strokeStyle = V.shade(sc, -0.18);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let yy = y + 7; yy < y + h * sh; yy += 8) {
        ctx.moveTo(x, yy);
        ctx.lineTo(x + w, yy);
      }
      ctx.stroke();
      rect(ctx, x, y + h * sh - 4, w, 4, V.shade(sc, -0.25));
    }
    ctx.restore();
    // mullions + glass outline
    const fr = o.frame || '#fbf8f2';
    if (o.mullion !== 'none') {
      rect(ctx, x + w / 2 - 4, y, 8, h, fr);
      if (o.mullion === 'cross') rect(ctx, x, y + h * 0.42 - 4, w, 8, fr);
    }
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x, y, w, h);
  }

  // ------------------------------------------------------------------ the family house
  const PLASTER = '#f7ead6';
  const STONE = '#ead5ae';
  const TILE = '#cf5a3d';
  const DOORC = '#2f7c86';

  function drawFacade(ctx, o, L) {
    const H = ST.house;
    const w = H.x1 - H.x0;
    // upper floor plaster
    rect(ctx, H.x0, H.ufTop, w, H.gfTop - H.ufTop + 4, PLASTER);
    // soft plaster mottling
    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 16; i++) V.ellipse(ctx, H.x0 + V.rand(i * 3.3) * w, H.ufTop + 30 + V.rand(i * 7.1) * 330, 40 + V.rand(i) * 60, 18 + V.rand(i * 2) * 20, '#b08a5a');
    ctx.restore();
    // ground floor: Jerusalem-stone blocks
    rect(ctx, H.x0, H.gfTop, w, H.base - H.gfTop, STONE);
    ctx.save();
    ctx.beginPath();
    ctx.rect(H.x0, H.gfTop, w, H.base - H.gfTop);
    ctx.clip();
    const rowH = 46;
    let row = 0;
    for (let y = H.gfTop + 6; y < H.base; y += rowH, row++) {
      const off = (row % 2) * 48;
      for (let x = H.x0 - 96 + off; x < H.x1; x += 96) {
        const r = V.rand(row * 31.7 + x * 0.13);
        if (r > 0.55) rect(ctx, x + 2, y + 2, 92, rowH - 4, r > 0.8 ? 'rgba(255,255,255,0.22)' : 'rgba(170,120,60,0.1)');
      }
    }
    ctx.strokeStyle = 'rgba(150,110,60,0.38)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    row = 0;
    for (let y = H.gfTop + 6; y < H.base; y += rowH, row++) {
      ctx.moveTo(H.x0, y);
      ctx.lineTo(H.x1, y);
      const off = (row % 2) * 48;
      for (let x = H.x0 - 96 + off; x < H.x1; x += 96) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
      }
    }
    ctx.stroke();
    ctx.restore();
    // morning: warm light raking from the left, cooler on the right
    if (L.morning > 0) {
      const g = ctx.createLinearGradient(H.x0, 0, H.x1, 0);
      g.addColorStop(0, `rgba(255,200,120,${0.18 * L.morning})`);
      g.addColorStop(1, `rgba(90,70,140,${0.12 * L.morning})`);
      ctx.fillStyle = g;
      ctx.fillRect(H.x0, H.ufTop, w, H.base - H.ufTop);
    }
    // side shading + outline
    rect(ctx, H.x1 - 16, H.ufTop, 16, H.base - H.ufTop, 'rgba(60,40,70,0.12)');
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.strokeRect(H.x0, H.ufTop, w, H.base - H.ufTop);
    // floor band
    rr(ctx, H.x0 - 16, H.gfTop - 20, w + 32, 26, 4, '#fbf8f1', INK, 3);
    rect(ctx, H.x0, H.gfTop + 6, w, 10, 'rgba(60,40,70,0.14)');
    // eave shadow
    const eg = ctx.createLinearGradient(0, H.ufTop, 0, H.ufTop + 60);
    eg.addColorStop(0, 'rgba(60,40,70,0.28)');
    eg.addColorStop(1, 'rgba(60,40,70,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(H.x0, H.ufTop, w, 60);
  }

  function drawRoof(ctx, o, L) {
    const H = ST.house;
    const e0 = H.x0 - 52, e1 = H.x1 + 52, r0 = -150, r1 = 350;
    const roofPts = [[e0, H.ufTop], [e1, H.ufTop], [r1, H.ridge], [r0, H.ridge]];
    poly(ctx, roofPts, TILE);
    ctx.save();
    ctx.beginPath();
    roofPts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    // tile rows with scalloped edges
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const y = H.ridge + ((H.ufTop - H.ridge) * (i + 1)) / rows;
      const band = ctx.createLinearGradient(0, y - 23, 0, y);
      band.addColorStop(0, V.shade(TILE, 0.06));
      band.addColorStop(1, V.shade(TILE, -0.16));
      ctx.fillStyle = band;
      ctx.fillRect(e0, y - 23, e1 - e0, 23);
      ctx.beginPath();
      for (let x = e0 + (i % 2) * 17; x < e1; x += 34) {
        ctx.moveTo(x + 34, y);
        ctx.arc(x + 17, y, 17, 0, Math.PI);
      }
      ctx.strokeStyle = V.shade(TILE, -0.32);
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    // light from the sun side
    const lg = ctx.createLinearGradient(e0, 0, e1, 0);
    lg.addColorStop(0, `rgba(255,220,160,${0.14 + 0.1 * L.morning})`);
    lg.addColorStop(1, 'rgba(60,20,40,0.12)');
    ctx.fillStyle = lg;
    ctx.fillRect(e0, H.ridge, e1 - e0, H.ufTop - H.ridge);
    ctx.restore();
    poly(ctx, roofPts, null, INK, 3.5);
    // hips + ridge
    V.line(ctx, r0, H.ridge, e0 + 8, H.ufTop - 2, V.shade(TILE, -0.35), 7);
    V.line(ctx, r1, H.ridge, e1 - 8, H.ufTop - 2, V.shade(TILE, -0.35), 7);
    V.line(ctx, r0 - 4, H.ridge, r1 + 4, H.ridge, INK, 13);
    V.line(ctx, r0 - 4, H.ridge, r1 + 4, H.ridge, V.shade(TILE, -0.25), 8);
    // gutter
    rr(ctx, e0 - 6, H.ufTop - 6, e1 - e0 + 12, 16, 5, '#efefef', INK, 3);
    // solar water heater (dud shemesh): two panels on the slope + white tank on top
    const px = 330, py = -278;
    for (let k = 0; k < 2; k++) {
      const x = px + k * 92;
      poly(ctx, [[x, py], [x + 84, py], [x + 96, py + 92], [x + 6, py + 92]], '#2a4f86', INK, 3);
      ctx.strokeStyle = 'rgba(160,200,255,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let g = 1; g < 4; g++) {
        ctx.moveTo(x + g * 21 + g * 0.5, py);
        ctx.lineTo(x + g * 21 + 3 + g * 2.5, py + 92);
      }
      ctx.moveTo(x + 2, py + 46);
      ctx.lineTo(x + 90, py + 46);
      ctx.stroke();
      poly(ctx, [[x + 10, py + 6], [x + 30, py + 6], [x + 14, py + 50], [x + 4, py + 50]], 'rgba(255,255,255,0.18)');
    }
    rr(ctx, px - 6, py - 46, 200, 40, 20, '#f4f4f0', INK, 3);
    rect(ctx, px + 10, py - 22, 168, 6, 'rgba(0,0,0,0.08)');
    V.line(ctx, px + 20, py - 6, px + 20, py + 4, INK, 4);
    V.line(ctx, px + 170, py - 6, px + 170, py + 4, INK, 4);
  }

  function drawUpperFloor(ctx, o, L, glow) {
    const lit = o.windowsLit;
    const W = o.windows || {};
    const wl = (k, v) => (W[k] !== undefined ? W[k] : v);
    drawWindow(ctx, -390, -66, 160, 214, { L, lit: wl('ul', lit * 0.9), glow, shutter: 0.18, curtain: '#bfd6ee', mullion: 'v' });
    drawWindow(ctx, 330, -66, 200, 214, { L, lit: wl('ur', lit * 0.75), glow, shutter: 0.3, curtain: '#f3cfd6', mullion: 'v' });
    // balcony French door
    drawWindow(ctx, -86, -92, 172, 290, { L, lit: wl('uc', lit * 0.6), glow, shutter: 0.12, curtain: '#f4e3b8', mullion: 'v', sill: false });
    // balcony slab + railing + plants
    rr(ctx, -160, 196, 320, 18, 4, '#f6f2ea', INK, 3);
    rect(ctx, -156, 214, 312, 10, 'rgba(60,40,70,0.2)');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-154, 196);
    ctx.lineTo(-154, 116);
    ctx.lineTo(154, 116);
    ctx.lineTo(154, 196);
    for (let x = -132; x < 154; x += 22) {
      ctx.moveTo(x, 118);
      ctx.lineTo(x, 196);
    }
    ctx.stroke();
    V.line(ctx, -158, 116, 158, 116, '#3b3640', 8);
    // potted plants on the balcony
    [[-118, '#d6338a'], [112, '#f39a3d']].forEach(([x, fl]) => {
      blob(ctx, [[x - 14, 150, 18], [x + 12, 146, 17], [x, 132, 19]], V.pal.leaf);
      V.circle(ctx, x - 8, 134, 6, fl);
      V.circle(ctx, x + 10, 140, 6, fl);
      V.circle(ctx, x + 2, 124, 5, fl);
      poly(ctx, [[x - 20, 160], [x + 20, 160], [x + 15, 196], [x - 15, 196]], '#c0673d', INK, 3);
    });
    // AC unit on the wall (very local detail)
    rr(ctx, 560, 20, 62, 46, 5, '#ececec', INK, 3);
    V.circle(ctx, 591, 43, 15, '#c9c9c9', INK, 2);
    V.line(ctx, 591, 66, 591, 120, '#bdbdbd', 3);
  }

  function drawGroundWindows(ctx, o, L, glow) {
    const lit = o.windowsLit;
    const W = o.windows || {};
    const wl = (k, v) => (W[k] !== undefined ? W[k] : v);
    drawWindow(ctx, -400, 404, 190, 236, { L, lit: wl('gl', lit), glow, shutter: 0.1, curtain: '#f2d7c4', mullion: 'cross', flowers: '#e2463c' });
    drawWindow(ctx, 300, 384, 300, 256, { L, lit: wl('gr', lit), glow, shutter: 0.05, curtain: '#f6e1b5', mullion: 'v', lamp: true });
  }

  function drawBougainvillea(ctx, t) {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const k = i / 25;
      const y = 790 - k * 640 + Math.sin(i * 1.7) * 18;
      const x = -436 + Math.sin(i * 2.3) * 26 + (k > 0.7 ? (k - 0.7) * 260 : 0);
      pts.push([x, y, 26 + V.rand(i) * 14]);
    }
    blob(ctx, pts.map(([x, y, r]) => [x + 4, y + 6, r]), V.pal.leafDark);
    blob(ctx, pts, V.pal.leaf);
    ctx.save();
    for (let i = 0; i < 46; i++) {
      const p = pts[i % pts.length];
      const a = V.rand(i * 5.1) * Math.PI * 2;
      const r = V.rand(i * 2.7) * p[2];
      const sway = Math.sin(t * 1.3 + i) * 1.5;
      V.circle(ctx, p[0] + Math.cos(a) * r + sway, p[1] + Math.sin(a) * r, 6 + V.rand(i) * 4, i % 3 ? '#d6338a' : '#f05aa8');
    }
    ctx.restore();
  }

  // the hallway seen through the door
  function drawInterior(ctx, o, L, lit) {
    const d = ST.house.door;
    const w = d.x1 - d.x0, h = d.sill - d.top;
    const wall = V.mixColor('#c9b08e', '#f7c779', lit);
    const g = ctx.createLinearGradient(d.x0, 0, d.x1, 0);
    g.addColorStop(0, V.shade(wall, -0.25));
    g.addColorStop(0.5, wall);
    g.addColorStop(1, V.shade(wall, -0.18));
    ctx.fillStyle = g;
    ctx.fillRect(d.x0, d.top, w, h);
    // ceiling lamp glow
    const lg = ctx.createRadialGradient(0, d.top + 20, 4, 0, d.top + 20, 200);
    lg.addColorStop(0, `rgba(255,236,180,${0.15 + 0.6 * lit})`);
    lg.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(d.x0, d.top, w, h);
    // floor (tiles)
    const fy = d.sill - 70;
    rect(ctx, d.x0, fy, w, d.sill - fy, V.mixColor('#b9a07e', '#e4b27a', lit));
    ctx.strokeStyle = 'rgba(90,60,30,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = d.x0 - 40; x < d.x1 + 40; x += 48) {
      ctx.moveTo(x * 0.7, fy);
      ctx.lineTo(x * 1.25, d.sill);
    }
    ctx.moveTo(d.x0, fy + 26);
    ctx.lineTo(d.x1, fy + 26);
    ctx.stroke();
    rect(ctx, d.x0, fy - 8, w, 8, V.shade(wall, -0.3));
    // picture frame + coat hooks with a jacket
    rr(ctx, -64, 430, 66, 50, 3, '#7a5236', INK, 2.5);
    rect(ctx, -58, 436, 54, 38, V.mixColor('#9cc7e0', '#e8b36a', lit * 0.4));
    poly(ctx, [[-56, 472], [-36, 450], [-22, 462], [-12, 452], [-6, 472]], '#5aa35a');
    rr(ctx, 36, 470, 66, 10, 3, '#7a5236', INK, 2);
    poly(ctx, [[46, 478], [74, 478], [82, 600], [40, 600]], V.mixColor('#3d5f8a', '#5f6f8a', 0.2), INK, 2.5);
    V.circle(ctx, 88, 494, 12, '#e2463c', INK, 2);
    // side wall (depth) on the left
    poly(ctx, [[d.x0, d.top], [d.x0 + 26, d.top + 26], [d.x0 + 26, fy + 6], [d.x0, d.sill]], V.shade(wall, -0.35));
  }

  function drawDoorLeaf(ctx, open, L) {
    const d = ST.house.door;
    const w = d.x1 - d.x0, h = d.sill - d.top;
    const a = V.deg(open * DOOR_MAX);
    const cw = Math.cos(a);
    const xe = d.x0 + w * cw;
    const dy = w * Math.sin(a) * 0.07;
    const quad = [[d.x0, d.top], [xe, d.top + dy], [xe, d.sill - dy * 0.6], [d.x0, d.sill]];
    const col = V.shade(DOORC, -0.35 * Math.sin(a));
    ctx.save();
    ctx.beginPath();
    quad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.clip();
    ctx.translate(d.x0, 0);
    ctx.scale(Math.max(0.02, cw), 1);
    // panels
    const pc = V.shade(col, -0.12), hl = V.shade(col, 0.12);
    [[22, d.top + 30, 176, 120], [22, d.top + 176, 78, 300], [120, d.top + 176, 78, 300]].forEach(([x, y, pw, ph]) => {
      rr(ctx, x, y, pw, ph, 6, pc);
      V.line(ctx, x + 4, y + ph - 3, x + pw - 4, y + ph - 3, hl, 3);
    });
    // small round window
    V.circle(ctx, 110, d.top + 90, 34, '#f4e7c6', INK, 3);
    V.circle(ctx, 110, d.top + 90, 26, V.mixColor('#a8cbe0', '#ffd98a', open > 0 ? 0.3 : 0), null);
    V.line(ctx, 110, d.top + 64, 110, d.top + 116, '#f4e7c6', 4);
    ctx.restore();
    poly(ctx, quad, null, INK, 3.5);
    // door thickness (visible edge while open)
    if (open > 0.01) {
      const tw = 14 * Math.sin(a);
      poly(ctx, [[xe, d.top + dy], [xe + tw, d.top + dy + 2], [xe + tw, d.sill - dy * 0.6], [xe, d.sill - dy * 0.6]], V.shade(DOORC, 0.15), INK, 2.5);
    }
    // lever handle + key plate
    const [hx, hy] = V.env.streetDoorHandle(open);
    rr(ctx, hx - 6, hy - 18, 12, 50, 5, '#d8b25a', INK, 2.5);
    ctx.save();
    ctx.translate(hx, hy);
    ctx.scale(open > 0.5 ? -1 : 1, 1);
    rr(ctx, -30 * Math.max(0.3, cw), -5, 34 * Math.max(0.3, cw), 10, 5, '#f0cf72', INK, 2.5);
    ctx.restore();
    V.circle(ctx, hx, hy + 20, 3, INK);
  }

  function drawDoorway(ctx, o, L, glow) {
    const d = ST.house.door;
    const open = V.clamp(o.doorOpen || 0);
    const lit = o.interiorLit;
    if (open > 0.002) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top + 1);
      ctx.clip();
      drawInterior(ctx, o, L, lit);
      // standalone use (no street pipeline): people inside are drawn right here
      if (!glow && o.inside) o.inside(ctx);
      ctx.restore();
      if (lit > 0.02 && glow) {
        const k = lit * Math.min(1, open * 2.2);
        glow.push({ f: 1, fn: (c) => {
          c.save();
          c.beginPath();
          c.rect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top);
          c.clip();
          c.globalAlpha = (0.35 + 0.5 * L.night) * k;
          drawInterior(c, o, L, lit);
          c.restore();
          drawDoorLeaf(c, open, L);
        } });
      }
    }
    drawDoorLeaf(ctx, open, L);
  }
  // people inside the doorway (+ the door leaf in front of them). Used by V.env.street.
  V.env.streetDoorwayLayer = (ctx, o) => {
    const d = ST.house.door;
    const open = V.clamp(o.doorOpen || 0);
    if (open <= 0.002 || !o.inside) return;
    const L = light(o.hour === undefined ? 12 : o.hour);
    ctx.save();
    ctx.beginPath();
    ctx.rect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top + 1);
    ctx.clip();
    o.inside(ctx);
    ctx.restore();
    drawDoorLeaf(ctx, open, L);
  };

  function drawDoorSurround(ctx, o, L, glow) {
    const d = ST.house.door;
    // stone casing (drawn as a frame around the opening, behind it the facade)
    ctx.save();
    ctx.beginPath();
    ctx.rect(d.x0 - 22, d.top - 22, d.x1 - d.x0 + 44, d.sill - d.top + 22);
    ctx.rect(d.x1, d.top, d.x0 - d.x1, d.sill - d.top);
    ctx.fillStyle = '#f6efe1';
    ctx.fill('evenodd');
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    // inner reveal shadow
    rect(ctx, d.x0, d.top, d.x1 - d.x0, 8, 'rgba(40,30,50,0.22)');
    // canopy
    rr(ctx, -176, 248, 352, 20, 4, '#f4efe4', INK, 3);
    const cg = ctx.createLinearGradient(0, 268, 0, 330);
    cg.addColorStop(0, 'rgba(40,30,50,0.3)');
    cg.addColorStop(1, 'rgba(40,30,50,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(-170, 268, 340, 62);
    // mezuzah on the right door post (slanted)
    ctx.save();
    ctx.translate(124, 404); // top third of the post (kept above the hero's chin when he stands at the door)
    ctx.rotate(0.35);
    rr(ctx, -5, -26, 10, 52, 4, '#c9a24a', INK, 2);
    V.circle(ctx, 0, -12, 2.4, INK);
    ctx.restore();
    // ceramic house number "12"
    rr(ctx, 150, 404, 72, 56, 8, '#fdfbf4', INK, 3);
    rr(ctx, 156, 410, 60, 44, 6, null, '#2a5ea8', 2.5);
    V.text(ctx, '12', 186, 433, { size: 32, weight: 800, color: '#2a5ea8', rtl: false });
    // wall lantern
    const lampOn = o._porchLamp || 0;
    V.line(ctx, 186, 312, 186, 296, INK, 4);
    rr(ctx, 170, 312, 32, 52, 6, V.mixColor('#f2e6c4', '#ffe7a0', lampOn), INK, 3);
    rr(ctx, 164, 304, 44, 10, 3, '#3b3640', INK, 2);
    if (lampOn > 0.02 && glow) {
      glow.push({ f: 1, fn: (c) => rr(c, 170, 312, 32, 52, 6, `rgba(255,236,170,${lampOn})`, INK, 3) });
      glow.push({ f: 1, light: true, fn: (c) => {
        V.lightPool(c, 186, 340, 230, '#ffc970', 0.42 * lampOn);
        V.lightPool(c, 120, 640, 360, '#ffb860', 0.12 * lampOn);
      } });
    }
  }

  function drawGarden(ctx, o, L, t) {
    const H = ST.house;
    // grass + flower beds in front of the facade
    const gx0 = H.x0 - 20, gx1 = H.x1 + 60;
    rect(ctx, gx0, ST.gardenY, gx1 - gx0, ST.walkBack - ST.gardenY, '#7fc65f');
    rect(ctx, gx0, ST.gardenY, gx1 - gx0, 10, 'rgba(40,60,30,0.22)');
    // soil bed along the wall + flowers
    for (let i = 0; i < 26; i++) {
      const x = H.x0 + 10 + i * 42 + V.rand(i) * 12;
      if (x > -200 && x < 440) continue;
      blob(ctx, [[x, 792, 16 + V.rand(i * 3) * 8], [x + 16, 798, 14]], i % 2 ? V.pal.leafDark : V.pal.leaf);
      if (i % 3 !== 1) V.circle(ctx, x + 4, 784 + V.rand(i * 9) * 6, 5, ['#f6c945', '#ffffff', '#e2463c', '#f39a3d'][i % 4]);
    }
    // morning: the house throws shade to the right garden
    if (L.morning > 0) {
      ctx.save();
      ctx.globalAlpha = 0.16 * L.morning;
      poly(ctx, [[H.x1 - 20, ST.gardenY], [H.x1 + 60, ST.gardenY], [H.x1 + 60, ST.walkBack], [H.x1 + 10, ST.walkBack]], '#2a1c3a');
      ctx.restore();
    }
    // lemon tree (right garden)
    const lx = H.lemon.x, ly = H.lemon.y;
    castShadow(ctx, L, ly, (c) => {
      c.fillRect(lx - 9, ly - 200, 18, 200);
      c.beginPath();
      c.arc(lx, ly - 290, 120, 0, Math.PI * 2);
      c.fill();
    }, 0.8);
    contact(ctx, lx, ly, 70, 0.2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly);
    ctx.quadraticCurveTo(lx - 4, ly - 120, lx - 18, ly - 210);
    ctx.lineTo(lx + 2, ly - 214);
    ctx.quadraticCurveTo(lx + 14, ly - 120, lx + 12, ly);
    ctx.closePath();
    ctx.fillStyle = V.pal.trunk;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    const sway = Math.sin(t * 1.1) * 3;
    const can = [[lx - 70, ly - 250, 66], [lx + 64, ly - 262, 70], [lx - 4, ly - 330, 82], [lx + 6, ly - 236, 64], [lx - 92, ly - 300, 50], [lx + 92, ly - 318, 50]];
    blob(ctx, can.map(([x, y, r]) => [x + sway * 0.5, y + 8, r + 5]), INK);
    blob(ctx, can.map(([x, y, r]) => [x + sway * 0.5, y, r]), '#4f9e44');
    blob(ctx, can.map(([x, y, r]) => [x + sway - r * 0.18, y - r * 0.2, r * 0.68]), '#66b852');
    for (let i = 0; i < 15; i++) {
      const a = V.rand(i * 4.7) * Math.PI * 2, r = 30 + V.rand(i * 1.9) * 80;
      const ex = lx + Math.cos(a) * r * 1.1 + sway, ey = ly - 285 + Math.sin(a) * r * 0.75;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      V.ellipse(ctx, 0, 0, 12, 9, '#f6d33c');
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      V.circle(ctx, -3, -3, 2.5, '#fff6b0');
      ctx.restore();
    }
  }

  function drawPorch(ctx, o, L) {
    const H = ST.house, p = H.porch;
    // porch slab: top surface (threshold .. front edge) + front face (tiled)
    const face = '#d9c7a6';
    rect(ctx, p.x0, p.back, p.x1 - p.x0, p.top - p.back, '#efe2c8');
    rect(ctx, p.x0, p.top, p.x1 - p.x0, ST.GY - p.top, face);
    // steps (descending to the RIGHT)
    H.steps.forEach((s) => {
      rect(ctx, s.x0, s.top - 10, s.x1 - s.x0, 10, '#efe2c8');
      rect(ctx, s.x0, s.top, s.x1 - s.x0, ST.GY - s.top, face);
    });
    // stone joints on the faces
    ctx.strokeStyle = 'rgba(120,90,50,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = p.x0 + 60; x < p.x1; x += 70) {
      ctx.moveTo(x, p.top + 4);
      ctx.lineTo(x, p.top + 38);
      ctx.moveTo(x + 35, p.top + 40);
      ctx.lineTo(x + 35, ST.GY);
    }
    ctx.moveTo(p.x0, p.top + 39);
    ctx.lineTo(p.x1, p.top + 39);
    ctx.stroke();
    // outlines (stair silhouette)
    const sil = [[p.x0, ST.GY], [p.x0, p.back], [p.x1, p.back], [p.x1, H.steps[0].top - 10], [H.steps[0].x1, H.steps[0].top - 10], [H.steps[0].x1, H.steps[1].top - 10], [H.steps[1].x1, H.steps[1].top - 10], [H.steps[1].x1, ST.GY]];
    ctx.beginPath();
    sil.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.stroke();
    V.line(ctx, p.x0, p.top, p.x1, p.top, 'rgba(60,40,30,0.5)', 2.5);
    H.steps.forEach((s) => V.line(ctx, s.x0, s.top, s.x1, s.top, 'rgba(60,40,30,0.5)', 2.5));
    // shadow on the top of the porch under the canopy
    rect(ctx, -170, p.back, 340, 4, 'rgba(40,30,50,0.2)');
    // doormat
    rr(ctx, -82, p.back + 1, 164, 9, 3, '#8a5a3a');
    // big potted plant left of the door
    const px = -158;
    poly(ctx, [[px - 26, 752], [px + 26, 752], [px + 20, 812], [px - 20, 812]], '#c0673d', INK, 3);
    rect(ctx, px - 28, 750, 56, 10, '#a85a34');
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      const len = 70 + V.rand(i * 3) * 50;
      ctx.beginPath();
      ctx.moveTo(px, 752);
      ctx.quadraticCurveTo(px + Math.cos(a) * len * 0.5, 752 + Math.sin(a) * len * 0.8, px + Math.cos(a) * len, 752 + Math.sin(a) * len);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#4f9e44' : '#66b852';
      ctx.lineWidth = 7;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGardenWallsAndMailbox(ctx, o, L) {
    const H = ST.house;
    // our low garden walls (front of the gardens)
    gardenWall(ctx, H.x0 - 20, H.porch.x0, L);
    gardenWall(ctx, H.mailbox.x0, H.x1 + 60, L);
    // mailbox pillar (right of the steps)
    const m = H.mailbox;
    castShadow(ctx, L, ST.walkBack, (c) => c.fillRect(m.x0, 752, m.x1 - m.x0, ST.walkBack - 752), 0.8);
    rect(ctx, m.x0, 760, m.x1 - m.x0, ST.walkBack - 760, '#f2ece0');
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(m.x0, 760, m.x1 - m.x0, ST.walkBack - 760);
    rr(ctx, m.x0 - 6, 750, m.x1 - m.x0 + 12, 14, 3, '#d9c7a6', INK, 3);
    // the mailbox itself
    rr(ctx, m.x0 + 5, 778, m.x1 - m.x0 - 10, 58, 6, '#e2463c', INK, 3);
    rect(ctx, m.x0 + 12, 790, m.x1 - m.x0 - 24, 5, INK);
    rr(ctx, m.x0 + 14, 806, m.x1 - m.x0 - 28, 16, 3, '#fbf7ee', INK, 2);
    V.text(ctx, '12', (m.x0 + m.x1) / 2, 815, { size: 13, weight: 800, color: '#2a5ea8', rtl: false });
    // envelope corner peeking out
    poly(ctx, [[m.x0 + 18, 790], [m.x0 + 34, 790], [m.x0 + 30, 782], [m.x0 + 20, 782]], '#ffffff', INK, 1.5);
  }

  function gardenWall(ctx, x0, x1, L, h = 62) {
    const y = ST.walkBack;
    rect(ctx, x0, y - h, x1 - x0, h, '#f1ebdd');
    rect(ctx, x0, y - h + 10, x1 - x0, 6, 'rgba(60,40,70,0.12)');
    ctx.strokeStyle = 'rgba(150,120,80,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = x0 + 40; x < x1; x += 80) {
      ctx.moveTo(x, y - h + 16);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    rr(ctx, x0 - 4, y - h - 10, x1 - x0 + 8, 14, 3, '#d9c7a6', INK, 3);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x0, y - h + 4, x1 - x0, h - 4);
  }

  V.env.houseFront = (ctx, o = {}) => {
    const L = o._L || light(o.hour === undefined ? 12 : o.hour);
    const t = o.t || 0;
    const glow = o._glow || null;
    const oo = Object.assign({ windowsLit: L.night }, o);
    if (oo.interiorLit === undefined) oo.interiorLit = Math.max(oo.windowsLit, 0.25);
    oo._porchLamp = o._porchLamp !== undefined ? o._porchLamp : L.night;
    ctx.save();
    if (o.x) ctx.translate(o.x, 0);
    drawRoof(ctx, oo, L);
    drawFacade(ctx, oo, L);
    drawUpperFloor(ctx, oo, L, glow);
    drawGroundWindows(ctx, oo, L, glow);
    drawBougainvillea(ctx, t);
    drawDoorway(ctx, oo, L, glow);
    drawDoorSurround(ctx, oo, L, glow);
    drawGarden(ctx, oo, L, t);
    drawPorch(ctx, oo, L);
    drawGardenWallsAndMailbox(ctx, oo, L);
    // warm light spilling out of the open door
    const open = V.clamp(oo.doorOpen || 0);
    if (glow && open > 0.01 && oo.interiorLit > 0.05) {
      const d = ST.house.door;
      const k = oo.interiorLit * Math.min(1, open * 1.6) * (0.35 + 0.65 * L.night);
      const xe = doorEdgeX(open);
      glow.push({ f: 1, light: true, fn: (c) => {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, d.sill, 0, ST.GY + 60);
        g.addColorStop(0, `rgba(255,190,100,${0.5 * k})`);
        g.addColorStop(1, 'rgba(255,190,100,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(xe, d.sill);
        c.lineTo(d.x1, d.sill);
        c.lineTo(d.x1 + 150, ST.GY + 60);
        c.lineTo(xe - 40, ST.GY + 60);
        c.closePath();
        c.fill();
        c.restore();
        V.lightPool(c, (xe + d.x1) / 2, d.sill - 200, 330, '#ffb35a', 0.25 * k);
      } });
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ background layers
  function drawFarCity(ctx, cam, L, t) {
    const f = 0.3;
    ctx.save();
    camApply(ctx, cam, f);
    const [a, b] = visRange(cam, f, 260);
    const haze = (c, k = 0.42) => V.mixColor(c, L.skyBottom, k);
    // distant hills
    ctx.fillStyle = haze('#8fae7a', 0.55);
    ctx.beginPath();
    ctx.moveTo(a, 900);
    for (let x = a; x <= b + 60; x += 60) ctx.lineTo(x, 640 - 70 * Math.sin(x * 0.0021) - 40 * Math.sin(x * 0.0057 + 1));
    ctx.lineTo(b + 60, 900);
    ctx.closePath();
    ctx.fill();
    const cols = ['#f3ead8', '#e9dcc4', '#dfe3e6', '#f1dfcf', '#e4e8dc', '#f5efe4'];
    const step = 176;
    const winOff = haze('#7d8fa6', 0.35);
    for (let i = Math.floor(a / step); i <= Math.ceil(b / step); i++) {
      const r = (k) => V.rand(i * 13.7 + k * 3.1);
      const w = 108 + r(1) * 100, h = 150 + r(2) * 210;
      const x = i * step + r(3) * 50 - 25, base = 800;
      const col = haze(cols[Math.floor(r(4) * cols.length)]);
      rect(ctx, x, base - h, w, h, col);
      rect(ctx, x + w - 14, base - h, 14, h, 'rgba(70,60,110,0.12)');
      // windows
      const lit = L.night;
      for (let yy = base - h + 18; yy < base - 20; yy += 30) {
        for (let xx = x + 12; xx < x + w - 18; xx += 24) {
          const rv = V.rand(xx * 0.71 + yy * 1.3);
          const on = lit > 0 && rv < 0.55 * lit;
          rect(ctx, xx, yy, 12, 15, on ? '#ffd88a' : winOff);
        }
      }
      // rooftop: solar water heaters + antenna
      if (r(5) < 0.8) {
        const n = 1 + Math.floor(r(6) * 3);
        for (let k = 0; k < n; k++) {
          const sx = x + 10 + k * 34;
          if (sx > x + w - 30) break;
          rr(ctx, sx, base - h - 22, 26, 10, 5, haze('#f8f8f8', 0.3));
          poly(ctx, [[sx, base - h], [sx + 24, base - h], [sx + 30, base - h - 12], [sx + 6, base - h - 12]], haze('#3a5a8a', 0.4));
        }
      }
      if (r(7) < 0.4) V.line(ctx, x + w * 0.7, base - h, x + w * 0.7, base - h - 40, haze('#555566', 0.4), 2);
    }
    // treeline in front of the city
    ctx.fillStyle = haze('#5f9a52', 0.38);
    ctx.beginPath();
    for (let x = Math.floor(a / 50) * 50; x <= b + 50; x += 50) {
      const r = 26 + V.rand(x * 0.37) * 22;
      ctx.moveTo(x + r, 790);
      ctx.arc(x, 790 - V.rand(x * 0.11) * 14, r, 0, Math.PI * 2);
    }
    ctx.fill();
    rect(ctx, a, 790, b - a, 1400, haze('#5f9a52', 0.38));
    ctx.restore();
  }

  function palm(ctx, x, base, h, col, trunk, t, seed) {
    ctx.save();
    ctx.lineCap = 'round';
    const lean = (V.rand(seed) - 0.5) * 50;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + lean * 0.2, base - h * 0.5, x + lean, base - h);
    ctx.strokeStyle = trunk;
    ctx.lineWidth = 16;
    ctx.stroke();
    const tx = x + lean, ty = base - h;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.42 + Math.sin(t * 1.2 + i) * 0.03;
      const len = 120 + (i % 2) * 30;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 30, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.5 + 40);
      ctx.strokeStyle = col;
      ctx.lineWidth = 15;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMidTrees(ctx, cam, L, t) {
    const f = 0.55;
    ctx.save();
    camApply(ctx, cam, f);
    const [a, b] = visRange(cam, f, 260);
    const haze = (c) => V.mixColor(c, L.skyBottom, 0.22);
    const step = 230;
    for (let i = Math.floor(a / step); i <= Math.ceil(b / step); i++) {
      const r = (k) => V.rand(i * 7.31 + k * 1.7 + 40);
      const x = i * step + r(1) * 80;
      const kind = r(2);
      const base = 812;
      if (kind < 0.22) {
        palm(ctx, x, base, 360 + r(3) * 120, haze('#4f8d47'), haze('#8a6a48'), t, i);
      } else if (kind < 0.42) {
        // cypress
        V.ellipse(ctx, x, base - 190, 34, 200, haze('#3f7d45'));
        V.ellipse(ctx, x - 8, base - 210, 18, 160, haze('#4f9150'));
      } else {
        const s = 0.9 + r(4) * 0.6;
        const c1 = haze(r(5) < 0.5 ? '#5aa35a' : '#4c9a59'), c2 = V.shade(c1, -0.14);
        rect(ctx, x - 10 * s, base - 170 * s, 20 * s, 170 * s, haze('#7a5236'));
        blob(ctx, [[x - 55 * s, base - 200 * s, 70 * s], [x + 55 * s, base - 205 * s, 72 * s], [x, base - 262 * s, 86 * s]], c2);
        blob(ctx, [[x - 40 * s, base - 222 * s, 58 * s], [x + 40 * s, base - 232 * s, 56 * s], [x - 6 * s, base - 270 * s, 70 * s]], c1);
      }
    }
    rect(ctx, a, 800, b - a, 1400, haze('#5d9a4f'));
    ctx.restore();
  }

  // set-back neighbour houses (parallax 0.85), drawn at 0.86 scale around their base
  const NB_STEP = 1200;
  const NB_COLS = ['#f3e2a8', '#dfe7ea', '#f6efe2', '#f3d2c0', '#e6ecd8', '#efe0d4'];
  function neighbourAt(i) {
    const r = (k) => V.rand(i * 5.77 + k * 2.3 + 11);
    return {
      cx: i * NB_STEP + (r(1) - 0.5) * 140,
      w: 760 + r(2) * 220,
      floors: r(3) < 0.25 ? 1 : 2,
      wall: NB_COLS[((i % NB_COLS.length) + NB_COLS.length) % NB_COLS.length],
      roof: r(4) < 0.5 ? 'flat' : 'tile',
      roofCol: r(5) < 0.5 ? '#c9603e' : '#b84f3c',
      seed: i,
      doorU: 0.25 + r(6) * 0.5,
      shutter: r(7),
      tree: r(8),
    };
  }
  function drawNeighbour(ctx, n, L, glow, t) {
    const base = 790;
    const x0 = n.cx - n.w / 2, x1 = n.cx + n.w / 2;
    const fh = 330;
    const top = base - fh * n.floors - 30;
    // walls
    rect(ctx, x0, top, n.w, base - top, n.wall);
    rect(ctx, x1 - 14, top, 14, base - top, 'rgba(60,40,70,0.12)');
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.strokeRect(x0, top, n.w, base - top);
    if (n.floors === 2) rr(ctx, x0 - 10, base - fh - 14, n.w + 20, 18, 3, '#fbf8f1', INK, 2.5);
    // roof
    if (n.roof === 'tile') {
      const pts = [[x0 - 40, top], [x1 + 40, top], [x1 - n.w * 0.28, top - 150], [x0 + n.w * 0.28, top - 150]];
      poly(ctx, pts, n.roofCol, INK, 3);
      ctx.save();
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.clip();
      ctx.strokeStyle = V.shade(n.roofCol, -0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = top - 130; y < top; y += 24) {
        ctx.moveTo(x0 - 40, y);
        ctx.lineTo(x1 + 40, y);
      }
      ctx.stroke();
      ctx.restore();
      rr(ctx, x0 - 46, top - 6, n.w + 92, 12, 4, '#ececec', INK, 2.5);
    } else {
      // flat roof: parapet, railing, solar heater, water tanks
      rr(ctx, x0 - 8, top - 18, n.w + 16, 22, 3, '#f7f4ec', INK, 3);
      const sx = x0 + n.w * (0.15 + 0.5 * V.rand(n.seed * 9));
      rr(ctx, sx, top - 92, 150, 34, 17, '#f4f4f0', INK, 3);
      poly(ctx, [[sx - 6, top - 18], [sx + 150, top - 18], [sx + 140, top - 70], [sx + 4, top - 70]], '#2a4f86', INK, 3);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = x0 + 4; x < x1; x += 36) {
        ctx.moveTo(x, top - 18);
        ctx.lineTo(x, top - 54);
      }
      ctx.moveTo(x0, top - 54);
      ctx.lineTo(x1, top - 54);
      ctx.stroke();
    }
    // windows (skip the door column on the ground floor)
    const doorX = x0 + n.w * n.doorU;
    const lit = L.night;
    for (let fl = 0; fl < n.floors; fl++) {
      const wy = base - fh * (fl + 1) + 70;
      const nw = Math.max(2, Math.floor(n.w / 260));
      for (let k = 0; k < nw; k++) {
        const wx = x0 + (n.w / nw) * (k + 0.5) - 70;
        if (fl === 0 && Math.abs(wx + 70 - doorX) < 170) continue;
        const wl = lit * (V.rand(n.seed * 3 + k + fl * 7) < 0.75 ? 1 : 0.2);
        drawWindow(ctx, wx, wy, 140, 170, { L, lit: wl, glow, shutter: 0.15 + 0.6 * V.rand(n.seed + k * 2 + fl), curtain: '#efd9c4', mullion: 'v', box: true });
      }
    }
    // door with a small canopy
    rr(ctx, doorX - 70, base - 330, 140, 330, 4, '#f4efe4', INK, 3);
    rr(ctx, doorX - 56, base - 316, 112, 316, 3, V.shade(n.wall, -0.45), INK, 3);
    V.circle(ctx, doorX + 38, base - 160, 6, '#d8b25a', INK, 2);
    rr(ctx, doorX - 96, base - 356, 192, 16, 3, '#f4efe4', INK, 3);
    // AC unit
    rr(ctx, x1 - 110, base - fh - 110, 58, 42, 5, '#ececec', INK, 2.5);
    V.circle(ctx, x1 - 81, base - fh - 89, 13, '#cccccc', INK, 2);
    // garden: lawn + a tree or bushes
    rect(ctx, x0 - 200, base - 6, n.w + 400, 400, '#76bd59');
    if (n.tree > 0.45) {
      const tx = n.tree > 0.72 ? x1 - 60 : x0 + 60;
      rect(ctx, tx - 10, base - 160, 20, 166, V.pal.trunk);
      blob(ctx, [[tx - 60, base - 200, 76], [tx + 60, base - 210, 74], [tx, base - 270, 86]], V.pal.leafDark);
      blob(ctx, [[tx - 44, base - 222, 60], [tx + 44, base - 236, 56], [tx - 6, base - 276, 66]], V.pal.leaf);
    } else {
      blob(ctx, [[x0 + 60, base - 20, 46], [x0 + 120, base - 26, 54], [x1 - 80, base - 22, 50]], V.pal.leafDark);
    }
  }
  function drawNeighbours(ctx, cam, L, glow, t) {
    const f = 0.85;
    ctx.save();
    camApply(ctx, cam, f);
    const [a, b] = visRange(cam, f, 700);
    for (let i = Math.floor(a / NB_STEP); i <= Math.ceil(b / NB_STEP); i++) {
      if (i === 0) continue; // the family house stands here (walk plane)
      const n = neighbourAt(i);
      ctx.save();
      ctx.translate(n.cx, 790);
      ctx.scale(0.86, 0.86);
      ctx.translate(-n.cx, -790);
      const g = [];
      drawNeighbour(ctx, n, L, g, t);
      ctx.restore();
      // re-scope glow items to this layer + scale
      g.forEach((it) => glow.push({ f, light: it.light, fn: (c) => {
        c.translate(n.cx, 790);
        c.scale(0.86, 0.86);
        c.translate(-n.cx, -790);
        it.fn(c);
      } }));
    }
    // continuous lawn under the set-back row
    rect(ctx, a, 786, b - a, 600, '#76bd59');
    ctx.restore();
  }

  // ------------------------------------------------------------------ walk plane (street)
  function drawGroundBands(ctx, cam, L) {
    const [a, b] = visRange(cam, 1, 100);
    // garden strip behind the sidewalk
    rect(ctx, a, ST.gardenY, b - a, ST.walkBack - ST.gardenY, '#79c25b');
    // sidewalk
    rect(ctx, a, ST.walkBack, b - a, ST.curbY - ST.walkBack, '#d6cebf');
    rect(ctx, a, ST.walkBack, b - a, 6, 'rgba(40,30,50,0.14)');
    ctx.strokeStyle = 'rgba(120,105,85,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = Math.floor(a / 110) * 110; x < b; x += 110) {
      ctx.moveTo(x, ST.walkBack);
      ctx.lineTo(x - 8, ST.curbY);
    }
    ctx.moveTo(a, 901);
    ctx.lineTo(b, 901);
    ctx.stroke();
    // curb (red / white painted)
    rect(ctx, a, ST.curbY, b - a, ST.roadY - ST.curbY, '#f2f0ea');
    for (let x = Math.floor(a / 160) * 160; x < b; x += 160) rect(ctx, x, ST.curbY, 80, ST.roadY - ST.curbY, '#d9483c');
    V.line(ctx, a, ST.curbY, b, ST.curbY, 'rgba(31,26,36,0.6)', 2.5);
    // road
    rect(ctx, a, ST.roadY, b - a, 900, '#5b616c');
    rect(ctx, a, ST.roadY, b - a, 12, 'rgba(0,0,0,0.25)');
    for (let x = Math.floor(a / 300) * 300; x < b; x += 300) rect(ctx, x, 1150, 150, 12, '#f3f0e6');
  }

  function drawStreetTree(ctx, x, L, t) {
    const y = ST.walkBack + 4;
    castShadow(ctx, L, y, (c) => {
      c.fillRect(x - 12, y - 300, 24, 300);
      c.beginPath();
      c.arc(x, y - 430, 150, 0, Math.PI * 2);
      c.fill();
    }, 0.7);
    rr(ctx, x - 40, y - 6, 80, 14, 4, '#9a8f7e');
    contact(ctx, x, y, 50, 0.2);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.quadraticCurveTo(x - 8, y - 200, x - 24, y - 330);
    ctx.lineTo(x + 8, y - 330);
    ctx.quadraticCurveTo(x + 10, y - 200, x + 16, y);
    ctx.closePath();
    ctx.fillStyle = '#86603f';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    const sw = Math.sin(t * 0.9 + x) * 4;
    const can = [[x - 120, y - 380, 100], [x + 120, y - 390, 104], [x, y - 470, 130], [x - 60, y - 330, 80], [x + 70, y - 330, 84]];
    blob(ctx, can.map(([cx, cy, r]) => [cx + sw * 0.5, cy, r + 5]), INK);
    blob(ctx, can.map(([cx, cy, r]) => [cx + sw * 0.5, cy, r]), '#4a9446');
    blob(ctx, can.map(([cx, cy, r]) => [cx + sw - r * 0.2, cy - r * 0.22, r * 0.66]), '#5fae55');
  }

  function drawLampPost(ctx, x, L, lit, glow) {
    const y = ST.walkBack + 2, s = 1.85;
    castShadow(ctx, L, y, (c) => c.fillRect(x - 8 * s, y - 430 * s, 16 * s, 430 * s), 0.8);
    contact(ctx, x, y, 22, 0.25);
    V.streetLamp(ctx, x, y, s, 0);
    rr(ctx, x - 18, y - 60, 36, 60, 6, '#3a3f4a', INK, 2.5);
    if (lit > 0.01 && glow) {
      glow.push({ f: 1, fn: (c) => V.ellipse(c, x + 62 * s, y - 408 * s, 18 * s, 7 * s, `rgba(255,244,210,${lit})`) });
      glow.push({ f: 1, light: true, fn: (c) => {
        c.save();
        c.translate(x, y);
        c.scale(s, s);
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(62, -410, 6, 62, -260, 360);
        g.addColorStop(0, `rgba(255,214,140,${0.26 * lit})`);
        g.addColorStop(1, 'rgba(255,214,140,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(46, -410);
        c.lineTo(78, -410);
        c.lineTo(250, 30);
        c.lineTo(-130, 30);
        c.closePath();
        c.fill();
        c.restore();
        V.lightPool(c, x + 62 * s, y - 408 * s, 120, '#ffe2a0', 0.55 * lit);
        V.lightPool(c, x + 62 * s, y + 40, 260, '#ffc870', 0.16 * lit);
      } });
    }
  }

  function drawStreetWalls(ctx, cam, L) {
    // continuous low garden walls along the street (except the family plot), hedges behind
    const [a, b] = visRange(cam, 1, 200);
    const H = ST.house;
    const segs = [];
    const STEP = 1200;
    for (let i = Math.floor(a / STEP) - 1; i <= Math.ceil(b / STEP); i++) {
      const s0 = i * STEP + 40, s1 = (i + 1) * STEP - 40;
      // gate gap
      const gx = i * STEP + 300 + V.rand(i * 3.3) * 500;
      segs.push([s0, gx - 70], [gx + 70, s1], ['gate', gx]);
    }
    segs.forEach((sg) => {
      if (sg[0] === 'gate') {
        const gx = sg[1];
        if (gx > H.x0 - 120 && gx < H.x1 + 140) return;
        if (gx + 70 < a || gx - 70 > b) return;
        // metal gate
        ctx.strokeStyle = INK;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = gx - 64; x <= gx + 64; x += 16) {
          ctx.moveTo(x, ST.walkBack);
          ctx.lineTo(x, ST.walkBack - 74);
        }
        ctx.moveTo(gx - 66, ST.walkBack - 74);
        ctx.lineTo(gx + 66, ST.walkBack - 74);
        ctx.moveTo(gx - 66, ST.walkBack - 40);
        ctx.lineTo(gx + 66, ST.walkBack - 40);
        ctx.stroke();
        return;
      }
      let [x0, x1] = sg;
      // cut out the family plot
      const cut0 = H.x0 - 40, cut1 = H.x1 + 80;
      const parts = [];
      if (x1 <= cut0 || x0 >= cut1) parts.push([x0, x1]);
      else {
        if (x0 < cut0) parts.push([x0, cut0 - 20]);
        if (x1 > cut1) parts.push([cut1 + 20, x1]);
      }
      parts.forEach(([p0, p1]) => {
        if (p1 < a || p0 > b || p1 - p0 < 30) return;
        // hedge behind the wall
        const hp = [];
        for (let x = p0 + 30; x < p1 - 20; x += 46) hp.push([x, ST.walkBack - 76 - V.rand(x) * 16, 34 + V.rand(x * 1.3) * 12]);
        blob(ctx, hp, V.pal.leafDark);
        blob(ctx, hp.map(([x, y, r]) => [x - 6, y - 6, r * 0.7]), V.pal.leaf);
        gardenWall(ctx, p0, p1, L);
      });
    });
  }

  // ------------------------------------------------------------------ sky (drawn BEHIND everything)
  function sunPos(hour) {
    const k = (hour - 6) / 13;
    return [V.lerp(-120, 2040, k), 780 - Math.pow(Math.max(0, Math.sin(k * Math.PI)), 0.7) * 700];
  }
  function drawSkyBehind(ctx, cam, L, t, o) {
    const h = L.hour;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    const px = -cam.x * 0.04, py = -(cam.y - Y0) * 0.04;
    // birds (nearest sky item first)
    if (o.birds) {
      for (let i = 0; i < 5; i++) {
        const k = ((t * 0.09 + i * 0.035) % 1.4) - 0.2;
        const bx = k * V.W + Math.sin(i * 2.1) * 40 + px * 3, by = 200 + Math.sin(i * 1.7) * 40 + Math.sin(t * 2 + i) * 6 + py * 3;
        const fl = Math.sin(t * 14 + i * 1.3) * 7;
        ctx.strokeStyle = '#3a3346';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx - 12, by - fl);
        ctx.quadraticCurveTo(bx - 5, by - 3, bx, by + 2);
        ctx.quadraticCurveTo(bx + 5, by - 3, bx + 12, by - fl);
        ctx.stroke();
      }
    }
    // clouds
    const cloudCol = V.mixColor(V.mixColor('#ffffff', '#ffd2b0', L.morning * 0.6), '#e88f8f', L.dusk * 0.8);
    const cA = 0.85 - 0.5 * L.night;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 520 + t * 7 + px * 2) % 3000) - 400 - cam.x * 0.05;
      const cy = 150 + V.rand(i * 3.7) * 220 + py;
      V.cloud(ctx, cx, cy, 0.7 + V.rand(i) * 0.7, V.rgba(cloudCol, cA));
    }
    // sun / moon / stars
    if (h > 6 && h < 17.9) {
      const [sx, sy] = sunPos(h);
      V.sun(ctx, sx + px, sy + py, 46, V.mixColor('#fff4c2', '#ffbe6a', L.morning + V.clamp((h - 15.5) / 2)));
    }
    if (L.dusk > 0 && h > 12) {
      const g = ctx.createRadialGradient(1900 + px, 760 + py, 30, 1900 + px, 760 + py, 900);
      g.addColorStop(0, `rgba(255,150,80,${0.55 * L.dusk})`);
      g.addColorStop(1, 'rgba(255,150,80,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, V.W, V.H);
    }
    if (L.night > 0.15) {
      V.moon(ctx, 330 + px, 190 + py, 30, L.skyTop);
      V.stars(ctx, 7, 50, 0, 64, V.W, 520, t, V.clamp((L.night - 0.15) * 1.3));
    }
    V.sky(ctx, h);
    ctx.restore();
  }

  // ------------------------------------------------------------------ props: cat, car
  // sitting ginger cat, (x, y) = where its paws rest; look -1 (left) .. 1 (right); tail phase
  V.env.cat = (ctx, x, y, s = 1, o = {}) => {
    const look = V.clamp(o.look || 0, -1, 1);
    const fur = o.fur || '#ec9a4c', dark = V.shade(fur, -0.22), belly = '#fbefdc';
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // tail (behind) hanging over the wall edge, swishing
    const tp = o.tail || 0;
    ctx.beginPath();
    ctx.moveTo(18, -10);
    ctx.bezierCurveTo(48, -4, 52 + Math.sin(tp) * 10, 30, 44 + Math.sin(tp * 1.3) * 18, 56);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = fur;
    ctx.lineWidth = 9;
    ctx.stroke();
    // body
    ctx.beginPath();
    ctx.moveTo(-26, 0);
    ctx.bezierCurveTo(-34, -40, -18, -66, 0, -66);
    ctx.bezierCurveTo(18, -66, 34, -40, 26, 0);
    ctx.closePath();
    ctx.fillStyle = fur;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    V.ellipse(ctx, 0, -22, 13, 24, belly);
    // stripes
    [[-22, -40], [-24, -28], [22, -40], [24, -28]].forEach(([sx, sy]) => V.line(ctx, sx, sy, sx * 0.7, sy + 3, dark, 3.5));
    // paws
    V.ellipse(ctx, -9, -2, 8, 5, belly);
    V.ellipse(ctx, 9, -2, 8, 5, belly);
    // head
    const hx = look * 7, hy = -78;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(look * 0.12);
    const ear = (sx) => {
      ctx.beginPath();
      ctx.moveTo(sx * 8, -14);
      ctx.lineTo(sx * 18 + look * 3, -36);
      ctx.lineTo(sx * 24, -8);
      ctx.closePath();
      ctx.fillStyle = fur;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx * 11, -14);
      ctx.lineTo(sx * 18 + look * 3, -29);
      ctx.lineTo(sx * 21, -11);
      ctx.closePath();
      ctx.fillStyle = '#f2a7a0';
      ctx.fill();
    };
    ear(-1);
    ear(1);
    V.ellipse(ctx, 0, 0, 28, 24, fur);
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 24, 0, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    V.line(ctx, -6 + look * 4, -22, -4 + look * 4, -12, dark, 3);
    V.line(ctx, 6 + look * 4, -22, 4 + look * 4, -12, dark, 3);
    // face (shifts toward the look direction)
    const fx = look * 9;
    V.ellipse(ctx, fx, 9, 13, 9, belly);
    const blink = o.blink;
    [-1, 1].forEach((sx) => {
      const ex = fx + sx * 10, ey = -3;
      if (blink) V.line(ctx, ex - 5, ey, ex + 5, ey, INK, 2.5);
      else {
        V.ellipse(ctx, ex, ey, 5.5, 6.5, '#9bd06a');
        V.ellipse(ctx, ex + look * 1.8, ey, 2, 5.5, INK);
      }
    });
    V.ellipse(ctx, fx, 5, 4, 3, '#e98585');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx - 6, 12);
    ctx.quadraticCurveTo(fx - 3, 15, fx, 11);
    ctx.quadraticCurveTo(fx + 3, 15, fx + 6, 12);
    ctx.stroke();
    // whiskers
    ctx.strokeStyle = 'rgba(31,26,36,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    [-1, 1].forEach((sx) => {
      ctx.moveTo(fx + sx * 10, 9);
      ctx.lineTo(fx + sx * 30, 5);
      ctx.moveTo(fx + sx * 10, 12);
      ctx.lineTo(fx + sx * 30, 14);
    });
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  };

  // cartoon hatchback, side view. (x, yWheels) = centre of the car at the wheel-contact line.
  V.env.car = (ctx, x, y, s = 1, o = {}) => {
    const col = o.color || '#3b7dd8';
    const dir = o.dir || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * dir, s);
    ctx.lineJoin = 'round';
    // speed lines
    if (o.blur) {
      for (let i = 0; i < 5; i++) V.line(ctx, -260 - i * 40, -60 - i * 26, -420 - i * 60, -60 - i * 26, `rgba(255,255,255,${0.5 * o.blur})`, 6);
    }
    // body
    ctx.beginPath();
    ctx.moveTo(-250, -40);
    ctx.lineTo(-250, -110);
    ctx.quadraticCurveTo(-248, -132, -220, -136);
    ctx.lineTo(-150, -140);
    ctx.quadraticCurveTo(-110, -220, -40, -226);
    ctx.lineTo(90, -226);
    ctx.quadraticCurveTo(140, -222, 180, -150);
    ctx.lineTo(236, -132);
    ctx.quadraticCurveTo(262, -120, 262, -80);
    ctx.lineTo(262, -40);
    ctx.quadraticCurveTo(262, -24, 240, -24);
    ctx.lineTo(-232, -24);
    ctx.quadraticCurveTo(-250, -24, -250, -40);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // windows
    poly(ctx, [[-132, -146], [-96, -206], [-30, -210], [-30, -146]], '#bfe0f4', INK, 3);
    poly(ctx, [[-14, -146], [-14, -210], [84, -210], [152, -146]], '#bfe0f4', INK, 3);
    poly(ctx, [[-80, -200], [-60, -200], [-92, -150], [-112, -150]], 'rgba(255,255,255,0.45)');
    // door line, handle, lights
    V.line(ctx, -22, -140, -22, -36, V.shade(col, -0.35), 3);
    rr(ctx, 6, -122, 26, 7, 3, V.shade(col, 0.3));
    rr(ctx, 236, -112, 24, 22, 6, '#fff3b0', INK, 2.5);
    rr(ctx, -250, -112, 14, 26, 4, '#e2463c', INK, 2.5);
    rr(ctx, -256, -52, 520, 16, 7, '#3a3a44');
    // wheels
    const rot = (o.dist || 0) / 44;
    [[-150, 0], [160, 0]].forEach(([wx]) => {
      V.circle(ctx, wx, -26, 46, INK);
      V.circle(ctx, wx, -26, 40, '#2a2a30');
      V.circle(ctx, wx, -26, 20, '#c9ccd2', INK, 2);
      ctx.save();
      ctx.translate(wx, -26);
      ctx.rotate(rot);
      for (let k = 0; k < 5; k++) {
        ctx.rotate((Math.PI * 2) / 5);
        V.line(ctx, 0, 0, 0, 17, '#8a8f99', 4);
      }
      ctx.restore();
    });
    ctx.restore();
  };

  // ------------------------------------------------------------------ hero cast shadow
  let shC = null;
  V.env.streetCastShadow = (ctx, o, groundY, fn, alphaMul = 1) => {
    const L = light(o.hour === undefined ? 12 : o.hour);
    if (L.shA <= 0.01 || Math.abs(L.shL) < 0.02) return;
    const cam = normCam(o);
    if (!shC) {
      shC = document.createElement('canvas');
      shC.width = V.W;
      shC.height = V.H;
    }
    const c = shC.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, V.W, V.H);
    c.save();
    camApply(c, cam, 1);
    fn(c);
    c.restore();
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#2a1c3a';
    c.fillRect(0, 0, V.W, V.H);
    c.globalCompositeOperation = 'source-over';
    const G = toScreen(cam, 0, groundY)[1];
    ctx.save();
    ctx.setTransform(1, 0, -L.shL, -L.shK, L.shL * G, G * (1 + L.shK));
    ctx.globalAlpha = L.shA * alphaMul;
    ctx.drawImage(shC, 0, 0);
    ctx.restore();
  };

  // colour grade of whatever is drawn on ctx so far ('source-atop' leaves transparent sky alone)
  function grade(ctx, L) {
    if (L.washA > 0.004) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = L.washA;
      ctx.fillStyle = L.wash;
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
    if (L.morning > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const g = ctx.createLinearGradient(0, 0, V.W, V.H * 0.6);
      g.addColorStop(0, `rgba(255,190,100,${0.3 * L.morning})`);
      g.addColorStop(0.7, 'rgba(255,190,100,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, V.W, V.H);
      ctx.restore();
    }
  }
  V.env.streetGrade = grade;

  // blend two full rig poses (from V.boy.pose.*): numbers, arms and legs interpolate,
  // everything else (face, outfit, facing, props) switches at k = 0.5
  V.env.poseMix = (a, b, k) => {
    if (k <= 0) return a;
    if (k >= 1) return b;
    const base = V.boy.pose.stand();
    a = Object.assign({}, base, a);
    b = Object.assign({}, base, b);
    ['armNear', 'armFar', 'legNear', 'legFar'].forEach((f) => {
      if (!a[f]) a[f] = base[f];
      if (!b[f]) b[f] = base[f];
    });
    const out = Object.assign({}, k < 0.5 ? a : b);
    ['rot', 'torso', 'head', 'brows', 'blush'].forEach((f) => {
      if (typeof a[f] === 'number' && typeof b[f] === 'number') out[f] = V.lerp(a[f], b[f], k);
    });
    ['armNear', 'armFar'].forEach((f) => {
      out[f] = { sh: V.lerp(a[f].sh, b[f].sh, k), el: V.lerp(a[f].el, b[f].el, k) };
    });
    ['legNear', 'legFar'].forEach((f) => {
      out[f] = { hip: V.lerp(a[f].hip, b[f].hip, k), knee: V.lerp(a[f].knee, b[f].knee, k), foot: V.lerp(a[f].foot || 0, b[f].foot || 0, k) };
    });
    return out;
  };
  let acC = null;
  const actorCanvas = () => {
    if (!acC) {
      acC = document.createElement('canvas');
      acC.width = V.W;
      acC.height = V.H;
    }
    return acC.getContext('2d');
  };

  // ------------------------------------------------------------------ the whole street
  V.env.street = (ctx, o = {}) => {
    const cam = normCam(o);
    const hour = o.hour === undefined ? 12 : o.hour;
    const L = light(hour);
    const t = o.t || 0;
    const glow = [];
    const lampsOf = (i, x) => (typeof o.lamps === 'function' ? o.lamps(i, x) : o.lamps !== undefined ? o.lamps : L.night);
    const winLit = o.windowsLit !== undefined ? o.windowsLit : L.night;
    ctx.save();
    ctx.clearRect(0, 0, V.W, V.H);
    // far -> near
    drawFarCity(ctx, cam, L, t);
    drawMidTrees(ctx, cam, L, t);
    drawNeighbours(ctx, cam, Object.assign({}, L, { night: winLit }), glow, t);
    ctx.save();
    camApply(ctx, cam, 1);
    drawGroundBands(ctx, cam, L);
    const [a, b] = visRange(cam, 1, 900);
    if (o.house !== false && b > ST.house.x0 - 100 && a < ST.house.x1 + 100) {
      V.env.houseFront(ctx, Object.assign({}, o, { _L: L, _glow: glow, windowsLit: winLit, _porchLamp: lampsOf(-1, 186) }));
    }
    drawStreetWalls(ctx, cam, L);
    ST.streetTrees.forEach((x) => {
      if (x > a && x < b) drawStreetTree(ctx, x, L, t);
    });
    ST.lamps.forEach((x, i) => {
      if (x > a - 200 && x < b) drawLampPost(ctx, x, L, lampsOf(i, x), glow);
    });
    if (o.props) o.props(ctx);
    ctx.restore();
    grade(ctx, L);
    // surface glows (lit window glass, hallway, lamp bulbs) under the actors
    glow.forEach((it) => {
      if (it.light) return;
      ctx.save();
      camApply(ctx, cam, it.f);
      it.fn(ctx);
      ctx.restore();
    });
    // actors (inside the doorway + outside) on their own layer, graded the same way
    if (o.actors || o.inside || o.front) {
      const ac = actorCanvas();
      ac.setTransform(1, 0, 0, 1, 0, 0);
      ac.globalCompositeOperation = 'source-over';
      ac.globalAlpha = 1;
      ac.clearRect(0, 0, V.W, V.H);
      ac.save();
      camApply(ac, cam, 1);
      if (o.inside && o.house !== false) V.env.streetDoorwayLayer(ac, o);
      if (o.actors) o.actors(ac);
      if (o.front) o.front(ac);
      ac.restore();
      ac.setTransform(1, 0, 0, 1, 0, 0);
      grade(ac, L);
      ctx.drawImage(acC, 0, 0);
    }
    // additive light (window halos, lamp cones, door spill) on top of everything
    glow.forEach((it) => {
      if (!it.light) return;
      ctx.save();
      camApply(ctx, cam, it.f);
      it.fn(ctx);
      ctx.restore();
    });
    // sky behind everything
    drawSkyBehind(ctx, cam, L, t, o);
    ctx.restore();
    if (o.overlay) {
      ctx.save();
      o.overlay(ctx);
      ctx.restore();
    }
  };
})();
