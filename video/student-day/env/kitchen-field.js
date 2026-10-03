// Shared helpers for the 'kitchen-field' location group (scenes 10-lunch, 11-gear-up, 12-training).
//
// =============================================================================================
//  GENERIC HELPERS (prefixed kf so they never collide with other groups)
// =============================================================================================
//   V.env.kfCam(ctx, cam)                 apply a 2D camera {x, y, zoom}: world (x, y) -> screen centre
//   V.env.kfToScreen(cam, x, y)           -> [sx, sy]
//   V.env.kfPoseMix(a, b, k)              blend two rig poses (angles lerp, face/outfit switch at 0.5)
//   V.env.kfArmIK(pose, x, y, s, 'near'|'far', [wx, wy], flip)  -> NEW pose with that hand at (wx, wy)
//   V.env.kfLegIK(pose, x, y, s, 'near'|'far', [wx, wy], footTilt) -> NEW pose, ankle at (wx, wy),
//                                         sole kept flat (+footTilt deg)
//   V.env.kfTorsoProp(pose, fn, prevHeadProp) -> a headProp that runs fn(ctx) in the TORSO frame
//                                         (origin = hip, y up negative, top of torso ~ -138). Drawn after
//                                         the torso and before the near arm (bibs, sweat patches ...)
//   V.env.kfBodyProp(pose, fn(ctx, fkJoints), prev) same, BODY frame (hip origin, no torso lean)
//   V.env.kfAim(ctx, screenAngleRad)      inside a propNear/propFar callback: rotate so +x points along a
//                                         SCREEN angle (keeps a fork / glass pointing where you want)
//   V.env.kfScratch(i, w, h)              shared off-screen canvas #i (default 1920x1080, cleared), for silhouettes
//
//  PROPS (all in local units; s = scale)
//   V.env.football(ctx, x, y, r, spin, {blur: [dx, dy], mud})   ball centre (x, y), radius r, spin (rad)
//   V.env.sportsBag(ctx, x, y, s, {open 0..1, contents(ctx), handles, rot, flip})
//                                         black/red duffel, 132 x 70 at s 1, origin = centre, bottom y +35.
//                                         open = how far the zip is undone (pull tab at x -44 + 88*open)
//   V.env.waterBottle(ctx, x, y, s, rot)  sport bottle 26 x 78, origin = centre
//   V.env.towelRoll(ctx, x, y, s, rot)    rolled white/red towel 70 x 34, origin = centre
//   V.env.lunchPlate(ctx, x, y, s, o)     SCHNITZEL + FRIES plate. Origin = plate centre, rim radius 80*s,
//        o.tilt 0..1 (vertical squash of the plate plane, default 0.42), o.bite 0..6 (schnitzel bites
//        taken, fractional = bite in progress; 6 = all gone), o.fries 0..1 remaining, o.ketchup 0..1,
//        o.steam 0..1 + o.t (rising steam), o.crumbs (bool). Bites eat the schnitzel from the LEFT.
//   V.env.lunchPlatePoint(name, x, y, s, tilt, bite) -> [wx, wy] of 'schnitzel' (next bite spot),
//        'fries' (top of the pile), 'ketchup', 'centre'
//   V.env.fork(ctx, {food: null|'schnitzel'|'fry'|'fries', dip: bool})  silver fork along +x, grip at origin
//   V.env.juiceGlass(ctx, x, y, s, {level 0..1, tilt deg, liquidTilt deg})  origin = bottom centre, 70 tall
//                                         (liquidTilt: how much the CURRENT frame is rotated, keeps the juice level)
//   V.env.ketchupBottle(ctx, x, y, s)     origin = bottom centre, 84 tall
//   V.env.saladBowl(ctx, x, y, s)         Israeli chopped salad, origin = bottom centre
//   V.env.whistleProp(ctx)                a headProp: coach whistle in the mouth + lanyard
//   V.env.kfBib(color)                    torso-frame drawing fn for a mesh training bib (use with kfTorsoProp)
//   V.env.KF_PEOPLE                       { coach, mate1, mate2, mate3, keeper } -> {look, outfit, bib}
//
// =============================================================================================
//  THE KITCHEN  —  V.env.kitchen(ctx, o)        (scene 10-lunch, 15:20, afternoon)
// =============================================================================================
//   o.cam {x, y, zoom}  (default {960, 540, 1})   o.hour (default 15.3)   o.t
//   o.clock 'HH:MM'     the wall clock (default '15:20')
//   o.table(ctx)        WORLD: items on the table top (plate, glass ...), drawn on the cloth
//   o.actors(ctx)       WORLD: people. Drawn after the table items and the chairs, BEFORE the front
//                       drop of the tablecloth (which hides the sitter's lap / knees)
//   o.front(ctx)        WORLD: in front of the cloth drop      o.overlay(ctx) SCREEN coords, last
//   o.chairDX           px the hero's chair is pushed back (to the left)
//   o.tableItems        default true: salad bowl, bread basket, water jug at the far end
//  LAYOUT  V.env.KITCHEN (world px; cam {960, 540, 1} shows x 0..1920)
//   FY 880              wall/floor line. Floor tiles below.
//   counter             x -560..410: upper cabinets y 150..380, worktop top y 614, base 640..880,
//                       sink x -200..0, oven + cooktop x 160..380 (pan + pot), range hood above
//   fridge              x 430..650, y 170..880 (mint, magnets, kids' drawings)
//   window              x 1010..1370, y 220..540 (afternoon sky), sill y 540..560
//   shelf with jars     x 1450..1690 y 420, calendar x 1740..1860
//   table               top surface: back edge y 630 (x 782..1840), front edge y 716 (x 768..1858),
//                       blue gingham cloth hanging down to y ~792. Legs to y 900 (back) / 950 (front)
//   hero chair          seat top y 808, x 636..790. HERO = {x 712, y 778 (hip), s 1.35}: P.sit() there
//                       puts the feet on the floor (y ~932) and the knees under the cloth.
//   plate spot          (952, 682), s 1.2, tilt 0.42   glass (902, 642)  ketchup (1080, 662)
//   clock               centre (918, 382) r 46 (between the sitter's head and the window)
//
// =============================================================================================
//  THE HALLWAY / HOME ENTRANCE  —  V.env.hallway(ctx, o)   (scene 11-gear-up, 16:40)
// =============================================================================================
//   o.cam, o.hour (default 16.67), o.t
//   o.doorOpen 0..1     front door swings INTO the hallway (toward the camera), hinge on the RIGHT jamb
//   o.inside(ctx)       WORLD: people in the doorway / outside (clipped to the opening, behind the frame)
//   o.back(ctx)         WORLD: props in the room behind the actors (bag on the bench, ball on the cabinet)
//   o.actors(ctx)       WORLD      o.front(ctx) WORLD      o.overlay(ctx) SCREEN
//   o.note              sticky note "אימון 17:00" on the mirror (default true)
//   o.clothes 0..1      the school tee + jeans lying crumpled on the bench's left end (x ~588)
//  LAYOUT  V.env.HALLWAY
//   FY 860 wall/floor line; people stand with their feet at FEET 915 (scale 1.3). Depth helper:
//   V.env.hallwayScale(feetY) -> rig scale for feet at feetY (horizon y 470): 1.3 at 915, 1.17 at 870
//   mirror   x 290..490, y 190..610 (arched), sticky note centre (440, 372)
//   hooks    x 560..1010 y 250..272 (jackets)   bench x 540..1040, seat top y 742 (front edge),
//            people sit with hip y ~ 718 (s 1.3); bench front legs stand at y 902
//   cabinet  x 1070..1230, top y 730 (key bowl, plant)      door opening x 1300..1560, top 210, sill 860
//   V.env.hallwayDoorHandle(open) -> [x, y] of the inside lever for an opening 0..1
//
// =============================================================================================
//  THE FOOTBALL PITCH  —  V.env.pitch(ctx, o)   (scene 12-training, 17:00 golden light)
// =============================================================================================
//  Pseudo-3D: ground coordinates (X along the pitch, Y = depth AWAY from the camera, h = height).
//  Y = 0 is the reference line (the hero runs on it, rig scale V.env.PITCH.S = 0.8); depth factor
//  Z = 1 + Y / D (D 1300). Camera cam = {x, y, zoom}: the Y = 0 plane is an ordinary 2D world
//  (ground line y GY 860, horizon y 340) and further planes shrink toward the horizon (parallax).
//   o.cam, o.hour (default 17), o.t
//   o.netHit 0..1(+)    back-net bulge strength (scene animates it, may oscillate negative a bit)
//   o.netAt {Y, h}      where the ball hits the back net (default {Y: 800, h: 150})
//   o.actors(ctx, api)  called after the pitch, lines and all scenery; draw depth-sorted people here:
//      api.layer(ctx, Y)          set ctx to the plane at depth Y (wrap in save/restore). In it, the
//                                 ground is y = GY and x = world X; draw the rig at scale S as usual.
//      api.P(X, Y, h) -> {x, y, k} screen point + screen scale (zoom / Z)
//      api.goalBack(ctx)          far post, far/back/top nets (draw a ball that is INSIDE the goal next)
//      api.goalFront(ctx)         near side net, near post, crossbar (draw after the ball / keeper)
//      api.shadows(ctx, list)     long 17:00 cast shadows: list of {Y, draw(c)} (draw the rig in layer
//                                 coords exactly like the real figure). Call BEFORE drawing the figures.
//      api.ballShadow(ctx, X, Y, h, r)  contact + cast shadow of a ball
//   o.overlay(ctx)      SCREEN, after the golden grade
//  LAYOUT  V.env.PITCH:  goal line X 2350, posts at Y 300 / 1300, crossbar h 400, net depth 260
//   far touchline Y 2800, near touchline Y -420, fence Y 3600, team bench Y 3150 (X 260..860)
//   scoreboard centre X 900, Y 3350 (LED clock o.clock, default '17:00')
//   floodlight towers (off) X -900, 1500, 3900 at Y 6000. Halfway line X -1450 (centre circle).
//   V.env.pitchP(cam, X, Y, h), V.env.pitchLayer(ctx, cam, Y), V.env.pitchZ(Y)
// =============================================================================================
(function () {
  const V = window.V;
  V.env = V.env || {};
  const E = V.env;
  const INK = V.pal.ink;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------ tiny drawing helpers
  const rr = (ctx, x, y, w, h, r, fill, stroke, lw = 3) => V.fillRound(ctx, x, y, w, h, r, fill, stroke, lw);
  const rect = (ctx, x, y, w, h, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  };
  const poly = (ctx, pts, fill, stroke, lw = 3) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
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
  // smooth closed curve through points (midpoint quadratic), optional y squash
  const smooth = (ctx, pts, sy = 1, dx = 0, dy = 0) => {
    const P = pts.map(([x, y]) => [x + dx, y * sy + dy]);
    const n = P.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.beginPath();
    const m0 = mid(P[n - 1], P[0]);
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(P[i], P[(i + 1) % n]);
      ctx.quadraticCurveTo(P[i][0], P[i][1], m[0], m[1]);
    }
    ctx.closePath();
  };
  E.kfPoly = poly;
  E.kfSmooth = smooth;

  // ------------------------------------------------------------------ camera
  E.kfCam = (ctx, cam) => {
    cam = cam || { x: 960, y: 540, zoom: 1 };
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  };
  E.kfToScreen = (cam, x, y) => [V.W / 2 + (x - cam.x) * cam.zoom, V.H / 2 + (y - cam.y) * cam.zoom];

  // ------------------------------------------------------------------ poses / IK
  E.kfPoseMix = (a, b, k) => {
    if (k <= 0) return a;
    if (k >= 1) return b;
    const base = V.boy.pose.stand();
    a = Object.assign({}, base, a);
    b = Object.assign({}, base, b);
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
  const d2 = (r) => (r * 180) / Math.PI;
  // world point -> body-local (facing +x, before rot) for a figure at hip (x, y), scale s
  const toLocal = (pose, x, y, s, w) => {
    const f = pose.facing || 1;
    const u = (w[0] - x) / (s * f), v = (w[1] - y) / s;
    const r = V.deg(pose.rot || 0);
    return [u * Math.cos(r) + v * Math.sin(r), -u * Math.sin(r) + v * Math.cos(r)];
  };
  E.kfArmIK = (pose, x, y, s, which, target, flip) => {
    const Bm = V.boy, Dm = Bm.D;
    const full = Object.assign(Bm.pose.stand(), pose);
    const j = Bm.fk(full);
    const [lx, ly] = toLocal(full, x, y, s, target);
    const sx = j.shoulder[0] + (which === 'far' ? -6 : 4), sy = j.shoulder[1];
    const dx = lx - sx, dy = ly - sy;
    const d = V.clamp(Math.hypot(dx, dy), 8, Dm.UA + Dm.FA - 0.5);
    const base = d2(Math.atan2(dx, dy));
    const al = d2(Math.acos(V.clamp((Dm.UA * Dm.UA + d * d - Dm.FA * Dm.FA) / (2 * Dm.UA * d), -1, 1)));
    const ua = flip ? base + al : base - al;
    const ex = sx + Math.sin(V.deg(ua)) * Dm.UA, ey = sy + Math.cos(V.deg(ua)) * Dm.UA;
    const fa = d2(Math.atan2(lx - ex, ly - ey));
    let el = fa - ua;
    while (el > 180) el -= 360;
    while (el < -180) el += 360;
    const out = Object.assign({}, pose);
    out[which === 'far' ? 'armFar' : 'armNear'] = { sh: ua - (full.torso || 0), el };
    return out;
  };
  E.kfLegIK = (pose, x, y, s, which, target, footTilt = 0) => {
    const Bm = V.boy, Dm = Bm.D;
    const full = Object.assign(Bm.pose.stand(), pose);
    const [lx, ly] = toLocal(full, x, y, s, target);
    const hx = which === 'far' ? -5 : 5;
    const dx = lx - hx, dy = ly;
    const d = V.clamp(Math.hypot(dx, dy), 10, Dm.TH + Dm.SH - 0.5);
    const base = d2(Math.atan2(dx, dy));
    const al = d2(Math.acos(V.clamp((Dm.TH * Dm.TH + d * d - Dm.SH * Dm.SH) / (2 * Dm.TH * d), -1, 1)));
    const ta = base + al;
    const kx = hx + Math.sin(V.deg(ta)) * Dm.TH, ky = Math.cos(V.deg(ta)) * Dm.TH;
    const sa = d2(Math.atan2(lx - kx, ly - ky));
    const out = Object.assign({}, pose);
    // foot angle fa = sa + 90 + foot -> 90 means flat, pointing forward (before rot)
    out[which === 'far' ? 'legFar' : 'legNear'] = { hip: ta, knee: sa - ta, foot: -sa - (full.rot || 0) + footTilt };
    return out;
  };
  E.kfTorsoProp = (pose, fn, prev) => (c) => {
    const full = Object.assign(V.boy.pose.stand(), pose);
    const j = V.boy.fk(full);
    c.save();
    c.rotate(-V.deg((full.torso || 0) + (full.head || 0)));
    c.translate(j.hip[0] - j.head[0], j.hip[1] - j.head[1]);
    c.rotate(V.deg(full.torso || 0));
    fn(c);
    c.restore();
    if (prev) prev(c);
  };
  // like kfTorsoProp but in the BODY frame (origin = hip, not rotated by the torso lean)
  E.kfBodyProp = (pose, fn, prev) => (c) => {
    const full = Object.assign(V.boy.pose.stand(), pose);
    const j = V.boy.fk(full);
    c.save();
    c.rotate(-V.deg((full.torso || 0) + (full.head || 0)));
    c.translate(j.hip[0] - j.head[0], j.hip[1] - j.head[1]);
    fn(c, j);
    c.restore();
    if (prev) prev(c);
  };
  E.kfAim = (ctx, ang) => {
    const m = ctx.getTransform();
    const cur = Math.atan2(m.b, m.a);
    const det = m.a * m.d - m.b * m.c;
    ctx.rotate(det < 0 ? -(ang - cur) : ang - cur);
  };
  // re-draw a rig hand on top of a held prop (inside a propNear/propFar callback)
  E.kfHand = (ctx, skin) => V.circle(ctx, 0, 0, V.boy.D.HAND, skin || V.boy.HERO.skin, INK, V.boy.D.OUT);
  const scratch = {};
  E.kfScratch = (i = 0, w = V.W, h = V.H) => {
    const key = i + ':' + w + 'x' + h;
    if (!scratch[key]) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      scratch[key] = c;
    }
    const c = scratch[key];
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, w, h);
    return x;
  };

  // ================================================================== PROPS
  E.football = (ctx, x, y, r, spin = 0, o = {}) => {
    ctx.save();
    if (o.blur) {
      const [bx, by] = o.blur;
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.12 * (4 - i);
        V.circle(ctx, x - bx * i * 0.33, y - by * i * 0.33, r, '#ffffff');
      }
      ctx.globalAlpha = 1;
    }
    ctx.translate(x, y);
    const lw = Math.max(1.5, r * 0.09);
    V.circle(ctx, 0, 0, r, '#fbfbf7');
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - lw * 0.3, 0, TAU);
    ctx.clip();
    ctx.rotate(spin);
    const pent = (px, py, pr, rot) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + (i * TAU) / 5;
        ctx.lineTo(px + Math.cos(a) * pr, py + Math.sin(a) * pr);
      }
      ctx.closePath();
      ctx.fillStyle = '#23232b';
      ctx.fill();
    };
    // seams from the centre patch
    ctx.strokeStyle = 'rgba(40,40,50,0.55)';
    ctx.lineWidth = lw * 0.55;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5;
      ctx.moveTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32);
      ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    }
    ctx.stroke();
    pent(0, 0, r * 0.34, -Math.PI / 2);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + Math.PI / 5 + (i * TAU) / 5;
      pent(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98, r * 0.3, a + Math.PI);
    }
    ctx.restore();
    // shading (fixed light from upper left)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, TAU);
    ctx.arc(-r * 0.28, -r * 0.3, r * 1.02, 0, TAU, true);
    ctx.fillStyle = 'rgba(30,40,70,0.22)';
    ctx.fill();
    if (o.mud) V.ellipse(ctx, r * 0.3, r * 0.55, r * 0.35, r * 0.18, 'rgba(110,75,40,0.55)', 0.3);
    ctx.restore();
    V.ellipse(ctx, -r * 0.38, -r * 0.42, r * 0.22, r * 0.13, 'rgba(255,255,255,0.75)', -0.7);
    V.circle(ctx, 0, 0, r, null, INK, lw);
    ctx.restore();
  };

  E.waterBottle = (ctx, x, y, s = 1, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    rr(ctx, -13, -26, 26, 64, 9, '#6fc0ef', INK, 3);
    rr(ctx, -13, -2, 26, 18, 2, '#e2463c');
    rr(ctx, -13, -26, 26, 64, 9, null, INK, 3);
    V.line(ctx, -7, -20, -7, 30, 'rgba(255,255,255,0.65)', 4);
    rr(ctx, -10, -38, 20, 14, 4, '#f4f4f0', INK, 2.5);
    rr(ctx, -4, -46, 8, 9, 3, '#f4f4f0', INK, 2);
    ctx.restore();
  };

  E.towelRoll = (ctx, x, y, s = 1, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    rr(ctx, -35, -17, 70, 34, 15, '#f6f4ee', INK, 3);
    rect(ctx, -12, -15, 8, 30, '#e2463c');
    rect(ctx, 2, -15, 4, 30, '#e2463c');
    V.ellipse(ctx, 28, 0, 9, 16, '#ebe7dc');
    ctx.beginPath();
    ctx.arc(28, 0, 9, 0, Math.PI * 1.6);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(31,26,36,0.5)';
    ctx.stroke();
    rr(ctx, -35, -17, 70, 34, 15, null, INK, 3);
    ctx.restore();
  };

  // black/red duffel (same design as the bag in 13-back-home)
  E.sportsBag = (ctx, x, y, s = 1, o = {}) => {
    const open = V.clamp(o.open || 0);
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(s * (o.flip ? -1 : 1), s);
    if (o.handles !== false) {
      ctx.lineCap = 'round';
      [[-30, 30], [-6, 6]].forEach(([a, b], i) => {
        ctx.beginPath();
        ctx.moveTo(a, -30);
        ctx.quadraticCurveTo((a + b) / 2, -64 + i * 8, b, -30);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.strokeStyle = i ? '#3a3a46' : '#2b2b33';
        ctx.lineWidth = 5;
        ctx.stroke();
      });
    }
    const body = () => V.roundRect(ctx, -66, -34, 132, 70, 30);
    body();
    ctx.fillStyle = '#22222a';
    ctx.fill();
    ctx.save();
    body();
    ctx.clip();
    rect(ctx, -70, -6, 140, 14, '#e2463c');
    V.ellipse(ctx, -58, 1, 9, 30, '#34343e');
    V.ellipse(ctx, 58, 1, 9, 30, '#34343e');
    // swoosh
    ctx.beginPath();
    ctx.moveTo(-20, 22);
    ctx.quadraticCurveTo(0, 30, 26, 14);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f4f4f0';
    ctx.stroke();
    ctx.restore();
    // open mouth (zip undone from the left up to the pull tab)
    const zx = -44 + 88 * open;
    if (open > 0.02) {
      const gap = Math.min(1, open * 2.5);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-46, -31);
      ctx.quadraticCurveTo((zx - 46) / 2, -31 - 16 * gap, zx, -31);
      ctx.quadraticCurveTo((zx - 46) / 2, -31 + 10 * gap, -46, -31);
      ctx.closePath();
      ctx.fillStyle = '#0c0c11';
      ctx.fill();
      ctx.restore();
      if (o.contents) {
        ctx.save();
        // contents stick out of the mouth (clip below the front lip)
        ctx.beginPath();
        ctx.rect(-200, -400, 400, 400);
        ctx.moveTo(-46, -31);
        ctx.quadraticCurveTo((zx - 46) / 2, -31 + 10 * gap, zx, -31);
        ctx.lineTo(200, -31);
        ctx.lineTo(200, 200);
        ctx.lineTo(-200, 200);
        ctx.lineTo(-200, -31);
        ctx.closePath();
        ctx.clip('evenodd');
        o.contents(ctx, zx);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.moveTo(-46, -31);
      ctx.quadraticCurveTo((zx - 46) / 2, -31 + 10 * gap, zx, -31);
      ctx.strokeStyle = '#8a8a96';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // zipper track (closed part)
    ctx.setLineDash([4, 3]);
    V.line(ctx, Math.max(-44, zx), -31, 44, -31, '#8a8a96', 3, 'butt');
    ctx.setLineDash([]);
    // pull tab
    rr(ctx, zx - 4, -36, 8, 12, 2, '#c9ced6', INK, 2);
    rr(ctx, zx - 3, -26, 6, 12, 2, '#e2463c', INK, 1.6);
    V.roundRect(ctx, -66, -34, 132, 70, 30);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  };

  // ------------------------------------------------------------------ lunch: schnitzel & fries
  const SCHNITZEL = [[-72, -2], [-67, -24], [-49, -36], [-22, -39], [4, -34], [20, -20], [26, 2], [19, 23], [0, 35], [-27, 38], [-54, 31], [-70, 15]];
  const SCH_X0 = -74, SCH_X1 = 28, BITES = 6;
  const FRIES = (() => {
    const a = [];
    for (let i = 0; i < 22; i++) {
      const layer = i < 10 ? 0 : i < 16 ? 1 : i < 20 ? 2 : 3;
      const spread = [1, 0.72, 0.48, 0.28][layer];
      a.push({
        x: 38 + (V.rand(i * 3.3 + 1) - 0.5) * 46 * spread,
        y: -4 + (V.rand(i * 5.1 + 2) - 0.5) * 56 * spread,
        h: layer * 6.5 + V.rand(i * 7.7) * 3,
        a: V.rand(i * 2.9 + 4) * Math.PI,
        len: 30 + V.rand(i * 1.7) * 13,
        tone: V.rand(i * 9.1),
      });
    }
    a.sort((p, q) => p.h - q.h || p.y - q.y);
    return a;
  })();
  const CRUMBS = Array.from({ length: 70 }, (_, i) => [SCH_X0 + 8 + V.rand(i * 4.7) * 80, -30 + V.rand(i * 6.1) * 62, 0.9 + V.rand(i * 2.3) * 1.9, V.rand(i * 8.3)]);
  const KETCHUP = [14, 46];
  const biteX = (b) => SCH_X0 + ((SCH_X1 + 8 - SCH_X0) * b) / BITES;

  E.lunchPlatePoint = (name, x, y, s, tilt = 0.42, bite = 0, fries = 1) => {
    let p;
    if (name === 'schnitzel') p = [Math.min(SCH_X1 - 10, biteX(Math.floor(bite)) + 16), 0, 8];
    else if (name === 'fries') {
      const n = Math.max(1, Math.round(FRIES.length * fries));
      const f = FRIES[n - 1];
      p = [f.x, f.y, f.h + 4];
    } else if (name === 'ketchup') p = [KETCHUP[0], KETCHUP[1], 3];
    else p = [0, 0, 0];
    return [x + p[0] * s, y + (p[1] * tilt - p[2]) * s];
  };

  function drawFry(ctx, f, tilt, L = 1) {
    const cx = f.x, cy = f.y * tilt - f.h;
    const ang = Math.atan2(Math.sin(f.a) * tilt, Math.cos(f.a));
    const len = f.len * Math.hypot(Math.cos(f.a), Math.sin(f.a) * tilt);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    const col = V.mixColor('#f8cf55', '#eeb43a', f.tone);
    rr(ctx, -len / 2, -4, len, 8, 3, col, INK, 1.6 * L);
    rect(ctx, -len / 2 + 3, -2.5, len - 8, 2, 'rgba(255,248,200,0.75)');
    rr(ctx, len / 2 - 6, -3, 4, 6, 2, 'rgba(176,104,30,0.6)');
    ctx.restore();
  }

  E.lunchPlate = (ctx, x, y, s = 1, o = {}) => {
    const tilt = o.tilt === undefined ? 0.42 : o.tilt;
    const t = o.t || 0;
    const bite = V.clamp(o.bite || 0, 0, BITES);
    const friesK = o.fries === undefined ? 1 : V.clamp(o.fries);
    const ket = o.ketchup === undefined ? 1 : V.clamp(o.ketchup);
    const L = o.lw || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    // plate
    V.ellipse(ctx, 5, 9, 86, 84 * tilt, 'rgba(70,40,20,0.2)');
    V.ellipse(ctx, 0, 6, 80, 80 * tilt, '#d9dde2');
    ctx.beginPath();
    ctx.ellipse(0, 6, 80, 80 * tilt, 0, 0, Math.PI);
    ctx.lineWidth = 2.5 * L;
    ctx.strokeStyle = INK;
    ctx.stroke();
    V.ellipse(ctx, 0, 0, 80, 80 * tilt, '#fbfaf6');
    ctx.beginPath();
    ctx.ellipse(0, 0, 80, 80 * tilt, 0, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, 72, 72 * tilt, 0, 0, TAU);
    ctx.strokeStyle = '#7fa7d6';
    ctx.lineWidth = 2;
    ctx.stroke();
    V.ellipse(ctx, 0, 1.5, 60, 60 * tilt, '#efede6');
    V.ellipse(ctx, 0, 3, 57, 56 * tilt, '#f6f4ee');
    // crumbs under the schnitzel (visible once it is eaten)
    if (bite > 0 || o.crumbs) {
      CRUMBS.forEach(([cx, cy, r, k], i) => {
        if (i % 2 && bite < 3) return;
        V.circle(ctx, cx * 0.9, cy * tilt * 0.9, r, k > 0.5 ? '#d9952f' : '#b9772a');
      });
    }
    // parsley sprig
    ctx.save();
    ctx.translate(-58, -38 * tilt - 2);
    ctx.lineCap = 'round';
    V.line(ctx, 0, 6, -6, -4, '#3f8a3c', 1.4);
    V.line(ctx, 0, 6, 6, -6, '#3f8a3c', 1.4);
    V.line(ctx, 0, 6, 0, -9, '#3f8a3c', 1.4);
    [[-7, -6, -0.6], [7, -8, 0.6], [0, -12, 0], [-3, -3, -1.2], [4, -2, 1.1]].forEach(([lx, ly, a], i) => {
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(a);
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const th = (k / 10) * TAU;
        const r = 4.2 + (k % 2 ? 1.1 : 0);
        ctx.lineTo(Math.cos(th) * r * 0.8, Math.sin(th) * r);
      }
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#3f9a45' : '#5cb85a';
      ctx.fill();
      ctx.lineWidth = 0.9 * L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();

    // schnitzel (bitten from the left)
    if (bite < BITES - 0.01) {
      ctx.save();
      const bf = Math.floor(bite), fr = V.ease.out(bite - bf);
      const xb = V.lerp(biteX(bf), biteX(bf + 1), fr);
      const sc = [[-24, 11], [-4, 13], [16, 11], [34, 10]].map(([yy, r], i) => [xb + 3 + (i % 2) * 2 - (yy + 4) * 0.18, yy + ((bf % 2) * 6 - 3), r]);
      if (bite > 0.001) {
        ctx.beginPath();
        ctx.rect(xb - 4, -200, 400, 400);
        ctx.clip();
        sc.forEach(([bx, by, r]) => {
          ctx.beginPath();
          ctx.rect(-300, -300, 600, 600);
          ctx.ellipse(bx, by * tilt, r, r * Math.max(0.6, tilt + 0.25), 0, 0, TAU);
          ctx.clip('evenodd');
        });
      }
      // thickness
      smooth(ctx, SCHNITZEL, tilt, 1, 6);
      ctx.fillStyle = '#a65f1d';
      ctx.fill();
      ctx.lineWidth = 2.2 * L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      // top
      const g = ctx.createRadialGradient(-34, -10 * tilt, 4, -24, 0, 70);
      g.addColorStop(0, '#f6c35a');
      g.addColorStop(0.7, '#e3a23c');
      g.addColorStop(1, '#c9822a');
      smooth(ctx, SCHNITZEL, tilt);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 230; i++) {
        const cx = SCH_X0 + V.rand(i * 3.7 + 0.5) * (SCH_X1 - SCH_X0), cy = (-40 + V.rand(i * 5.3 + 0.2) * 80) * tilt;
        const r = 0.6 + V.rand(i * 1.9) * 1.1;
        const k = V.rand(i * 7.1);
        V.circle(ctx, cx, cy, r, k < 0.5 ? 'rgba(252,226,140,0.9)' : k < 0.9 ? 'rgba(170,96,26,0.75)' : 'rgba(130,70,18,0.8)');
      }
      for (let i = 0; i < 34; i++) {
        const cx = SCH_X0 + 6 + V.rand(i * 9.7 + 0.3) * (SCH_X1 - SCH_X0 - 12), cy = (-34 + V.rand(i * 4.1 + 0.9) * 68) * tilt;
        const r = 2 + V.rand(i * 2.6) * 1.8;
        V.circle(ctx, cx, cy + r * 0.35, r, 'rgba(176,100,28,0.55)');
        V.circle(ctx, cx, cy, r, '#eab24e');
        V.circle(ctx, cx - r * 0.3, cy - r * 0.35, r * 0.45, 'rgba(255,240,180,0.9)');
      }
      // glossy fried sheen
      ctx.beginPath();
      ctx.ellipse(-36, -16 * tilt, 18, 5, -0.2, 0, TAU);
      ctx.fillStyle = 'rgba(255,245,200,0.45)';
      ctx.fill();
      // exposed meat along the bite edge
      if (bite > 0.001) {
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#f6e7c8';
        ctx.beginPath();
        ctx.moveTo(xb - 4, -200);
        ctx.lineTo(xb - 4, 200);
        ctx.stroke();
        sc.forEach(([bx, by, r]) => {
          ctx.beginPath();
          ctx.ellipse(bx, by * tilt, r, r * Math.max(0.6, tilt + 0.25), 0, 0, TAU);
          ctx.stroke();
        });
        ctx.lineWidth = 3.4 * L;
        ctx.strokeStyle = '#8a4e18';
        ctx.beginPath();
        ctx.moveTo(xb - 4, -200);
        ctx.lineTo(xb - 4, 200);
        ctx.stroke();
        sc.forEach(([bx, by, r]) => {
          ctx.beginPath();
          ctx.ellipse(bx, by * tilt, r, r * Math.max(0.6, tilt + 0.25), 0, 0, TAU);
          ctx.stroke();
        });
      }
      ctx.restore();
      smooth(ctx, SCHNITZEL, tilt);
      ctx.lineWidth = 2.2 * L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.restore();
    }
    // lemon wedge (front left, in front of the schnitzel)
    ctx.save();
    ctx.translate(-44, 52 * tilt + 2);
    ctx.rotate(-0.15);
    ctx.scale(1.3, 1.3);
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(0, -20, 16, 0);
    ctx.closePath();
    ctx.fillStyle = '#fbf0a6';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * L;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(0, 7, 16, 0);
    ctx.quadraticCurveTo(0, 3, -16, 0);
    ctx.fillStyle = '#f2cf2e';
    ctx.fill();
    ctx.stroke();
    [[-8, -4], [0, -8], [8, -4]].forEach(([lx, ly]) => V.line(ctx, 0, -1, lx, ly, 'rgba(230,200,60,0.9)', 1.4));
    ctx.restore();
    // ketchup dollop
    if (ket > 0.02) {
      const k = Math.sqrt(ket);
      ctx.save();
      ctx.translate(KETCHUP[0], KETCHUP[1] * tilt);
      V.ellipse(ctx, 0, 0, 16 * k, 11 * k * Math.max(0.55, tilt + 0.2), '#c9221b');
      ctx.beginPath();
      ctx.ellipse(0, 0, 16 * k, 11 * k * Math.max(0.55, tilt + 0.2), 0, 0, TAU);
      ctx.lineWidth = 1.6 * L;
      ctx.strokeStyle = INK;
      ctx.stroke();
      V.ellipse(ctx, -1 * k, -3 * k, 9 * k, 6 * k, '#df3426');
      V.ellipse(ctx, -5 * k, -5 * k, 4 * k, 2 * k, 'rgba(255,220,210,0.85)');
      ctx.restore();
    }
    // fries pile (eaten from the top)
    const nF = Math.round(FRIES.length * friesK);
    for (let i = 0; i < nF; i++) drawFry(ctx, FRIES[i], tilt, L);
    ctx.restore();
    // steam: soft wisps rising and curling
    const st = o.steam || 0;
    if (st > 0.01) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const srcs = [[-34, -8], [-4, -16], [40, -20]];
      srcs.forEach(([sx0, sy0], i) => {
        if (i === 0 && bite >= 3) return;
        if (i === 1 && bite >= 5) return;
        if (i === 2 && friesK < 0.3) return;
        const y0 = y + sy0 * tilt * s, H = 130 * s;
        const pulse = 0.65 + 0.35 * Math.sin(t * 1.7 + i * 2.3);
        const g = ctx.createLinearGradient(0, y0, 0, y0 - H);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.25, `rgba(255,255,255,${0.42 * st * pulse})`);
        g.addColorStop(0.7, `rgba(255,255,255,${0.2 * st * pulse})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.beginPath();
        for (let k = 0; k <= 24; k++) {
          const a = k / 24;
          const px = x + (sx0 + Math.sin(a * 5.5 - t * 3 + i * 2.1) * 11 * (0.3 + a)) * s;
          const py = y0 - a * H;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.lineWidth = 9 * s;
        ctx.stroke();
        ctx.lineWidth = 4 * s;
        ctx.stroke();
      });
      ctx.restore();
    }
  };

  // fork along +x, grip at the origin (draw inside a hand frame, use kfAim to point it)
  E.fork = (ctx, o = {}) => {
    ctx.save();
    ctx.lineCap = 'round';
    V.line(ctx, -18, 0, 30, 0, INK, 9);
    V.line(ctx, -18, 0, 30, 0, '#cfd4dc', 5);
    poly(ctx, [[28, -4], [38, -7], [38, 7], [28, 4]], '#cfd4dc', INK, 2);
    for (let i = 0; i < 4; i++) {
      const yy = -6 + i * 4;
      V.line(ctx, 37, yy, 54, yy, INK, 3.4);
      V.line(ctx, 37, yy, 53, yy, '#dfe3ea', 1.6);
    }
    if (o.food === 'schnitzel') {
      smooth(ctx, [[42, -12], [56, -14], [62, -2], [58, 11], [44, 12], [38, 0]]);
      ctx.fillStyle = '#e3a23c';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      [[47, -6], [54, 3], [50, 7], [57, -5]].forEach(([cx, cy], i) => V.circle(ctx, cx, cy, 1.8, i % 2 ? '#f9d777' : '#b8701f'));
      V.line(ctx, 40, -9, 40, 9, '#f6e7c8', 3);
    } else if (o.food === 'fries') {
      [[-0.25, -6], [0.1, 0], [0.4, 5]].forEach(([a, dy], i) => {
        ctx.save();
        ctx.translate(56, dy);
        ctx.rotate(a);
        rr(ctx, -16, -4.5, 38, 9, 3.5, i === 1 ? '#f8cf55' : '#eeb43a', INK, 1.8);
        ctx.restore();
      });
    } else if (o.food === 'fry') {
      ctx.save();
      ctx.translate(58, 0);
      ctx.rotate(0.12);
      rr(ctx, -18, -4.5, 40, 9, 3.5, '#f8cf55', INK, 1.8);
      rect(ctx, -14, -3, 30, 2, 'rgba(255,248,200,0.8)');
      if (o.dip) {
        rr(ctx, 9, -5.5, 15, 11, 5, '#c9221b', INK, 1.6);
        V.circle(ctx, 14, -2, 1.6, 'rgba(255,220,210,0.9)');
      }
      ctx.restore();
    }
    ctx.restore();
  };

  E.juiceGlass = (ctx, x, y, s = 1, o = {}) => {
    const level = o.level === undefined ? 0.8 : V.clamp(o.level);
    const col = o.color || '#f7a21b';
    ctx.save();
    ctx.translate(x, y);
    if (o.tilt) ctx.rotate(V.deg(o.tilt));
    ctx.scale(s, s);
    const shape = () => poly(ctx, [[-15, 0], [15, 0], [19, -70], [-19, -70]]);
    shape();
    ctx.fillStyle = 'rgba(220,240,255,0.35)';
    ctx.fill();
    if (level > 0.01) {
      ctx.save();
      shape();
      ctx.clip();
      ctx.rotate(-V.deg(o.liquidTilt !== undefined ? o.liquidTilt : o.tilt || 0));
      const ly = -4 - 62 * level;
      rect(ctx, -60, ly, 120, 120, col);
      rect(ctx, -60, ly, 120, 4, V.shade(col, 0.35));
      ctx.restore();
    }
    V.line(ctx, -11, -8, -14, -62, 'rgba(255,255,255,0.7)', 3);
    shape();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    V.ellipse(ctx, 0, -70, 19, 4, 'rgba(255,255,255,0.35)');
    ctx.restore();
  };

  E.ketchupBottle = (ctx, x, y, s = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    rr(ctx, -17, -66, 34, 66, 12, '#d8261d', INK, 2.6);
    rr(ctx, -13, -46, 26, 22, 4, '#fbf7f0');
    V.circle(ctx, 0, -35, 6, '#d8261d');
    V.line(ctx, 0, -42, 2, -45, '#3f9a45', 2.4);
    V.line(ctx, -10, -60, -10, -8, 'rgba(255,255,255,0.45)', 3.5);
    rr(ctx, -11, -78, 22, 14, 4, '#fbf7f0', INK, 2.2);
    poly(ctx, [[-4, -78], [4, -78], [1.5, -88], [-1.5, -88]], '#fbf7f0', INK, 1.8);
    ctx.restore();
  };

  E.saladBowl = (ctx, x, y, s = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    V.ellipse(ctx, 0, -38, 54, 13, '#7fbf54');
    const bits = [[-30, -40, '#e2463c'], [-14, -44, '#5aa83f'], [2, -40, '#e2463c'], [18, -44, '#7fca5a'], [32, -40, '#e2463c'], [-22, -34, '#5aa83f'], [10, -35, '#f0e6a0'], [-4, -47, '#e2463c'], [26, -35, '#5aa83f']];
    bits.forEach(([bx, by, c]) => rr(ctx, bx - 6, by - 5, 12, 10, 2, c, INK, 1.2));
    ctx.beginPath();
    ctx.moveTo(-56, -38);
    ctx.quadraticCurveTo(-50, 2, 0, 2);
    ctx.quadraticCurveTo(50, 2, 56, -38);
    ctx.quadraticCurveTo(0, -26, -56, -38);
    ctx.fillStyle = '#f3f6fb';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-48, -22);
    ctx.quadraticCurveTo(0, -10, 48, -22);
    ctx.strokeStyle = '#4f86c6';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  };

  // headProp: whistle in the mouth (+ lanyard down to the chest)
  E.whistleProp = (c) => {
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-14, 34);
    c.quadraticCurveTo(10, 70, 30, 34);
    c.strokeStyle = '#e2463c';
    c.lineWidth = 3;
    c.stroke();
    rr(c, 28, 20, 26, 14, 6, '#c9ced6', INK, 2.4);
    rr(c, 48, 22, 12, 8, 2, '#c9ced6', INK, 2);
    V.circle(c, 36, 27, 3, INK);
    c.restore();
  };

  // mesh training bib, drawn in the torso frame
  E.kfBib = (color) => (c) => {
    const top = -138;
    const path = () => {
      c.beginPath();
      c.moveTo(-30, 12);
      c.lineTo(-33, top + 40);
      c.quadraticCurveTo(-30, top + 8, -16, top + 4);
      c.quadraticCurveTo(4, top + 30, 26, top + 4);
      c.quadraticCurveTo(42, top + 10, 42, top + 40);
      c.lineTo(36, 12);
      c.quadraticCurveTo(4, 20, -30, 12);
      c.closePath();
    };
    c.save();
    path();
    c.fillStyle = color;
    c.fill();
    c.save();
    c.clip();
    c.strokeStyle = 'rgba(0,0,0,0.12)';
    c.lineWidth = 1.5;
    for (let i = -8; i < 10; i++) {
      c.beginPath();
      c.moveTo(-50 + i * 10, top);
      c.lineTo(-50 + i * 10 + 60, 20);
      c.stroke();
    }
    c.restore();
    path();
    c.lineWidth = 3;
    c.strokeStyle = INK;
    c.stroke();
    c.restore();
  };

  const SPORT = () => V.boy.OUTFITS.sport;
  E.KF_PEOPLE = {
    coach: {
      look: { skin: '#c99068', hair: '#2b2b2b', hairStyle: 'cap', capColor: '#1d3f78' },
      outfit: { shirt: '#1d3f78', sleeves: 'long', pants: '#1d3f78', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#e2463c', logo: false, number: null, trim: null, socks: null },
    },
    mate1: {
      look: { skin: '#8d5a3b', hair: '#111111', hairStyle: 'curly' },
      outfit: Object.assign({}, SPORT(), { shirt: '#3b7dd8', number: null, socks: '#3b7dd8', shoeColor: '#f4f4f4', shoeAccent: '#3b7dd8', logo: false }),
      bib: '#d4ef3a',
    },
    mate2: {
      look: { skin: '#f3c7a8', hair: '#e0b35a', hairStyle: 'short' },
      outfit: Object.assign({}, SPORT(), { shirt: '#3b7dd8', number: null, socks: '#3b7dd8', shoeColor: '#1f1f27', logo: false }),
      bib: '#d4ef3a',
    },
    mate3: {
      look: { skin: '#d9a07a', hair: '#2a1a10', hairStyle: 'buzz' },
      outfit: Object.assign({}, SPORT(), { shirt: '#3b7dd8', number: null, socks: '#3b7dd8', shoeColor: '#f4f4f4', logo: false }),
      bib: '#d4ef3a',
    },
    keeper: {
      look: { skin: '#e8b48c', hair: '#6b3a1e', hairStyle: 'short' },
      outfit: Object.assign({}, SPORT(), { shirt: '#2f9e57', sleeves: 'long', number: null, trim: null, socks: '#2f9e57', logo: false }),
      gloves: '#f6c945',
    },
  };

  // ================================================================== THE KITCHEN
  const K = (E.KITCHEN = {
    FY: 880,
    window: { x0: 1010, x1: 1370, y0: 220, y1: 540 },
    clock: { x: 918, y: 382, r: 46 },
    fridge: { x0: 430, x1: 650, y0: 170 },
    table: { y0: 630, y1: 716, xb0: 782, xb1: 1840, xf0: 768, xf1: 1858, drop: 76 },
    chair: { x0: 636, x1: 790, seat: 808 },
    hero: { x: 712, y: 778, s: 1.35 },
    plate: { x: 952, y: 682, s: 1.2, tilt: 0.42 },
    glass: { x: 902, y: 642 },
    ketchup: { x: 1080, y: 662 },
    fork: { x: 832, y: 707 },
  });

  function kitchenRoom(ctx, o) {
    const t = o.t || 0;
    const hour = o.hour;
    const FY = K.FY;
    // wall
    const wg = ctx.createLinearGradient(0, -200, 0, FY);
    wg.addColorStop(0, '#f8e7c8');
    wg.addColorStop(1, '#efd5a9');
    ctx.fillStyle = wg;
    ctx.fillRect(-1400, -600, 4600, FY + 600);
    // subtle wallpaper dots
    ctx.fillStyle = 'rgba(214,170,110,0.18)';
    for (let yy = -560; yy < FY; yy += 46) for (let xx = 640 + ((yy / 46) % 2) * 23; xx < 3000; xx += 46) ctx.fillRect(xx, yy, 4, 4);

    // ---- window
    const W = K.window;
    ctx.save();
    ctx.beginPath();
    ctx.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0);
    ctx.clip();
    V.sky(ctx, hour, W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0);
    V.cloud(ctx, W.x0 + 40 + ((t * 6) % 60), W.y0 + 70, 0.55, 'rgba(255,255,255,0.85)');
    V.cloud(ctx, W.x0 + 230 + ((t * 4) % 40), W.y0 + 40, 0.35, 'rgba(255,255,255,0.7)');
    // rooftops with solar water heaters + a tree
    const roof = '#d7c3a5';
    [[W.x0 - 10, 420, 140], [W.x0 + 120, 450, 120], [W.x0 + 230, 400, 160]].forEach(([bx, by, bw], i) => {
      rect(ctx, bx, by, bw, 200, V.shade(roof, -0.04 * i));
      for (let wy = by + 24; wy < W.y1; wy += 40) for (let wx = bx + 16; wx < bx + bw - 20; wx += 34) rect(ctx, wx, wy, 16, 20, 'rgba(120,150,170,0.55)');
      rect(ctx, bx + bw * 0.3, by - 20, 30, 20, '#9aa3ad');
      poly(ctx, [[bx + bw * 0.3 + 34, by], [bx + bw * 0.3 + 70, by], [bx + bw * 0.3 + 62, by - 26], [bx + bw * 0.3 + 26, by - 26]], '#3f5a8a');
    });
    V.circle(ctx, W.x0 + 300, 470, 60, '#5aa35a');
    V.circle(ctx, W.x0 + 260, 500, 50, '#4f9a50');
    ctx.restore();
    // frame + mullions + curtains
    ctx.save();
    ctx.beginPath();
    ctx.rect(W.x0 - 18, W.y0 - 18, W.x1 - W.x0 + 36, W.y1 - W.y0 + 36);
    ctx.rect(W.x1, W.y0, W.x0 - W.x1, W.y1 - W.y0);
    ctx.fillStyle = '#fbf7f0';
    ctx.fill('evenodd');
    ctx.restore();
    rr(ctx, W.x0 - 18, W.y0 - 18, W.x1 - W.x0 + 36, W.y1 - W.y0 + 36, 4, null, INK, 3);
    rr(ctx, W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, 2, null, INK, 2.5);
    const mx = (W.x0 + W.x1) / 2;
    rect(ctx, mx - 6, W.y0, 12, W.y1 - W.y0, '#fbf7f0');
    rect(ctx, W.x0, W.y0 + 150, W.x1 - W.x0, 10, '#fbf7f0');
    V.line(ctx, mx - 6, W.y0, mx - 6, W.y1, 'rgba(31,26,36,0.35)', 2);
    V.line(ctx, mx + 6, W.y0, mx + 6, W.y1, 'rgba(31,26,36,0.35)', 2);
    // curtains (tied back)
    const curtain = (side) => {
      const x0 = side < 0 ? W.x0 - 30 : W.x1 + 30;
      const c = '#f4c95d';
      ctx.beginPath();
      ctx.moveTo(x0, W.y0 - 30);
      ctx.lineTo(x0 - side * -70, W.y0 - 30);
      ctx.quadraticCurveTo(x0 - side * -26, W.y0 + 160, x0 - side * -40, W.y0 + 330);
      ctx.quadraticCurveTo(x0 - side * -60, W.y1 + 10, x0 - side * -30, W.y1 + 30);
      ctx.lineTo(x0, W.y1 + 30);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 4; i++) V.line(ctx, x0 - side * -(14 + i * 16), W.y0 - 30, x0 - side * -(12 + i * 10), W.y1 + 30, 'rgba(200,140,40,0.35)', 3);
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      rr(ctx, x0 - side * -(side < 0 ? 0 : 0) - (side < 0 ? -2 : 46), W.y0 + 316, 44, 12, 5, '#e2463c', INK, 2);
    };
    curtain(-1);
    curtain(1);
    rr(ctx, W.x0 - 60, W.y0 - 40, W.x1 - W.x0 + 120, 12, 6, '#a86b42', INK, 2.5);
    // sill + plants
    rr(ctx, W.x0 - 30, W.y1 + 2, W.x1 - W.x0 + 60, 20, 4, '#fbf7f0', INK, 3);
    const pot = (px, s, leaf) => {
      ctx.save();
      ctx.translate(px, W.y1 + 2);
      ctx.scale(s, s);
      if (leaf === 'basil') {
        [[-14, -52, 14], [8, -58, 15], [-2, -70, 13], [16, -44, 11], [-20, -38, 10]].forEach(([lx, ly, r], i) => V.circle(ctx, lx, ly, r, i % 2 ? '#4f9a50' : '#62b25e', INK, 2));
      } else {
        rr(ctx, -9, -66, 18, 50, 9, '#5f9d5a', INK, 2.4);
        rr(ctx, 6, -54, 12, 22, 6, '#5f9d5a', INK, 2.2);
        V.circle(ctx, 0, -68, 4, '#f05aa8');
      }
      poly(ctx, [[-22, -30], [22, -30], [16, 0], [-16, 0]], '#c86b4f', INK, 2.4);
      rect(ctx, -23, -34, 46, 8, '#b85f45');
      ctx.restore();
    };
    pot(W.x0 + 60, 1, 'basil');
    pot(W.x1 - 50, 0.8, 'cactus');

    // ---- wall clock + shelf
    V.wallClockStr(ctx, K.clock.x, K.clock.y, K.clock.r, o.clock || '15:20', { rim: '#c2562f', face: '#fffaf0' });
    V.circle(ctx, K.clock.x, K.clock.y, K.clock.r * 1.12, null, INK, 3);
    const SY = 420;
    rr(ctx, 1450, SY, 240, 14, 3, '#a86b42', INK, 2.5);
    [1480, 1660].forEach((bx) => poly(ctx, [[bx - 6, SY + 14], [bx + 6, SY + 14], [bx + 6, SY + 40], [bx - 6, SY + 20]], '#7a5236', INK, 2));
    const jar = (jx, h, fill, lid) => {
      rr(ctx, jx - 18, SY - h, 36, h, 6, 'rgba(230,245,250,0.6)', INK, 2.4);
      rr(ctx, jx - 15, SY - h * 0.75, 30, h * 0.75 - 3, 4, fill);
      rr(ctx, jx - 19, SY - h - 10, 38, 12, 4, lid, INK, 2.2);
    };
    jar(1490, 70, '#f2c25a', '#c2562f');
    jar(1534, 54, '#b5653a', '#3f5a8a');
    jar(1576, 62, '#e8e2d0', '#5aa35a');
    rr(ctx, 1612, SY - 74, 18, 74, 2, '#3f5a8a', INK, 2.2);
    rr(ctx, 1632, SY - 64, 16, 64, 2, '#e2463c', INK, 2.2);
    // trailing pothos
    for (let i = 0; i < 7; i++) V.circle(ctx, 1672 + Math.sin(i * 1.3) * 8, SY - 6 + i * 22, 9, i % 2 ? '#4f9a50' : '#62b25e', INK, 1.6);
    // calendar
    rr(ctx, 1740, 290, 120, 160, 4, '#fbf7f0', INK, 2.5);
    rect(ctx, 1740, 290, 120, 40, '#e2463c');
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(1740, 290, 120, 160);
    for (let r0 = 0; r0 < 4; r0++) for (let c0 = 0; c0 < 5; c0++) rect(ctx, 1750 + c0 * 22, 342 + r0 * 26, 14, 14, (r0 * 5 + c0) === 13 ? '#e2463c' : 'rgba(31,26,36,0.18)');
    V.circle(ctx, 1800, 286, 5, INK);

    // ---- counter run (left)
    const sage = '#9dbf9f', sageD = '#86a989';
    // backsplash tiles
    rect(ctx, -560, 380, 980, 240, '#f7f3ea');
    ctx.strokeStyle = '#ddd4c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let yy = 380; yy < 620; yy += 30) {
      ctx.moveTo(-560, yy);
      ctx.lineTo(420, yy);
      for (let xx = -560 + ((yy / 30) % 2) * 30; xx < 420; xx += 60) {
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, Math.min(620, yy + 30));
      }
    }
    ctx.stroke();
    // upper cabinets
    for (let i = 0; i < 4; i++) {
      const cx = -560 + i * 177;
      rr(ctx, cx, 150, 172, 230, 6, sage, INK, 3);
      rr(ctx, cx + 16, 166, 140, 198, 5, i === 2 ? 'rgba(210,235,240,0.9)' : '#b2d0b3', INK, 2);
      if (i === 2) {
        rect(ctx, cx + 16, 262, 140, 6, '#86a989');
        [[cx + 40, 252], [cx + 76, 252], [cx + 112, 252]].forEach(([px, py]) => rr(ctx, px - 14, py - 34, 28, 34, 6, '#fbf7f0', INK, 2));
        [[cx + 50, 352], [cx + 100, 352]].forEach(([px, py]) => {
          V.ellipse(ctx, px, py - 6, 26, 10, '#e7eef6');
          ctx.beginPath();
          ctx.ellipse(px, py - 6, 26, 10, 0, 0, TAU);
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }
      V.circle(ctx, cx + (i % 2 ? 22 : 150), 350, 6, '#d8b25a', INK, 2);
    }
    // range hood
    rect(ctx, 210, -300, 110, 600, '#c9ced6');
    ctx.strokeRect(210, -300, 110, 600);
    poly(ctx, [[180, 300], [350, 300], [380, 372], [150, 372]], '#d5dae1', INK, 3);
    rect(ctx, 150, 372, 230, 10, '#aab1bb');
    // worktop
    rr(ctx, -580, 614, 1000, 28, 4, '#d4a373', INK, 3);
    V.line(ctx, -576, 620, 416, 620, 'rgba(255,240,210,0.6)', 3);
    // base cabinets
    for (let i = 0; i < 5; i++) {
      const cx = -560 + i * 196;
      if (cx + 196 > 160 && cx < 380) continue;
      rr(ctx, cx, 642, 192, 222, 6, sage, INK, 3);
      rr(ctx, cx + 14, 656, 164, 40, 5, sageD, INK, 2);
      rr(ctx, cx + 14, 708, 164, 142, 5, '#b2d0b3', INK, 2);
      V.line(ctx, cx + 76, 676, cx + 116, 676, '#d8b25a', 5);
      V.circle(ctx, cx + 160, 730, 6, '#d8b25a', INK, 2);
    }
    // oven
    rr(ctx, 160, 642, 220, 222, 6, '#e9ecef', INK, 3);
    rr(ctx, 176, 700, 188, 150, 8, '#2a2d34', INK, 2.5);
    rr(ctx, 194, 724, 152, 96, 6, '#3b414b');
    V.line(ctx, 200, 712, 340, 712, '#c9ced6', 7);
    for (let i = 0; i < 4; i++) V.circle(ctx, 196 + i * 50, 668, 10, '#3b414b', INK, 2);
    // cooktop + pan + pot
    rect(ctx, 170, 608, 200, 7, '#1f1f27');
    ctx.save();
    ctx.translate(222, 606);
    V.line(ctx, -50, -12, -110, -22, INK, 12);
    V.line(ctx, -50, -12, -108, -22, '#2b2b33', 7);
    V.ellipse(ctx, 0, -6, 52, 12, '#3b3b45');
    ctx.beginPath();
    ctx.moveTo(-52, -10);
    ctx.lineTo(-46, 4);
    ctx.quadraticCurveTo(0, 12, 46, 4);
    ctx.lineTo(52, -10);
    ctx.fillStyle = '#2b2b33';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -10, 52, 10, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    rr(ctx, 290, 540, 76, 66, 8, '#e2463c', INK, 3);
    rr(ctx, 284, 530, 88, 14, 6, '#c9382f', INK, 2.5);
    rr(ctx, 318, 518, 20, 14, 5, '#2b2b33', INK, 2);
    // sink + faucet
    rr(ctx, -210, 608, 210, 10, 3, '#c9ced6', INK, 2);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-100, 610);
    ctx.lineTo(-100, 520);
    ctx.quadraticCurveTo(-100, 490, -72, 492);
    ctx.quadraticCurveTo(-52, 494, -52, 520);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.strokeStyle = '#d5dae1';
    ctx.lineWidth = 7;
    ctx.stroke();
    // utensil crock, cutting board, fruit bowl, kettle
    rr(ctx, 30, 548, 46, 66, 8, '#3f5a8a', INK, 2.5);
    [[40, 470, -0.2], [54, 462, 0], [66, 478, 0.25]].forEach(([ux, uy, a]) => {
      ctx.save();
      ctx.translate(ux, 556);
      ctx.rotate(a);
      V.line(ctx, 0, 0, 0, uy - 556, '#a86b42', 6);
      V.ellipse(ctx, 0, uy - 560, 9, 14, '#b77a4c');
      ctx.restore();
    });
    rr(ctx, -340, 470, 110, 146, 30, '#c98d5a', INK, 3);
    V.circle(ctx, -285, 492, 9, '#efd5a9', INK, 2);
    V.ellipse(ctx, -450, 600, 66, 14, '#f3f6fb');
    [[-480, 584, '#f39a3d'], [-450, 578, '#f39a3d'], [-420, 586, '#e2463c']].forEach(([fx, fy, c]) => V.circle(ctx, fx, fy, 18, c, INK, 2.2));
    ctx.beginPath();
    ctx.moveTo(-500, 600);
    ctx.quadraticCurveTo(-450, 630, -400, 600);
    ctx.fillStyle = '#f3f6fb';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    rr(ctx, 100, 552, 60, 62, 18, '#f4f4f0', INK, 2.5);
    rr(ctx, 152, 560, 16, 34, 8, null, INK, 4);

    // ---- fridge
    const F = K.fridge;
    rr(ctx, F.x0, F.y0, F.x1 - F.x0, FY - F.y0 - 4, 22, '#a8d8c8', INK, 3.5);
    rect(ctx, F.x0 + 3, 382, F.x1 - F.x0 - 6, 6, '#86b8a7');
    V.line(ctx, F.x0 + 3, 385, F.x1 - 3, 385, INK, 2);
    rr(ctx, F.x0 + 14, 240, 12, 110, 6, '#e8eef2', INK, 2.4);
    rr(ctx, F.x0 + 14, 410, 12, 170, 6, '#e8eef2', INK, 2.4);
    rr(ctx, F.x1 - 16, F.y0 + 30, 6, 330, 3, 'rgba(255,255,255,0.4)');
    rect(ctx, F.x0 + 20, FY - 16, F.x1 - F.x0 - 40, 12, '#2b2b33');
    const paper = (px, py, w, h, rot, fn, mag) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      rr(ctx, -w / 2, -h / 2, w, h, 2, '#fdfcf6', INK, 2);
      fn();
      V.circle(ctx, 0, -h / 2 + 4, 7, mag, INK, 2);
      ctx.restore();
    };
    paper(520, 470, 104, 96, -0.06, () => {
      V.sun(ctx, 30, -26, 10, '#f6c945');
      poly(ctx, [[-34, 34], [-34, 4], [-14, -16], [6, 4], [6, 34]], '#e2463c', '#b0302a', 2);
      rect(ctx, -20, 16, 10, 18, '#7a5236');
      V.line(ctx, -50, 36, 48, 36, '#4f9e44', 4);
      V.line(ctx, 20, 34, 20, 14, '#2f4f86', 2.5);
      V.circle(ctx, 20, 10, 5, null, '#2f4f86', 2.5);
    }, '#3b7dd8');
    paper(590, 610, 90, 84, 0.08, () => {
      [[-22, '#e2463c'], [0, '#3b7dd8'], [22, '#f39a3d']].forEach(([fx, c], i) => {
        V.circle(ctx, fx, -12 + (i === 1 ? 4 : 0), 7, null, c, 2.5);
        V.line(ctx, fx, -5 + (i === 1 ? 4 : 0), fx, 18, c, 2.5);
        V.line(ctx, fx - 8, 4, fx + 8, 4, c, 2.5);
      });
      V.text(ctx, '♥', 30, 26, { size: 16, color: '#e2463c', rtl: false });
    }, '#f6c945');
    paper(500, 280, 70, 60, 0.05, () => {
      rect(ctx, -30, -24, 60, 40, '#7fb3d9');
      V.circle(ctx, -8, -4, 7, '#e9b48f');
      V.circle(ctx, 10, -2, 8, '#d9a07a');
      rect(ctx, -30, 8, 60, 8, '#6cbf5a');
    }, '#e2463c');
    [[470, 720, '#e2463c'], [500, 742, '#3b7dd8'], [540, 716, '#f6c945'], [612, 744, '#6cbf5a']].forEach(([mx2, my, c]) => rr(ctx, mx2 - 9, my - 9, 18, 18, 5, c, INK, 2));
    rr(ctx, 560, 300, 60, 70, 2, '#fff9c4', INK, 1.6);
    for (let i = 0; i < 4; i++) V.line(ctx, 568, 316 + i * 12, 600 - (i % 2) * 10, 316 + i * 12, 'rgba(60,80,140,0.6)', 2);

    // ---- framed picture (right wall)
    rr(ctx, 1470, 220, 120, 92, 4, '#a86b42', INK, 3);
    rect(ctx, 1482, 232, 96, 68, '#cfe2ea');
    poly(ctx, [[1482, 300], [1512, 266], [1536, 286], [1556, 260], [1578, 300]], '#6cbf5a');
    V.circle(ctx, 1558, 248, 8, '#f6c945');
    // pendant lamp over the table
    V.line(ctx, 1290, -400, 1290, 236, INK, 3);
    ctx.beginPath();
    ctx.moveTo(1240, 290);
    ctx.quadraticCurveTo(1242, 236, 1290, 232);
    ctx.quadraticCurveTo(1338, 236, 1340, 290);
    ctx.closePath();
    ctx.fillStyle = '#e2463c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    V.ellipse(ctx, 1290, 290, 50, 7, '#f8e9c0');

    // ---- floor
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1400, FY, 4600, 900);
    ctx.clip();
    rect(ctx, -1400, FY, 4600, 900, '#e7d2ae');
    ctx.strokeStyle = '#cdb38c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let yy = FY, step = 22;
    while (yy < FY + 900) {
      ctx.moveTo(-1400, yy);
      ctx.lineTo(3200, yy);
      yy += step;
      step *= 1.32;
    }
    const VPx = 960, VPy = 380;
    for (let xx = -2000; xx < 4000; xx += 150) {
      ctx.moveTo(xx, FY);
      const k = (FY + 900 - VPy) / (FY - VPy);
      ctx.lineTo(VPx + (xx - VPx) * k, FY + 900);
    }
    ctx.stroke();
    ctx.restore();
    // baseboard
    rect(ctx, 650, FY - 18, 2600, 18, '#fbf7f0');
    V.line(ctx, 650, FY - 18, 3250, FY - 18, 'rgba(31,26,36,0.35)', 2);
    V.line(ctx, -1400, FY, 3250, FY, 'rgba(31,26,36,0.45)', 2.5);
  }

  function kitchenChair(ctx, x0, seat, flip, behind) {
    const wood = '#b97a4a', woodD = '#946039';
    ctx.save();
    ctx.lineJoin = 'round';
    const w = 154;
    const backX = flip ? x0 + w - 18 : x0;
    // far legs (darker)
    rr(ctx, x0 + 18, seat + 6, 13, 118, 4, woodD, INK, 2.5);
    rr(ctx, x0 + w - 14, seat + 6, 13, 112, 4, woodD, INK, 2.5);
    // back
    rr(ctx, backX, seat - 250, 18, 262, 6, wood, INK, 3);
    if (!behind) {
      rr(ctx, backX + (flip ? -8 : 6), seat - 250, 22, 30, 6, wood, INK, 3);
      for (let i = 0; i < 3; i++) rr(ctx, backX + (flip ? -2 : 4), seat - 206 + i * 52, 14, 22, 4, woodD, INK, 2);
    }
    // seat
    rr(ctx, x0, seat - 4, w, 18, 6, wood, INK, 3);
    rr(ctx, x0 + 6, seat - 10, w - 12, 10, 5, '#e2463c', INK, 2.5);
    // near legs
    rr(ctx, x0 + 4, seat + 12, 14, 124, 4, wood, INK, 3);
    rr(ctx, x0 + w - 22, seat + 12, 14, 124, 4, wood, INK, 3);
    ctx.restore();
  }

  function tableTop(ctx) {
    const T = K.table;
    // back legs
    rr(ctx, T.xb0 + 150, T.y1, 20, 186, 4, '#946039', INK, 2.5);
    rr(ctx, T.xb1 - 40, T.y1, 20, 186, 4, '#946039', INK, 2.5);
    // floor shadow
    V.ellipse(ctx, (T.xf0 + T.xf1) / 2, 930, 560, 26, 'rgba(90,50,20,0.14)');
    // cloth top (blue gingham)
    const quad = [[T.xb0, T.y0], [T.xb1, T.y0], [T.xf1, T.y1], [T.xf0, T.y1]];
    poly(ctx, quad, '#f6f8fc');
    ctx.save();
    poly(ctx, quad);
    ctx.clip();
    ctx.fillStyle = 'rgba(96,146,214,0.28)';
    for (let i = 0; i < 6; i++) {
      const a = T.y0 + i * 15.5, b = a + 7.5;
      ctx.fillRect(T.xf0 - 20, a, T.xf1 - T.xf0 + 40, b - a);
    }
    for (let x = T.xb0 - 40; x < T.xb1 + 40; x += 34) {
      const xf = V.lerp(T.xf0, T.xf1, (x - T.xb0) / (T.xb1 - T.xb0));
      poly(ctx, [[x, T.y0], [x + 17, T.y0], [xf + 17.5, T.y1], [xf, T.y1]], 'rgba(96,146,214,0.28)');
    }
    // window light patch on the cloth
    const lp = ctx.createLinearGradient(1100, 0, 1500, 0);
    lp.addColorStop(0, 'rgba(255,240,190,0)');
    lp.addColorStop(0.5, 'rgba(255,240,190,0.35)');
    lp.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = lp;
    ctx.fillRect(1000, T.y0, 600, T.y1 - T.y0);
    ctx.restore();
    poly(ctx, quad, null, INK, 3);
  }

  function tableDrop(ctx) {
    const T = K.table;
    // front drop of the cloth with a wavy hem
    const y0 = T.y1, y1 = T.y1 + T.drop;
    ctx.beginPath();
    ctx.moveTo(T.xf0, y0);
    ctx.lineTo(T.xf1, y0);
    ctx.lineTo(T.xf1 + 6, y1 - 4);
    const n = 18;
    for (let i = n; i >= 0; i--) {
      const x = V.lerp(T.xf0 - 6, T.xf1 + 6, i / n);
      ctx.lineTo(x, y1 + Math.sin(i * 1.7) * 4 + (i % 2) * 3);
    }
    ctx.closePath();
    ctx.fillStyle = '#eef2f9';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(96,146,214,0.28)';
    for (let x = T.xf0; x < T.xf1; x += 34) ctx.fillRect(x, y0, 17, T.drop + 10);
    for (let yy = y0 + 4; yy < y1 + 6; yy += 15.5) ctx.fillRect(T.xf0 - 10, yy, T.xf1 - T.xf0 + 20, 7.5);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, 'rgba(40,40,80,0.18)');
    g.addColorStop(0.25, 'rgba(40,40,80,0.02)');
    g.addColorStop(1, 'rgba(40,40,80,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(T.xf0 - 10, y0, T.xf1 - T.xf0 + 20, T.drop + 10);
    for (let i = 0; i < 12; i++) {
      const fx = T.xf0 + 50 + i * 90 + V.rand(i) * 30;
      const fg = ctx.createLinearGradient(fx - 14, 0, fx + 14, 0);
      fg.addColorStop(0, 'rgba(40,40,80,0)');
      fg.addColorStop(0.5, 'rgba(40,40,80,0.12)');
      fg.addColorStop(1, 'rgba(40,40,80,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(fx - 14, y0 + 10, 28, T.drop);
    }
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // front legs
    rr(ctx, T.xf0 + 150, y1 + 2, 22, 950 - y1 - 2, 5, '#b97a4a', INK, 3);
    rr(ctx, T.xf1 - 38, y1 + 2, 22, 950 - y1 - 2, 5, '#b97a4a', INK, 3);
  }

  function tableFarItems(ctx) {
    E.saladBowl(ctx, 1300, 690, 1.15);
    // bread basket
    ctx.save();
    ctx.translate(1470, 676);
    [[-30, -18, -0.3], [-4, -24, 0.1], [22, -18, 0.4]].forEach(([bx, by, a]) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a);
      rr(ctx, -20, -12, 40, 24, 12, '#d99a4a', INK, 2.2);
      V.line(ctx, -8, -6, -2, 4, '#f3c27a', 2.5);
      V.line(ctx, 4, -6, 10, 4, '#f3c27a', 2.5);
      ctx.restore();
    });
    poly(ctx, [[-50, -14], [50, -14], [40, 12], [-40, 12]], '#c98d5a', INK, 2.6);
    for (let i = -3; i <= 3; i++) V.line(ctx, i * 12, -12, i * 10, 10, 'rgba(110,70,30,0.5)', 2);
    ctx.restore();
    // water jug
    ctx.save();
    ctx.translate(1640, 672);
    poly(ctx, [[-26, 0], [26, 0], [30, -90], [-30, -90]], 'rgba(200,232,250,0.55)', INK, 2.6);
    rect(ctx, -26, -60, 52, 58, 'rgba(120,190,235,0.45)');
    V.circle(ctx, -8, -40, 6, '#f6c945');
    ctx.beginPath();
    ctx.moveTo(28, -80);
    ctx.quadraticCurveTo(54, -70, 28, -24);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    // napkin holder
    rr(ctx, 1180, 618, 44, 30, 4, '#fbf7f0', INK, 2.2);
    rr(ctx, 1172, 640, 60, 12, 3, '#a86b42', INK, 2.2);
  }

  E.kitchen = (ctx, o = {}) => {
    o = Object.assign({ hour: 15.3, t: 0, cam: { x: 960, y: 540, zoom: 1 }, tableItems: true }, o);
    ctx.save();
    ctx.fillStyle = '#efd5a9';
    ctx.fillRect(0, 0, V.W, V.H);
    E.kfCam(ctx, o.cam);
    kitchenRoom(ctx, o);
    // sunbeam from the window (afternoon: falls down-left onto the table and floor)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const W = K.window;
    const bg = ctx.createLinearGradient(0, W.y0, 0, 1000);
    bg.addColorStop(0, 'rgba(255,214,140,0.16)');
    bg.addColorStop(1, 'rgba(255,214,140,0.02)');
    ctx.fillStyle = bg;
    poly(ctx, [[W.x0, W.y0], [W.x1, W.y0], [W.x1 - 260, 1000], [W.x0 - 360, 1000]]);
    ctx.fill();
    ctx.restore();
    // far chair behind the table (right) + the hero's chair
    tableTop(ctx);
    if (o.tableItems) tableFarItems(ctx);
    if (o.table) o.table(ctx);
    kitchenChair(ctx, K.chair.x0 - (o.chairDX || 0), K.chair.seat, false, false);
    if (o.actors) o.actors(ctx);
    tableDrop(ctx);
    if (o.front) o.front(ctx);
    ctx.restore();
    // warm afternoon grade
    V.tint(ctx, '#fff0d8', 0.22, 'multiply');
    V.lightPool(ctx, ...E.kfToScreen(o.cam, 1190, 380), 700 * o.cam.zoom, '#ffd890', 0.12);
    if (o.overlay) o.overlay(ctx);
  };

  // ================================================================== THE HALLWAY
  const HW = (E.HALLWAY = {
    FY: 860,
    FEET: 915,
    horizon: 470,
    door: { x0: 1300, x1: 1560, top: 210, sill: 860 },
    mirror: { x0: 290, x1: 490, y0: 190, y1: 610 },
    bench: { x0: 540, x1: 1040, top: 730, front: 742, legs: 902 },
    cabinet: { x0: 1070, x1: 1230, top: 730 },
    hooks: { x0: 560, x1: 1010, y: 250 },
  });
  E.hallwayScale = (feetY) => (1.3 * (feetY - HW.horizon)) / (HW.FEET - HW.horizon);
  const DOOR_MAX = 96;
  const HVP = [960, 470];
  const doorPt = (u, v, open) => {
    // u 0 (free/left edge) .. 1 (hinge), v 0 top .. 1 sill; door swings toward the camera
    const d = HW.door;
    const w = d.x1 - d.x0;
    const a = V.deg(open * DOOR_MAX);
    const r = (1 - u) * w;
    const wx = d.x1 - r * Math.cos(a);
    const depth = r * Math.sin(a);
    const f = 1 / (1 - depth / 1100);
    const wy = V.lerp(d.top, d.sill, v);
    return [HVP[0] + (wx - HVP[0]) * f, HVP[1] + (wy - HVP[1]) * f];
  };
  E.hallwayDoorHandle = (open) => doorPt(0.13, 0.54, open);

  function hallOutside(ctx, o) {
    const d = HW.door;
    const t = o.t || 0;
    V.sky(ctx, o.hour, d.x0 - 10, d.top - 10, d.x1 - d.x0 + 20, 380);
    V.sun(ctx, d.x0 + 60, d.top + 80, 26, '#fff1b8');
    V.cloud(ctx, d.x0 + 120 + t * 5, d.top + 60, 0.4);
    // houses across the street
    rect(ctx, d.x0 - 10, 450, 140, 200, '#f2dcc0');
    rect(ctx, d.x0 + 130, 420, 160, 230, '#e9cfb0');
    for (let i = 0; i < 3; i++) rect(ctx, d.x0 + 150 + i * 46, 450, 26, 36, '#8fb7d6');
    rect(ctx, d.x0 + 10, 480, 30, 40, '#8fb7d6');
    poly(ctx, [[d.x0 + 120, 420], [d.x0 + 210, 370], [d.x0 + 300, 420]], '#c86b4f');
    V.tree(ctx, d.x0 + 60, 660, 0.55);
    // street + sidewalk + garden path
    rect(ctx, d.x0 - 10, 640, d.x1 - d.x0 + 20, 40, '#5d6470');
    rect(ctx, d.x0 - 10, 680, d.x1 - d.x0 + 20, 40, '#c9c2b6');
    rect(ctx, d.x0 - 10, 720, d.x1 - d.x0 + 20, 150, '#7fc06a');
    poly(ctx, [[d.x0 + 100, 720], [d.x0 + 160, 720], [d.x0 + 240, 870], [d.x0 + 20, 870]], '#e2d6c2');
    // low garden wall + gate
    rect(ctx, d.x0 - 10, 700, d.x1 - d.x0 + 20, 26, '#efe6d6');
    V.line(ctx, d.x0 - 10, 700, d.x1 + 10, 700, 'rgba(31,26,36,0.4)', 2);
    // bright sunlight haze
    const g = ctx.createLinearGradient(0, d.top, 0, d.sill);
    g.addColorStop(0, 'rgba(255,248,220,0.35)');
    g.addColorStop(1, 'rgba(255,236,190,0.1)');
    ctx.fillStyle = g;
    ctx.fillRect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top);
  }

  function hallRoom(ctx, o) {
    const d = HW.door;
    const FY = HW.FY;
    // wall with the door opening cut out
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1200, -600, 4200, FY + 600);
    ctx.rect(d.x1, d.top, d.x0 - d.x1, d.sill - d.top);
    const wg = ctx.createLinearGradient(0, -100, 0, FY);
    wg.addColorStop(0, '#eadbc2');
    wg.addColorStop(1, '#e3d0b2');
    ctx.fillStyle = wg;
    ctx.fill('evenodd');
    ctx.restore();
    // wainscoting
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1200, 600, 4200, FY - 600);
    ctx.rect(d.x1 + 22, 600, d.x0 - d.x1 - 44, FY - 600);
    ctx.fillStyle = '#f7f3ea';
    ctx.fill('evenodd');
    ctx.restore();
    rr(ctx, -1200, 592, d.x0 - 22 + 1200, 14, 3, '#fbf8f1', INK, 2.5);
    rr(ctx, d.x1 + 22, 592, 2000, 14, 3, '#fbf8f1', INK, 2.5);
    for (let x = -1180; x < 2900; x += 170) {
      if (x + 150 > d.x0 - 30 && x < d.x1 + 30) continue;
      rr(ctx, x, 628, 150, 196, 4, null, 'rgba(160,140,110,0.5)', 2.5);
    }
    // skirting
    rect(ctx, -1200, FY - 20, 4200, 20, '#fbf8f1');
    V.line(ctx, -1200, FY - 20, 3000, FY - 20, 'rgba(31,26,36,0.3)', 2);

    // ---- door casing (white) + light switch + sconce
    ctx.save();
    ctx.beginPath();
    ctx.rect(d.x0 - 26, d.top - 26, d.x1 - d.x0 + 52, d.sill - d.top + 26);
    ctx.rect(d.x1, d.top, d.x0 - d.x1, d.sill - d.top);
    ctx.fillStyle = '#fbf8f1';
    ctx.fill('evenodd');
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
    rr(ctx, 1640, 520, 30, 44, 4, '#fbf8f1', INK, 2.2);
    rr(ctx, 1649, 532, 12, 18, 2, '#e9e3d6', INK, 1.6);
    // intercom
    rr(ctx, 1700, 470, 54, 86, 6, '#fbf8f1', INK, 2.4);
    rr(ctx, 1710, 482, 34, 26, 3, '#2b2f38');
    for (let i = 0; i < 3; i++) V.circle(ctx, 1727, 524 + i * 9, 2.5, INK);
    // umbrella stand
    rr(ctx, 1610, 790, 64, 96, 10, '#3f5a8a', INK, 2.6);
    V.line(ctx, 1630, 790, 1612, 640, '#f6c945', 10);
    V.line(ctx, 1630, 790, 1612, 640, INK, 2);
    ctx.beginPath();
    ctx.arc(1606, 634, 12, Math.PI, TAU);
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    V.line(ctx, 1652, 790, 1666, 660, '#2b2b33', 8);

    // ---- mirror + sticky note
    const M = HW.mirror;
    const mPath = (inset) => {
      ctx.beginPath();
      const x0 = M.x0 + inset, x1 = M.x1 - inset, y0 = M.y0 + inset, y1 = M.y1 - inset;
      const r = (x1 - x0) / 2;
      ctx.moveTo(x0, y1);
      ctx.lineTo(x0, y0 + r);
      ctx.arc((x0 + x1) / 2, y0 + r, r, Math.PI, TAU);
      ctx.lineTo(x1, y1);
      ctx.closePath();
    };
    mPath(0);
    ctx.fillStyle = '#b07a4a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    mPath(14);
    const mg = ctx.createLinearGradient(M.x0, M.y0, M.x1, M.y1);
    mg.addColorStop(0, '#dcecf1');
    mg.addColorStop(1, '#a9c6d2');
    ctx.fillStyle = mg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // faint reflection of the opposite wall
    rect(ctx, M.x0, 470, M.x1 - M.x0, 200, 'rgba(240,226,200,0.45)');
    poly(ctx, [[M.x0 + 30, M.y1], [M.x0 + 120, M.y0], [M.x0 + 150, M.y0], [M.x0 + 60, M.y1]], 'rgba(255,255,255,0.35)');
    poly(ctx, [[M.x0 + 90, M.y1], [M.x0 + 180, M.y0], [M.x0 + 192, M.y0], [M.x0 + 102, M.y1]], 'rgba(255,255,255,0.3)');
    ctx.restore();
    mPath(14);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (o.note !== false) {
      ctx.save();
      ctx.translate(440, 372);
      ctx.rotate(0.1);
      rect(ctx, -44, -38 + 6, 88, 80, 'rgba(0,0,0,0.12)');
      poly(ctx, [[-46, -40], [46, -40], [46, 30], [30, 44], [-46, 44]], '#ffe66b', INK, 2);
      poly(ctx, [[46, 30], [30, 44], [32, 30]], '#f0cf3e', INK, 1.6);
      rect(ctx, -46, -40, 92, 12, '#f7d84a');
      V.text(ctx, 'אימון', 0, -10, { size: 26, weight: 800, color: '#1f3d7a' });
      V.text(ctx, '17:00', 0, 20, { size: 24, weight: 800, color: '#e2463c', rtl: false });
      V.line(ctx, -28, 34, 28, 34, '#e2463c', 2.5);
      ctx.restore();
    }

    // ---- coat hooks
    const H = HW.hooks;
    rr(ctx, H.x0, H.y, H.x1 - H.x0, 22, 4, '#a86b42', INK, 2.6);
    [600, 700, 820, 930].forEach((hx) => {
      V.line(ctx, hx, H.y + 14, hx, H.y + 36, INK, 7);
      V.line(ctx, hx, H.y + 14, hx, H.y + 36, '#d8b25a', 3);
    });
    // denim jacket
    poly(ctx, [[580, 286], [620, 286], [646, 330], [652, 520], [548, 520], [554, 330]], '#4f6f9e', INK, 2.8);
    V.line(ctx, 600, 300, 600, 520, 'rgba(31,26,36,0.4)', 2);
    rr(ctx, 562, 380, 28, 22, 3, '#5e80b0', INK, 1.6);
    // red long coat
    poly(ctx, [[684, 286], [716, 286], [748, 334], [758, 600], [642, 600], [652, 334]], '#c9382f', INK, 2.8);
    V.line(ctx, 700, 300, 700, 600, 'rgba(31,26,36,0.35)', 2);
    [360, 420, 480].forEach((by) => V.circle(ctx, 712, by, 4, '#f3d27a', INK, 1.4));
    // grey hoodie
    poly(ctx, [[804, 286], [836, 286], [862, 330], [864, 480], [776, 480], [778, 330]], '#9aa3ad', INK, 2.8);
    V.ellipse(ctx, 820, 300, 26, 16, '#8a939d');
    // cap + scarf
    ctx.save();
    ctx.translate(930, 300);
    ctx.beginPath();
    ctx.arc(0, 10, 30, Math.PI, TAU);
    ctx.closePath();
    ctx.fillStyle = '#3b7dd8';
    ctx.fill();
    ctx.lineWidth = 2.6;
    ctx.stroke();
    rr(ctx, -2, 4, 52, 10, 5, '#2f64b0', INK, 2.4);
    ctx.restore();
    rr(ctx, 914, 316, 22, 150, 8, '#f39a3d', INK, 2.4);
    for (let i = 0; i < 5; i++) rect(ctx, 916, 330 + i * 26, 18, 8, '#e2463c');

    // ---- bench (shoes underneath)
    const Bn = HW.bench;
    rr(ctx, Bn.x0 + 10, Bn.top + 34, Bn.x1 - Bn.x0 - 20, 14, 3, '#946039', INK, 2.4);
    // shoes on the low shelf
    const shoe = (sx, c, w = 56) => {
      rr(ctx, sx, Bn.legs - 46, w, 24, 10, c, INK, 2.4);
      rr(ctx, sx, Bn.legs - 30, w, 8, 3, V.shade(c, -0.3));
    };
    rr(ctx, Bn.x0 + 20, Bn.legs - 22, Bn.x1 - Bn.x0 - 40, 12, 3, '#946039', INK, 2.4);
    shoe(Bn.x0 + 50, '#7a5236', 60);
    shoe(Bn.x0 + 116, '#7a5236', 60);
    shoe(Bn.x0 + 230, '#e2463c', 48);
    shoe(Bn.x0 + 284, '#e2463c', 48);
    shoe(Bn.x0 + 380, '#f4f4f4', 54);
    // legs + seat + cushion
    rr(ctx, Bn.x0 + 14, Bn.top + 10, 22, Bn.legs - Bn.top - 10, 4, '#b97a4a', INK, 2.8);
    rr(ctx, Bn.x1 - 36, Bn.top + 10, 22, Bn.legs - Bn.top - 10, 4, '#b97a4a', INK, 2.8);
    poly(ctx, [[Bn.x0 + 10, Bn.top - 12], [Bn.x1 - 10, Bn.top - 12], [Bn.x1, Bn.front], [Bn.x0, Bn.front]], '#c98d5a', INK, 2.6);
    rr(ctx, Bn.x0, Bn.front, Bn.x1 - Bn.x0, 20, 3, '#b97a4a', INK, 2.8);
    rr(ctx, Bn.x0 + 30, Bn.top - 22, 190, 20, 9, '#3f5a8a', INK, 2.4);
    for (let i = 0; i < 5; i++) rect(ctx, Bn.x0 + 44 + i * 36, Bn.top - 20, 12, 16, 'rgba(255,255,255,0.35)');
    // crumpled school clothes after the quick change (left end of the bench)
    if (o.clothes > 0.01) {
      ctx.save();
      const k = V.clamp(o.clothes);
      ctx.globalAlpha = V.clamp(k * 3);
      ctx.translate(Bn.x0 + 48, Bn.top - 14);
      ctx.scale(V.lerp(0.5, 1, V.ease.outBack(k)), V.lerp(0.5, 1, V.ease.outBack(k)));
      // jeans, folded once
      poly(ctx, [[-50, 4], [-46, -16], [34, -20], [50, -4], [44, 10], [-44, 12]], '#2f4f86', INK, 2.6);
      V.line(ctx, -40, -2, 38, -6, 'rgba(255,255,255,0.25)', 2);
      rr(ctx, 30, -18, 18, 26, 4, '#3d5f98', INK, 2);
      // white tee on top (sleeves sticking out)
      poly(ctx, [[-36, -12], [-22, -30], [-6, -26], [8, -34], [26, -28], [40, -38], [44, -24], [30, -14], [26, -4], [-28, 0]], '#fbfbf7', INK, 2.6);
      V.circle(ctx, 4, -18, 6, V.pal.navy);
      V.circle(ctx, 4, -18, 2.6, V.pal.yellow);
      ctx.restore();
    }

    // ---- cabinet (keys, plant, photo) + picture above
    const C = HW.cabinet;
    rr(ctx, 1080, 400, 136, 112, 4, '#7a5236', INK, 3);
    rect(ctx, 1092, 412, 112, 88, '#cfe2ea');
    V.circle(ctx, 1124, 446, 13, '#e9b48f');
    V.circle(ctx, 1158, 440, 15, '#c99068');
    V.circle(ctx, 1184, 452, 11, '#e9b48f');
    rect(ctx, 1092, 470, 112, 30, '#6cbf5a');
    rr(ctx, C.x0, C.top, C.x1 - C.x0, 140, 6, '#fbf8f1', INK, 3);
    rr(ctx, C.x0 + 12, C.top + 16, C.x1 - C.x0 - 24, 50, 4, null, 'rgba(160,140,110,0.6)', 2);
    rr(ctx, C.x0 + 12, C.top + 74, C.x1 - C.x0 - 24, 50, 4, null, 'rgba(160,140,110,0.6)', 2);
    V.line(ctx, 1130, C.top + 40, 1170, C.top + 40, '#d8b25a', 5);
    V.line(ctx, 1130, C.top + 98, 1170, C.top + 98, '#d8b25a', 5);
    rr(ctx, C.x0 + 8, C.top + 140, 14, 14, 3, '#7a5236');
    rr(ctx, C.x1 - 22, C.top + 140, 14, 14, 3, '#7a5236');
    // key bowl
    ctx.beginPath();
    ctx.moveTo(1092, C.top - 18);
    ctx.quadraticCurveTo(1112, C.top + 2, 1132, C.top - 18);
    ctx.closePath();
    ctx.fillStyle = '#3b7dd8';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.stroke();
    V.circle(ctx, 1104, C.top - 22, 5, null, '#d8b25a', 2.5);
    // plant
    rr(ctx, 1196, C.top - 36, 26, 36, 4, '#c86b4f', INK, 2.2);
    [[1200, C.top - 56, 0.4], [1214, C.top - 64, -0.2], [1222, C.top - 48, -0.6], [1190, C.top - 46, 0.9]].forEach(([lx, ly, a]) => V.ellipse(ctx, lx, ly, 8, 18, '#5aa35a', a));

    // ---- monstera on the left
    rr(ctx, 120, 770, 90, 100, 10, '#e9e3d6', INK, 3);
    [[150, 640, -0.5, 46], [196, 610, 0.3, 50], [120, 700, -1, 40], [210, 690, 0.8, 42], [170, 560, 0.1, 44]].forEach(([lx, ly, a, r]) => {
      V.line(ctx, 165, 770, lx, ly, '#3f8448', 5);
      V.ellipse(ctx, lx, ly, r, r * 0.62, '#4f9e44', a);
      ctx.beginPath();
      ctx.ellipse(lx, ly, r, r * 0.62, a, 0, TAU);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = INK;
      ctx.stroke();
    });

    // ---- floor (oak planks) + runner rug
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1200, FY, 4200, 900);
    ctx.clip();
    rect(ctx, -1200, FY, 4200, 900, '#c98f5f');
    ctx.strokeStyle = 'rgba(110,64,32,0.45)';
    ctx.lineWidth = 2.2;
    let yy = FY, step = 16, row = 0;
    ctx.beginPath();
    while (yy < FY + 700) {
      ctx.moveTo(-1200, yy);
      ctx.lineTo(3000, yy);
      const ny = yy + step;
      for (let x = -1200 + ((row * 173) % 260); x < 3000; x += 260 + step * 3) {
        ctx.moveTo(x, yy);
        ctx.lineTo(x, ny);
      }
      yy = ny;
      step *= 1.28;
      row++;
    }
    ctx.stroke();
    ctx.restore();
    // runner rug (perspective trapezoid)
    const rug = [[420, 878], [1470, 878], [1560, 990], [330, 990]];
    poly(ctx, rug, '#b9473c', INK, 2.6);
    ctx.save();
    poly(ctx, rug);
    ctx.clip();
    poly(ctx, [[440, 892], [1450, 892], [1530, 976], [360, 976]], '#e8d3b0');
    poly(ctx, [[470, 904], [1420, 904], [1490, 964], [400, 964]], '#2f4f86');
    for (let i = 0; i < 9; i++) {
      const cx = 520 + i * 115;
      poly(ctx, [[cx, 914], [cx + 30, 934], [cx, 954], [cx - 30, 934]], '#f6c945');
    }
    ctx.restore();
  }

  function hallDoorLeaf(ctx, open) {
    const d = HW.door;
    const P = (u, v) => doorPt(u, v, open);
    const quad = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)];
    const a = V.deg(open * DOOR_MAX);
    const col = V.shade('#2f7c86', -0.25 * Math.sin(a));
    poly(ctx, quad, col);
    // panels mapped onto the leaf
    const mapQ = (u0, v0, u1, v1) => [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
    const pc = V.shade(col, -0.12);
    poly(ctx, mapQ(0.1, 0.36, 0.46, 0.94), pc);
    poly(ctx, mapQ(0.54, 0.36, 0.9, 0.94), pc);
    // round window (porthole): bright outside
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const th = (i / 24) * TAU;
      const [px, py] = P(0.5 + 0.17 * Math.cos(th), 0.17 + 0.075 * Math.sin(th));
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff3cf';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f4e7c6';
    ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    poly(ctx, quad, null, INK, 3.2);
    // door edge thickness when open
    if (open > 0.02) {
      const e0 = P(0, 0), e1 = P(0, 1);
      const tw = 16 * Math.sin(a);
      poly(ctx, [e0, [e0[0] - tw, e0[1] + 2], [e1[0] - tw, e1[1] - 2], e1], V.shade('#2f7c86', 0.15), INK, 2.4);
    }
    // lever handle + deadbolt
    const [hx, hy] = E.hallwayDoorHandle(open);
    rr(ctx, hx - 7, hy - 22, 14, 56, 5, '#d8b25a', INK, 2.4);
    const lw = 36 * Math.max(0.35, Math.cos(a));
    rr(ctx, hx, hy - 6, lw, 12, 6, '#f0cf72', INK, 2.4);
    const [bx, by] = doorPt(0.13, 0.42, open);
    V.circle(ctx, bx, by, 9, '#d8b25a', INK, 2.2);
  }

  E.hallway = (ctx, o = {}) => {
    o = Object.assign({ hour: 16.67, t: 0, cam: { x: 960, y: 540, zoom: 1 }, doorOpen: 0, clothes: 0 }, o);
    const d = HW.door;
    const open = V.clamp(o.doorOpen);
    ctx.save();
    ctx.fillStyle = '#e3d0b2';
    ctx.fillRect(0, 0, V.W, V.H);
    E.kfCam(ctx, o.cam);
    // outside + people in the doorway (clipped to the opening)
    ctx.save();
    ctx.beginPath();
    ctx.rect(d.x0, d.top, d.x1 - d.x0, d.sill - d.top + 2);
    ctx.clip();
    if (open > 0.001) {
      hallOutside(ctx, o);
      if (o.inside) o.inside(ctx);
    } else rect(ctx, d.x0, d.top, d.x1 - d.x0, d.sill - d.top, '#2f7c86');
    ctx.restore();
    hallRoom(ctx, o);
    // sunlight flooding in through the open door
    if (open > 0.01) {
      const k = V.clamp(open * 1.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, d.sill, 0, 1080);
      g.addColorStop(0, `rgba(255,222,150,${0.38 * k})`);
      g.addColorStop(1, `rgba(255,222,150,${0.05 * k})`);
      ctx.fillStyle = g;
      poly(ctx, [[d.x0, d.sill], [d.x1, d.sill], [d.x1 - 80, 1100], [d.x0 - 380, 1100]]);
      ctx.fill();
      const r = ctx.createRadialGradient(1430, 560, 40, 1430, 560, 520);
      r.addColorStop(0, `rgba(255,236,190,${0.3 * k})`);
      r.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.fillStyle = r;
      ctx.fillRect(900, 40, 1060, 1040);
      ctx.restore();
    }
    hallDoorLeaf(ctx, open);
    if (o.back) o.back(ctx);
    if (o.actors) o.actors(ctx);
    if (o.front) o.front(ctx);
    ctx.restore();
    V.tint(ctx, '#fff0dc', 0.18, 'multiply');
    if (o.overlay) o.overlay(ctx);
  };

  // ================================================================== THE PITCH
  const PT = (E.PITCH = {
    GY: 860,
    H: 520,
    D: 1300,
    S: 0.8,
    goal: { x: 2350, y0: 300, y1: 1300, h: 400, depth: 260, backH: 330 },
    nearLine: -420,
    farLine: 2800,
    fence: 3600,
    halfway: -1450,
    scoreboard: { x: 900, y: 3350, w: 900, h0: 520, h1: 900 },
    lights: [-900, 1500, 3900],
    bench: { x0: 260, x1: 860, y: 3150 },
  });
  const yh = PT.GY - PT.H;
  E.pitchZ = (Y) => 1 + Y / PT.D;
  E.pitchP = (cam, X, Y, h = 0) => {
    const Z = 1 + Y / PT.D;
    const xr = cam.x + (X - cam.x) / Z;
    const yr = yh + (PT.H - h) / Z;
    return { x: V.W / 2 + (xr - cam.x) * cam.zoom, y: V.H / 2 + (yr - cam.y) * cam.zoom, k: cam.zoom / Z };
  };
  E.pitchLayer = (ctx, cam, Y) => {
    const Z = 1 + Y / PT.D;
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    ctx.translate(cam.x, yh);
    ctx.scale(1 / Z, 1 / Z);
    ctx.translate(-cam.x, -yh);
  };

  // ground quad helper (X0..X1 x Y0..Y1 on the ground)
  function gquad(ctx, cam, X0, X1, Y0, Y1, fill) {
    const a = E.pitchP(cam, X0, Y0), b = E.pitchP(cam, X1, Y0), c = E.pitchP(cam, X1, Y1), d = E.pitchP(cam, X0, Y1);
    poly(ctx, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], fill);
  }
  const LW = 13;
  function lineX(ctx, cam, X0, X1, Y, fill) {
    gquad(ctx, cam, X0, X1, Y - LW / 2, Y + LW / 2, fill);
  }
  function lineY(ctx, cam, X, Y0, Y1, fill) {
    gquad(ctx, cam, X - LW / 2, X + LW / 2, Y0, Y1, fill);
  }

  function pitchSky(ctx, o) {
    const t = o.t || 0;
    // only the part above the horizon is visible (the ground covers the rest)
    const hz = Math.min(V.H, E.pitchP(o.cam, o.cam.x, 1e7, 0).y + 6);
    const [skyTop, skyBot] = V.skyColors(o.hour);
    const sg = ctx.createLinearGradient(0, 0, 0, V.H);
    sg.addColorStop(0, skyTop);
    sg.addColorStop(1, skyBot);
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, V.W, hz);
    // low golden sun, upper left
    const sp = E.pitchP(o.cam, o.cam.x - 9000, 60000, 1600);
    const sx = 330, sy = Math.max(170, Math.min(420, sp.y));
    const g = ctx.createRadialGradient(sx, sy, 10, sx, sy, 700);
    g.addColorStop(0, 'rgba(255,226,150,0.9)');
    g.addColorStop(0.12, 'rgba(255,206,120,0.45)');
    g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, Math.min(V.W, sx + 700), hz);
    V.circle(ctx, sx, sy, 46, '#fff1c4');
    V.cloud(ctx, 700 - ((o.cam.x * 0.02 + t * 8) % 2400) + 1200, 150, 0.9, 'rgba(255,236,214,0.75)');
    V.cloud(ctx, 1500 - ((o.cam.x * 0.02 + t * 6) % 2400) + 900, 110, 0.6, 'rgba(255,230,206,0.7)');
    V.cloud(ctx, 140 - ((o.cam.x * 0.02 + t * 5) % 2400) + 1600, 230, 0.55, 'rgba(255,226,200,0.6)');
    return [sx, sy];
  }

  let fenceTile = null;
  function pitchFar(ctx, o) {
    const cam = o.cam;
    // ground beyond the pitch (to the horizon)
    const hz = E.pitchP(cam, cam.x, 1e7, 0).y;
    const gg = ctx.createLinearGradient(0, hz, 0, V.H);
    gg.addColorStop(0, '#7aa85a');
    gg.addColorStop(1, '#4f9a44');
    ctx.fillStyle = gg;
    ctx.fillRect(0, hz - 2, V.W, V.H);
    // skyline (apartment blocks with solar heaters) Y 15000
    ctx.save();
    E.pitchLayer(ctx, cam, 15000);
    const Zs = E.pitchZ(15000);
    const x0 = cam.x - 1200 * Zs / cam.zoom, x1 = cam.x + 1200 * Zs / cam.zoom;
    for (let i = Math.floor(x0 / 700) - 1; i < x1 / 700 + 1; i++) {
      const bx = i * 700 + V.rand(i * 3.1) * 200;
      const bw = 420 + V.rand(i * 1.7) * 260;
      const bh = 900 + V.rand(i * 2.3) * 900;
      const col = V.mixColor('#d7b8a0', '#c9a6a0', V.rand(i * 4.4));
      rect(ctx, bx, PT.GY - bh, bw, bh, col);
      ctx.fillStyle = 'rgba(255,214,150,0.5)';
      for (let wy = PT.GY - bh + 70; wy < PT.GY - 60; wy += 150) for (let wx = bx + 50; wx < bx + bw - 60; wx += 110) ctx.fillRect(wx, wy, 50, 70);
      rect(ctx, bx + bw * 0.3, PT.GY - bh - 70, 80, 70, '#a8a2a8');
      poly(ctx, [[bx + bw * 0.3 + 100, PT.GY - bh], [bx + bw * 0.3 + 230, PT.GY - bh], [bx + bw * 0.3 + 200, PT.GY - bh - 90], [bx + bw * 0.3 + 70, PT.GY - bh - 90]], '#5b6a8f');
    }
    ctx.restore();
    // tree line Y 7000
    ctx.save();
    E.pitchLayer(ctx, cam, 7000);
    const Zt = E.pitchZ(7000);
    const tx0 = cam.x - 1300 * Zt / cam.zoom, tx1 = cam.x + 1300 * Zt / cam.zoom;
    for (let i = Math.floor(tx0 / 260) - 1; i < tx1 / 260 + 1; i++) {
      const bx = i * 260 + V.rand(i * 5.3) * 80;
      const r = 150 + V.rand(i * 2.9) * 110;
      const c = V.mixColor('#4e8a4a', '#6a9a50', V.rand(i * 7.7));
      rect(ctx, bx - 14, PT.GY - 200, 28, 200, '#6b4a33');
      V.circle(ctx, bx, PT.GY - 200 - r * 0.6, r, c);
      V.circle(ctx, bx - r * 0.6, PT.GY - 160 - r * 0.3, r * 0.7, V.shade(c, -0.08));
    }
    ctx.restore();
    // floodlight towers (off) Y 6000
    PT.lights.forEach((lx) => {
      ctx.save();
      E.pitchLayer(ctx, cam, 6000);
      const top = PT.GY - 1650;
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(lx - 50, PT.GY);
      ctx.lineTo(lx - 10, top + 120);
      ctx.moveTo(lx + 50, PT.GY);
      ctx.lineTo(lx + 10, top + 120);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let yy = PT.GY; yy > top + 160; yy -= 110) {
        const k = (PT.GY - yy) / (PT.GY - top);
        const w = V.lerp(50, 12, k);
        ctx.moveTo(lx - w, yy);
        ctx.lineTo(lx + w * 0.8, yy - 110);
      }
      ctx.stroke();
      rr(ctx, lx - 170, top - 60, 340, 190, 10, '#4b5260', INK, 8);
      for (let r0 = 0; r0 < 3; r0++) for (let c0 = 0; c0 < 4; c0++) V.circle(ctx, lx - 120 + c0 * 80, top - 10 + r0 * 50, 26, '#c9ced6', '#3a3f4a', 6);
      ctx.restore();
    });
    // the pitch: mown stripes between the touchlines
    const Xa = cam.x - 4200 / cam.zoom, Xb = cam.x + 4200 / cam.zoom;
    gquad(ctx, cam, Xa, Xb, -640, PT.fence + 300, '#5ea64f');
    const SW = 300;
    for (let i = Math.floor(Xa / SW); i < Xb / SW; i++) gquad(ctx, cam, i * SW, i * SW + SW, -640, PT.farLine + 200, i % 2 ? '#62b553' : '#6fc35c');
    // soft depth haze toward the far side
    const fh = E.pitchP(cam, cam.x, PT.fence, 0).y;
    const nh = E.pitchP(cam, cam.x, 800, 0).y;
    const hg = ctx.createLinearGradient(0, fh, 0, nh);
    hg.addColorStop(0, 'rgba(255,220,170,0.28)');
    hg.addColorStop(1, 'rgba(255,220,170,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, fh, V.W, nh - fh);
    // fence (chain link) Y 3600
    const fy0 = E.pitchP(cam, cam.x, PT.fence, 0), fy1 = E.pitchP(cam, cam.x, PT.fence, 620);
    // chain-link mesh: one cached diamond tile used as a pattern (fast)
    if (!fenceTile) {
      fenceTile = document.createElement('canvas');
      fenceTile.width = 36;
      fenceTile.height = 36;
      const fc = fenceTile.getContext('2d');
      fc.strokeStyle = 'rgba(70,90,80,0.45)';
      fc.lineWidth = 2.6;
      fc.beginPath();
      fc.moveTo(0, 0);
      fc.lineTo(36, 36);
      fc.moveTo(36, 0);
      fc.lineTo(0, 36);
      fc.stroke();
    }
    const pat = ctx.createPattern(fenceTile, 'repeat');
    const ps = 0.5;
    const offX = (((-cam.x * fy0.k) % (36 * ps)) + 36 * ps) % (36 * ps);
    pat.setTransform(new DOMMatrix([ps, 0, 0, ps, offX, fy1.y]));
    ctx.fillStyle = pat;
    ctx.fillRect(0, fy1.y, V.W, fy0.y - fy1.y);
    const pstep = 500;
    const pxa = cam.x - 2600 * E.pitchZ(PT.fence) / cam.zoom, pxb = cam.x + 2600 * E.pitchZ(PT.fence) / cam.zoom;
    for (let x = Math.floor(pxa / pstep) * pstep; x < pxb; x += pstep) {
      const a = E.pitchP(cam, x, PT.fence, 0), b = E.pitchP(cam, x, PT.fence, 640);
      V.line(ctx, a.x, a.y, b.x, b.y, '#3f6a55', Math.max(2, 18 * a.k));
    }
    const ra = E.pitchP(cam, pxa, PT.fence, 630), rb = E.pitchP(cam, pxb, PT.fence, 630);
    V.line(ctx, ra.x, ra.y, rb.x, rb.y, '#3f6a55', Math.max(2, 14 * ra.k));
  }

  function scoreboard(ctx, o) {
    const S = PT.scoreboard;
    ctx.save();
    E.pitchLayer(ctx, o.cam, S.y);
    const cx = S.x, top = PT.GY - S.h1, bot = PT.GY - S.h0;
    // legs
    rr(ctx, cx - 300, bot, 34, S.h0, 4, '#4b5260', INK, 6);
    rr(ctx, cx + 266, bot, 34, S.h0, 4, '#4b5260', INK, 6);
    rr(ctx, cx - S.w / 2, top, S.w, bot - top, 18, '#1b1e26', INK, 8);
    rr(ctx, cx - S.w / 2 + 24, top + 22, S.w - 48, 64, 8, '#2a2f3b');
    V.text(ctx, 'מגרש הכדורגל השכונתי', cx, top + 55, { size: 42, weight: 700, color: '#f6c945' });
    // home / guest
    V.text(ctx, 'בית', cx - 350, top + 128, { size: 36, weight: 700, color: '#e9e3d6' });
    V.text(ctx, 'אורח', cx + 350, top + 128, { size: 36, weight: 700, color: '#e9e3d6' });
    rr(ctx, cx - 400, top + 158, 100, 140, 10, '#0b0606');
    rr(ctx, cx + 300, top + 158, 100, 140, 10, '#0b0606');
    V.sevenSeg(ctx, '0', cx - 376, top + 182, 92, { on: '#ffb020', off: 'rgba(255,170,30,0.08)', glow: 0.6 });
    V.sevenSeg(ctx, '0', cx + 324, top + 182, 92, { on: '#ffb020', off: 'rgba(255,170,30,0.08)', glow: 0.6 });
    // the clock
    const str = o.clock || '17:00';
    const dh = 150;
    const dw = V.sevenSegWidth(str, dh);
    rr(ctx, cx - dw / 2 - 26, top + 108, dw + 52, dh + 56, 12, '#0b0606');
    V.sevenSeg(ctx, str, cx - dw / 2, top + 136, dh, { glow: 1 });
    ctx.restore();
  }

  function benchArea(ctx, o) {
    const Bn = PT.bench;
    const cam = o.cam;
    ctx.save();
    E.pitchLayer(ctx, cam, Bn.y);
    // dugout shelter
    const g = PT.GY;
    rr(ctx, Bn.x0 - 30, g - 330, 24, 330, 4, '#9aa3ad', INK, 5);
    rr(ctx, Bn.x1 + 6, g - 330, 24, 330, 4, '#9aa3ad', INK, 5);
    ctx.beginPath();
    ctx.moveTo(Bn.x0 - 60, g - 300);
    ctx.quadraticCurveTo((Bn.x0 + Bn.x1) / 2, g - 420, Bn.x1 + 60, g - 300);
    ctx.lineTo(Bn.x1 + 60, g - 286);
    ctx.quadraticCurveTo((Bn.x0 + Bn.x1) / 2, g - 400, Bn.x0 - 60, g - 286);
    ctx.closePath();
    ctx.fillStyle = 'rgba(190,225,240,0.75)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    rr(ctx, Bn.x0, g - 150, Bn.x1 - Bn.x0, 26, 6, '#3b7dd8', INK, 5);
    rr(ctx, Bn.x0 + 20, g - 124, 18, 124, 3, '#4b5260');
    rr(ctx, Bn.x1 - 38, g - 124, 18, 124, 3, '#4b5260');
    // bags on the bench (the hero's black/red bag among them)
    E.sportsBag(ctx, Bn.x0 + 130, g - 186, 1.15, { handles: true });
    rr(ctx, Bn.x0 + 260, g - 210, 110, 64, 24, '#3f5a8a', INK, 4);
    E.waterBottle(ctx, Bn.x0 + 420, g - 190, 1.2, 0);
    E.waterBottle(ctx, Bn.x0 + 452, g - 190, 1.2, 0.1);
    E.towelRoll(ctx, Bn.x0 + 520, g - 172, 1.1, 0);
    // ball net bag
    ctx.save();
    ctx.translate(Bn.x1 + 140, g - 70);
    [[-38, 10], [0, 14], [38, 10], [-18, -26], [20, -24]].forEach(([bx, by]) => E.football(ctx, bx, by, 26, bx * 0.05));
    ctx.strokeStyle = 'rgba(31,26,36,0.6)';
    ctx.lineWidth = 3;
    for (let i = -4; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 14, -64);
      ctx.lineTo(i * 18, 38);
      ctx.stroke();
    }
    ctx.restore();
    // stacked cones
    for (let i = 0; i < 4; i++) {
      poly(ctx, [[Bn.x0 - 160, g - i * 16], [Bn.x0 - 100, g - i * 16], [Bn.x0 - 122, g - 70 - i * 16], [Bn.x0 - 138, g - 70 - i * 16]], '#f39a3d', INK, 4);
    }
    ctx.restore();
  }

  function pitchLines(ctx, o) {
    const cam = o.cam;
    const G = PT.goal;
    const wc = 'rgba(255,255,255,0.88)';
    const Xa = cam.x - 5000, Xb = cam.x + 5000;
    lineX(ctx, cam, Xa, Math.min(Xb, G.x), PT.farLine, wc);
    lineX(ctx, cam, Xa, Math.min(Xb, G.x), PT.nearLine, wc);
    lineY(ctx, cam, G.x, PT.nearLine, PT.farLine, wc);
    // penalty box + goal area
    const P0 = -250, P1 = 1850;
    lineY(ctx, cam, G.x - 1100, P0, P1, wc);
    lineX(ctx, cam, G.x - 1100, G.x, P0, wc);
    lineX(ctx, cam, G.x - 1100, G.x, P1, wc);
    lineY(ctx, cam, G.x - 450, 150, 1450, wc);
    lineX(ctx, cam, G.x - 450, G.x, 150, wc);
    lineX(ctx, cam, G.x - 450, G.x, 1450, wc);
    gquad(ctx, cam, G.x - 770, G.x - 740, 785, 815, wc);
    // halfway line + centre circle
    lineY(ctx, cam, PT.halfway, PT.nearLine, PT.farLine, wc);
    const cy = (PT.nearLine + PT.farLine) / 2, R = 750;
    const ring = (r) => {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * TAU;
        const p = E.pitchP(cam, PT.halfway + Math.cos(a) * r, cy + Math.sin(a) * r);
        pts.push([p.x, p.y]);
      }
      return pts;
    };
    ctx.beginPath();
    ring(R + LW / 2).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ring(R - LW / 2).reverse().forEach(([x, y], i) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = wc;
    ctx.fill('evenodd');
    // corner flag at the goal line (far side)
    const cf = E.pitchP(cam, G.x, PT.farLine, 0), ct = E.pitchP(cam, G.x, PT.farLine, 260);
    V.line(ctx, cf.x, cf.y, ct.x, ct.y, '#fbf7f0', Math.max(1.5, 8 * cf.k));
    poly(ctx, [[ct.x, ct.y], [ct.x + 50 * ct.k, ct.y + 16 * ct.k], [ct.x, ct.y + 34 * ct.k]], '#f6c945', INK, 1.5);
  }

  // ---- the goal (with a bulging back net)
  function goalGeom(o) {
    const G = PT.goal;
    const hit = o.netHit || 0;
    const at = o.netAt || { Y: 800, h: 150 };
    const bulge = (Y, h, k) => {
      if (Math.abs(hit) < 0.001) return 0;
      const u = (Y - G.y0) / (G.y1 - G.y0), v = h / G.backH;
      const edge = Math.sin(Math.PI * V.clamp(u)) * Math.sin(Math.PI * V.clamp(v) * 0.5 + Math.PI * 0.5 * V.clamp(v)) ;
      const gs = Math.exp(-((Y - at.Y) ** 2) / (2 * 230 * 230) - ((h - at.h) ** 2) / (2 * 120 * 120));
      return hit * 190 * gs * Math.max(0, edge) * k;
    };
    return { G, bulge };
  }
  function meshQuad(ctx, cam, corner, nu, nv, disp, color, lw) {
    const pts = [];
    for (let i = 0; i <= nu; i++) {
      const row = [];
      for (let j = 0; j <= nv; j++) {
        const [X, Y, h] = corner(i / nu, j / nv);
        const p = E.pitchP(cam, X + (disp ? disp(X, Y, h) : 0), Y, h);
        row.push(p);
      }
      pts.push(row);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const p = pts[i][j];
      if (j) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const p = pts[i][j];
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
    return pts;
  }
  function post(ctx, cam, X, Y, h0, h1, w) {
    const a = E.pitchP(cam, X, Y, h0), b = E.pitchP(cam, X, Y, h1);
    V.line(ctx, a.x, a.y, b.x, b.y, INK, (w + 7) * a.k);
    V.line(ctx, a.x, a.y, b.x, b.y, '#fbfbf7', w * a.k);
  }
  function goalBack(ctx, o) {
    const cam = o.cam;
    const { G, bulge } = goalGeom(o);
    const bx = G.x + G.depth;
    const netC = 'rgba(245,245,240,0.55)';
    // ground frame at the back
    const g0 = E.pitchP(cam, bx, G.y0, 0), g1 = E.pitchP(cam, bx, G.y1, 0);
    V.line(ctx, g0.x, g0.y, g1.x, g1.y, '#c9ced6', 6 * g0.k);
    // back net (bulges)
    const dispBack = (X, Y, h) => bulge(Y, h, 1);
    meshQuad(ctx, cam, (u, v) => [bx, V.lerp(G.y0, G.y1, u), V.lerp(0, G.backH, v)], 16, 8, dispBack, netC, Math.max(1, 2.2 * g0.k));
    // far side net
    meshQuad(ctx, cam, (u, v) => [V.lerp(G.x, bx, u), G.y1, V.lerp(0, V.lerp(G.h, G.backH, u), v)], 5, 8, null, netC, Math.max(1, 2 * g0.k));
    // top net
    meshQuad(ctx, cam, (u, v) => [V.lerp(G.x, bx, v), V.lerp(G.y0, G.y1, u), V.lerp(G.h, G.backH, v)], 16, 5, (X, Y, h) => bulge(Y, G.backH, (X - G.x) / G.depth) * 0.5, netC, Math.max(1, 2 * g0.k));
    // back frame bars
    const t0 = E.pitchP(cam, bx, G.y0, G.backH), t1 = E.pitchP(cam, bx, G.y1, G.backH);
    V.line(ctx, t0.x, t0.y, t1.x, t1.y, '#c9ced6', 5 * t0.k);
    V.line(ctx, t1.x, t1.y, g1.x, g1.y, '#c9ced6', 5 * t1.k);
    // far post (behind anything inside the goal)
    post(ctx, cam, G.x, G.y1, 0, G.h, 15);
  }
  function goalFront(ctx, o) {
    const cam = o.cam;
    const { G } = goalGeom(o);
    const bx = G.x + G.depth;
    const netC = 'rgba(250,250,245,0.6)';
    const k0 = E.pitchP(cam, G.x, G.y0, 0).k;
    // near side net
    meshQuad(ctx, cam, (u, v) => [V.lerp(G.x, bx, u), G.y0, V.lerp(0, V.lerp(G.h, G.backH, u), v)], 5, 8, null, netC, Math.max(1, 2.2 * k0));
    const n0 = E.pitchP(cam, bx, G.y0, 0), n1 = E.pitchP(cam, bx, G.y0, G.backH);
    V.line(ctx, n0.x, n0.y, n1.x, n1.y, '#c9ced6', 5 * n0.k);
    // crossbar + near post
    const c0 = E.pitchP(cam, G.x, G.y0, G.h), c1 = E.pitchP(cam, G.x, G.y1, G.h);
    V.line(ctx, c0.x, c0.y, c1.x, c1.y, INK, 22 * c0.k);
    V.line(ctx, c0.x, c0.y, c1.x, c1.y, '#fbfbf7', 15 * c0.k);
    post(ctx, cam, G.x, G.y0, 0, G.h, 15);
  }

  E._pitchParts = { pitchSky, pitchFar, scoreboard, benchArea, pitchLines }; // internal (profiling)
  E.pitch = (ctx, o = {}) => {
    o = Object.assign({ hour: 17, t: 0, cam: { x: 960, y: 600, zoom: 1 } }, o);
    const cam = o.cam;
    ctx.save();
    pitchSky(ctx, o);
    pitchFar(ctx, o);
    scoreboard(ctx, o);
    benchArea(ctx, o);
    pitchLines(ctx, o);
    const api = {
      cam,
      P: (X, Y, h) => E.pitchP(cam, X, Y, h),
      layer: (c, Y) => E.pitchLayer(c, cam, Y),
      goalBack: (c) => goalBack(c, o),
      goalFront: (c) => goalFront(c, o),
      shadows: (c, list) => {
        // half-resolution silhouette layer (soft edges for free, 4x cheaper)
        const sc = E.kfScratch(1, V.W / 2, V.H / 2);
        list.forEach((it) => {
          sc.save();
          sc.scale(0.5, 0.5);
          E.pitchLayer(sc, cam, it.Y);
          // ground-plane skew: x' = x + 0.9 (GY - y), y' = GY + 0.2 (GY - y)
          sc.transform(1, 0, -0.9, -0.2, 0.9 * PT.GY, 1.2 * PT.GY);
          it.draw(sc);
          sc.restore();
        });
        // shadows only lie on the ground: composite just the region below the horizon
        const hz = Math.max(0, Math.floor(E.pitchP(cam, cam.x, 1e7, 0).y));
        sc.save();
        sc.globalCompositeOperation = 'source-in';
        sc.fillStyle = '#2c3a1e';
        const hz2 = Math.floor(hz / 2);
        sc.fillRect(0, hz2, V.W / 2, V.H / 2 - hz2);
        sc.restore();
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 0.3;
        c.drawImage(sc.canvas, 0, hz2, V.W / 2, V.H / 2 - hz2, 0, hz2 * 2, V.W, V.H - hz2 * 2);
        c.restore();
      },
      ballShadow: (c, X, Y, h, r) => {
        const p = E.pitchP(cam, X, Y, 0);
        const fade = 1 / (1 + h / 180);
        V.ellipse(c, p.x, p.y, r * 1.1 * p.k * (0.6 + 0.4 * fade), r * 0.3 * p.k, `rgba(30,50,20,${0.35 * fade})`);
        const q = E.pitchP(cam, X + 0.9 * h + r * 0.6, Y - 0.5 * h, 0);
        V.ellipse(c, q.x, q.y, r * 1.6 * q.k, r * 0.45 * q.k, 'rgba(30,50,20,0.22)', -0.08);
      },
    };
    if (o.actors) o.actors(ctx, api);
    ctx.restore();
    // golden late-afternoon grade
    V.tint(ctx, '#ffcf8f', 0.26, 'multiply');
    V.lightPool(ctx, 330, 260, 1300, '#ffb05a', 0.2);
    if (o.overlay) o.overlay(ctx);
  };
})();
