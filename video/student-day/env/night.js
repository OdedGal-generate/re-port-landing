// Shared helpers for the 'night' location group (scene 16-friends; reusable by anyone who needs a
// night exterior with the hero's friends).
//
// ============================================================================================
//  NIGHT SETS — API
// ============================================================================================
//
//  Two sets, each drawn by ONE call that paints the whole frame (sky, set, actors, lights):
//
//     V.env.nightCorner(ctx, o)   residential street corner at ~21:00: stone garden wall + hedge
//                                 on the left, a fenced basketball court (hoop, floodlight) in the
//                                 middle, the corner STREET LAMP (warm pool of light) and a stone
//                                 apartment building on the right (lit lobby + windows).
//     V.env.nightPlaza(ctx, o)    seaside promenade ("tayelet") at night: sea + moon reflection, far
//                                 city lights on the horizon, railing, palms, string lights, a pizza
//                                 kiosk with a glowing neon "פיצה" sign, benches, passers-by.
//
//  Common options:
//     o.cam      {x, y, zoom}  world point (x, y) lands on the screen centre (zoom 1 = 1:1 with
//                              the 1920x1080 canvas, so {x: 960, y: 540, zoom: 1} = identity).
//                              Far layers use parallax derived from the same camera.
//     o.t        seconds (twinkle, flicker, waves, moths)
//     o.moon     [sx, sy, r] SCREEN position/radius of the crescent moon (default: upper left)
//     o.starSpin radians — rotates the star field around a pole (time-lapse sky)
//     o.actors(c)  WORLD coords: characters on the walk plane. Drawn through the set's night
//                  lighting (ambient blue darkness, lifted by every light pool), so they match.
//     o.front(c)   WORLD coords: foreground drawn after the actors (also night-lit).
//     o.lights     extra light pools [{x, y, r, a, tint, color}] (world) — e.g. a phone screen.
//     o.glow(c)    WORLD coords: extra additive glows drawn last (before the screen overlay).
//     o.overlay(c) SCREEN coords, drawn last.
//     o.dark       0..1 extra darkness (default 0)
//
//  nightCorner extra options:
//     o.lamp       0..1 street lamp (default 1)      o.court  0..1 court floodlight (default 1)
//     o.windows    0..1 building windows lit (default 1)
//  nightPlaza extra options (k = night progress 0 at 21:00 .. 1 at 01:30 drives the defaults):
//     o.k          0..1   default driver for everything below
//     o.tau        "fast-forward clock" (seconds) for passers-by / lighthouse; default o.t.
//                  Pass a value that runs faster than t during a time-lapse.
//     o.ff         0..1 time-lapse strength (ghost trails on passers-by)
//     o.bulbs      fn(i, n) -> 0..1  string-light bulbs (default: switch off one by one with k)
//     o.neon       0..1   kiosk neon sign            o.kiosk 0..1 kiosk interior light
//     o.menu       0..1   menu light box             o.shutter 0..1 kiosk shutter (1 = closed)
//     o.crowd      bool   passers-by + kiosk customers (default true)
//     o.owner      bool   kiosk owner behind the counter (default: until the shutter closes)
//
//  Lower-level pieces (all exported):
//     V.env.nightCam(ctx, cam, f=1)          apply the camera for parallax factor f
//     V.env.nightToScreen(cam, x, y, f=1)    -> [sx, sy]
//     V.env.nightSky(ctx, o)                 sky gradient + milky way + stars + crescent moon
//     V.env.nightMoon(ctx, x, y, r)          crescent moon with halo (screen coords)
//     V.env.nightLitPass(ctx, cam, mask, fn) draw fn(c) in WORLD coords through the darkness mask
//     V.env.nightMask(cam, lights, o)        build the darkness mask canvas (full-res, reused)
//     V.env.nightBench(ctx, x0, x1, seatY, feetY)  park bench (backrest, slats, cast-iron legs)
//
//  Lighting model: the near set + actors are painted in their normal (day) colours on an
//  offscreen layer, then a deep-blue darkness mask is laid over them 'source-atop'; every light
//  pool punches a soft hole in the darkness (+ a warm tint), so characters walking under a lamp
//  light up automatically. Emissive things (lit windows, neon, bulbs, kiosk interior) are drawn
//  after the set layer, additive glows last. ~50 ms/frame with four characters.
//
//  Characters (same rig, V.boy):
//     V.env.NIGHT_FRIENDS = { curly, blond, buzz }  each {look, outfit} — spread into a pose:
//          P.stand({ ...V.env.NIGHT_FRIENDS.curly, facing: -1 })
//          curly: dark skin, black curly hair, RED jacket, dark jeans, white sneakers
//          blond: fair skin, blond short hair, mustard tee, light jeans (the skater)
//          buzz:  tan skin, buzz cut, blue #23 basketball tank, black shorts (the baller)
//     V.env.nightPerson(ctx, x, groundY, s, pose, {lift, shadow, hipY, alpha, headOver})  feet on
//                                            groundY + soft shadow (hipY overrides the hip); returns
//                                            joints. headOver: a raised near arm passes BEHIND the
//                                            head instead of across the face (empty hands only)
//     V.env.nightPoseMix(a, b, k)            blend two full poses (angles lerp)
//     V.env.nightArmIK(pose, x, hipY, s, 'near'|'far', [wx, wy]) -> {sh, el} hand on a world point
//     V.env.nightTurn(t, t0, dur, from, to)  facing value for a quick squash-turn
//     V.env.nightHipForFeet(pose, s, feetX)  hip x that keeps the feet at feetX (sit <-> stand)
//
//  Props (world coords):
//     V.env.skateboard(ctx, x, y, s, {rot, flip})  (x,y) = centre of the deck top, rot radians,
//                                                   flip 0..1 = one kickflip roll; 200*s long
//     V.env.basketball(ctx, x, y, r, spin)
//     V.env.pizzaSlice(ctx, x, y, s, ang, bite)    (x,y) = crust (where it is held), tip toward
//                                                   angle ang (radians), bite 0..1 eaten
//     V.env.pizzaBox(ctx, x, y, s, slices)         open box on a surface, (x,y) = front-bottom
//                                                   centre, slices 0..8 left
//     V.env.nightPhone(ctx, x, y, s, time, {pop})   phone in a hand, screen toward camera
//
//  LAYOUT  V.env.NIGHT (world px)
//   corner (camera ~ {x: 900, y: 580, zoom: 1.0 .. 1.2}):
//     GY 885         front walk line (feet).  back row of people: feet ~858 (scale x0.95)
//     sidewalk       y 836 (back edge: wall, fence, lamp and building stand here) .. 930
//     curb           930..952 (red/white), road below
//     garden wall    x < 250 (top 742) with hedge + ficus tree
//     court fence    x 250..1235 (top rail 560), hoop at x 735, floodlight at x 300
//     street lamp    pole x 1250, lantern at (1128, 322); light pool centre (1110, 870)
//     building       x >= 1340 (lobby door x 1440..1540)
//   plaza (camera ~ {x: 960, y: 560, zoom: 1}):
//     horizon 455, sea 455..600, seawall 600..650, railing posts 548..600
//     floor from 650 (back) down; walk lines: back 705 (passers-by, s~0.62), front 935..990
//     bench          x 300..860, seat top 800, feet of sitters 895 (drawn by the scene:
//                    V.env.nightBench(ctx, x0, x1, seatY, feetY))
//     kiosk          x 1360..1840, counter window 1420..1780 x 540..720, neon at y ~300
//     string lights  poles x -160, 940, 1352 (tops y 196); street lamp x 210 (stays lit)
//     palms          x 110, 1196 (behind the railing line)
//     open floor     x 900..1300 in front of the kiosk (skating space)
// ============================================================================================
(function () {
  const V = window.V;
  const E = (V.env = V.env || {});
  const B = V.boy, P = B.pose;
  const INK = V.pal.ink;
  const R = V.rand;

  const NIGHT = {
    corner: {
      GY: 885, backY: 858, walkBack: 836, curbY: 930, roadY: 952,
      wallX: 250, fence: { x0: 250, x1: 1235, top: 560 }, hoopX: 735, floodX: 300,
      lamp: { x: 1250, base: 842, headX: 1128, headY: 322 },
      pool: [1110, 870],
      building: { x0: 1340, door: [1440, 1540] },
      heroScale: 1.05,
    },
    plaza: {
      horizon: 455, seaY: 600, floorY: 650, backWalk: 705, frontY: 935,
      bench: { x0: 300, x1: 860, seatY: 800, feetY: 895 },
      kiosk: { x0: 1360, x1: 1840, win: [1420, 1780, 540, 720], roof: 360, base: 905 },
      poles: [-160, 940, 1352], poleTop: 196,
      palms: [110, 1196],
      heroScale: 0.92,
    },
  };
  E.NIGHT = NIGHT;

  // ---------------------------------------------------------------- friends
  const noLogo = { logo: false, number: null, trim: null, socks: null, hoodie: false, shirtDots: null, towel: null };
  E.NIGHT_FRIENDS = {
    curly: {
      look: { skin: '#8d5a3b', skinShade: '#76482d', hair: '#17110e', hairStyle: 'curly', brow: '#17110e' },
      outfit: Object.assign({}, noLogo, { shirt: '#c0142a', sleeves: 'long', pants: '#2b3140', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#d23c33' }),
    },
    blond: {
      look: { skin: '#f2c6a4', skinShade: '#dcaa86', hair: '#f0c85c', hairStyle: 'short', brow: '#c4943a' },
      outfit: Object.assign({}, noLogo, { shirt: '#f0a23a', sleeves: 'short', pants: '#6f86ad', pantsLen: 'long', shoes: 'sneakers', shoeColor: '#ece7dc', shoeAccent: '#2c7be5' }),
    },
    buzz: {
      look: { skin: '#c98d62', skinShade: '#ae7550', hair: '#241812', hairStyle: 'buzz', brow: '#241812' },
      outfit: Object.assign({}, noLogo, { shirt: '#3657c4', sleeves: 'none', number: '23', trim: '#ffffff', pants: '#1d2333', pantsLen: 'shorts', socks: '#f2f2f2', shoes: 'sneakers', shoeColor: '#f4f4f4', shoeAccent: '#3657c4' }),
    },
  };

  // ---------------------------------------------------------------- camera
  const camZ = (cam, f) => 1 + (cam.zoom - 1) * f;
  const camApply = (ctx, cam, f = 1) => {
    const z = camZ(cam, f);
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(z, z);
    ctx.translate(-(cam.x * f + (V.W / 2) * (1 - f)), -(cam.y * f + (V.H / 2) * (1 - f)));
  };
  const toScreen = (cam, x, y, f = 1) => {
    const z = camZ(cam, f);
    return [(x - (cam.x * f + (V.W / 2) * (1 - f))) * z + V.W / 2, (y - (cam.y * f + (V.H / 2) * (1 - f))) * z + V.H / 2];
  };
  const normCam = (c) => Object.assign({ x: V.W / 2, y: V.H / 2, zoom: 1 }, c || {});
  E.nightCam = camApply;
  E.nightToScreen = toScreen;

  // ---------------------------------------------------------------- offscreen canvases
  const CV = {};
  const canvas = (name, w, h) => {
    let c = CV[name];
    if (!c) {
      c = CV[name] = document.createElement('canvas');
      c.width = w;
      c.height = h;
    }
    return c;
  };

  // ---------------------------------------------------------------- lighting
  // Darkness mask (quarter res): ambient deep-blue darkness with holes punched by light pools,
  // plus a warm tint inside the pools. Drawn 'source-atop' over a layer => night lighting.
  const MS = 4;
  function buildMask(cam, lights, o = {}) {
    const c = canvas('mask', V.W / MS, V.H / MS);
    const m = c.getContext('2d');
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over';
    m.globalAlpha = 1;
    m.clearRect(0, 0, c.width, c.height);
    const amb = V.clamp((o.ambient === undefined ? 0.6 : o.ambient) + (o.dark || 0) * 0.25, 0, 0.92);
    m.fillStyle = `rgba(9,12,38,${amb})`;
    m.fillRect(0, 0, c.width, c.height);
    m.setTransform(1 / MS, 0, 0, 1 / MS, 0, 0);
    camApply(m, cam);
    m.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      if (!(L.a > 0.003)) continue;
      const g = m.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r);
      g.addColorStop(0, `rgba(0,0,0,${V.clamp(L.a)})`);
      g.addColorStop(0.45, `rgba(0,0,0,${V.clamp(L.a) * 0.6})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g;
      m.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    m.globalCompositeOperation = 'source-over';
    for (const L of lights) {
      const tk = (L.tint === undefined ? 0.16 : L.tint) * V.clamp(L.a);
      if (tk < 0.004) continue;
      const col = L.color || '#ffb45c';
      const g = m.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.8);
      g.addColorStop(0, V.rgba(col, tk));
      g.addColorStop(1, V.rgba(col, 0));
      m.fillStyle = g;
      m.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    }
    m.setTransform(1, 0, 0, 1, 0, 0);
    // upscale once into a full-res mask (a plain upscale + an unscaled 'source-atop' is much
    // cheaper than a scaled 'source-atop' draw in the software rasterizer)
    const F = canvas('maskFull', V.W, V.H);
    const f = F.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0);
    f.globalCompositeOperation = 'source-over';
    f.clearRect(0, 0, V.W, V.H);
    f.drawImage(c, 0, 0, V.W, V.H);
    return F;
  }
  E.nightMask = (cam, lights, o) => buildMask(normCam(cam), lights, o);

  function litPass(ctx, cam, mask, fn) {
    const c = canvas('layer', V.W, V.H);
    const x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, V.W, V.H);
    x.save();
    camApply(x, cam);
    fn(x);
    x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    if (mask.width === V.W) x.drawImage(mask, 0, 0);
    else x.drawImage(mask, 0, 0, V.W, V.H);
    x.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
  E.nightLitPass = (ctx, cam, mask, fn) => litPass(ctx, normCam(cam), mask, fn);

  let profT = 0;
  const prof = (ctx, label) => {
    const P_ = E._prof;
    if (!P_) return;
    ctx.getImageData(0, 0, 1, 1);
    const n = performance.now();
    if (label) P_[label] = (P_[label] || 0) + n - profT;
    profT = n;
  };

  const glowDot = (ctx, x, y, r, col, a) => {
    if (a <= 0.003) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, V.rgba(col, a));
    g.addColorStop(0.35, V.rgba(col, a * 0.35));
    g.addColorStop(1, V.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // ---------------------------------------------------------------- sky
  function moonImage() {
    const c = canvas('moon', 256, 256);
    if (c._done) return c;
    const m = c.getContext('2d');
    const g = m.createRadialGradient(110, 110, 10, 128, 128, 100);
    g.addColorStop(0, '#fffbe6');
    g.addColorStop(1, '#f4e3a6');
    m.fillStyle = g;
    m.beginPath();
    m.arc(128, 128, 100, 0, Math.PI * 2);
    m.fill();
    m.fillStyle = 'rgba(214,196,140,0.45)';
    [[90, 160, 16], [70, 110, 10], [110, 200, 9], [60, 175, 7]].forEach(([x, y, r]) => {
      m.beginPath();
      m.arc(x, y, r, 0, Math.PI * 2);
      m.fill();
    });
    m.globalCompositeOperation = 'destination-out';
    m.beginPath();
    m.arc(128 + 52, 128 - 30, 90, 0, Math.PI * 2);
    m.fill();
    m.globalCompositeOperation = 'source-over';
    c._done = true;
    return c;
  }
  E.nightMoon = (ctx, x, y, r) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.2);
    g.addColorStop(0, 'rgba(255,246,210,0.22)');
    g.addColorStop(0.4, 'rgba(190,200,255,0.07)');
    g.addColorStop(1, 'rgba(190,200,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 4.2, y - r * 4.2, r * 8.4, r * 8.4);
    ctx.restore();
    // faint earthshine disc
    V.circle(ctx, x, y, r * 0.98, 'rgba(120,135,190,0.16)');
    ctx.drawImage(moonImage(), x - r * 1.28, y - r * 1.28, r * 2.56, r * 2.56);
  };

  // static part of the sky (gradient + milky way), rendered once, slightly oversized for parallax
  const SKY_PAD = 60;
  function skyBase() {
    const c = canvas('skyBase', V.W + SKY_PAD * 2, V.H + SKY_PAD * 2);
    if (c._done) return c;
    const x = c.getContext('2d');
    x.translate(SKY_PAD, SKY_PAD);
    const g = x.createLinearGradient(0, -SKY_PAD, 0, V.H + SKY_PAD);
    g.addColorStop(0, '#070b26');
    g.addColorStop(0.45, '#121b4a');
    g.addColorStop(0.75, '#22306a');
    g.addColorStop(1, '#3a3f7c');
    x.fillStyle = g;
    x.fillRect(-SKY_PAD, -SKY_PAD, V.W + SKY_PAD * 2, V.H + SKY_PAD * 2);
    // milky way haze (diagonal band)
    x.save();
    x.translate(980, 300);
    x.rotate(-0.38);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const bx = -900 + i * 300 + R(i * 3.3) * 120, by = (R(i * 5.1) - 0.5) * 60;
      const rr = 180 + R(i * 2.2) * 120;
      const hg = x.createRadialGradient(bx, by, 0, bx, by, rr);
      hg.addColorStop(0, 'rgba(140,150,230,0.10)');
      hg.addColorStop(1, 'rgba(140,150,230,0)');
      x.fillStyle = hg;
      x.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
    }
    x.restore();
    c._done = true;
    return c;
  }

  E.nightSky = (ctx, o = {}) => {
    const cam = normCam(o.cam);
    const t = o.t || 0;
    const off = toScreen(cam, 0, 0, 0.04);
    const ox = off[0], oy = off[1];
    // integer offsets keep this a fast blit (fractional ones go through the slow filtered path)
    ctx.drawImage(skyBase(), Math.round(V.clamp(ox, -SKY_PAD, SKY_PAD)) - SKY_PAD, Math.round(V.clamp(oy, -SKY_PAD, SKY_PAD)) - SKY_PAD);
    // stars rotating around a pole up-left
    const pole = [ox + 300, oy - 200];
    const spin = o.starSpin || 0;
    const cs = Math.cos(spin), sn = Math.sin(spin);
    const n = o.stars || 170;
    ctx.save();
    for (let i = 0; i < n; i++) {
      let sx = R(i * 3.17 + 1) * 2600 - 340, sy = R(i * 7.71 + 2) * 900 - 120;
      const dx = sx - 300, dy = sy + 200;
      sx = pole[0] + dx * cs - dy * sn;
      sy = pole[1] + dx * sn + dy * cs;
      if (sx < -10 || sx > V.W + 10 || sy < -10 || sy > V.H * 0.8) continue;
      const tw = 0.55 + 0.45 * Math.sin(t * (1.3 + R(i) * 2.4) + i * 1.7);
      const big = R(i * 1.91) > 0.93;
      const r = big ? 2.6 : 0.9 + R(i * 1.37) * 1.5;
      ctx.globalAlpha = (big ? 0.95 : 0.75) * tw * (1 - V.clamp((sy - V.H * 0.55) / (V.H * 0.25)));
      ctx.fillStyle = R(i * 4.4) > 0.8 ? '#ffe9c4' : '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      if (big) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 9 * tw, sy);
        ctx.lineTo(sx + 9 * tw, sy);
        ctx.moveTo(sx, sy - 9 * tw);
        ctx.lineTo(sx, sy + 9 * tw);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (o.moon !== false) {
      const [mx, my, mr] = o.moon || [330, 190, 46];
      E.nightMoon(ctx, mx, my, mr);
    }
  };

  // ---------------------------------------------------------------- rig helpers
  const num = (v, d = 0) => (typeof v === 'number' ? v : d);
  E.nightPoseMix = (a, b, k) => {
    k = V.clamp(k);
    const out = Object.assign({}, k < 0.5 ? a : b);
    ['rot', 'torso', 'head', 'brows', 'blush'].forEach((key) => (out[key] = V.lerp(num(a[key]), num(b[key]), k)));
    ['armNear', 'armFar'].forEach((l) => {
      out[l] = { sh: V.lerp(a[l].sh, b[l].sh, k), el: V.lerp(a[l].el, b[l].el, k) };
    });
    ['legNear', 'legFar'].forEach((l) => {
      out[l] = { hip: V.lerp(a[l].hip, b[l].hip, k), knee: V.lerp(a[l].knee, b[l].knee, k), foot: V.lerp(num(a[l].foot), num(b[l].foot), k) };
    });
    if (typeof a.facing === 'number' && typeof b.facing === 'number' && Math.sign(a.facing) === Math.sign(b.facing)) out.facing = V.lerp(a.facing, b.facing, k);
    return out;
  };

  // two-bone IK: returns {sh, el} so the hand lands on world point tgt (pose.rot must be 0)
  E.nightArmIK = (pose, x, hipY, s, side, tgt) => {
    const p = Object.assign(P.stand(), pose);
    const f = p.facing || 1;
    const lx = (tgt[0] - x) / (f * s), ly = (tgt[1] - hipY) / s;
    const tr = V.deg(p.torso || 0);
    const sx = Math.sin(tr) * (B.D.TORSO - 16) + (side === 'near' ? 4 : -6);
    const sy = -Math.cos(tr) * (B.D.TORSO - 16);
    const dx = lx - sx, dy = ly - sy;
    const UA = B.D.UA, FA = B.D.FA;
    const L = V.clamp(Math.hypot(dx, dy), Math.abs(UA - FA) + 2, UA + FA - 0.5);
    const ang = (Math.atan2(dx, dy) * 180) / Math.PI;
    const alpha = (Math.acos(V.clamp((UA * UA + L * L - FA * FA) / (2 * UA * L), -1, 1)) * 180) / Math.PI;
    const gamma = (Math.acos(V.clamp((UA * UA + FA * FA - L * L) / (2 * UA * FA), -1, 1)) * 180) / Math.PI;
    let ua = ang - alpha;
    // keep the angle continuous around the "straight up" seam
    while (ua - (p.torso || 0) < -200) ua += 360;
    while (ua - (p.torso || 0) > 200) ua -= 360;
    return { sh: ua - (p.torso || 0), el: 180 - gamma };
  };

  E.nightTurn = (t, t0, dur, from, to) => {
    if (from === to) return from;
    const k = V.ease.inOut(V.seg(t, t0, t0 + dur));
    let f = V.lerp(from, to, k);
    if (Math.abs(f) < 0.16) f = (k < 0.5 ? Math.sign(from) : Math.sign(to)) * 0.16;
    return f;
  };

  // hip x so that the mean ankle x of the pose sits at feetX
  E.nightHipForFeet = (pose, s, feetX) => {
    const p = Object.assign(P.stand(), pose);
    const j = B.fk(p);
    const f = p.facing || 1;
    return feetX - f * s * (j.legNear.a[0] + j.legFar.a[0]) / 2;
  };

  // Redraw the head on top of the near arm: in this side-view rig a raised near arm (high five,
  // big greeting) sweeps across the face. The figure is drawn again with the near arm hanging
  // down, clipped to an ellipse around the head, so the raised arm reads as passing BEHIND the
  // head/neck (3/4 view) and the face stays visible. Only for empty hands (a held prop near the
  // face would be hidden too) and rot = 0.
  function headOver(ctx, x, hip, s, pose) {
    const p = Object.assign(P.stand(), pose);
    if (p.rot) return;
    const j = B.joints(x, hip, s, p);
    const m = ctx.getTransform();
    ctx.save();
    ctx.translate(j.head[0], j.head[1]);
    ctx.scale((p.facing || 1) * s, s);
    ctx.rotate(V.deg((p.torso || 0) + (p.head || 0)));
    ctx.beginPath();
    ctx.ellipse(4, 0, 52, 50, 0, 0, Math.PI * 2);
    ctx.setTransform(m);
    ctx.clip();
    B.draw(ctx, x, hip, s, Object.assign({}, pose, { armNear: { sh: 0, el: 0 }, propNear: null }));
    ctx.restore();
  }

  E.nightPerson = (ctx, x, groundY, s, pose, o = {}) => {
    const lift = o.lift || 0;
    const hip = (o.hipY !== undefined ? o.hipY : B.standY(groundY, s, pose)) - lift;
    if (o.shadow !== false) V.groundShadow(ctx, x, groundY, 62 * s * (1 - V.clamp(lift / 300) * 0.4), 0.3 * (1 - V.clamp(lift / 260) * 0.5));
    if (o.alpha !== undefined && o.alpha < 1) {
      ctx.save();
      ctx.globalAlpha *= o.alpha;
      B.draw(ctx, x, hip, s, pose);
      ctx.restore();
    } else {
      B.draw(ctx, x, hip, s, pose);
      if (o.headOver) headOver(ctx, x, hip, s, pose);
    }
    return B.joints(x, hip, s, pose);
  };

  // ---------------------------------------------------------------- props
  E.skateboard = (ctx, x, y, s, o = {}) => {
    const th = (o.flip || 0) * Math.PI * 2;
    const cw = Math.cos(th), sw = Math.sin(th);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(o.rot || 0);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    const L = 200, half = L / 2;
    const wheelY = cw * 22;
    const wheels = () => {
      if (Math.abs(cw) < 0.05) return;
      for (const wx of [-62, 62]) {
        V.fillRound(ctx, wx - 16, Math.min(0, wheelY) + (cw > 0 ? 4 : -4), 32, Math.abs(wheelY) - 2, 4, '#9aa1ad', INK, 3);
        V.circle(ctx, wx - 13, wheelY, 11, '#f6c945', INK, 3);
        V.circle(ctx, wx + 13, wheelY, 11, '#f6c945', INK, 3);
      }
    };
    if (cw >= 0) wheels();
    // deck: thickness + visible face (top griptape / bottom graphic) when it rolls
    const face = Math.abs(sw) * 40;
    const hh = 12 + face;
    ctx.beginPath();
    ctx.moveTo(-half + 18, -hh / 2);
    ctx.lineTo(half - 18, -hh / 2);
    ctx.quadraticCurveTo(half + 6, -hh / 2 - 12, half + 2, -hh / 2 - 2);
    ctx.quadraticCurveTo(half + 4, hh / 2, half - 18, hh / 2);
    ctx.lineTo(-half + 18, hh / 2);
    ctx.quadraticCurveTo(-half - 4, hh / 2, -half - 2, -hh / 2 - 2);
    ctx.quadraticCurveTo(-half - 6, -hh / 2 - 12, -half + 18, -hh / 2);
    ctx.closePath();
    const bottom = sw > 0;
    ctx.fillStyle = face < 3 ? '#e2463c' : bottom ? '#2fb3a3' : '#24242c';
    ctx.fill();
    if (face >= 3 && bottom) {
      ctx.save();
      ctx.clip();
      for (let i = -3; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#f6c945' : '#e2463c';
        ctx.fillRect(i * 34 - 8, -hh, 16, hh * 2);
      }
      ctx.restore();
    } else if (face < 3) {
      ctx.fillStyle = '#24242c';
      ctx.fillRect(-half + 10, -hh / 2, L - 20, 4);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    if (cw < 0) wheels();
    ctx.restore();
  };

  E.basketball = (ctx, x, y, r, spin = 0) => {
    ctx.save();
    ctx.translate(x, y);
    V.circle(ctx, 0, 0, r, '#e8762d', INK, Math.max(2, r * 0.12));
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = '#3a1d10';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    // equator + one meridian that rotates with the spin
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    const k = Math.cos(spin), k2 = Math.cos(spin + Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(k) * r, r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.abs(k2) * r * 0.55 + r * 0.05, r, 0, -Math.PI / 2, Math.PI / 2, k2 < 0);
    ctx.stroke();
    ctx.restore();
    V.ellipse(ctx, -r * 0.35, -r * 0.4, r * 0.28, r * 0.16, 'rgba(255,255,255,0.35)', -0.6);
    ctx.restore();
  };

  // pizza slice: (x,y) = crust centre (where it is held), tip toward angle ang
  E.pizzaSlice = (ctx, x, y, s, ang, bite = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    const tipX = 92;
    const cut = tipX * (1 - V.clamp(bite) * 0.82);
    const wAt = (px) => 30 * (1 - px / tipX);
    // cheese body (clipped by the bite)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-20, -40, cut + 20, 80);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(6, -30);
    ctx.lineTo(tipX, 0);
    ctx.lineTo(6, 30);
    ctx.closePath();
    ctx.fillStyle = '#ffd45c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    // sauce rim + pepperoni
    ctx.fillStyle = '#e0563a';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(6, -28, 7, 56);
    ctx.globalAlpha = 1;
    [[30, -10, 7], [52, 7, 6], [26, 14, 6], [70, -2, 5]].forEach(([px, py, r]) => {
      if (px < cut - 4) V.circle(ctx, px, py, r, '#c23a2e', INK, 2);
    });
    ctx.restore();
    if (bite > 0.02) {
      // bite marks
      const w = wAt(cut);
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) {
        const yy = -w + (2 * w * i) / 3;
        ctx.moveTo(cut, yy);
        ctx.arc(cut + 1, yy + w / 3, w / 3, -Math.PI / 2, Math.PI / 2, true);
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // crust
    V.fillRound(ctx, -8, -34, 18, 68, 9, '#d9944a', INK, 3.4);
    V.line(ctx, -2, -22, -2, 22, '#efb46a', 3);
    ctx.restore();
  };

  // open pizza box: (x,y) = front-bottom centre on a surface; slices 0..8
  E.pizzaBox = (ctx, x, y, s, slices) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    // lid leaning back
    ctx.beginPath();
    ctx.moveTo(-74, -22);
    ctx.lineTo(-64, -104);
    ctx.lineTo(70, -104);
    ctx.lineTo(80, -22);
    ctx.closePath();
    ctx.fillStyle = '#e9d2a6';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    V.circle(ctx, 8, -64, 20, '#d23c33');
    V.text(ctx, 'פיצה', 8, -64, { size: 14, weight: 800, color: '#fff' });
    // tray (seen from slightly above)
    ctx.beginPath();
    ctx.moveTo(-84, -22);
    ctx.lineTo(84, -22);
    ctx.lineTo(90, 0);
    ctx.lineTo(-90, 0);
    ctx.closePath();
    ctx.fillStyle = '#d8bd8c';
    ctx.fill();
    ctx.stroke();
    // pizza (ellipse, 8 wedges)
    const n = Math.max(0, Math.min(8, slices));
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.ellipse(0, -11, 70, 10, 0, a0, a1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(190,150,90,0.35)';
      ctx.fill();
      if (i < Math.ceil(n)) {
        ctx.globalAlpha = V.clamp(n - i);
        ctx.fillStyle = i % 2 ? '#ffd45c' : '#ffcd4a';
        ctx.fill();
        ctx.strokeStyle = '#d9944a';
        ctx.lineWidth = 2;
        ctx.stroke();
        const am = (a0 + a1) / 2;
        V.circle(ctx, Math.cos(am) * 40, -11 + Math.sin(am) * 5.5, 4, '#c23a2e');
        ctx.globalAlpha = 1;
      }
    }
    // front wall of the tray
    V.fillRound(ctx, -90, -4, 180, 10, 3, '#cfb27e', INK, 3);
    ctx.restore();
  };

  // phone held up with the screen toward the camera (x,y = centre)
  E.nightPhone = (ctx, x, y, s, time, o = {}) => {
    const pop = o.pop === undefined ? 1 : o.pop;
    if (pop <= 0.001) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.rotate(o.rot || 0);
    V.fillRound(ctx, -116 * s, -226 * s, 232 * s, 452 * s, 38 * s, INK);
    V.phone(ctx, 0, 0, s, time, { label: o.label, top: '#2c3a8e', bottom: '#b0478f' });
    ctx.restore();
  };

  // ============================================================================================
  //  CORNER SET
  // ============================================================================================
  const C = NIGHT.corner;

  function farSkyline(ctx, cam, t, lit) {
    ctx.save();
    camApply(ctx, cam, 0.38);
    // distant blocks
    let x = -900;
    let i = 0;
    while (x < 2800) {
      const w = 140 + R(i * 3.7) * 170;
      const h = 150 + R(i * 5.3) * 230;
      const top = 760 - h;
      ctx.fillStyle = i % 3 === 0 ? '#151d47' : i % 3 === 1 ? '#18224f' : '#131a40';
      ctx.fillRect(x, top, w - 10, h + 200);
      // roof bits: solar water heaters + antennas
      if (R(i * 9.1) > 0.35) {
        ctx.fillStyle = '#10163a';
        ctx.fillRect(x + 20, top - 18, 34, 18);
        ctx.fillRect(x + 60, top - 26, 14, 26);
      }
      if (R(i * 2.9) > 0.5) {
        ctx.strokeStyle = '#10163a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + w - 40, top);
        ctx.lineTo(x + w - 40, top - 40);
        ctx.moveTo(x + w - 52, top - 30);
        ctx.lineTo(x + w - 28, top - 30);
        ctx.stroke();
      }
      // windows
      const cols = Math.floor((w - 30) / 34), rows = Math.floor(h / 44);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const sd = i * 131 + r * 17 + c * 7;
          const on = R(sd) < 0.32 * lit;
          const wx = x + 14 + c * 34, wy = top + 18 + r * 44;
          if (on) {
            const tv = R(sd * 1.7) > 0.82;
            ctx.fillStyle = tv ? `rgba(150,180,255,${0.55 + 0.25 * Math.sin(t * 9 + sd)})` : 'rgba(255,206,120,0.85)';
          } else ctx.fillStyle = 'rgba(40,52,100,0.55)';
          ctx.fillRect(wx, wy, 16, 20);
        }
      }
      x += w;
      i++;
    }
    ctx.restore();
  }

  function midTrees(ctx, cam) {
    ctx.save();
    camApply(ctx, cam, 0.72);
    ctx.fillStyle = '#0f1934';
    const blobs = [];
    for (let i = 0; i < 16; i++) {
      const bx = -500 + i * 190 + R(i * 4.4) * 80;
      const by = 640 - R(i * 2.2) * 120;
      blobs.push([bx, by, 90 + R(i * 7.7) * 60]);
    }
    ctx.beginPath();
    blobs.forEach(([bx, by, r]) => {
      ctx.moveTo(bx + r, by);
      ctx.arc(bx, by, r, 0, Math.PI * 2);
    });
    ctx.rect(-800, 640, 3600, 300);
    ctx.fill();
    ctx.fillStyle = '#132042';
    ctx.beginPath();
    blobs.forEach(([bx, by, r], i) => {
      if (i % 2) return;
      ctx.moveTo(bx - r * 0.2 + r * 0.6, by + 20);
      ctx.arc(bx - r * 0.2, by + 20, r * 0.6, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.restore();
  }

  let chainPat = null;
  function chainPattern(c) {
    if (chainPat) return chainPat;
    const st = 22;
    const tile = canvas('chain', st * 2, st * 2);
    const x = tile.getContext('2d');
    x.strokeStyle = 'rgba(170,178,192,0.55)';
    x.lineWidth = 1.6;
    x.beginPath();
    for (let k = -2; k <= 2; k++) {
      x.moveTo(k * st * 2 - st * 2, 0);
      x.lineTo(k * st * 2 + st * 2, st * 4);
      x.moveTo(k * st * 2 + st * 2, 0);
      x.lineTo(k * st * 2 - st * 2, st * 4);
    }
    x.stroke();
    chainPat = c.createPattern(tile, 'repeat');
    return chainPat;
  }

  // the near set in WORLD coords, day-ish colours (darkened by the mask)
  function cornerSet(c, o) {
    const t = o.t || 0;
    // --- court behind the fence
    c.fillStyle = '#3b6f86';
    c.fillRect(C.fence.x0, 742, C.fence.x1 - C.fence.x0, 100);
    c.fillStyle = '#2f5f74';
    c.fillRect(C.fence.x0, 742, C.fence.x1 - C.fence.x0, 10);
    V.line(c, C.fence.x0, 800, C.fence.x1, 800, 'rgba(255,255,255,0.7)', 4);
    c.beginPath();
    c.ellipse(C.hoopX + 40, 800, 160, 22, 0, Math.PI, 0);
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = 4;
    c.stroke();
    // hoop
    const hx = C.hoopX;
    V.fillRound(c, hx - 8, 520, 16, 300, 6, '#5a6070', INK, 3);
    V.fillRound(c, hx - 4, 520, 70, 12, 5, '#5a6070', INK, 3);
    V.fillRound(c, hx + 40, 470, 80, 90, 6, '#f4f4f4', INK, 3.5);
    c.strokeStyle = '#e2463c';
    c.lineWidth = 4;
    c.strokeRect(hx + 64, 506, 32, 26);
    V.line(c, hx + 66, 548, hx + 112, 548, '#e2463c', 5);
    // net
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 4; i++) {
      c.moveTo(hx + 66 + i * 11.5, 550);
      c.lineTo(hx + 74 + i * 7.5, 590);
    }
    c.moveTo(hx + 70, 566);
    c.lineTo(hx + 108, 566);
    c.moveTo(hx + 73, 582);
    c.lineTo(hx + 105, 582);
    c.stroke();
    // floodlight pole
    V.fillRound(c, C.floodX - 7, 380, 14, 460, 5, '#4a5060', INK, 3);
    V.fillRound(c, C.floodX - 30, 366, 60, 26, 6, '#3a3f4a', INK, 3);
    // --- fence (posts + chain link)
    const fx0 = C.fence.x0, fx1 = C.fence.x1, ft = C.fence.top, fb = 840;
    // chain link: a repeating diamond tile (cheap pattern fill instead of hundreds of strokes)
    c.save();
    c.translate(fx0, ft);
    c.fillStyle = chainPattern(c);
    c.fillRect(0, 0, fx1 - fx0, fb - ft);
    c.restore();
    V.fillRound(c, fx0, ft - 6, fx1 - fx0, 10, 4, '#7d8494', INK, 2.5);
    for (let x = fx0; x <= fx1 + 1; x += (fx1 - fx0) / 6) V.fillRound(c, x - 6, ft - 14, 12, fb - ft + 14, 5, '#7d8494', INK, 3);
    // --- left: stone garden wall + ficus + hedge
    // ficus behind the wall
    V.fillRound(c, -150, 380, 40, 400, 14, '#6b4a33', INK, 3);
    V.line(c, -130, 470, -60, 400, '#6b4a33', 16);
    c.fillStyle = '#3f7a4a';
    c.beginPath();
    [[-210, 380, 120], [-90, 330, 130], [10, 400, 100], [-160, 270, 100], [-40, 250, 90]].forEach(([x, y, r]) => {
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
    });
    c.fill();
    c.fillStyle = '#4b8c55';
    c.beginPath();
    [[-120, 300, 70], [-20, 330, 60], [-190, 350, 60]].forEach(([x, y, r]) => {
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
    });
    c.fill();
    // wall
    c.fillStyle = '#d8c6a2';
    c.fillRect(-900, 742, C.wallX + 900, 100);
    c.strokeStyle = 'rgba(120,96,64,0.55)';
    c.lineWidth = 2.5;
    c.beginPath();
    for (let r = 0; r < 3; r++) {
      const y = 742 + r * 33;
      c.moveTo(-900, y);
      c.lineTo(C.wallX, y);
      for (let x = -900 + (r % 2) * 40; x < C.wallX; x += 80) {
        c.moveTo(x, y);
        c.lineTo(x, y + 33);
      }
    }
    c.stroke();
    V.fillRound(c, -900, 730, C.wallX + 912, 16, 4, '#e7d8b8', INK, 3);
    // hedge + bougainvillea on top
    c.fillStyle = '#3f7d46';
    c.beginPath();
    for (let x = -880; x < C.wallX - 10; x += 46) {
      const r = 34 + R(x) * 14;
      c.moveTo(x + r, 712);
      c.arc(x, 712, r, 0, Math.PI * 2);
    }
    c.fill();
    for (let i = 0; i < 40; i++) {
      const x = -860 + R(i * 3.3) * (C.wallX + 840), y = 690 + R(i * 6.1) * 40;
      V.circle(c, x, y, 6 + R(i) * 4, i % 3 ? '#e0559a' : '#f07ab8');
    }
    // --- corner building (stone, 3 floors visible)
    const bx = C.building.x0;
    c.fillStyle = '#e4d3b2';
    c.fillRect(bx, -300, 1300, 1142);
    // rounded corner shading strip
    const cg = c.createLinearGradient(bx, 0, bx + 50, 0);
    cg.addColorStop(0, 'rgba(60,40,30,0.35)');
    cg.addColorStop(1, 'rgba(60,40,30,0)');
    c.fillStyle = cg;
    c.fillRect(bx, -300, 50, 1142);
    // stone courses
    c.strokeStyle = 'rgba(140,110,70,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    for (let y = -280; y < 840; y += 46) {
      c.moveTo(bx, y);
      c.lineTo(bx + 1300, y);
    }
    c.stroke();
    // floor slab lines
    [610, 220].forEach((y) => V.fillRound(c, bx - 6, y, 1312, 18, 4, '#cdbb98', INK, 2.5));
    // lobby entrance (door glass drawn as emissive later)
    const [d0, d1] = C.building.door;
    V.fillRound(c, d0 - 18, 630, d1 - d0 + 36, 212, 6, '#8a7a62', INK, 3);
    V.fillRound(c, d0 - 30, 618, d1 - d0 + 60, 18, 4, '#cdbb98', INK, 3);
    // building number plaque
    V.fillRound(c, d1 + 34, 660, 46, 34, 6, '#2d5aa8', '#ffffff', 3);
    V.text(c, '8', d1 + 57, 678, { size: 24, weight: 800, color: '#fff' });
    // mailboxes / intercom
    V.fillRound(c, d1 + 40, 720, 30, 46, 4, '#9aa0aa', INK, 2.5);
    // upper windows (frames; glass emissive later) + balconies
    WIN.forEach((w) => {
      V.fillRound(c, w[0] - 10, w[1] - 10, w[2] + 20, w[3] + 20, 6, '#c9b690', INK, 3);
      V.fillRound(c, w[0], w[1], w[2], w[3], 4, '#2a3150');
    });
    // balcony rails on the 2nd floor
    [[1640, 470, 260]].forEach(([x, y, w]) => {
      V.fillRound(c, x - 10, y + 108, w + 20, 14, 4, '#cdbb98', INK, 3);
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.beginPath();
      for (let k = 0; k <= w; k += 26) {
        c.moveTo(x + k, y + 40);
        c.lineTo(x + k, y + 108);
      }
      c.moveTo(x, y + 40);
      c.lineTo(x + w, y + 40);
      c.stroke();
      // plants
      [[x + 30, '#4f9e44'], [x + 220, '#5aa35a']].forEach(([px, col]) => {
        V.fillRound(c, px - 16, y + 80, 32, 28, 5, '#c86b4f', INK, 2.5);
        V.circle(c, px, y + 64, 26, col, INK, 2.5);
      });
    });
    // --- sidewalk + curb + road
    c.fillStyle = '#a7a196';
    c.fillRect(-900, 836, 3800, 96);
    c.strokeStyle = 'rgba(80,74,66,0.45)';
    c.lineWidth = 2;
    c.beginPath();
    [866, 898].forEach((y) => {
      c.moveTo(-900, y);
      c.lineTo(2900, y);
    });
    for (let x = -900; x < 2900; x += 64) {
      c.moveTo(x, 836);
      c.lineTo(x - 10, 930);
    }
    c.stroke();
    for (let x = -900, i = 0; x < 2900; x += 72, i++) c.fillStyle = i % 2 ? '#f2f0ea' : '#d6463c', c.fillRect(x, 930, 72, 22);
    V.line(c, -900, 930, 2900, 930, 'rgba(0,0,0,0.35)', 2);
    c.fillStyle = '#4c515c';
    c.fillRect(-900, 952, 3800, 400);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(-900, 952, 3800, 10);
    for (let x = -880; x < 2900; x += 220) V.fillRound(c, x, 1046, 110, 10, 4, '#e8e4d8');
    // --- street lamp (pole + curved arm), sign
    const L = C.lamp;
    V.fillRound(c, L.x - 20, L.base - 34, 40, 36, 8, '#3a3f4a', INK, 3);
    V.fillRound(c, L.x - 9, L.headY - 20, 18, L.base - L.headY + 10, 6, '#454b58', INK, 3);
    c.beginPath();
    c.moveTo(L.x, L.headY - 10);
    c.quadraticCurveTo(L.x - 10, L.headY - 60, L.headX + 40, L.headY - 46);
    c.lineTo(L.headX + 6, L.headY - 30);
    c.strokeStyle = INK;
    c.lineWidth = 15;
    c.stroke();
    c.strokeStyle = '#454b58';
    c.lineWidth = 9;
    c.stroke();
    // lantern housing
    c.beginPath();
    c.moveTo(L.headX - 40, L.headY - 8);
    c.quadraticCurveTo(L.headX, L.headY - 52, L.headX + 40, L.headY - 8);
    c.closePath();
    c.fillStyle = '#2f343e';
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 3.5;
    c.stroke();
    // street name sign on the pole
    V.fillRound(c, L.x + 6, 560, 150, 50, 6, '#f6f4ee', INK, 3);
    V.fillRound(c, L.x + 12, 566, 138, 38, 4, null, '#2459b6', 3);
    V.text(c, 'רחוב הדקל', L.x + 81, 586, { size: 25, weight: 700, color: '#2459b6' });
  }
  const WIN = [
    [1430, 410, 120, 150], [1640, 400, 110, 140], [1800, 400, 110, 140], [2000, 410, 120, 150],
    [1430, 20, 120, 150], [1640, 20, 110, 140], [1800, 20, 110, 140], [2000, 20, 120, 150],
  ];

  // emissive bits of the corner set (drawn after the darkened set, before actors)
  function cornerEmissive(c, o) {
    const t = o.t || 0;
    const win = o.windows === undefined ? 1 : o.windows;
    const lamp = o.lamp === undefined ? 1 : o.lamp;
    WIN.forEach((w, i) => {
      const on = (i === 0 || i === 2 || i === 5 || i === 7 ? 1 : 0) * win;
      if (on <= 0) return;
      const g = c.createLinearGradient(0, w[1], 0, w[1] + w[3]);
      g.addColorStop(0, i === 5 ? '#9fb8ff' : '#ffe2a2');
      g.addColorStop(1, i === 5 ? '#6f86d8' : '#f6b860');
      c.globalAlpha = on * (i === 5 ? 0.75 + 0.2 * Math.sin(t * 7) : 1);
      V.fillRound(c, w[0], w[1], w[2], w[3], 4, g);
      // half-lowered roller shutter + a curtain
      c.globalAlpha = on;
      c.fillStyle = '#7a6e5c';
      c.fillRect(w[0], w[1], w[2], w[3] * 0.32);
      c.strokeStyle = 'rgba(0,0,0,0.3)';
      c.lineWidth = 2;
      c.beginPath();
      for (let y = w[1] + 6; y < w[1] + w[3] * 0.32; y += 7) {
        c.moveTo(w[0], y);
        c.lineTo(w[0] + w[2], y);
      }
      c.stroke();
      if (i !== 5) {
        c.fillStyle = 'rgba(214,120,90,0.55)';
        c.fillRect(w[0] + w[2] - 30, w[1] + w[3] * 0.32, 30, w[3] * 0.68);
      }
      c.globalAlpha = 1;
    });
    // lobby door glass
    const [d0, d1] = C.building.door;
    const g = c.createLinearGradient(0, 640, 0, 842);
    g.addColorStop(0, '#fff0c4');
    g.addColorStop(1, '#f2c06e');
    V.fillRound(c, d0, 646, d1 - d0, 196, 4, g);
    V.line(c, (d0 + d1) / 2, 646, (d0 + d1) / 2, 842, '#8a7a62', 6);
    V.fillRound(c, d0 + 30, 734, 10, 26, 4, '#8a7a62');
    V.fillRound(c, d1 - 40, 734, 10, 26, 4, '#8a7a62');
    // lamp bulb + court flood lamp face
    const L = C.lamp;
    if (lamp > 0) {
      c.globalAlpha = lamp;
      V.ellipse(c, L.headX, L.headY - 6, 30, 9, '#fff3cf');
      c.globalAlpha = 1;
    }
    const court = o.court === undefined ? 1 : o.court;
    if (court > 0) {
      c.globalAlpha = court;
      V.fillRound(c, C.floodX - 24, 386, 48, 8, 3, '#f4f8ff');
      c.globalAlpha = 1;
    }
  }

  function cornerLights(o) {
    const lamp = o.lamp === undefined ? 1 : o.lamp;
    const court = o.court === undefined ? 1 : o.court;
    const win = o.windows === undefined ? 1 : o.windows;
    const L = C.lamp;
    const ls = [
      { x: C.pool[0], y: C.pool[1] - 120, r: 560, a: 0.9 * lamp, tint: 0.2 },
      { x: L.headX, y: L.headY + 60, r: 300, a: 0.6 * lamp, tint: 0.12 },
      { x: (C.building.door[0] + C.building.door[1]) / 2, y: 760, r: 280, a: 0.55 * win, tint: 0.14 },
      { x: C.hoopX, y: 700, r: 420, a: 0.36 * court, tint: 0.05, color: '#cfe0ff' },
      { x: 1500, y: 470, r: 200, a: 0.3 * win, tint: 0.1 },
      { x: 1860, y: 470, r: 200, a: 0.3 * win, tint: 0.1 },
    ];
    return ls.concat(o.lights || []);
  }

  function cornerGlow(c, o) {
    const t = o.t || 0;
    const lamp = o.lamp === undefined ? 1 : o.lamp;
    const court = o.court === undefined ? 1 : o.court;
    const L = C.lamp;
    c.save();
    c.globalCompositeOperation = 'lighter';
    if (lamp > 0) {
      // volumetric cone
      const g = c.createLinearGradient(0, L.headY, 0, C.GY + 20);
      g.addColorStop(0, `rgba(255,214,140,${0.3 * lamp})`);
      g.addColorStop(1, `rgba(255,214,140,${0.04 * lamp})`);
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(L.headX - 30, L.headY);
      c.lineTo(L.headX + 30, L.headY);
      c.lineTo(L.headX + 300, C.GY + 30);
      c.lineTo(L.headX - 300, C.GY + 30);
      c.closePath();
      c.fill();
      glowDot(c, L.headX, L.headY, 190, '#ffd88a', 0.55 * lamp);
      glowDot(c, C.pool[0], C.GY, 360, '#ffc070', 0.16 * lamp);
      // moths circling the lamp
      for (let i = 0; i < 4; i++) {
        const a = t * (3 + i * 0.7) + i * 1.9;
        const mx = L.headX + Math.cos(a) * (36 + i * 9), my = L.headY + 14 + Math.sin(a * 1.3) * (14 + i * 5);
        V.circle(c, mx, my, 2.6, `rgba(255,240,200,${0.85 * lamp})`);
      }
    }
    if (court > 0) {
      const g = c.createLinearGradient(0, 390, 0, 840);
      g.addColorStop(0, `rgba(210,225,255,${0.18 * court})`);
      g.addColorStop(1, 'rgba(210,225,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(C.floodX - 24, 392);
      c.lineTo(C.floodX + 24, 392);
      c.lineTo(C.floodX + 560, 840);
      c.lineTo(C.floodX + 60, 840);
      c.closePath();
      c.fill();
      glowDot(c, C.floodX, 390, 90, '#e8f0ff', 0.5 * court);
    }
    const [d0, d1] = C.building.door;
    glowDot(c, (d0 + d1) / 2, 760, 220, '#ffcf80', 0.22);
    c.restore();
  }

  E.nightCorner = (ctx, o = {}) => {
    const cam = normCam(o.cam);
    const t = o.t || 0;
    prof(ctx);
    E.nightSky(ctx, { cam, t, moon: o.moon, starSpin: o.starSpin });
    prof(ctx, 'sky');
    farSkyline(ctx, cam, t, o.windows === undefined ? 1 : o.windows);
    midTrees(ctx, cam);
    prof(ctx, 'far');
    const mask = buildMask(cam, cornerLights(o), o);
    prof(ctx, 'mask');
    litPass(ctx, cam, mask, (c) => cornerSet(c, o));
    prof(ctx, 'setPass');
    ctx.save();
    camApply(ctx, cam);
    cornerEmissive(ctx, o);
    ctx.restore();
    prof(ctx, 'emissive');
    if (o.actors || o.front) {
      litPass(ctx, cam, mask, (c) => {
        if (o.actors) o.actors(c);
        if (o.front) o.front(c);
      });
    }
    prof(ctx, 'actorPass');
    ctx.save();
    camApply(ctx, cam);
    cornerGlow(ctx, o);
    if (o.glow) o.glow(ctx);
    ctx.restore();
    if (o.overlay) o.overlay(ctx);
    prof(ctx, 'glow');
  };

  // ============================================================================================
  //  PLAZA (PROMENADE) SET
  // ============================================================================================
  const PZ = NIGHT.plaza;
  const BULB_COLORS = ['#ffd36b', '#ff9f5a', '#ff7aa2', '#86e0c8', '#fff0b0'];
  const LAMP_X = 210;

  // string-light cables: [x0, y0, x1, y1, sag]
  const CABLES = [
    [PZ.poles[0], PZ.poleTop, PZ.poles[1], PZ.poleTop, 110],
    [PZ.poles[1], PZ.poleTop, PZ.poles[2], PZ.poleTop + 20, 100],
  ];
  const BULBS = (() => {
    const out = [];
    CABLES.forEach(([x0, y0, x1, y1, sag], ci) => {
      const n = Math.round((x1 - x0) / 52);
      for (let i = 1; i < n; i++) {
        const k = i / n;
        out.push({ x: V.lerp(x0, x1, k), y: V.lerp(y0, y1, k) + sag * 4 * k * (1 - k) + 12, c: BULB_COLORS[(i + ci * 2) % BULB_COLORS.length], ci });
      }
    });
    // switch-off order: pseudo random but deterministic
    const order = out.map((b, i) => [R(i * 12.9 + 4), i]).sort((a, b) => a[0] - b[0]);
    order.forEach(([, i], r) => (out[i].off = 0.1 + (0.78 * r) / (out.length - 1)));
    return out;
  })();
  NIGHT.plaza.bulbs = BULBS;

  const plazaDefaults = (o) => {
    const k = o.k || 0;
    const d = {
      k,
      neon: o.neon !== undefined ? o.neon : neonFlicker(k, o.t || 0),
      kiosk: o.kiosk !== undefined ? o.kiosk : 1 - V.seg(k, 0.75, 0.79),
      menu: o.menu !== undefined ? o.menu : 1 - V.seg(k, 0.5, 0.52),
      shutter: o.shutter !== undefined ? o.shutter : V.ease.inOut(V.seg(k, 0.6, 0.74)),
      bulbs: o.bulbs || ((i) => bulbState(BULBS[i], k, o.t || 0)),
      tau: o.tau !== undefined ? o.tau : o.t || 0,
      ff: o.ff || 0,
      crowd: o.crowd !== false,
      lampsOn: o.lampsOn === undefined ? 1 : o.lampsOn,
    };
    d.owner = o.owner !== undefined ? o.owner : d.shutter < 0.98;
    return d;
  };
  function bulbState(b, k, t) {
    const d = k - b.off;
    if (d < -0.03) return 1;
    if (d > 0.02) return 0;
    // quick flicker before going out
    return Math.sin(t * 60 + b.x) > 0 ? 0.9 : 0.2;
  }
  function neonFlicker(k, t) {
    if (k < 0.9) return 1;
    if (k > 0.97) return 0;
    const f = Math.sin(t * 47) + Math.sin(t * 31.7);
    return f > 0.4 ? 1 : 0.15;
  }

  function plazaFar(ctx, cam, d) {
    const t = d.tau;
    // distant coastline city on the horizon (left) + a lighthouse/breakwater light (right)
    ctx.save();
    camApply(ctx, cam, 0.2);
    const hz = PZ.horizon;
    ctx.fillStyle = '#141b45';
    ctx.beginPath();
    ctx.moveTo(-400, hz);
    let x = -400;
    let i = 0;
    const towers = [];
    while (x < 760) {
      const w = 26 + R(i * 2.1) * 44;
      const h = 10 + R(i * 3.9) * (x < 300 ? 70 : 34);
      ctx.lineTo(x, hz - h);
      ctx.lineTo(x + w, hz - h);
      towers.push([x, w, h, i]);
      x += w;
      i++;
    }
    ctx.lineTo(x + 60, hz);
    ctx.closePath();
    ctx.fill();
    // city lights (fewer later at night)
    towers.forEach(([tx, w, h, j]) => {
      for (let q = 0; q < 6; q++) {
        const sd = j * 19 + q;
        if (R(sd) > 0.75 - 0.4 * d.k) continue;
        const lx = tx + 4 + R(sd * 1.3) * (w - 8), ly = hz - 4 - R(sd * 2.7) * (h - 6);
        ctx.fillStyle = R(sd * 5.5) > 0.7 ? '#ffffff' : '#ffcf7a';
        ctx.fillRect(lx, ly, 3, 3);
      }
    });
    // red aviation light on the tallest tower
    const tall = towers.reduce((a, b) => (b[2] > a[2] ? b : a));
    if (Math.sin(t * 4) > 0) V.circle(ctx, tall[0] + tall[1] / 2, hz - tall[2] - 4, 3.5, '#ff4a3a');
    // breakwater + blinking green light on the right
    ctx.fillStyle = '#121838';
    ctx.fillRect(1500, hz - 6, 420, 8);
    V.fillRound(ctx, 1830, hz - 46, 14, 42, 3, '#1a2048');
    const bl = Math.sin(t * 3.1) > 0.2 ? 1 : 0;
    if (bl) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glowDot(ctx, 1837, hz - 50, 26, '#7dffb0', 0.8);
      ctx.restore();
    }
    ctx.restore();
  }

  function sea(ctx, cam, d, moonScreen) {
    ctx.save();
    camApply(ctx, cam, 0.5);
    const top = PZ.horizon, bot = PZ.seaY + 60;
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#1c2558');
    g.addColorStop(1, '#0b1233');
    ctx.fillStyle = g;
    ctx.fillRect(-1200, top, 4400, bot - top);
    // wave lines
    const t = d.tau;
    ctx.strokeStyle = 'rgba(120,140,220,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 0; r < 9; r++) {
      const y = top + 8 + r * r * 2.2 + r * 6;
      for (let q = 0; q < 14; q++) {
        const x = -600 + ((q * 260 + r * 97 + t * (14 + r * 3)) % 3400);
        const w = 40 + r * 12;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
      }
    }
    ctx.stroke();
    ctx.restore();
    // moon reflection column (screen space under the moon)
    if (moonScreen) {
      const [mx] = moonScreen;
      const yTop = toScreen(cam, 0, top, 0.5)[1];
      const yBot = toScreen(cam, 0, PZ.seaY + 10, 0.5)[1];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 16; r++) {
        const k = r / 15;
        const y = V.lerp(yTop + 3, yBot, k * k * 0.6 + k * 0.4);
        const w = (14 + k * 60) * (0.6 + 0.4 * Math.sin(t * 3 + r * 1.7));
        const xo = Math.sin(t * 2.3 + r * 2.1) * 8 * k;
        ctx.fillStyle = `rgba(255,244,205,${0.5 - 0.3 * k})`;
        ctx.fillRect(mx - w / 2 + xo, y, w, 2.5 + k * 2);
      }
      ctx.restore();
    }
  }

  function palm(c, x, base, h, lean, t) {
    // trunk (curved, segmented)
    const topX = x + lean, topY = base - h;
    c.save();
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, base);
    c.quadraticCurveTo(x + lean * 0.1, base - h * 0.5, topX, topY);
    c.strokeStyle = INK;
    c.lineWidth = 30;
    c.stroke();
    c.strokeStyle = '#8a6a48';
    c.lineWidth = 23;
    c.stroke();
    c.strokeStyle = 'rgba(80,56,36,0.6)';
    c.lineWidth = 3;
    for (let i = 1; i < 14; i++) {
      const k = i / 14;
      const px = V.lerp(x, topX, k) + lean * 0.1 * 4 * k * (1 - k) * 0.5, py = V.lerp(base, topY, k);
      c.beginPath();
      c.moveTo(px - 11, py);
      c.lineTo(px + 11, py - 4);
      c.stroke();
    }
    // fronds
    const sway = Math.sin(t * 0.9 + x) * 0.04;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.42 + sway;
      const len = 150 + (i % 2) * 30;
      const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.6 + 70 * Math.abs(Math.cos(a));
      const mx = topX + Math.cos(a) * len * 0.5, my = topY + Math.sin(a) * len * 0.5 - 30;
      c.beginPath();
      c.moveTo(topX, topY);
      c.quadraticCurveTo(mx, my - 18, ex, ey);
      c.quadraticCurveTo(mx + 8, my + 16, topX, topY + 6);
      c.fillStyle = i % 2 ? '#3f8a52' : '#4f9e5e';
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 3;
      c.stroke();
    }
    V.circle(c, topX, topY + 8, 14, '#6b4a2f', INK, 3);
    c.restore();
  }

  function bench(c, x0, x1, seatY, feetY, slatOnly) {
    // backrest posts + slats
    const legs = [x0 + 40, (x0 + x1) / 2, x1 - 40];
    if (!slatOnly) {
      legs.forEach((lx) => {
        V.fillRound(c, lx - 7, seatY - 112, 14, 112, 5, '#2f3440', INK, 3);
      });
      [seatY - 104, seatY - 74].forEach((y) => V.fillRound(c, x0, y, x1 - x0, 22, 6, '#b77a4a', INK, 3));
    }
    // seat
    V.fillRound(c, x0 - 10, seatY - 4, x1 - x0 + 20, 22, 6, '#c4875a', INK, 3);
    V.line(c, x0 - 2, seatY + 5, x1 + 2, seatY + 5, 'rgba(90,50,26,0.5)', 2);
    // legs to the floor
    legs.forEach((lx) => {
      V.fillRound(c, lx - 8, seatY + 14, 16, feetY - seatY - 14, 5, '#2f3440', INK, 3);
      V.fillRound(c, lx - 18, feetY - 8, 36, 10, 4, '#2f3440', INK, 2.5);
    });
  }
  E.nightBench = bench;

  function plazaSet(c, o, d) {
    const t = o.t || 0;
    // seawall + railing
    c.fillStyle = '#b8b2a6';
    c.fillRect(-900, PZ.seaY, 3800, 52);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(-900, PZ.seaY + 40, 3800, 12);
    V.line(c, -900, PZ.seaY, 2900, PZ.seaY, INK, 3);
    c.fillStyle = '#e8eef2';
    for (let x = -880; x < 2900; x += 120) V.fillRound(c, x - 5, 548, 10, 54, 3, '#dfe7ec', INK, 2.5);
    V.fillRound(c, -900, 544, 3800, 9, 4, '#e8eef2', INK, 2.5);
    V.fillRound(c, -900, 572, 3800, 6, 3, '#dfe7ec', INK, 2);
    // promenade floor with the famous wave tiles
    const fg = c.createLinearGradient(0, PZ.floorY, 0, 1200);
    fg.addColorStop(0, '#a99a84');
    fg.addColorStop(1, '#bcae96');
    c.fillStyle = fg;
    c.fillRect(-900, PZ.floorY, 3800, 600);
    c.strokeStyle = 'rgba(120,98,70,0.4)';
    c.lineWidth = 3;
    c.beginPath();
    for (let r = 0; r < 9; r++) {
      const y = PZ.floorY + 22 + r * (18 + r * 6);
      const amp = 4 + r * 1.6, wl = 90 + r * 14;
      c.moveTo(-900, y);
      for (let x = -900; x <= 2900; x += 48) c.lineTo(x, y + Math.sin((x / wl) * Math.PI * 2 + r) * amp);
    }
    c.stroke();
    // palms behind the walk line
    PZ.palms.forEach((px, i) => palm(c, px, PZ.floorY + 18, 470 + i * 30, i ? -40 : 36, t));
    PZ.palms.forEach((px) => {
      V.fillRound(c, px - 46, PZ.floorY - 4, 92, 30, 8, '#9d968a', INK, 3);
    });
    // string light poles
    PZ.poles.forEach((x, i) => {
      if (i === 2) return; // the right end hangs from the kiosk roof
      V.fillRound(c, x - 7, PZ.poleTop - 6, 14, PZ.floorY + 40 - PZ.poleTop, 5, '#3a3f4a', INK, 3);
      V.circle(c, x, PZ.poleTop - 6, 9, '#3a3f4a', INK, 3);
    });
    // street lamp (municipal, stays on all night) between the two benches
    const lx = LAMP_X;
    V.fillRound(c, lx - 9, 300, 18, PZ.floorY + 60 - 300, 6, '#454b58', INK, 3);
    V.fillRound(c, lx - 40, 286, 80, 14, 6, '#454b58', INK, 3);
    [lx - 40, lx + 40].forEach((hx) => V.fillRound(c, hx - 16, 296, 32, 18, 6, '#2f343e', INK, 3));
    // far-left bench (for background sitters)
    bench(c, -260, 120, 738, 790);
  }

  function plazaKioskBody(c) {
    // --- kiosk
    const K = PZ.kiosk;
    const [w0, w1, wy0, wy1] = K.win;
    // body
    V.fillRound(c, K.x0, K.roof, K.x1 - K.x0, K.base - K.roof, 8, '#f3efe6', INK, 3.5);
    // lower panels (blue & white stripes)
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#2f74c0' : '#f3efe6';
      c.fillRect(K.x0 + 3 + i * ((K.x1 - K.x0 - 6) / 8), wy1 + 30, (K.x1 - K.x0 - 6) / 8, K.base - wy1 - 34);
    }
    V.line(c, K.x0, wy1 + 30, K.x1, wy1 + 30, INK, 3);
    // roof slab + sign board
    V.fillRound(c, K.x0 - 20, K.roof - 18, K.x1 - K.x0 + 40, 30, 6, '#d9d2c4', INK, 3.5);
    V.fillRound(c, K.x0 + 60, K.roof - 120, K.x1 - K.x0 - 120, 96, 10, '#232838', INK, 3.5);
    V.fillRound(c, K.x0 + 90, K.roof - 30, 14, 14, 3, '#3a3f4a');
    V.fillRound(c, K.x1 - 104, K.roof - 30, 14, 14, 3, '#3a3f4a');
    // window opening (interior drawn by the emissive pass)
    V.fillRound(c, w0 - 8, wy0 - 8, w1 - w0 + 16, wy1 - wy0 + 16, 6, '#c9c2b4', INK, 3);
    V.fillRound(c, w0, wy0, w1 - w0, wy1 - wy0, 4, '#3a3048');
    // counter ledge
    V.fillRound(c, w0 - 30, wy1 - 2, w1 - w0 + 60, 22, 5, '#9a6a44', INK, 3);
    // menu light box frame (side)
    V.fillRound(c, K.x0 - 66, 520, 70, 120, 6, '#2b2f3a', INK, 3);
    V.fillRound(c, K.x0 - 52, 640, 10, 130, 3, '#2b2f3a', INK, 2.5);
    // stools
    [1490, 1700].forEach((sx) => {
      V.fillRound(c, sx - 4, 790, 8, 112, 3, '#4a5060', INK, 2.5);
      V.fillRound(c, sx - 30, 780, 60, 16, 7, '#e2463c', INK, 3);
      V.fillRound(c, sx - 22, 896, 44, 8, 3, '#4a5060', INK, 2);
    });
    // trash bin
    V.fillRound(c, 1272, 820, 56, 84, 8, '#4b8a5a', INK, 3);
    V.fillRound(c, 1266, 812, 68, 14, 5, '#3d7049', INK, 3);
  }

  // kiosk interior + owner + shutter (drawn in the actor-lighting pass? no: interior is emissive)
  function kioskInterior(c, o, d) {
    const K = PZ.kiosk;
    const [w0, w1, wy0, wy1] = K.win;
    const lit = d.kiosk;
    c.save();
    c.beginPath();
    c.rect(w0, wy0, w1 - w0, wy1 - wy0);
    c.clip();
    // back wall
    const g = c.createLinearGradient(0, wy0, 0, wy1);
    g.addColorStop(0, V.mixColor('#3a3048', '#ffe7b0', lit));
    g.addColorStop(1, V.mixColor('#2a2238', '#f2b56a', lit));
    c.fillStyle = g;
    c.fillRect(w0, wy0, w1 - w0, wy1 - wy0);
    // tiles
    c.strokeStyle = `rgba(160,110,60,${0.25 * lit + 0.05})`;
    c.lineWidth = 1.5;
    c.beginPath();
    for (let x = w0; x < w1; x += 26) {
      c.moveTo(x, wy0);
      c.lineTo(x, wy1);
    }
    for (let y = wy0; y < wy1; y += 26) {
      c.moveTo(w0, y);
      c.lineTo(w1, y);
    }
    c.stroke();
    // shelf with bottles
    V.fillRound(c, w0 + 16, wy0 + 52, 150, 8, 2, V.mixColor('#2a2238', '#9a6a44', lit));
    for (let i = 0; i < 7; i++) {
      const col = ['#3fae5a', '#e2463c', '#f6c945', '#3b7dd8'][i % 4];
      V.fillRound(c, w0 + 22 + i * 20, wy0 + 22, 13, 30, 4, V.mixColor('#1c1828', col, 0.25 + 0.75 * lit));
    }
    // pizza oven (right)
    V.fillRound(c, w1 - 170, wy0 + 26, 150, 120, 14, V.mixColor('#22202c', '#8a8f9a', lit), INK, 3);
    c.beginPath();
    c.ellipse(w1 - 95, wy0 + 96, 50, 26, 0, Math.PI, 0);
    c.closePath();
    c.fillStyle = V.mixColor('#2a1a14', '#ff8a2a', lit);
    c.fill();
    c.stroke();
    if (lit > 0.05) glowDot(c, w1 - 95, wy0 + 86, 60, '#ffb050', 0.5 * lit);
    // pendant lamps
    for (let i = 0; i < 3; i++) {
      const px = w0 + 80 + i * 110;
      V.line(c, px, wy0, px, wy0 + 18, '#222', 2);
      V.fillRound(c, px - 14, wy0 + 16, 28, 12, 6, '#2b2f3a');
      if (lit > 0) V.ellipse(c, px, wy0 + 29, 9, 4, `rgba(255,240,200,${lit})`);
    }
    c.restore();
  }

  function kioskOwner(c, o, d) {
    if (!d.owner) return;
    const K = PZ.kiosk;
    const [w0, w1, wy0, wy1] = K.win;
    const t = o.t || 0;
    const sh = d.shutter;
    c.save();
    c.beginPath();
    c.rect(w0, wy0, w1 - w0, wy1 - wy0);
    c.clip();
    // leans on the counter; before closing he reaches up and pulls the shutter down
    const reach = V.ep(d.k, 0.55, 0.6) ;
    const s = 0.84, x = 1590;
    const hip = wy1 + 34;
    const pose = P.stand({
      facing: -1,
      look: { skin: '#d9a27c', hair: '#3a3a3a', hairStyle: 'buzz' },
      outfit: { shirt: '#ffffff', sleeves: 'short', logo: false, pants: '#333', pantsLen: 'long', shoes: 'sneakers' },
      eyes: B.blink(t, 'open', 9),
      mouth: 'smile',
      torso: 8,
      armNear: { sh: 60, el: 50 },
      armFar: { sh: 50, el: 60 },
    });
    if (reach > 0) {
      const barY = wy0 + (wy1 - wy0) * sh;
      const nk = E.nightArmIK(pose, x, hip, s, 'near', [x - 40, barY + 2]);
      const fk = E.nightArmIK(pose, x, hip, s, 'far', [x + 30, barY + 2]);
      pose.armNear = { sh: V.lerp(pose.armNear.sh, nk.sh, reach), el: V.lerp(pose.armNear.el, nk.el, reach) };
      pose.armFar = { sh: V.lerp(pose.armFar.sh, fk.sh, reach), el: V.lerp(pose.armFar.el, fk.el, reach) };
      pose.torso = V.lerp(8, 0, reach);
      pose.head = -8 * reach;
    }
    B.draw(c, x, hip, s, pose);
    // apron string
    c.restore();
  }

  function shutter(c, d) {
    const K = PZ.kiosk;
    const [w0, w1, wy0, wy1] = K.win;
    const sh = d.shutter;
    // rolled shutter box (always)
    if (sh > 0.002) {
      const h = (wy1 - wy0) * sh;
      c.fillStyle = '#9aa2ae';
      c.fillRect(w0, wy0, w1 - w0, h);
      c.strokeStyle = 'rgba(40,46,58,0.6)';
      c.lineWidth = 2.5;
      c.beginPath();
      for (let y = wy0 + 8; y < wy0 + h; y += 10) {
        c.moveTo(w0, y);
        c.lineTo(w1, y);
      }
      c.stroke();
      V.fillRound(c, w0, wy0 + h - 8, w1 - w0, 10, 3, '#7d8592', INK, 2.5);
      V.fillRound(c, (w0 + w1) / 2 - 20, wy0 + h - 4, 40, 8, 3, '#4a5060');
    }
    V.fillRound(c, w0 - 10, wy0 - 30, w1 - w0 + 20, 26, 6, '#8a929e', INK, 3);
  }

  function awning(c) {
    const K = PZ.kiosk;
    const [w0, w1, wy0] = K.win;
    const y0 = wy0 - 70, y1 = wy0 - 18;
    const x0 = w0 - 40, x1 = w1 + 40;
    const n = 10, sw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      c.beginPath();
      c.moveTo(x0 + i * sw, y0);
      c.lineTo(x0 + (i + 1) * sw, y0);
      c.lineTo(x0 + (i + 1) * sw, y1);
      c.quadraticCurveTo(x0 + (i + 0.5) * sw, y1 + 22, x0 + i * sw, y1);
      c.closePath();
      c.fillStyle = i % 2 ? '#f6f1e6' : '#e0453b';
      c.fill();
    }
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y0);
    c.lineTo(x1, y1);
    for (let i = n - 1; i >= 0; i--) c.quadraticCurveTo(x0 + (i + 0.5) * sw, y1 + 22, x0 + i * sw, y1);
    c.closePath();
    c.strokeStyle = INK;
    c.lineWidth = 3.5;
    c.stroke();
  }

  function neonSign(c, d, glowOnly) {
    const K = PZ.kiosk;
    const cx = (K.x0 + K.x1) / 2, cy = K.roof - 72;
    const on = d.neon;
    const pink = '#ff4f8a';
    if (!glowOnly) {
      // unlit tubes (always visible faintly)
      V.text(c, 'פיצה', cx + 40, cy, { size: 72, weight: 800, color: on > 0.5 ? '#fff0f6' : '#5a3a4c', stroke: on > 0.5 ? pink : '#3a2a38', strokeWidth: 8 });
      // neon slice icon
      c.save();
      c.translate(cx - 130, cy);
      c.rotate(-0.25);
      c.beginPath();
      c.moveTo(-26, -30);
      c.lineTo(26, -30);
      c.lineTo(0, 34);
      c.closePath();
      c.strokeStyle = on > 0.5 ? '#ffe36a' : '#5a5030';
      c.lineWidth = 6;
      c.lineJoin = 'round';
      c.stroke();
      [[-8, -14], [8, -6], [0, 10]].forEach(([px, py]) => V.circle(c, px, py, 5, null, on > 0.5 ? '#ff7a3a' : '#5a3a2c', 4));
      c.restore();
    } else if (on > 0.01) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      glowDot(c, cx + 40, cy, 220, pink, 0.38 * on);
      glowDot(c, cx - 130, cy, 110, '#ffd84a', 0.3 * on);
      c.restore();
    }
  }

  function menuBox(c, d) {
    const K = PZ.kiosk;
    const x = K.x0 - 60, y = 528, w = 58, h = 104;
    const on = d.menu;
    V.fillRound(c, x, y, w, h, 4, V.mixColor('#2c2f3c', '#fff6dc', on));
    for (let i = 0; i < 5; i++) V.fillRound(c, x + 8, y + 12 + i * 18, w - 16 - (i % 2) * 10, 6, 2, V.mixColor('#3a3d4a', '#d0453b', on * 0.9));
  }

  function stringLights(c, d, glowOnly) {
    // cables
    if (!glowOnly) {
      c.strokeStyle = '#1b1c26';
      c.lineWidth = 2.5;
      c.beginPath();
      CABLES.forEach(([x0, y0, x1, y1, sag]) => {
        c.moveTo(x0, y0);
        c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
      });
      c.stroke();
    }
    BULBS.forEach((b, i) => {
      const on = d.bulbs(i, BULBS.length);
      if (glowOnly) {
        if (on > 0.02) glowDot(c, b.x, b.y + 4, 46, b.c, 0.55 * on);
        return;
      }
      V.line(c, b.x, b.y - 12, b.x, b.y - 4, '#1b1c26', 3);
      V.ellipse(c, b.x, b.y + 4, 7, 10, on > 0.02 ? V.mixColor('#5a5560', V.shade(b.c, 0.45), on) : '#5a5560');
    });
  }

  // passers-by on the back walk line (time-lapse aware)
  const WALKERS = [
    { tau0: -9, dir: 1, v: 120, s: 0.6, look: { skin: '#f2c6a4', hair: '#7a4a2a', hairStyle: 'ponytail' }, outfit: { shirt: '#f4e3a1', sleeves: 'short', logo: false, pants: '#3b4a6a', pantsLen: 'long' } },
    { tau0: -7, dir: -1, v: 105, s: 0.62, look: { skin: '#8d5a3b', hair: '#222', hairStyle: 'short' }, outfit: { shirt: '#6aa86b', sleeves: 'short', logo: false, pants: '#2a2f3d', pantsLen: 'long' } },
    { tau0: -5.2, dir: 1, v: 110, s: 0.58, look: { skin: '#e9b48f', hair: '#c9a24a', hairStyle: 'long' }, outfit: { shirt: '#e88aa8', sleeves: 'short', logo: false, pants: '#f0ece2', pantsLen: 'long' } },
    { tau0: -3.6, dir: -1, v: 150, s: 0.6, run: true, look: { skin: '#d9a27c', hair: '#333', hairStyle: 'buzz' }, outfit: { shirt: '#f39a3d', sleeves: 'short', logo: false, pants: '#222', pantsLen: 'shorts', shoes: 'sneakers' } },
    { tau0: -2.2, dir: 1, v: 100, s: 0.63, look: { skin: '#c98d62', hair: '#555', hairStyle: 'short' }, outfit: { shirt: '#7a8fc4', sleeves: 'long', logo: false, pants: '#3a3a44', pantsLen: 'long' } },
    { tau0: -0.6, dir: -1, v: 115, s: 0.59, look: { skin: '#f3c7a8', hair: '#2a1a12', hairStyle: 'long' }, outfit: { shirt: '#b56ad8', sleeves: 'short', logo: false, pants: '#2a2f3d', pantsLen: 'long' } },
    { tau0: 1.5, dir: 1, v: 125, s: 0.61, look: { skin: '#8d5a3b', hair: '#111', hairStyle: 'curly' }, outfit: { shirt: '#e0e0e0', sleeves: 'short', logo: false, pants: '#4b5a74', pantsLen: 'long' } },
    { tau0: 3.8, dir: -1, v: 160, s: 0.6, run: true, look: { skin: '#e9b48f', hair: '#5a3a22', hairStyle: 'ponytail' }, outfit: { shirt: '#3fb3a9', sleeves: 'short', logo: false, pants: '#222', pantsLen: 'shorts' } },
    { tau0: 6.2, dir: 1, v: 120, s: 0.62, look: { skin: '#d9a27c', hair: '#222', hairStyle: 'short' }, outfit: { shirt: '#d8453b', sleeves: 'short', logo: false, pants: '#2a2f3d', pantsLen: 'long' } },
  ];
  function walkers(c, o, d) {
    if (!d.crowd) return;
    const tau = d.tau;
    const ghosts = d.ff > 0.05 ? [0, 0.26] : [0];
    WALKERS.forEach((w, i) => {
      const startX = w.dir > 0 ? -380 : 2300;
      ghosts.forEach((gd, gi) => {
        const tt = tau - gd * d.ff * 1.6;
        const dist = (tt - w.tau0) * w.v;
        if (dist < 0) return;
        const x = startX + w.dir * dist;
        if (x < -420 || x > 2340) return;
        const ph = w.run ? B.runPhase(dist, w.s) : B.walkPhase(dist, w.s);
        const pose = (w.run ? P.run : P.walk)(ph, { facing: w.dir, look: w.look, outfit: Object.assign({ shoes: 'sneakers', shoeColor: '#eee' }, w.outfit), eyes: 'open', mouth: 'smile' });
        const gy = PZ.backWalk + (i % 3) * 6;
        const a = gi === 0 ? 1 : 0.24;
        c.save();
        c.globalAlpha = a;
        if (gi === 0) V.groundShadow(c, x, gy, 38 * w.s / 0.6);
        B.draw(c, x, B.standY(gy, w.s, pose), w.s, pose);
        c.restore();
      });
    });
    // a couple on the far-left bench, and two customers at the kiosk counter: gone as the night goes on
    const stay = (end) => V.clamp(1 - (tau - end) / 0.6);
    const couple = stay(5.5);
    if (couple > 0) {
      c.save();
      c.globalAlpha = couple;
      const s = 0.6;
      const p1 = P.sit({ facing: 1, look: { skin: '#e9b48f', hair: '#3a2a1a', hairStyle: 'short' }, outfit: { shirt: '#5a7fc4', sleeves: 'long', logo: false, pants: '#2a2f3d', pantsLen: 'long', shoes: 'sneakers' }, eyes: 'happy', mouth: 'smile' });
      const p2 = P.sit({ facing: -1, look: { skin: '#f2c6a4', hair: '#b5652a', hairStyle: 'long' }, outfit: { shirt: '#e6b450', sleeves: 'short', logo: false, pants: '#f0ece2', pantsLen: 'long', shoes: 'sneakers' }, eyes: 'happy', mouth: 'smile', head: 6 });
      B.draw(c, -110, 734, s, p1);
      B.draw(c, 40, 734, s, p2);
      c.restore();
    }
  }
  function customers(c, o, d) {
    if (!d.crowd) return;
    const cust = V.clamp(1 - (d.tau - 2.6) / 0.6);
    if (cust > 0) {
      c.save();
      c.globalAlpha = cust;
      [[1500, 0.8, '#7a8fc4', 'ponytail', '#5a3a22'], [1690, 0.82, '#f3efe6', 'short', '#222']].forEach(([x, s, shirt, hs, hair], i) => {
        const p = P.stand({ facing: -1, look: { skin: i ? '#8d5a3b' : '#f2c6a4', hair, hairStyle: hs }, outfit: { shirt, sleeves: 'short', logo: false, pants: '#2a2f3d', pantsLen: 'long', shoes: 'sneakers' }, armNear: { sh: 70, el: 60 }, mouth: 'smile', eyes: 'open' });
        V.groundShadow(c, x, 900, 50 * s);
        B.draw(c, x, B.standY(900, s, p), s, p);
      });
      c.restore();
    }
  }

  function plazaLights(o, d) {
    const K = PZ.kiosk;
    const ls = [];
    BULBS.forEach((b, i) => {
      const on = d.bulbs(i, BULBS.length);
      if (on > 0.02) ls.push({ x: b.x, y: b.y + 330, r: 270, a: 0.13 * on, tint: 0.12, color: b.c });
    });
    ls.push({ x: (K.win[0] + K.win[1]) / 2, y: 760, r: 500, a: 0.72 * d.kiosk * (1 - d.shutter * 0.75), tint: 0.18 });
    ls.push({ x: (K.x0 + K.x1) / 2 + 40, y: K.roof - 40, r: 420, a: 0.45 * d.neon, tint: 0.22, color: '#ff4f8a' });
    ls.push({ x: LAMP_X + 120, y: 700, r: 640, a: 0.58 * d.lampsOn, tint: 0.16 });
    ls.push({ x: 760, y: 720, r: 900, a: 0.16, tint: 0.06, color: '#9fb4ff' }); // moonlight fill
    return ls.concat(o.lights || []);
  }

  function plazaGlow(c, o, d) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    stringLights(c, d, true);
    neonSign(c, d, true);
    const K = PZ.kiosk;
    const kl = d.kiosk * (1 - d.shutter * 0.8);
    if (kl > 0.01) {
      glowDot(c, (K.win[0] + K.win[1]) / 2, 700, 300, '#ffc070', 0.22 * kl);
      // light spilling on the floor in front of the counter
      const g = c.createLinearGradient(0, 740, 0, 1000);
      g.addColorStop(0, `rgba(255,200,120,${0.18 * kl})`);
      g.addColorStop(1, 'rgba(255,200,120,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(K.win[0], 740);
      c.lineTo(K.win[1], 740);
      c.lineTo(K.win[1] + 160, 1000);
      c.lineTo(K.win[0] - 160, 1000);
      c.closePath();
      c.fill();
    }
    if (d.menu > 0.01) glowDot(c, K.x0 - 31, 580, 90, '#fff2c8', 0.3 * d.menu);
    // municipal lamp: soft cone + heads
    if (d.lampsOn > 0) {
      const g = c.createLinearGradient(0, 310, 0, 940);
      g.addColorStop(0, `rgba(255,214,150,${0.16 * d.lampsOn})`);
      g.addColorStop(1, 'rgba(255,214,150,0)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(LAMP_X - 60, 312);
      c.lineTo(LAMP_X + 60, 312);
      c.lineTo(LAMP_X + 380, 940);
      c.lineTo(LAMP_X - 300, 940);
      c.closePath();
      c.fill();
    }
    [LAMP_X - 40, LAMP_X + 40].forEach((hx) => {
      V.ellipse(c, hx, 314, 13, 5, `rgba(255,236,190,${0.9 * d.lampsOn})`);
      glowDot(c, hx, 318, 120, '#ffd88a', 0.4 * d.lampsOn);
    });
    c.restore();
  }

  E.nightPlaza = (ctx, o = {}) => {
    const cam = normCam(o.cam);
    const t = o.t || 0;
    const d = plazaDefaults(o);
    const moon = o.moon || [340, 200, 44];
    prof(ctx);
    E.nightSky(ctx, { cam, t, moon, starSpin: o.starSpin });
    prof(ctx, 'sky');
    plazaFar(ctx, cam, d);
    sea(ctx, cam, d, moon);
    prof(ctx, 'far+sea');
    const mask = buildMask(cam, plazaLights(o, d), Object.assign({ ambient: 0.64, dark: d.k * 0.3 }, o));
    prof(ctx, 'mask');
    litPass(ctx, cam, mask, (c) => {
      plazaSet(c, o, d);
      walkers(c, o, d);
      plazaKioskBody(c);
    });
    prof(ctx, 'setPass');
    ctx.save();
    camApply(ctx, cam);
    kioskInterior(ctx, o, d);
    kioskOwner(ctx, o, d);
    shutter(ctx, d);
    awning(ctx);
    // the shutter + awning are not emissive: dim them with the kiosk light
    const K = PZ.kiosk;
    const dimA = 0.62 - 0.38 * d.kiosk * (1 - d.shutter * 0.7);
    ctx.fillStyle = `rgba(9,12,38,${dimA})`;
    ctx.fillRect(K.win[0] - 40, K.win[2] - 72, K.win[1] - K.win[0] + 80, 76);
    if (d.shutter > 0.002) ctx.fillRect(K.win[0], K.win[2] - 4, K.win[1] - K.win[0], (K.win[3] - K.win[2]) * d.shutter + 4);
    neonSign(ctx, d, false);
    menuBox(ctx, d);
    stringLights(ctx, d, false);
    ctx.restore();
    prof(ctx, 'emissive');
    litPass(ctx, cam, mask, (c) => {
      customers(c, o, d);
      if (o.actors) o.actors(c);
      if (o.front) o.front(c);
    });
    prof(ctx, 'actorPass');
    ctx.save();
    camApply(ctx, cam);
    plazaGlow(ctx, o, d);
    if (o.glow) o.glow(ctx);
    ctx.restore();
    if (o.overlay) o.overlay(ctx);
    prof(ctx, 'glow');
  };
})();
