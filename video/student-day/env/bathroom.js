// =====================================================================================
// env/bathroom.js — the shared BATHROOM set (scenes 02-shower, 03-teeth, 14-shower-2).
// =====================================================================================
//
// The set lives in a fixed WORLD coordinate space (px at zoom 1, +y down). A scene frames
// it with a camera  cam = { x, y, zoom, rot? }: world point (cam.x, cam.y) lands at the
// screen centre, scaled by zoom (rot = small Dutch tilt in degrees, optional).
// A character at rig scale s = 1.2 in world units matches the furniture (about 535 px tall).
//
// ---------------------------------------------------------------- API (V.env.bathroom)
//   V.env.bathroom(ctx, o)            paints the background frame: fills the screen, applies the
//                                     camera and draws everything that sits BEHIND a person
//                                     standing in the shower or at the sink, then restores.
//       o.t        scene time (steam drips, plant sway)        o.cam    {x, y, zoom, rot}
//       o.hour     sky in the small window (7.5 morning, >=19 dark-blue evening)
//       o.light    'cool' (morning daylight) | 'warm' (evening lamps)   [default by hour]
//       o.fog      0..1 fog on the mirror / window             o.reflect (ctx)=>{} subject drawn
//       o.wipe     {x, y, rx, ry} wiped clear patch on the foggy mirror (world)   in the mirror
//       o.duck     'niche' (default) | false                   o.brushInCup true|false (his blue brush)
//       o.kit      true -> muddy football kit dropped on the bath mat (evening scene)
//       o.faucet   0..1 sink faucet running                    o.mirror {axis, axisY, k} override
//   V.env.bathroom.cam(ctx, cam)      apply the camera transform (caller wraps in save/restore)
//   V.env.bathroom.toScreen(cam, x, y) -> [sx, sy]
//   V.env.bathroom.curtain(ctx, o)    shower curtain + rod (draw AFTER the person in the shower;
//                                     the person stands between the stall wall and the curtain).
//                                     o = {t, alpha (default .86), sway 0..1, wet 0..1}
//   V.env.bathroom.water(ctx, o)      shower streams + splashes (world coords; call inside the cam)
//                                     o = {t, on 0..1, hits:[{x,y,r}] circles that stop the water
//                                     (head, shoulders), yEnd (floor of the streams), mud 0..1}
//   V.env.bathroom.steam(ctx, o)      rising steam puffs (world). o = {t, amount, x0, x1, y, rise, seed}
//   V.env.bathroom.mirror(ctx, o, fn) the mirror glass: clip + mirrored transform about the vertical
//                                     axis x = axis (scaled by k about (axis, axisY) for depth) — fn(ctx)
//                                     draws the subject in ordinary world coords and comes out mirrored.
//                                     (V.env.bathroom() calls this itself when o.reflect is given.)
//   V.env.bathroom.light(ctx, o)      final light pass (call last, OUTSIDE the cam; needs o.cam, o.hour,
//                                     o.light, o.steam 0..1 for visible light shafts)
//   V.env.bathroom.foam(ctx, blobs, o)  foam / lather cluster: blobs [{x,y,r}] in the current frame,
//                                     one ink outline round the union. o = {color, ring, lw}
//   V.env.bathroom.bubble(ctx, x, y, r, a)   iridescent soap bubble
//   V.env.bathroom.duck(ctx, x, y, s, rot)   rubber duck, (x, y) = bottom centre, s 1 -> 60 px long
//   V.env.bathroom.shampoo(ctx, x, y, s)     blue shampoo bottle, (x, y) = bottom centre (o.shampooOut
//                                     hides the one in the niche when the hero is holding it)
//   V.env.bathroom.drain(ctx, o)      puddle on the shower tray + swirl into the drain (world; draw
//                                     after the room, before the hero). o = {t, mud 0..1, x0, amount}
//   V.env.bathroom.sparkle(ctx, x, y, r, rot, a)  4-point "ting" star
//   V.env.bathroom.L                  layout constants (below)
//   V.env.bathroom.kit                rig helpers (generic, reusable by anyone):
//       kit.full(pose)                         pose with defaults filled in
//       kit.toWorld(x, y, s, pose, lx, ly)     rig-local (unscaled, facing +x) -> world
//       kit.toLocal(x, y, s, pose, wx, wy)     world -> rig-local
//       kit.headPt(pose, hx, hy)               head-frame point (face toward +x) -> rig-local
//       kit.headWorld(x, y, s, pose, hx, hy)   head-frame point -> world
//       kit.ik(pose, 'near'|'far', lx, ly, bend=1) -> {sh, el}  2-bone IK, hand reaches rig-local point
//       kit.aim(pose, 'near'|'far', lx, ly)    -> {ang, dist}: inside propNear/propFar do
//                                              ctx.rotate(ang) and +x points at the rig-local target
//       kit.headFrame(ctx, x, y, s, pose)      apply the head frame to ctx (draw hair foam, mud, drops)
//       kit.down(pose)                         world "down" expressed in the head frame (for drips)
//
// ---------------------------------------------------------------- LAYOUT (world px)
//   wall / floor line ............ y = 850 (baseboard 830..850); floor below, perspective tiles
//   tiled wainscot ............... y 560..830 (border strip 546..562), cream paint above
//   SHOWER STALL (mosaic alcove) . x 130..830 ; corner pillar x 92..130 ; pony wall x 830..870 (top y 512)
//     shower tray ................ top surface y 842 (back) .. 886 (front), front face to 908
//     stand here (feet y) ........ L.SHOWER_Y = 866 ; drain at (590, 868)
//     shower head ................ face centre (640, 122), sprays down-left (L.HEAD.ang = 26 deg)
//     curtain .................... rod at y 520 (chest height of a s=1.2 person), hem at y 780
//                                  -> head + shoulders show above it, shins + feet below it
//     wall niche ................. x 170..350, y 396..500 (shampoo bottles + rubber duck)
//     mixer valve ................ (720, 650)
//   WINDOW ....................... x 930..1090, y 140..352 (sill + little plant)
//   VANITY ....................... x 1150..1690, counter top y 652..682, cabinet to y 902
//     vessel basin ............... centre x 1350, rim y 622 (rx 96) ; gooseneck faucet spout (1366, 582)
//     mirror glass ............... x 1190..1650, y 262..626 ; vanity light bar y 210..232
//     default reflection axis .... x 1365, axisY 495, depth scale k 0.86
//     cup + toothbrushes ......... x 1640 ; toothpaste tube x ≈ 1560 ; soap pump x 1218
//     stand here (feet y) ........ L.SINK_Y = 962 (in front of the cabinet), e.g. hip x ≈ 1150
//   TOWEL RACK ................... bar x 1760..2060 at y 400, two towels hanging to ~y 650
//   BATH MAT ..................... floor x 320..720, y 912..962 (in front of the stall)
//   left of the stall ............ laundry basket x -190..40, robe hook at x -60
// =====================================================================================
(function () {
  const V = window.V;
  V.env = V.env || {};
  const ink = V.pal.ink;
  const OUT = 3.5;
  const TAU = Math.PI * 2;

  const L = {
    FLOOR_Y: 850,
    WAINSCOT_Y: 560,
    LEFT_X: -900, RIGHT_X: 2900, TOP_Y: -700, BOTTOM_Y: 1700,
    STALL: { x0: 130, x1: 830 },
    PILLAR: { x0: 92, x1: 130 },
    HALF_WALL: { x0: 830, x1: 870, top: 512 },
    TRAY: { x0: 130, x1: 830, back: 842, front: 886, bottom: 908 },
    SHOWER_Y: 866,
    DRAIN: { x: 590, y: 868 },
    ROD_Y: 520, HEM_Y: 780,
    HEAD: { x: 640, y: 122, ang: 26 },
    PIPE_X: 724,
    MIXER: { x: 724, y: 650 },
    NICHE: { x0: 170, x1: 350, y0: 396, y1: 500 },
    WINDOW: { x0: 930, x1: 1090, y0: 140, y1: 352 },
    MIRROR: { x0: 1190, x1: 1650, y0: 262, y1: 626, axis: 1365, axisY: 495, k: 0.86 },
    VANITY: { x0: 1150, x1: 1690, top: 652, front: 902 },
    BASIN: { x: 1350, rim: 622, rx: 96 },
    SPOUT: { x: 1366, y: 582 },
    CUP: { x: 1640 },
    SOAP: { x: 1218 },
    RACK: { x0: 1760, x1: 2060, y: 400 },
    MAT: { x0: 320, x1: 720, y0: 912, y1: 962 },
    SINK_Y: 962,
  };

  const C = {
    paint: '#f4ead7',
    paintShade: '#e8dcc4',
    tile: '#a7d8dd',
    tileGrout: '#e3f4f4',
    border: '#2f8fa3',
    mosaic: '#5fb3c1',
    mosaicGrout: '#a3d9e0',
    pillar: '#4a9fae',
    tray: '#eef4f4',
    trayFront: '#cfdfe1',
    floorA: '#efe6d6',
    floorB: '#d9cdb8',
    base: '#d9cfbd',
    wood: '#c58b5d',
    woodDark: '#a26c43',
    stone: '#f5f1e8',
    chrome: '#cfd8de',
    chromeDark: '#8d9aa4',
    curtain: '#ffd56b',
  };

  // ------------------------------------------------------------------ camera
  const cam = (ctx, c) => {
    ctx.translate(V.W / 2, V.H / 2);
    if (c.rot) ctx.rotate(V.deg(c.rot));
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);
  };
  const toScreen = (c, x, y) => {
    let dx = (x - c.x) * c.zoom, dy = (y - c.y) * c.zoom;
    if (c.rot) {
      const r = V.deg(c.rot), cs = Math.cos(r), sn = Math.sin(r);
      [dx, dy] = [dx * cs - dy * sn, dx * sn + dy * cs];
    }
    return [V.W / 2 + dx, V.H / 2 + dy];
  };

  // ------------------------------------------------------------------ small helpers
  const gridLines = (ctx, x0, y0, x1, y1, step, color, lw, offX = 0, offY = 0) => {
    ctx.beginPath();
    for (let x = x0 + (((offX - x0) % step) + step) % step; x <= x1; x += step) {
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    }
    for (let y = y0 + (((offY - y0) % step) + step) % step; y <= y1; y += step) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
  };
  const sparkle = (ctx, x, y, r, rot = 0, a = 1, color = '#ffffff') => {
    if (r <= 0 || a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.22;
      const an = (i / 8) * TAU - Math.PI / 2;
      ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * rr, Math.sin(an) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(255,255,255,0.9)';
    ctx.shadowBlur = r * 0.6;
    ctx.fill();
    ctx.restore();
  };

  // ------------------------------------------------------------------ props
  const duck = (ctx, x, y, s = 1, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    // body
    ctx.beginPath();
    ctx.moveTo(-30, -14);
    ctx.quadraticCurveTo(-34, 0, -22, 0);
    ctx.lineTo(18, 0);
    ctx.quadraticCurveTo(32, -2, 28, -18);
    ctx.quadraticCurveTo(20, -26, 0, -24);
    ctx.quadraticCurveTo(-18, -24, -26, -30);
    ctx.quadraticCurveTo(-32, -24, -30, -14);
    ctx.closePath();
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    // wing
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.quadraticCurveTo(0, -4, 10, -14);
    ctx.strokeStyle = '#e0a514';
    ctx.lineWidth = 3;
    ctx.stroke();
    // head
    V.circle(ctx, 12, -34, 14, '#ffd23a', ink, 3);
    // beak
    ctx.beginPath();
    ctx.moveTo(23, -36);
    ctx.quadraticCurveTo(38, -36, 36, -29);
    ctx.quadraticCurveTo(30, -26, 23, -29);
    ctx.closePath();
    ctx.fillStyle = '#f3812f';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    V.circle(ctx, 16, -38, 2.6, ink);
    V.circle(ctx, 5, -41, 3, 'rgba(255,255,255,0.7)');
    ctx.restore();
  };

  const bubble = (ctx, x, y, r, a = 1) => {
    if (r <= 0.5 || a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    V.circle(ctx, x, y, r, 'rgba(220,240,255,0.18)', 'rgba(120,170,210,0.75)', Math.max(1.2, r * 0.12));
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, Math.PI * 1.1, Math.PI * 1.45);
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(1.2, r * 0.16);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, Math.PI * 0.1, Math.PI * 0.45);
    ctx.strokeStyle = 'rgba(255,160,220,0.55)';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.stroke();
    ctx.restore();
  };

  // blue shampoo bottle, (x, y) = bottom centre, s 1 -> 76 px tall (+cap)
  const shampoo = (ctx, x, y, s = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    V.fillRound(ctx, -18, -76, 36, 76, 10, '#3b7dd8', ink, 3);
    V.fillRound(ctx, -12, -88, 24, 14, 4, '#f4f4f4', ink, 3);
    V.fillRound(ctx, -12, -56, 24, 28, 4, '#eaf2ff');
    V.line(ctx, -7, -47, 7, -47, '#3b7dd8', 3);
    V.line(ctx, -7, -38, 3, -38, '#3b7dd8', 3);
    V.line(ctx, -12, -70, -12, -10, 'rgba(255,255,255,0.35)', 4);
    ctx.restore();
  };

  // foam cluster: union with one ink outline, white body, little bubble rings
  const foam = (ctx, blobs, o = {}) => {
    const lw = o.lw === undefined ? OUT : o.lw;
    const fill = o.color || '#ffffff';
    const list = blobs.filter((b) => b.r > 0.6);
    if (!list.length) return;
    ctx.save();
    ctx.beginPath();
    list.forEach((b) => {
      ctx.moveTo(b.x + b.r + lw, b.y);
      ctx.arc(b.x, b.y, b.r + lw, 0, TAU);
    });
    ctx.fillStyle = o.ink || ink;
    ctx.fill();
    ctx.beginPath();
    list.forEach((b) => {
      ctx.moveTo(b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, TAU);
    });
    ctx.fillStyle = fill;
    ctx.fill();
    // soft shade on the lower side of each blob
    ctx.beginPath();
    list.forEach((b) => {
      ctx.moveTo(b.x + b.r * 0.78 * Math.cos(0.15 * Math.PI), b.y + b.r * 0.78 * Math.sin(0.15 * Math.PI));
      ctx.arc(b.x, b.y, b.r * 0.78, 0.15 * Math.PI, 0.75 * Math.PI);
    });
    ctx.strokeStyle = o.shade || 'rgba(140,185,215,0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    // bubble rings
    if (o.ring !== false) {
      ctx.beginPath();
      list.forEach((b, i) => {
        if (i % 3) return;
        const rr = b.r * 0.32;
        const bx = b.x - b.r * 0.3, by = b.y - b.r * 0.25;
        ctx.moveTo(bx + rr, by);
        ctx.arc(bx, by, rr, 0, TAU);
      });
      ctx.strokeStyle = 'rgba(150,195,225,0.7)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  };

  // ------------------------------------------------------------------ the room pieces
  function walls(ctx, o) {
    // cream paint (upper wall)
    ctx.fillStyle = C.paint;
    ctx.fillRect(L.LEFT_X, L.TOP_Y, L.RIGHT_X - L.LEFT_X, L.FLOOR_Y - L.TOP_Y);
    // tiled wainscot
    ctx.fillStyle = C.tile;
    ctx.fillRect(L.LEFT_X, L.WAINSCOT_Y, L.RIGHT_X - L.LEFT_X, L.FLOOR_Y - L.WAINSCOT_Y);
    // a few lighter tiles for life
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 40; i++) {
      const cx = Math.floor(V.rand(i * 3.3 + 1) * 56) - 14;
      const cy = Math.floor(V.rand(i * 5.1 + 2) * 4);
      ctx.fillRect(cx * 64 + 3, L.WAINSCOT_Y + 2 + cy * 64 + 3, 58, 58);
    }
    gridLines(ctx, L.LEFT_X, L.WAINSCOT_Y, L.RIGHT_X, L.FLOOR_Y, 64, C.tileGrout, 3, 0, L.WAINSCOT_Y + 2);
    // border strip
    ctx.fillStyle = C.border;
    ctx.fillRect(L.LEFT_X, L.WAINSCOT_Y - 14, L.RIGHT_X - L.LEFT_X, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(L.LEFT_X, L.WAINSCOT_Y - 16, L.RIGHT_X - L.LEFT_X, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = -896; x < L.RIGHT_X; x += 32) ctx.fillRect(x, L.WAINSCOT_Y - 9, 12, 5);
    // baseboard
    ctx.fillStyle = C.base;
    ctx.fillRect(L.LEFT_X, L.FLOOR_Y - 20, L.RIGHT_X - L.LEFT_X, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(L.LEFT_X, L.FLOOR_Y - 3, L.RIGHT_X - L.LEFT_X, 3);
    // soft wall shading towards the top
    const g = ctx.createLinearGradient(0, L.TOP_Y, 0, 300);
    g.addColorStop(0, 'rgba(120,90,60,0.22)');
    g.addColorStop(1, 'rgba(120,90,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(L.LEFT_X, L.TOP_Y, L.RIGHT_X - L.LEFT_X, 300 - L.TOP_Y);
  }

  function floor(ctx) {
    const y0 = L.FLOOR_Y, y1 = L.BOTTOM_Y;
    ctx.fillStyle = C.floorA;
    ctx.fillRect(L.LEFT_X, y0, L.RIGHT_X - L.LEFT_X, y1 - y0);
    const vpx = 1000, vpy = 120, tile = 96;
    const rows = [];
    let y = y0, h = 26;
    while (y < y1) {
      rows.push(y);
      y += h;
      h *= 1.22;
    }
    rows.push(y);
    const X = (c, yy) => vpx + (c * tile - vpx) * ((yy - vpy) / (y0 - vpy));
    ctx.beginPath();
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r], yb = rows[r + 1];
      for (let c = -12; c < 34; c++) {
        if ((((c + r) % 2) + 2) % 2) continue;
        ctx.moveTo(X(c, ya), ya);
        ctx.lineTo(X(c + 1, ya), ya);
        ctx.lineTo(X(c + 1, yb), yb);
        ctx.lineTo(X(c, yb), yb);
        ctx.closePath();
      }
    }
    ctx.fillStyle = C.floorB;
    ctx.fill();
    // contact shadow along the wall
    const g = ctx.createLinearGradient(0, y0, 0, y0 + 60);
    g.addColorStop(0, 'rgba(60,40,20,0.22)');
    g.addColorStop(1, 'rgba(60,40,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(L.LEFT_X, y0, L.RIGHT_X - L.LEFT_X, 60);
  }

  function stall(ctx, o) {
    const S = L.STALL, T = L.TRAY;
    // mosaic back wall
    ctx.fillStyle = C.mosaic;
    ctx.fillRect(S.x0, L.TOP_Y, S.x1 - S.x0, T.back - L.TOP_Y);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = 0; i < 90; i++) {
      const cx = Math.floor(V.rand(i * 2.7 + 9) * 20), cy = Math.floor(V.rand(i * 4.3 + 3) * 36) - 12;
      ctx.fillRect(S.x0 + cx * 35 + 2, cy * 35 + 2, 31, 31);
    }
    ctx.fillStyle = 'rgba(20,70,90,0.12)';
    for (let i = 0; i < 50; i++) {
      const cx = Math.floor(V.rand(i * 6.1 + 4) * 20), cy = Math.floor(V.rand(i * 1.9 + 7) * 36) - 12;
      ctx.fillRect(S.x0 + cx * 35 + 2, cy * 35 + 2, 31, 31);
    }
    gridLines(ctx, S.x0, L.TOP_Y, S.x1, T.back, 35, C.mosaicGrout, 2.5, S.x0, 0);
    // recess shadow (alcove)
    const g = ctx.createLinearGradient(S.x0, 0, S.x0 + 120, 0);
    g.addColorStop(0, 'rgba(10,50,70,0.35)');
    g.addColorStop(1, 'rgba(10,50,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(S.x0, L.TOP_Y, 120, T.back - L.TOP_Y);
    // wall niche with bottles
    niche(ctx, o);
    // plumbing + mixer
    plumbing(ctx, o);
    // tray
    ctx.fillStyle = C.tray;
    ctx.fillRect(T.x0, T.back, T.x1 - T.x0, T.front - T.back);
    ctx.fillStyle = 'rgba(80,130,150,0.12)';
    ctx.fillRect(T.x0, T.back, T.x1 - T.x0, 8);
    V.fillRound(ctx, T.x0 - 4, T.front, T.x1 - T.x0 + 8, T.bottom - T.front, 4, C.trayFront, ink, 3);
    V.line(ctx, T.x0, T.front + 3, T.x1, T.front + 3, 'rgba(255,255,255,0.8)', 3);
    // drain
    const d = L.DRAIN;
    V.ellipse(ctx, d.x, d.y, 30, 8, '#b7c3c8');
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, 30, 8, 0, 0, TAU);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    V.ellipse(ctx, d.x, d.y + 1, 22, 5, '#5d6a72');
    for (let i = -2; i <= 2; i++) V.line(ctx, d.x + i * 8, d.y - 2.5, d.x + i * 8, d.y + 4, '#c9d3d8', 2.2);
    // corner pillar (left)
    const P = L.PILLAR;
    ctx.fillStyle = C.pillar;
    ctx.fillRect(P.x0, L.TOP_Y, P.x1 - P.x0, L.FLOOR_Y + 30 - L.TOP_Y);
    gridLines(ctx, P.x0, L.TOP_Y, P.x1, L.FLOOR_Y + 30, 35, 'rgba(255,255,255,0.35)', 2, 1000, 0);
    V.line(ctx, P.x1, L.TOP_Y, P.x1, L.FLOOR_Y + 30, 'rgba(255,255,255,0.75)', 4);
    V.line(ctx, P.x0, L.TOP_Y, P.x0, L.FLOOR_Y + 30, ink, 3);
    // pony wall (right) — the curtain rod ends on it
    const H = L.HALF_WALL;
    ctx.fillStyle = '#6dbcc9';
    ctx.fillRect(H.x0, H.top, H.x1 - H.x0, L.FLOOR_Y + 30 - H.top);
    gridLines(ctx, H.x0, H.top, H.x1, L.FLOOR_Y + 30, 35, 'rgba(255,255,255,0.35)', 2, H.x0, H.top);
    V.fillRound(ctx, H.x0 - 6, H.top - 12, H.x1 - H.x0 + 12, 16, 5, '#eef7f7', ink, 3);
    ctx.beginPath();
    ctx.moveTo(H.x0, H.top + 4);
    ctx.lineTo(H.x0, L.FLOOR_Y + 30);
    ctx.moveTo(H.x1, H.top + 4);
    ctx.lineTo(H.x1, L.FLOOR_Y + 30);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function niche(ctx, o) {
    const N = L.NICHE;
    V.fillRound(ctx, N.x0 - 6, N.y0 - 6, N.x1 - N.x0 + 12, N.y1 - N.y0 + 16, 8, '#e9f6f6', ink, 3);
    const g = ctx.createLinearGradient(0, N.y0, 0, N.y1);
    g.addColorStop(0, '#2f7f8f');
    g.addColorStop(1, '#4f9fae');
    V.fillRound(ctx, N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0, 6, g);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(N.x0, N.y0, N.x1 - N.x0, 10);
    const b = N.y1; // shelf line
    // bottles: tall blue shampoo, round orange, pink pump
    if (!o.shampooOut) shampoo(ctx, 204, b, 1);
    V.fillRound(ctx, 232, b - 56, 42, 56, 16, '#f39a3d', ink, 3);
    V.fillRound(ctx, 244, b - 66, 18, 12, 4, '#ffffff', ink, 3);
    V.circle(ctx, 253, b - 30, 9, '#ffe2b8');
    V.fillRound(ctx, 284, b - 64, 30, 64, 9, '#f07fa6', ink, 3);
    V.fillRound(ctx, 294, b - 80, 10, 18, 3, '#ffffff', ink, 2.5);
    V.fillRound(ctx, 294, b - 82, 20, 7, 3, '#ffffff', ink, 2.5);
    if (o.duck !== false && o.duck !== 'floor') duck(ctx, 334, b + 1, 0.5, -0.05);
  }

  function plumbing(ctx, o) {
    const x = L.PIPE_X, H = L.HEAD;
    const a = V.deg(H.ang);
    const neck = [H.x + Math.sin(a) * 52, H.y - Math.cos(a) * 52];
    // vertical riser + arm
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, L.MIXER.y);
    ctx.lineTo(x, 66);
    ctx.quadraticCurveTo(x, 50, x - 16, 50);
    ctx.lineTo(neck[0] + 12, 50);
    ctx.quadraticCurveTo(neck[0], 50, neck[0], neck[1]);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = C.chrome;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // wall bracket
    V.fillRound(ctx, x - 14, 280, 28, 16, 5, C.chromeDark, ink, 3);
    // shower head
    ctx.save();
    ctx.translate(H.x, H.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.lineTo(-14, -36);
    ctx.lineTo(14, -36);
    ctx.lineTo(46, 0);
    ctx.closePath();
    const hg = ctx.createLinearGradient(-46, 0, 46, 0);
    hg.addColorStop(0, '#e9eef2');
    hg.addColorStop(0.5, '#aebac3');
    hg.addColorStop(1, '#dfe6eb');
    ctx.fillStyle = hg;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    V.fillRound(ctx, -10, -54, 20, 22, 6, C.chrome, ink, 3);
    V.ellipse(ctx, 0, 0, 47, 11, '#8e9ca6');
    ctx.beginPath();
    ctx.ellipse(0, 0, 47, 11, 0, 0, TAU);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.fillStyle = '#50606b';
    for (let i = -3; i <= 3; i++) {
      for (let r = -1; r <= 1; r++) {
        if (Math.abs(i) === 3 && r !== 0) continue;
        ctx.fillRect(i * 11 - 1.5 + r * 4, r * 4 - 1.5, 3, 3);
      }
    }
    ctx.restore();
    // mixer valve
    const m = L.MIXER;
    V.circle(ctx, m.x, m.y, 26, '#e7edf0', ink, 3);
    V.circle(ctx, m.x, m.y, 12, C.chromeDark, ink, 3);
    V.fillRound(ctx, m.x - 4, m.y - 8, 44, 12, 6, C.chrome, ink, 3);
    V.circle(ctx, m.x - 16, m.y + 14, 4, '#e2463c');
    V.circle(ctx, m.x + 16, m.y + 14, 4, '#3b7dd8');
  }

  function windowPane(ctx, o) {
    const Wn = L.WINDOW;
    const hour = o.hour === undefined ? 7.6 : o.hour;
    const night = hour >= 19 || hour < 5.5;
    // reveal / frame
    V.fillRound(ctx, Wn.x0 - 14, Wn.y0 - 14, Wn.x1 - Wn.x0 + 28, Wn.y1 - Wn.y0 + 28, 8, '#d9cfbf', ink, 3);
    V.fillRound(ctx, Wn.x0, Wn.y0, Wn.x1 - Wn.x0, Wn.y1 - Wn.y0, 4, '#fbfbf7', ink, 3);
    const ix = Wn.x0 + 12, iy = Wn.y0 + 12, iw = Wn.x1 - Wn.x0 - 24, ih = Wn.y1 - Wn.y0 - 24;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip();
    V.sky(ctx, hour, ix, iy, iw, ih);
    const t = o.t || 0;
    if (night) {
      V.stars(ctx, 77, 16, ix, iy, iw, ih * 0.7, t * 2);
      V.moon(ctx, ix + iw * 0.7, iy + ih * 0.26, 16, V.skyColors(hour)[0]);
      // distant rooftops with lit windows
      ctx.fillStyle = '#121a3a';
      ctx.fillRect(ix, iy + ih * 0.72, iw, ih);
      ctx.fillRect(ix + 20, iy + ih * 0.6, 50, ih);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(ix + 32, iy + ih * 0.66, 9, 9);
      ctx.fillRect(ix + 50, iy + ih * 0.78, 9, 9);
      ctx.fillRect(ix + 96, iy + ih * 0.8, 9, 9);
    } else {
      V.sun(ctx, ix + iw * 0.82, iy + ih * 0.18, 16, '#fff2c0');
      V.cloud(ctx, ix + 14 + ((t * 6) % 40), iy + ih * 0.38, 0.32);
      ctx.fillStyle = '#7fbf7a';
      V.circle(ctx, ix + 30, iy + ih + 10, 46, '#6fb46b');
      V.circle(ctx, ix + iw - 20, iy + ih + 24, 50, '#5fa85e');
    }
    // frosted lower half
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(ix, iy + ih * 0.55, iw, ih * 0.45);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 24; i++) V.circle(ctx, ix + V.rand(i * 3.1) * iw, iy + ih * 0.57 + V.rand(i * 7.3) * ih * 0.42, 2 + V.rand(i) * 3, 'rgba(255,255,255,0.45)');
    // fog
    if (o.fog) {
      ctx.fillStyle = `rgba(255,255,255,${0.28 * o.fog})`;
      ctx.fillRect(ix, iy, iw, ih);
    }
    // glass glint
    ctx.beginPath();
    ctx.moveTo(ix + 10, iy + ih * 0.5);
    ctx.lineTo(ix + 40, iy);
    ctx.lineTo(ix + 56, iy);
    ctx.lineTo(ix + 26, iy + ih * 0.5);
    ctx.closePath();
    ctx.fillStyle = night ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.restore();
    // mullions
    V.fillRound(ctx, ix + iw / 2 - 5, iy, 10, ih, 2, '#fbfbf7', ink, 2.5);
    V.fillRound(ctx, ix, iy + ih * 0.55 - 5, iw, 10, 2, '#fbfbf7', ink, 2.5);
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // sill + little plant
    V.fillRound(ctx, Wn.x0 - 24, Wn.y1 + 8, Wn.x1 - Wn.x0 + 48, 16, 5, '#fbfbf7', ink, 3);
    const px = Wn.x1 - 30, py = Wn.y1 + 8;
    const sway = Math.sin((o.t || 0) * 1.3) * 0.04;
    ctx.save();
    ctx.translate(px, py);
    [[-0.5, 36], [0.05, 44], [0.55, 34], [-0.2, 30]].forEach(([a, len]) => {
      ctx.save();
      ctx.rotate(a + sway);
      V.ellipse(ctx, 0, -len * 0.55 - 10, 8, len * 0.5, '#4f9e44');
      ctx.beginPath();
      ctx.ellipse(0, -len * 0.55 - 10, 8, len * 0.5, 0, 0, TAU);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    });
    ctx.beginPath();
    ctx.moveTo(-16, -22);
    ctx.lineTo(16, -22);
    ctx.lineTo(12, 0);
    ctx.lineTo(-12, 0);
    ctx.closePath();
    ctx.fillStyle = '#d9774a';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function vanity(ctx, o) {
    const Vn = L.VANITY;
    // cabinet
    V.fillRound(ctx, Vn.x0, Vn.top + 20, Vn.x1 - Vn.x0, Vn.front - Vn.top - 20, 6, C.wood, ink, 3.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(Vn.x0 + 10, Vn.front - 18, Vn.x1 - Vn.x0 - 20, 14);
    const dw = (Vn.x1 - Vn.x0 - 60) / 3;
    for (let i = 0; i < 3; i++) {
      const dx = Vn.x0 + 20 + i * (dw + 10);
      V.fillRound(ctx, dx, Vn.top + 44, dw, Vn.front - Vn.top - 76, 8, '#d39a6b', V.shade(C.wood, -0.35), 3);
      V.fillRound(ctx, dx + 14, Vn.top + 58, dw - 28, Vn.front - Vn.top - 104, 6, null, 'rgba(255,255,255,0.18)', 3);
      V.fillRound(ctx, dx + dw / 2 - 22, Vn.top + 64, 44, 9, 4, '#e9d6a8', ink, 2.5);
    }
    // counter slab
    V.fillRound(ctx, Vn.x0 - 16, Vn.top, Vn.x1 - Vn.x0 + 32, 30, 6, C.stone, ink, 3.5);
    ctx.fillStyle = 'rgba(160,150,130,0.25)';
    ctx.fillRect(Vn.x0 - 12, Vn.top + 20, Vn.x1 - Vn.x0 + 24, 6);
    // soap pump (left)
    const sx = L.SOAP.x, top = Vn.top + 2;
    V.fillRound(ctx, sx - 18, top - 58, 36, 58, 10, '#9fd8a8', ink, 3);
    V.fillRound(ctx, sx - 5, top - 74, 10, 18, 3, '#ffffff', ink, 2.5);
    V.fillRound(ctx, sx - 5, top - 78, 24, 8, 3, '#ffffff', ink, 2.5);
    V.fillRound(ctx, sx - 10, top - 42, 20, 22, 4, 'rgba(255,255,255,0.7)');
    // cup with toothbrushes (right)
    const cx = L.CUP.x;
    const brush = (bx, by, ang, col) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      V.fillRound(ctx, -5, -86, 10, 92, 5, col, ink, 2.5);
      V.fillRound(ctx, -6, -104, 12, 22, 4, '#ffffff', ink, 2.5);
      ctx.restore();
    };
    brush(cx - 8, top - 30, -0.22, '#f07fa6');
    if (o.brushInCup !== false) brush(cx + 8, top - 30, 0.2, '#3b7dd8');
    ctx.beginPath();
    ctx.moveTo(cx - 26, top - 62);
    ctx.lineTo(cx + 26, top - 62);
    ctx.lineTo(cx + 20, top);
    ctx.lineTo(cx - 20, top);
    ctx.closePath();
    ctx.fillStyle = '#5fb3c1';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    V.line(ctx, cx - 16, top - 50, cx - 13, top - 10, 'rgba(255,255,255,0.5)', 4);
    // toothpaste tube lying on the counter
    ctx.save();
    ctx.translate(cx - 84, top - 9);
    ctx.rotate(-0.06);
    ctx.beginPath();
    ctx.moveTo(-40, -9);
    ctx.lineTo(26, -11);
    ctx.lineTo(30, 9);
    ctx.lineTo(-40, 9);
    ctx.quadraticCurveTo(-46, 0, -40, -9);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    V.fillRound(ctx, -22, -7, 26, 14, 3, '#e2463c');
    V.fillRound(ctx, 28, -7, 14, 14, 3, '#3b7dd8', ink, 2.5);
    ctx.restore();
  }

  function basin(ctx, o) {
    const B = L.BASIN, top = L.VANITY.top + 2;
    // faucet (gooseneck behind the bowl)
    const fx = B.x + 70;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx, top - 10);
    const fy = L.SPOUT.y - 44;
    ctx.lineTo(fx, fy + 26);
    ctx.quadraticCurveTo(fx, fy - 4, fx - 34, fy);
    ctx.quadraticCurveTo(L.SPOUT.x, fy + 4, L.SPOUT.x, L.SPOUT.y);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 17;
    ctx.stroke();
    ctx.strokeStyle = C.chrome;
    ctx.lineWidth = 11;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    V.fillRound(ctx, fx - 16, top - 14, 32, 14, 4, C.chromeDark, ink, 3);
    V.fillRound(ctx, fx + 4, L.SPOUT.y + 12, 34, 10, 5, C.chrome, ink, 2.5);
    // running water
    if (o.faucet > 0) {
      ctx.save();
      ctx.globalAlpha = V.clamp(o.faucet);
      const sx = L.SPOUT.x, sy = L.SPOUT.y + 4;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy);
      ctx.lineTo(sx + 5, sy);
      ctx.lineTo(sx + 6, B.rim + 12);
      ctx.lineTo(sx - 6, B.rim + 12);
      ctx.closePath();
      ctx.fillStyle = 'rgba(170,220,250,0.85)';
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const k = ((o.t || 0) * 3.5 + i / 3) % 1;
        V.line(ctx, sx - 1, sy + k * 40, sx - 1, sy + k * 40 + 10, 'rgba(255,255,255,0.95)', 2.5);
      }
      ctx.restore();
    }
    // vessel bowl
    ctx.beginPath();
    ctx.moveTo(B.x - B.rx, B.rim);
    ctx.bezierCurveTo(B.x - B.rx + 6, top + 4, B.x + B.rx - 6, top + 4, B.x + B.rx, B.rim);
    ctx.closePath();
    const g = ctx.createLinearGradient(B.x - B.rx, 0, B.x + B.rx, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#dfe7ea');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    V.ellipse(ctx, B.x, B.rim, B.rx, 13, '#f7fafb');
    V.ellipse(ctx, B.x, B.rim + 2, B.rx - 10, 8, '#b9c9cf');
    ctx.beginPath();
    ctx.ellipse(B.x, B.rim, B.rx, 13, 0, 0, TAU);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    V.line(ctx, B.x - B.rx + 22, B.rim + 16, B.x - B.rx + 34, B.rim + 22, 'rgba(255,255,255,0.9)', 4);
  }

  function lightBar(ctx, o) {
    const M = L.MIRROR;
    const cx = (M.x0 + M.x1) / 2;
    V.fillRound(ctx, cx - 170, M.y0 - 52, 340, 22, 10, '#2b2f38', ink, 3);
    for (let i = -1; i <= 1; i++) V.circle(ctx, cx + i * 110, M.y0 - 28, 15, o.light === 'warm' ? '#ffe2a8' : '#fffbe8', ink, 2.5);
  }

  // reflected room (what the side mirror sees) + subject + glass effects
  function mirror(ctx, o, fn) {
    const M = L.MIRROR;
    const mo = Object.assign({}, M, o.mirror || {});
    const warm = (o.light || (o.hour >= 17 || o.hour < 5 ? 'warm' : 'cool')) === 'warm';
    // frame
    V.fillRound(ctx, M.x0 - 16, M.y0 - 16, M.x1 - M.x0 + 32, M.y1 - M.y0 + 32, 18, '#f9f6ef', ink, 3.5);
    V.fillRound(ctx, M.x0 - 6, M.y0 - 6, M.x1 - M.x0 + 12, M.y1 - M.y0 + 12, 12, '#d8cdbb');
    ctx.save();
    V.roundRect(ctx, M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0, 10);
    ctx.clip();
    // reflected room: opposite wall with a door and a hanging robe
    const g = ctx.createLinearGradient(0, M.y0, 0, M.y1);
    g.addColorStop(0, warm ? '#cdb79b' : '#d5e3e4');
    g.addColorStop(1, warm ? '#bda686' : '#c4d8da');
    ctx.fillStyle = g;
    ctx.fillRect(M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0);
    ctx.fillStyle = warm ? '#8fb3b2' : '#9fcfd4';
    ctx.fillRect(M.x0, M.y1 - 24, M.x1 - M.x0, 30);
    ctx.fillStyle = warm ? '#2a7686' : '#3a96a8';
    ctx.fillRect(M.x0, M.y1 - 32, M.x1 - M.x0, 10);
    V.fillRound(ctx, M.x0 + 18, M.y0 + 40, 150, 340, 6, warm ? '#9a6d48' : '#bf9670', 'rgba(31,26,36,0.5)', 3);
    V.fillRound(ctx, M.x0 + 34, M.y0 + 60, 118, 120, 6, null, 'rgba(255,255,255,0.18)', 3);
    V.circle(ctx, M.x0 + 150, M.y0 + 220, 7, '#e9d6a8');
    // the subject, mirrored
    if (fn) {
      const ax = mo.axis, ay = mo.axisY, k = mo.k;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.scale(-k, k);
      ctx.translate(-ax, -ay);
      fn(ctx);
      ctx.restore();
    }
    // glass tint + sheen
    ctx.fillStyle = 'rgba(190,225,240,0.12)';
    ctx.fillRect(M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    ctx.moveTo(M.x0 + 250, M.y0);
    ctx.lineTo(M.x0 + 330, M.y0);
    ctx.lineTo(M.x0 + 150, M.y1);
    ctx.lineTo(M.x0 + 70, M.y1);
    ctx.closePath();
    ctx.moveTo(M.x0 + 360, M.y0);
    ctx.lineTo(M.x0 + 385, M.y0);
    ctx.lineTo(M.x0 + 205, M.y1);
    ctx.lineTo(M.x0 + 180, M.y1);
    ctx.closePath();
    ctx.fill();
    // fog with a wiped patch
    if (o.fog > 0) {
      const w = o.wipe;
      ctx.beginPath();
      ctx.rect(M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0);
      if (w) ctx.ellipse(w.x, w.y, w.rx, w.ry, w.rot || 0, 0, TAU);
      ctx.fillStyle = `rgba(245,250,252,${0.55 * o.fog})`;
      ctx.fill('evenodd');
      // drips running through the fog
      ctx.strokeStyle = `rgba(200,225,235,${0.8 * o.fog})`;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const x = M.x0 + 20 + V.rand(i * 4.7 + 1) * (M.x1 - M.x0 - 40);
        const y0 = M.y0 + 10 + V.rand(i * 2.3) * 120;
        const len = 30 + V.rand(i * 8.1) * 90 + (o.t || 0) * 6;
        if (w && ((x - w.x) / w.rx) ** 2 + ((y0 + len / 2 - w.y) / w.ry) ** 2 < 1.2) continue;
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + len);
      }
      ctx.stroke();
      if (w) {
        // smeared rim of the wiped patch
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.rx, w.ry, w.rot || 0, 0, TAU);
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * o.fog})`;
        ctx.lineWidth = 10;
        ctx.stroke();
      }
    }
    ctx.restore();
    V.fillRound(ctx, M.x0, M.y0, M.x1 - M.x0, M.y1 - M.y0, 10, null, 'rgba(31,26,36,0.55)', 2.5);
  }

  function towels(ctx, o) {
    const R = L.RACK;
    // bar + brackets
    V.fillRound(ctx, R.x0 - 10, R.y - 18, 16, 30, 4, C.chromeDark, ink, 3);
    V.fillRound(ctx, R.x1 - 6, R.y - 18, 16, 30, 4, C.chromeDark, ink, 3);
    V.fillRound(ctx, R.x0, R.y - 6, R.x1 - R.x0, 12, 6, C.chrome, ink, 3);
    const towel = (x0, w, len, col, stripe) => {
      // back panel
      V.fillRound(ctx, x0, R.y - 4, w, len, 8, V.shade(col, -0.15), ink, 3.5);
      // front flap
      V.fillRound(ctx, x0 - 3, R.y - 10, w + 6, len * 0.62, 10, col, ink, 3.5);
      ctx.fillStyle = stripe;
      ctx.fillRect(x0, R.y - 10 + len * 0.62 - 34, w, 10);
      ctx.fillRect(x0, R.y - 10 + len * 0.62 - 18, w, 5);
      // fringe on the back panel
      ctx.beginPath();
      for (let x = x0 + 6; x < x0 + w - 4; x += 9) {
        ctx.moveTo(x, R.y - 4 + len);
        ctx.lineTo(x, R.y + 6 + len);
      }
      ctx.strokeStyle = V.shade(col, -0.3);
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    towel(R.x0 + 16, 120, 250, '#f39a3d', '#fff3e0');
    towel(R.x0 + 156, 118, 230, '#f4f1ea', '#5fb3c1');
  }

  function mat(ctx, o) {
    const M = L.MAT;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(M.x0 + 18, M.y0);
    ctx.lineTo(M.x1 - 18, M.y0);
    ctx.quadraticCurveTo(M.x1, M.y0, M.x1 + 6, M.y0 + 12);
    ctx.lineTo(M.x1 + 22, M.y1 - 10);
    ctx.quadraticCurveTo(M.x1 + 26, M.y1, M.x1 + 8, M.y1);
    ctx.lineTo(M.x0 - 8, M.y1);
    ctx.quadraticCurveTo(M.x0 - 26, M.y1, M.x0 - 22, M.y1 - 10);
    ctx.lineTo(M.x0 - 6, M.y0 + 12);
    ctx.quadraticCurveTo(M.x0, M.y0, M.x0 + 18, M.y0);
    ctx.closePath();
    ctx.fillStyle = '#7fb0e0';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      const x = M.x0 + 30 + i * 66;
      ctx.beginPath();
      ctx.moveTo(x, M.y0);
      ctx.lineTo(x + 14, M.y0);
      ctx.lineTo(x + 14 + (x - 520) * 0.06, M.y1);
      ctx.lineTo(x + (x - 520) * 0.06, M.y1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // muddy football kit dropped on the floor (evening): red #10 jersey, black shorts, cleats
  function kitOnFloor(ctx, o) {
    const x = 760, y = 948;
    // shorts
    ctx.save();
    ctx.translate(x - 250, y + 2);
    ctx.rotate(-0.08);
    V.fillRound(ctx, -46, -24, 92, 30, 10, '#1f1f27', ink, 3);
    V.fillRound(ctx, -40, -14, 30, 12, 5, 'rgba(120,80,40,0.6)');
    ctx.restore();
    // jersey heap
    ctx.save();
    ctx.translate(x - 120, y);
    ctx.beginPath();
    ctx.moveTo(-80, 0);
    ctx.quadraticCurveTo(-90, -30, -50, -38);
    ctx.quadraticCurveTo(-20, -56, 20, -40);
    ctx.quadraticCurveTo(70, -48, 80, -12);
    ctx.quadraticCurveTo(84, 4, 60, 4);
    ctx.lineTo(-70, 6);
    ctx.closePath();
    ctx.fillStyle = '#e2463c';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-40, -30);
    ctx.quadraticCurveTo(-10, -18, 30, -32);
    ctx.strokeStyle = '#b8352d';
    ctx.lineWidth = 3;
    ctx.stroke();
    V.text(ctx, '10', 8, -16, { size: 26, weight: 900, color: '#ffffff', rtl: false });
    V.ellipse(ctx, 48, -14, 16, 7, 'rgba(110,72,38,0.7)');
    V.ellipse(ctx, -52, -12, 10, 5, 'rgba(110,72,38,0.6)');
    ctx.restore();
    // cleats
    for (const [cx, rot] of [[x + 10, 0.1], [x + 92, -0.25]]) {
      ctx.save();
      ctx.translate(cx, y + 4);
      ctx.rotate(rot);
      V.fillRound(ctx, -34, -24, 68, 26, 11, '#1f1f27', ink, 3);
      V.fillRound(ctx, -34, -2, 68, 7, 3, '#111');
      V.line(ctx, -12, -14, 14, -16, '#f6c945', 5);
      V.ellipse(ctx, 10, -6, 22, 8, 'rgba(110,72,38,0.85)');
      V.ellipse(ctx, -18, -20, 9, 5, 'rgba(110,72,38,0.7)');
      ctx.restore();
    }
  }

  function leftCorner(ctx, o) {
    // robe on a hook
    V.circle(ctx, -60, 300, 9, C.chromeDark, ink, 3);
    ctx.beginPath();
    ctx.moveTo(-60, 304);
    ctx.quadraticCurveTo(-130, 330, -120, 620);
    ctx.lineTo(10, 620);
    ctx.quadraticCurveTo(10, 330, -60, 304);
    ctx.closePath();
    ctx.fillStyle = '#e88aa6';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    V.line(ctx, -60, 320, -50, 610, 'rgba(0,0,0,0.15)', 5);
    // laundry basket
    ctx.beginPath();
    ctx.moveTo(-190, 700);
    ctx.lineTo(40, 700);
    ctx.lineTo(24, 880);
    ctx.lineTo(-174, 880);
    ctx.closePath();
    ctx.fillStyle = '#d8b07a';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.beginPath();
    for (let y = 730; y < 880; y += 26) {
      ctx.moveTo(-186 + (y - 700) * 0.09, y);
      ctx.lineTo(36 - (y - 700) * 0.09, y);
    }
    ctx.strokeStyle = '#b48a55';
    ctx.lineWidth = 3;
    ctx.stroke();
    V.ellipse(ctx, -70, 694, 100, 16, '#7fb0e0');
    V.fillRound(ctx, -120, 676, 60, 26, 10, '#f6c945');
  }

  // ------------------------------------------------------------------ background (behind the hero)
  function room(ctx, o) {
    const hour = o.hour === undefined ? 7.6 : o.hour;
    const oo = Object.assign({ light: hour >= 17 || hour < 5 ? 'warm' : 'cool' }, o, { hour });
    walls(ctx, oo);
    floor(ctx);
    leftCorner(ctx, oo);
    stall(ctx, oo);
    windowPane(ctx, oo);
    lightBar(ctx, oo);
    mirror(ctx, oo, oo.reflect);
    vanity(ctx, oo);
    basin(ctx, oo);
    towels(ctx, oo);
    mat(ctx, oo);
    if (oo.kit) kitOnFloor(ctx, oo);
    if (oo.duck === 'floor' && oo.duckPos) duck(ctx, oo.duckPos.x, oo.duckPos.y, oo.duckPos.s || 0.6, oo.duckPos.rot || 0);
  }

  function bathroom(ctx, o = {}) {
    ctx.save();
    ctx.fillStyle = C.paint;
    ctx.fillRect(0, 0, V.W, V.H);
    cam(ctx, o.cam || { x: V.W / 2, y: V.H / 2, zoom: 1 });
    room(ctx, o);
    ctx.restore();
  }

  // ------------------------------------------------------------------ curtain (in front of the hero)
  function curtain(ctx, o = {}) {
    const t = o.t || 0;
    const x0 = L.STALL.x0 + 4, x1 = L.HALF_WALL.x0 - 2;
    const top = L.ROD_Y + 8, hem = L.HEM_Y;
    const alpha = o.alpha === undefined ? 0.86 : o.alpha;
    const sway = o.sway === undefined ? 1 : o.sway;
    const folds = 14;
    const fw = (x1 - x0) / folds;
    const hemY = (x) => hem + Math.sin(x * 0.045 + t * 2.2) * 5 * sway + Math.sin(x * 0.11 - t * 3.1) * 2.5 * sway;
    const edge = (x) => x + Math.sin(t * 1.7 + x * 0.01) * 4 * sway;
    ctx.save();
    // body
    const body = new Path2D();
    body.moveTo(x0, top);
    for (let i = 0; i <= folds; i++) {
      const x = x0 + i * fw;
      body.lineTo(x, top + (i % 2 ? 4 : 0));
    }
    body.lineTo(edge(x1), hemY(x1));
    for (let i = folds - 1; i >= 0; i--) {
      const x = x0 + i * fw, xm = x + fw / 2;
      body.quadraticCurveTo(edge(xm), hemY(xm) + 13, edge(x), hemY(x));
    }
    body.closePath();
    ctx.globalAlpha = alpha;
    const col = o.color || C.curtain;
    ctx.fillStyle = col;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    // fold shading (one gradient with repeating stops)
    const fg = ctx.createLinearGradient(x0, 0, x1, 0);
    for (let i = 0; i < folds; i++) {
      const k0 = i / folds, k1 = (i + 1) / folds;
      fg.addColorStop(k0 + 0.001, 'rgba(255,255,255,0.28)');
      fg.addColorStop(V.lerp(k0, k1, 0.45), 'rgba(255,255,255,0)');
      fg.addColorStop(k1 - 0.001, 'rgba(160,90,0,0.22)');
    }
    ctx.fillStyle = fg;
    ctx.fillRect(x0, top, x1 - x0 + 10, hem - top + 24);
    // pattern: little white bubbles + blue waves
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 16; c++) {
        const px = x0 + 20 + c * 46 + (r % 2) * 23 + Math.sin(t * 1.7 + c) * 1.5 * sway;
        const py = top + 26 + r * 44;
        const rr = 6 + ((r * 7 + c * 3) % 3) * 2;
        ctx.moveTo(px + rr, py);
        ctx.arc(px, py, rr, 0, TAU);
      }
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,170,200,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = x0; x < x1; x += 10) {
      const y = hem - 34 + Math.sin(x * 0.08) * 5;
      ctx[x === x0 ? 'moveTo' : 'lineTo'](x, y);
    }
    ctx.stroke();
    // wet streaks
    if (o.wet) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * o.wet})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const x = x0 + 30 + V.rand(i * 3.7 + 2) * (x1 - x0 - 60);
        const y0 = top + 30 + V.rand(i * 1.3) * 120;
        const len = 30 + V.rand(i * 5.9) * 60 + ((t * 40 + i * 13) % 40);
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y0 + len);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke(body);
    // fold lines
    ctx.beginPath();
    for (let i = 1; i < folds; i++) {
      const x = x0 + i * fw;
      ctx.moveTo(x, top + 6);
      ctx.lineTo(edge(x), hemY(x) - 4);
    }
    ctx.strokeStyle = 'rgba(150,90,10,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // rod + rings
    ctx.save();
    V.fillRound(ctx, L.STALL.x0 - 6, L.ROD_Y - 7, L.HALF_WALL.x0 - L.STALL.x0 + 20, 14, 7, C.chrome, ink, 3);
    V.line(ctx, L.STALL.x0, L.ROD_Y - 3, L.HALF_WALL.x0, L.ROD_Y - 3, 'rgba(255,255,255,0.85)', 2.5);
    V.fillRound(ctx, L.STALL.x0 - 8, L.ROD_Y - 12, 14, 24, 4, C.chromeDark, ink, 3);
    V.fillRound(ctx, L.HALF_WALL.x0 - 4, L.ROD_Y - 12, 14, 24, 4, C.chromeDark, ink, 3);
    ctx.beginPath();
    for (let i = 0; i <= folds; i += 1) {
      const x = x0 + i * fw;
      ctx.moveTo(x + 7, L.ROD_Y + 2);
      ctx.ellipse(x, L.ROD_Y + 2, 7, 10, 0, 0, TAU);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.strokeStyle = '#f4f7f8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ water
  const headDir = () => {
    const a = V.deg(L.HEAD.ang);
    return [-Math.sin(a), Math.cos(a)];
  };
  function water(ctx, o = {}) {
    const on = o.on === undefined ? 1 : o.on;
    if (on <= 0) return;
    const t = o.t || 0;
    const H = L.HEAD;
    const a = V.deg(H.ang);
    const [dx0, dy0] = headDir();
    const px = Math.cos(a), py = Math.sin(a); // across the head face
    const yEnd = o.yEnd || L.SHOWER_Y;
    const hits = o.hits || [];
    const N = o.n || 30;
    const mud = o.mud || 0;
    const streakCol = mud > 0 ? V.mixColor('#ffffff', '#d9b98a', mud * 0.6) : '#ffffff';
    ctx.save();
    ctx.lineCap = 'round';
    const ends = [];
    const faint = new Path2D(), bright = new Path2D(), blue = new Path2D();
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1) - 0.5;
      const ox = H.x + px * u * 80 + dx0 * 8, oy = H.y + py * u * 80 + dy0 * 8;
      const spread = u * (o.spread || 0.62) + (V.rand(i * 3.3) - 0.5) * 0.08;
      const dx = dx0 * Math.cos(spread) - dy0 * Math.sin(spread);
      const dy = dx0 * Math.sin(spread) + dy0 * Math.cos(spread);
      // length to the floor
      let len = (yEnd - oy) / dy;
      let hit = null;
      for (const c of hits) {
        // ray-circle intersection
        const fx = ox - c.x, fy = oy - c.y;
        const b = fx * dx + fy * dy;
        const cc = fx * fx + fy * fy - c.r * c.r;
        const disc = b * b - cc;
        if (disc > 0) {
          const d = -b - Math.sqrt(disc);
          if (d > 0 && d < len) {
            len = d;
            hit = c;
          }
        }
      }
      len *= Math.min(1, on * 1.4);
      const ex = ox + dx * len, ey = oy + dy * len;
      faint.moveTo(ox, oy);
      faint.lineTo(ex, ey);
      // moving streaks
      const speed = 1500, cyc = 320;
      const segL = 34 + V.rand(i * 1.7) * 36;
      for (let k = 0; k < 4; k++) {
        const ph = ((t * speed) / cyc + k / 4 + V.rand(i * 7.1 + k) * 0.2) % 1;
        const d0 = ph * cyc - segL * 0.5 + V.rand(i * 2.9) * 40;
        if (d0 < 0) continue;
        if (d0 > len) continue;
        const d1 = Math.min(len, d0 + segL);
        blue.moveTo(ox + dx * d0, oy + dy * d0);
        blue.lineTo(ox + dx * d1, oy + dy * d1);
        bright.moveTo(ox + dx * d0, oy + dy * d0);
        bright.lineTo(ox + dx * d1, oy + dy * d1);
      }
      ends.push({ x: ex, y: ey, hit, i, dx, dy });
    }
    ctx.globalAlpha = 0.3 * on;
    ctx.strokeStyle = mud > 0 ? V.mixColor('#bfe6ff', '#c8a070', mud * 0.5) : '#bfe6ff';
    ctx.lineWidth = 4;
    ctx.stroke(faint);
    ctx.globalAlpha = 0.6 * on;
    ctx.strokeStyle = '#6fb9e6';
    ctx.lineWidth = 6;
    ctx.stroke(blue);
    ctx.globalAlpha = 0.95 * on;
    ctx.strokeStyle = streakCol;
    ctx.lineWidth = 2.6;
    ctx.stroke(bright);
    // splashes where the water hits something (or the floor)
    ctx.globalAlpha = on;
    const drops = new Path2D();
    const dropsHi = new Path2D();
    ends.forEach((e) => {
      const n = e.hit ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const seed = e.i * 17.3 + k * 5.1;
        const life = 0.32;
        const ph = ((t / life) + V.rand(seed)) % 1;
        const ang = (V.rand(seed + 2) - 0.5) * 2.4 + (e.hit ? Math.atan2(e.y - e.hit.y, e.x - e.hit.x) + Math.PI / 2 : -Math.PI / 2 + Math.PI / 2);
        const sp = 160 + V.rand(seed + 3) * 200;
        const vx = Math.cos(ang - Math.PI / 2) * sp, vy = Math.sin(ang - Math.PI / 2) * sp;
        const tt = ph * life;
        const x = e.x + vx * tt, y = e.y + vy * tt + 0.5 * 2400 * tt * tt;
        const r = (3.4 + V.rand(seed + 4) * 2.4) * (1 - ph * 0.5);
        drops.moveTo(x + r, y);
        drops.arc(x, y, r, 0, TAU);
        dropsHi.moveTo(x - r * 0.3 + r * 0.35, y - r * 0.3);
        dropsHi.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, TAU);
      }
    });
    ctx.fillStyle = mud > 0 ? V.mixColor('#7fc4ee', '#a8774a', mud) : '#7fc4ee';
    ctx.fill(drops);
    ctx.fillStyle = '#ffffff';
    ctx.fill(dropsHi);
    ctx.restore();
  }

  // ------------------------------------------------------------------ steam
  // soft round puff sprite, built once (static image, no animation state)
  let puffImg = null;
  const puff = () => {
    if (puffImg) return puffImg;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.45, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    puffImg = c;
    return c;
  };
  function steam(ctx, o = {}) {
    const amount = o.amount === undefined ? 1 : o.amount;
    if (amount <= 0) return;
    const t = o.t || 0;
    const x0 = o.x0 === undefined ? L.STALL.x0 : o.x0, x1 = o.x1 === undefined ? L.STALL.x1 : o.x1;
    const y = o.y === undefined ? 560 : o.y;
    const rise = o.rise || 520;
    const n = o.n || 14;
    const seed = o.seed || 1;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const per = 3 + V.rand(seed + i * 2.1) * 2.5;
      const ph = ((t / per) + V.rand(seed + i * 5.3)) % 1;
      const bx = x0 + V.rand(seed + i * 9.7) * (x1 - x0);
      const x = bx + Math.sin(ph * 4 + i) * 30 + ph * 40 * (V.rand(seed + i) - 0.3);
      const yy = y - ph * rise;
      const r = (55 + V.rand(seed + i * 1.1) * 60) * (0.55 + ph * 1.2);
      const a = amount * 0.5 * Math.sin(Math.PI * ph);
      ctx.globalAlpha = a;
      ctx.drawImage(puff(), x - r * 1.2, yy - r, r * 2.4, r * 2);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ puddle + drain swirl
  // o = {t, mud 0..1 (brown -> clear), x0: left edge of the puddle (under the feet), amount 0..1}
  function drain(ctx, o = {}) {
    const t = o.t || 0, mud = o.mud || 0, amt = o.amount === undefined ? 1 : o.amount;
    if (amt <= 0) return;
    const d = L.DRAIN;
    const x0 = o.x0 === undefined ? 380 : o.x0;
    const wcol = V.mixColor('#9fd6ee', '#8b5a2f', mud);
    ctx.save();
    ctx.globalAlpha = amt;
    // puddle film on the tray
    ctx.beginPath();
    ctx.moveTo(x0, 864);
    ctx.quadraticCurveTo(x0 + 10, 848, (x0 + d.x) / 2, 849);
    ctx.quadraticCurveTo(d.x + 60, 848, d.x + 70, 864);
    ctx.quadraticCurveTo(d.x + 60, 882, (x0 + d.x) / 2, 881);
    ctx.quadraticCurveTo(x0 + 6, 880, x0, 864);
    ctx.fillStyle = V.rgba(wcol, 0.55 + 0.25 * mud);
    ctx.fill();
    // flow streaks heading to the drain
    ctx.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const ph = ((t * 1.6) + i / 7) % 1;
      const xa = V.lerp(x0 + 20, d.x - 40, ph), ya = 856 + (i % 3) * 9;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * Math.sin(Math.PI * ph)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.lineTo(xa + 26, ya + (d.y - ya) * 0.2);
      ctx.stroke();
    }
    // swirl (spiral arms in perspective) round the drain
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(1, 0.3);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let s2 = 0; s2 <= 24; s2++) {
        const u = s2 / 24;
        const r = 64 - 52 * u;
        const a = t * 7 + k * (TAU / 3) + u * 4.2;
        ctx[s2 ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.strokeStyle = V.rgba(V.shade(wcol, -0.35), 0.8);
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    // debris: mud lumps + grass blades orbiting into the drain
    for (let i = 0; i < 7; i++) {
      const per = 1.1 + V.rand(i * 3.7) * 0.6;
      const ph = ((t / per) + V.rand(i * 1.9)) % 1;
      const r = 62 * (1 - ph) + 4;
      const a = t * 6 + i * 1.7 + ph * 6;
      const x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r * 0.24;
      const k = 1 - ph * 0.7;
      if (i % 2 === 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a * 1.5);
        ctx.globalAlpha = amt * Math.min(1, mud * 2 + 0.2);
        V.line(ctx, -9 * k, 0, 9 * k, 0, '#4f9e44', 3.5);
        ctx.restore();
      } else {
        ctx.globalAlpha = amt * mud;
        V.ellipse(ctx, x, y, 6 * k, 3.5 * k, '#6b4424');
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ light pass (screen, last)
  function light(ctx, o = {}) {
    const hour = o.hour === undefined ? 7.6 : o.hour;
    const warm = (o.light || (hour >= 17 || hour < 5 ? 'warm' : 'cool')) === 'warm';
    const c = o.cam || { x: V.W / 2, y: V.H / 2, zoom: 1 };
    const st = o.steam === undefined ? 0.6 : o.steam;
    ctx.save();
    cam(ctx, c);
    const Wn = L.WINDOW;
    ctx.globalCompositeOperation = 'lighter';
    if (!warm) {
      // morning sun shafts from the window, down-left through the steam
      const shafts = [[0.0, 0.32], [0.38, 0.62], [0.7, 1.0]];
      shafts.forEach(([a, b], i) => {
        const xa = V.lerp(Wn.x0 + 12, Wn.x1 - 12, a), xb = V.lerp(Wn.x0 + 12, Wn.x1 - 12, b);
        const g = ctx.createLinearGradient(Wn.x0, Wn.y0, Wn.x0 - 420, Wn.y0 + 760);
        const k = (0.05 + 0.07 * st) * (0.8 + 0.2 * Math.sin((o.t || 0) * 0.9 + i * 1.7));
        g.addColorStop(0, `rgba(255,236,180,${k})`);
        g.addColorStop(1, 'rgba(255,236,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(xa, Wn.y0 + 20);
        ctx.lineTo(xb, Wn.y0 + 20);
        ctx.lineTo(xb - 560, Wn.y0 + 820);
        ctx.lineTo(xa - 640, Wn.y0 + 820);
        ctx.closePath();
        ctx.fill();
      });
    } else {
      // warm glow of the vanity lights (only when they are in view)
      const M = L.MIRROR, lx = (M.x0 + M.x1) / 2, ly = M.y0 - 30;
      const [sx] = toScreen(c, lx, ly);
      if (sx > -400 && sx < V.W + 400) {
        const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 380);
        g.addColorStop(0, 'rgba(255,190,110,0.22)');
        g.addColorStop(1, 'rgba(255,190,110,0)');
        ctx.fillStyle = g;
        ctx.fillRect(lx - 380, ly - 380, 760, 760);
      }
    }
    ctx.restore();
    // global grade
    ctx.save();
    if (warm) {
      // single multiply pass: warm lamp light in the upper middle, falling off to dusky corners
      ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(V.W * 0.45, V.H * 0.25, V.H * 0.1, V.W * 0.5, V.H * 0.45, V.H * 1.05);
      g.addColorStop(0, '#ffe2bf');
      g.addColorStop(0.55, '#f6c79a');
      g.addColorStop(1, '#a8785e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, V.W, V.H);
    } else {
      V.tint(ctx, '#eaf4ff', 0.12, 'multiply');
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ rig kit
  const full = (pose) => Object.assign(V.boy.pose.stand(), pose);
  const kit = {
    full,
    toWorld(x, y, s, pose, lx, ly) {
      const r = V.deg(pose.rot || 0);
      const px = lx * Math.cos(r) - ly * Math.sin(r), py = lx * Math.sin(r) + ly * Math.cos(r);
      return [x + (pose.facing || 1) * s * px, y + s * py];
    },
    toLocal(x, y, s, pose, wx, wy) {
      const px = (wx - x) / ((pose.facing || 1) * s), py = (wy - y) / s;
      const r = -V.deg(pose.rot || 0);
      return [px * Math.cos(r) - py * Math.sin(r), px * Math.sin(r) + py * Math.cos(r)];
    },
    headPt(pose, hx, hy) {
      const p = full(pose);
      const j = V.boy.fk(p);
      const a = V.deg(p.torso + p.head);
      return [j.head[0] + hx * Math.cos(a) - hy * Math.sin(a), j.head[1] + hx * Math.sin(a) + hy * Math.cos(a)];
    },
    headWorld(x, y, s, pose, hx = 0, hy = 0) {
      const l = kit.headPt(pose, hx, hy);
      return kit.toWorld(x, y, s, pose, l[0], l[1]);
    },
    ik(pose, side, lx, ly, bend = 1) {
      const D = V.boy.D;
      const p = full(pose);
      const j = V.boy.fk(p);
      const s0 = side === 'far' ? j.armFar.s : j.armNear.s;
      const dx = lx - s0[0], dy = ly - s0[1];
      const d = V.clamp(Math.hypot(dx, dy), Math.abs(D.UA - D.FA) + 1, D.UA + D.FA - 0.01);
      const th = Math.atan2(dx, dy);
      const a = Math.acos(V.clamp((D.UA * D.UA + d * d - D.FA * D.FA) / (2 * D.UA * d), -1, 1));
      const b = Math.acos(V.clamp((D.UA * D.UA + D.FA * D.FA - d * d) / (2 * D.UA * D.FA), -1, 1));
      const ua = th - bend * a;
      const el = bend * (Math.PI - b);
      return { sh: (ua * 180) / Math.PI - p.torso, el: (el * 180) / Math.PI };
    },
    aim(pose, side, lx, ly) {
      const p = full(pose);
      const j = V.boy.fk(p);
      const arm = side === 'far' ? j.armFar : j.armNear;
      const phi = Math.atan2(ly - arm.h[1], lx - arm.h[0]);
      const base = Math.PI / 2 - V.deg(arm.fa);
      return { ang: phi - base, dist: Math.hypot(lx - arm.h[0], ly - arm.h[1]) };
    },
    headFrame(ctx, x, y, s, pose) {
      const p = full(pose);
      const j = V.boy.fk(p);
      ctx.translate(x, y);
      ctx.scale((p.facing || 1) * s, s);
      ctx.rotate(V.deg(p.rot || 0));
      ctx.translate(j.head[0], j.head[1]);
      ctx.rotate(V.deg(p.torso + p.head));
    },
    down(pose) {
      const p = full(pose);
      const a = V.deg((p.rot || 0) + p.torso + p.head);
      return [Math.sin(a), Math.cos(a)];
    },
  };

  bathroom.L = L;
  bathroom.C = C;
  bathroom.cam = cam;
  bathroom.toScreen = toScreen;
  bathroom.room = room;
  bathroom.curtain = curtain;
  bathroom.water = water;
  bathroom.steam = steam;
  bathroom.mirror = mirror;
  bathroom.light = light;
  bathroom.foam = foam;
  bathroom.bubble = bubble;
  bathroom.duck = duck;
  bathroom.shampoo = shampoo;
  bathroom.drain = drain;
  bathroom.sparkle = sparkle;
  bathroom.kit = kit;
  V.env.bathroom = bathroom;
})();
