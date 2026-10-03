// Shared helpers for the 'bedroom' location group (scenes 01-wake, 04-dress, 15-homework, 17-sleep).
//
// ============================================================================================
//  THE HERO'S BEDROOM — API
// ============================================================================================
//
//  Everything is drawn in fixed WORLD coordinates (px) and mapped to the screen by a camera:
//
//     cam = { x, y, zoom }   world point (x, y) lands on the screen centre; zoom 1 = 1:1.
//     default {x: 960, y: 540, zoom: 1} shows world x 0..1920 (door ... desk).
//     Walls / floor are painted far past the furniture, so any cam with zoom >= 0.7 and
//     x in [-300, 3000] never shows an edge.
//
//  One call does the whole frame (recommended):
//
//     V.env.bedroomScene(ctx, o, actors, front)
//        actors(ctx)  draw people in WORLD coords. Drawn after the bed/pillow and BEFORE the
//                     blanket, so a hero lying in bed ends up under the blanket.
//        front(ctx)   optional, drawn after the blanket (e.g. someone standing in front of the bed).
//        Both layers get the same night lighting as the room (see o.light).
//
//  Options `o` (all optional):
//     cam            {x, y, zoom}                     camera (see above)
//     hour           0..24   sky in the window (7.5 morning, 15 afternoon, 19 dusk, 1.5 night)
//     light          0..1    0 = dark night (moonlight + LED glow only), 1 = full daylight
//     actorLight     0..1    lighting for the actors/blanket layers (default = light); a touch
//                            higher than `light` keeps characters readable at night
//     t              seconds (animates clouds, stars, dust motes, clock shake)
//     clockTime      'HH:MM' shown on the bedside LED clock (default '07:30')
//     clockRing      0..1    clock shakes + ring lines (V.alarmClock ring)
//     clockSquash    0..1    squash the clock (snooze slam)
//     lamp           bool/0..1  desk lamp on
//     doorOpen       0..1    room door (hinge on the LEFT, swings into the room toward camera)
//     hallLight      0..1    lit hallway behind the door (warm light wedge on the floor at night)
//     wardrobeOpen   0..1    both wardrobe doors
//     curtain        0..1    0 = curtains tied open, 1 = drawn closed
//     bedSquash      px      mattress compression (a body flopping onto the bed)
//     blanket        false | { edge, lumps, heap }   (see V.env.bedroomBlanket)
//     backpack       bool    blue school backpack leaning by the wardrobe (default true)
//     ball           bool    football under the desk (default true)
//     hide           {nightstand, clock, bed, chair: true}  skip pieces (custom compositions)
//     sky            fn(ctx, {x, y, w, h})  extra drawing inside the window glass (birds, plane)
//     pillowDent     px      dent in the pillow top (default 10)
//
//  Lower-level pieces (each applies o.cam itself, balanced save/restore):
//     V.env.bedroom(ctx, o)          the room only (walls, furniture, bed, pillow, clock)
//     V.env.bedroomBlanket(ctx, o)   just the blanket
//     V.env.bedroomCam(ctx, cam)     apply the camera transform (caller saves/restores)
//     V.env.bedroomToScreen(cam, x, y) -> [sx, sy]
//     V.env.bedroomClock(ctx, o)     the LED clock alone (world coords, camera applied)
//     V.env.bedroomDimLayer(ctx, light, fn)  draw fn(ctx) with the room's night lighting
//     V.env.bedroomIK.leg(pose, x, y, s, 'near'|'far', [wx, wy])   2-bone IK: put an ankle on a
//     V.env.bedroomIK.arm(pose, x, y, s, 'near'|'far', [wx, wy], flip)  point / a hand on a prop
//                    (mutates pose.legNear/legFar or armNear/armFar; returns the pose;
//                     flip = true bends the elbow the other way)
//     V.env.bedroomLumps(j)          blanket lump profile for a hero lying under it (j = V.boy.joints)
//
//  BLANKET  o.blanket = { edge, lumps, heap }
//     edge   world x of the blanket's head-side edge (folded white hem). Head is on the LEFT,
//            so the blanket covers edge -> foot of the bed. ~ bed.mattressX0+170 = up to the chin.
//     lumps  [[x, h], ...] heights (px) above the mattress, e.g. from V.env.bedroomLumps(joints)
//     heap   0..1  blanket thrown back / bunched up
//
//  LAYOUT  V.env.BEDROOM (world px) — hero scale in this set: heroScale 1.25 (standing ~555 px tall)
//     floorY 900          feet stand here (B.standY(floorY, 1.25, pose))
//     door                x 120..400, top 252, bottom 882, handle at u=0.88 (see doorHandle(open))
//     nightstand          x 452..648, top 760
//     clock               {x: 556, y: 760, s: 0.42}  (bottom-centre, as V.alarmClock takes it)
//     bed                 head on the LEFT. headboard x 652..700; mattress x 696..1404, top 770;
//                         pillow x 708..886; footboard x 1398..1442
//        bed.lie          {x: 1030, y: 734}  hip for V.boy.pose.lie({facing: 1, head: 24, torso: 6})
//                         -> head on the pillow, feet toward the foot end
//        bed.sit          {x: 1030, y: 750}  hip when sitting up / on the mattress edge (facing 1)
//     window              glass x 866..1234, y 176..514 (above the bed); curtain rod y 142
//     desk                x 1720..2170, top 650 (lamp at x 2112, notebook ~1830..1950)
//     chair               seat x 1588..1704, seat top 772; P.sit() hip {x: 1642, y: 746}, facing 1
//                         (feet on the floor, knees under the desk, hands reach the desk top)
//     shelf               x 1750..2140, y 382 (books, trophy)
//     wardrobe            x 2240..2640, top 200, bottom 896 (two doors, mirror on the right door);
//                         standing in front of it: x ~2440
//     backpack            leaning at x ~2205 on the floor (o.backpack: false hides it)
//     standing hip        B.standY(900, 1.25, P.stand()) = 640.5
//
//  LIGHTING ORDER (inside bedroomScene): room -> night dim -> practical lights that actors can
//  occlude (window sky, lit hallway, the LED clock re-drawn bright + the hot core of its red
//  spill) -> actors/blanket/front (dimmed with the same maths) -> additive glows on top
//  (sun/moon beams, dust motes, lamp cone, hallway wedge, the wide faint red LED spill).
//  Daylight (light 1) skips all the dimming.
//
//  EXAMPLE (hero at his desk in the evening, camera on the desk):
//     const BR = V.env.BEDROOM, B = V.boy, S = BR.heroScale;
//     V.env.bedroomScene(ctx, { cam: {x: 1800, y: 560, zoom: 1.5}, hour: 19, light: 0.45,
//         actorLight: 0.55, lamp: 1, t, clockTime: '19:00' },
//       null,                                              // nobody in bed
//       (c) => B.draw(c, BR.chair.hip.x, BR.chair.hip.y, S, B.pose.sit({ outfit: 'home' })));
//  (Someone in bed goes in `actors` so the blanket covers them; anyone standing on the floor
//   in front of the bed goes in `front`.)
// ============================================================================================
(function () {
  const V = window.V;
  V.env = V.env || {};
  const INK = V.pal.ink;
  const D2R = Math.PI / 180;

  const BR = {
    heroScale: 1.25,
    floorY: 900,
    wallBase: 862,
    railY: 604,
    ceilY: 20,
    door: { x0: 120, x1: 400, top: 252, bottom: 882, maxAngle: 80 },
    nightstand: { x0: 452, x1: 648, top: 760 },
    clock: { x: 556, y: 760, s: 0.42 },
    bed: {
      headX0: 652, headX1: 700, headTop: 548,
      mattressX0: 696, mattressX1: 1404, mattressTop: 770, mattressBottom: 830,
      pillowX0: 708, pillowX1: 886, pillowTop: 714,
      footX0: 1398, footX1: 1442, footTop: 732,
      lie: { x: 1030, y: 734 },
      sit: { x: 1030, y: 750 },
    },
    window: { x0: 846, x1: 1254, top: 156, bottom: 534, glass: { x0: 866, x1: 1234, y0: 176, y1: 514 }, rodY: 142 },
    posterSpace: { x0: 470, x1: 636, y0: 300, y1: 510 },
    posterFootball: { x0: 1338, x1: 1530, y0: 236, y1: 494 },
    desk: { x0: 1720, x1: 2170, top: 650 },
    chair: { x0: 1588, x1: 1704, seatY: 772, hip: { x: 1642, y: 746 } },
    shelf: { x0: 1750, x1: 2140, y: 382 },
    lamp: { x: 2112, y: 650, head: { x: 2030, y: 478 } },
    wardrobe: { x0: 2240, x1: 2640, top: 200, bottom: 896 },
    backpack: { x: 2205, y: 900 },
    rug: { x: 1060, y: 934, rx: 380, ry: 34 },
  };
  V.env.BEDROOM = BR;

  // ---------------------------------------------------------------- camera
  const camOf = (c) => Object.assign({ x: 960, y: 540, zoom: 1 }, c || {});
  V.env.bedroomCam = (ctx, cam) => {
    const c = camOf(cam);
    ctx.translate(V.W / 2, V.H / 2);
    ctx.scale(c.zoom, c.zoom);
    ctx.translate(-c.x, -c.y);
  };
  V.env.bedroomToScreen = (cam, x, y) => {
    const c = camOf(cam);
    return [(x - c.x) * c.zoom + V.W / 2, (y - c.y) * c.zoom + V.H / 2];
  };

  const opts = (o) =>
    Object.assign(
      { hour: 12, light: 1, t: 0, clockTime: '07:30', clockRing: 0, clockSquash: 0, lamp: 0, doorOpen: 0, hallLight: 0, wardrobeOpen: 0, curtain: 0, bedSquash: 0, backpack: true, ball: true },
      o || {},
      { cam: camOf(o && o.cam) },
    );

  // ---------------------------------------------------------------- small helpers
  const poly = (ctx, pts, fill, stroke, lw = 4) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
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
  const box = (ctx, x, y, w, h, fill, stroke = INK, lw = 4) => {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  };
  // night factor of the sky for an hour (0 day .. 1 night)
  const nightK = (h) => {
    h = ((h % 24) + 24) % 24;
    if (h >= 20.5 || h < 4.8) return 1;
    if (h >= 18.2) return V.seg(h, 18.2, 20.5);
    if (h < 6.6) return 1 - V.seg(h, 4.8, 6.6);
    return 0;
  };

  // ---------------------------------------------------------------- walls / floor
  function drawShell(ctx) {
    const top = '#f1d9b8', low = '#dfbd95';
    ctx.fillStyle = '#e4cba8';
    ctx.fillRect(-3000, -3000, 9000, 3000 + BR.ceilY);
    ctx.fillStyle = top;
    ctx.fillRect(-3000, BR.ceilY, 9000, BR.railY - BR.ceilY);
    // soft wallpaper stripes
    ctx.fillStyle = 'rgba(170,110,60,0.055)';
    for (let x = -1520; x < 4600; x += 76) ctx.fillRect(x, BR.ceilY, 30, BR.railY - BR.ceilY);
    // crown molding
    ctx.fillStyle = '#f8f1e6';
    ctx.fillRect(-3000, BR.ceilY, 9000, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(-3000, BR.ceilY + 16, 9000, 6);
    // lower wall (wainscot) + rail
    ctx.fillStyle = low;
    ctx.fillRect(-3000, BR.railY, 9000, BR.wallBase - BR.railY);
    ctx.fillStyle = 'rgba(120,70,30,0.07)';
    for (let x = -1500; x < 4600; x += 150) ctx.fillRect(x, BR.railY + 30, 6, BR.wallBase - BR.railY - 60);
    ctx.fillStyle = '#f8f1e6';
    ctx.fillRect(-3000, BR.railY - 8, 9000, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(-3000, BR.railY + 6, 9000, 4);
    // floor
    const fy = BR.wallBase;
    const g = ctx.createLinearGradient(0, fy, 0, fy + 260);
    g.addColorStop(0, '#9f6c48');
    g.addColorStop(1, '#bd875e');
    ctx.fillStyle = g;
    ctx.fillRect(-3000, fy, 9000, 3000);
    // planks (perspective spacing) + staggered seams
    let y = fy, gap = 13, row = 0;
    ctx.strokeStyle = 'rgba(80,45,25,0.35)';
    ctx.lineWidth = 2.5;
    while (y < 2200) {
      const y2 = y + gap;
      ctx.beginPath();
      ctx.moveTo(-3000, y2);
      ctx.lineTo(6000, y2);
      ctx.stroke();
      const off = (row * 173) % 420;
      ctx.beginPath();
      for (let x = -1500 + off; x < 4600; x += 420) {
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x, y2 - 2);
      }
      ctx.stroke();
      y = y2;
      gap *= 1.32;
      row++;
    }
    // contact shadow where floor meets wall
    const sh = ctx.createLinearGradient(0, fy, 0, fy + 40);
    sh.addColorStop(0, 'rgba(40,20,10,0.35)');
    sh.addColorStop(1, 'rgba(40,20,10,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(-3000, fy, 9000, 40);
    // baseboard
    ctx.fillStyle = '#f6eee2';
    ctx.fillRect(-3000, fy - 26, 9000, 26);
    V.line(ctx, -3000, fy - 26, 6000, fy - 26, 'rgba(0,0,0,0.18)', 3);
    V.line(ctx, -3000, fy, 6000, fy, 'rgba(60,30,15,0.5)', 3);
    // light switch left of the door
    V.fillRound(ctx, 50, 548, 40, 62, 6, '#f8f3ea', INK, 3);
    V.fillRound(ctx, 63, 564, 14, 28, 4, '#e3dccf', INK, 2);
  }

  // ---------------------------------------------------------------- door
  // door panel geometry for an opening amount (0..1); exported for scenes that want the handle
  function doorGeom(open) {
    const d = BR.door;
    const W = d.x1 - d.x0;
    const th = V.clamp(open) * BR.door.maxAngle * D2R;
    const sn = Math.sin(th);
    const cw = W * Math.cos(th);
    const xf = d.x0 + cw;
    const topF = d.top - 24 * sn, botF = d.bottom + 40 * sn;
    const P = (u, v) => {
      const yt = V.lerp(d.top, topF, u), yb = V.lerp(d.bottom, botF, u);
      return [d.x0 + u * cw, yt + v * (yb - yt)];
    };
    return { th, sn, cw, xf, topF, botF, P, persp: 1 + 0.16 * sn };
  }
  V.env.bedroomDoorHandle = (open) => {
    const g = doorGeom(open);
    return g.P(0.88, 0.535);
  };

  function drawHall(ctx, lit) {
    const d = BR.door;
    // hallway: far wall, a framed picture, floor strip
    ctx.fillStyle = lit ? '#f4c27c' : '#cfae86';
    ctx.fillRect(d.x0, d.top, d.x1 - d.x0, d.bottom - d.top);
    ctx.fillStyle = lit ? '#e0a058' : '#b8946c';
    ctx.fillRect(d.x0, d.bottom - 64, d.x1 - d.x0, 64);
    ctx.fillStyle = lit ? 'rgba(120,60,10,0.18)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(d.x0, d.top, d.x1 - d.x0, 34);
    V.fillRound(ctx, d.x0 + 150, d.top + 150, 84, 104, 4, lit ? '#a8662c' : '#8a6a4c', INK, 3);
    V.fillRound(ctx, d.x0 + 160, d.top + 160, 64, 84, 2, lit ? '#ffe0a8' : '#d9c7a8');
    V.circle(ctx, d.x0 + 192, d.top + 190, 12, lit ? '#f39a3d' : '#c49064');
  }

  function drawDoor(ctx, o) {
    const d = BR.door;
    const W = d.x1 - d.x0;
    // casing
    V.fillRound(ctx, d.x0 - 22, d.top - 22, W + 44, d.bottom - d.top + 22, 6, '#f7efe3', INK, 4);
    V.line(ctx, d.x0 - 10, d.top - 10, d.x1 + 10, d.top - 10, 'rgba(0,0,0,0.10)', 3);
    const open = V.clamp(o.doorOpen);
    if (open > 0.001) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x0, d.top, W, d.bottom - d.top);
      ctx.clip();
      drawHall(ctx, false);
      ctx.restore();
      box(ctx, d.x0, d.top, W, d.bottom - d.top, null, INK, 3);
    }
    drawDoorPanel(ctx, open);
  }

  function drawDoorPanel(ctx, open) {
    const g = doorGeom(open);
    const d = BR.door;
    const wood = '#b77c4a', woodD = '#9a6338', woodL = '#c99062';
    const P = g.P;
    // edge thickness (visible as the door swings toward the camera)
    if (g.sn > 0.02) {
      const e = 12 * g.sn;
      poly(ctx, [[g.xf, g.topF], [g.xf + e, g.topF + 4], [g.xf + e, g.botF - 4], [g.xf, g.botF]], woodD, INK, 3);
    }
    poly(ctx, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], wood, INK, 4);
    // inset panels
    const inset = (u0, u1, v0, v1) => {
      poly(ctx, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], woodD, null);
      poly(ctx, [P(u0 + 0.02, v0 + 0.012), P(u1 - 0.02, v0 + 0.012), P(u1 - 0.02, v1 - 0.012), P(u0 + 0.02, v1 - 0.012)], woodL, null);
      poly(ctx, [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)], null, 'rgba(60,30,10,0.55)', 2.5);
    };
    inset(0.14, 0.86, 0.06, 0.45);
    inset(0.14, 0.86, 0.55, 0.94);
    // knob + plate
    const h = P(0.88, 0.535);
    const k = g.persp;
    V.fillRound(ctx, h[0] - 7 * k, h[1] - 26 * k, 14 * k, 52 * k, 5 * k, '#d9d2c4', INK, 2.5);
    V.circle(ctx, h[0] + 3 * g.sn, h[1], 11 * k, '#e9c25a', INK, 3);
    V.circle(ctx, h[0] + 1, h[1] - 3 * k, 3.5 * k, 'rgba(255,255,255,0.7)');
    // keep it readable: hinge side shadow strip
    if (g.sn > 0.02) poly(ctx, [P(0, 0), P(0.06, 0), P(0.06, 1), P(0, 1)], 'rgba(0,0,0,0.12)', null);
    void d;
  }

  // ---------------------------------------------------------------- window
  function drawGlass(ctx, o) {
    const G = BR.window.glass;
    const x = G.x0, y = G.y0, w = G.x1 - G.x0, h = G.y1 - G.y0;
    const nk = nightK(o.hour);
    const [skyTop, skyBot] = V.skyColors(o.hour);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    V.sky(ctx, o.hour, x, y, w, h);
    const t = o.t || 0;
    if (nk > 0.05) {
      V.stars(ctx, 41, 22, x, y, w, h * 0.55, t, nk);
      V.moon(ctx, x + w * 0.74, y + h * 0.24, 26, skyTop);
    }
    const hh = ((o.hour % 24) + 24) % 24;
    if (hh > 5.8 && hh < 18.6) {
      const k = (hh - 6) / 12;
      const sx = x + 40 + k * (w - 80);
      const sy = y + h * 0.62 - Math.sin(Math.PI * V.clamp(k)) * h * 0.5;
      V.sun(ctx, sx, sy, 28, hh > 17 ? '#ffc070' : '#ffe8a0');
    }
    if (nk < 0.9) {
      const ca = 1 - nk;
      ctx.globalAlpha = ca;
      V.cloud(ctx, x + 210 + ((t * 6) % 80), y + 92, 0.42);
      V.cloud(ctx, x + 40 + ((t * 4) % 60), y + 200, 0.3);
      ctx.globalAlpha = 1;
    }
    if (o.sky) o.sky(ctx, { x, y, w, h });
    // distant rooftops
    const far = V.mixColor(V.mixColor(skyBot, '#7b8db0', 0.55), '#0f1530', nk * 0.7);
    const near = V.mixColor('#8e7d8a', '#141a33', nk);
    const bld = [[0, 120, 70], [60, 160, 50], [104, 95, 80], [176, 140, 60], [228, 110, 90], [310, 170, 70]];
    bld.forEach(([bx, bh, bw], i) => {
      ctx.fillStyle = far;
      ctx.fillRect(x + bx, y + h - bh, bw, bh);
      if (nk > 0.3) {
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 2; c++) {
            if (V.rand(i * 13 + r * 3 + c) < 0.45) continue;
            ctx.fillStyle = `rgba(255,214,130,${0.85 * nk})`;
            ctx.fillRect(x + bx + 12 + c * 24, y + h - bh + 18 + r * 26, 9, 12);
          }
      }
    });
    ctx.fillStyle = near;
    ctx.beginPath();
    ctx.moveTo(x - 10, y + h);
    ctx.lineTo(x - 10, y + h - 46);
    ctx.lineTo(x + 120, y + h - 92);
    ctx.lineTo(x + 250, y + h - 46);
    ctx.lineTo(x + 250, y + h);
    ctx.fill();
    // tree on the right
    const leaf = V.mixColor('#5aa35a', '#0e1a22', nk * 0.85), leafD = V.mixColor('#3f8448', '#0a121a', nk * 0.85);
    V.circle(ctx, x + w - 20, y + h - 40, 90, leafD);
    V.circle(ctx, x + w - 70, y + h - 90, 64, leaf);
    V.circle(ctx, x + w + 10, y + h - 140, 60, leaf);
    // glass sheen
    ctx.globalAlpha = 0.16 * (1 - nk * 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.lineTo(x + 110, y);
    ctx.lineTo(x + 10, y + 150);
    ctx.lineTo(x - 60, y + 150);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 230, y + h);
    ctx.lineTo(x + 270, y + h);
    ctx.lineTo(x + 360, y + h - 140);
    ctx.lineTo(x + 320, y + h - 140);
    ctx.fill();
    ctx.restore();
  }
  function drawMullions(ctx, color) {
    const G = BR.window.glass;
    const mx = (G.x0 + G.x1) / 2, my = (G.y0 + G.y1) / 2;
    ctx.fillStyle = color;
    ctx.fillRect(mx - 7, G.y0, 14, G.y1 - G.y0);
    ctx.fillRect(G.x0, my - 7, G.x1 - G.x0, 14);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(mx - 7, G.y0, 14, G.y1 - G.y0);
    ctx.strokeRect(G.x0, my - 7, G.x1 - G.x0, 14);
    ctx.fillStyle = color;
    ctx.fillRect(mx - 5, my - 5, 10, 10);
  }
  function drawWindow(ctx, o) {
    const Wd = BR.window, G = Wd.glass;
    V.fillRound(ctx, Wd.x0, Wd.top, Wd.x1 - Wd.x0, Wd.bottom - Wd.top, 6, '#f8f2e8', INK, 4);
    drawGlass(ctx, o);
    box(ctx, G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0, null, INK, 3);
    drawMullions(ctx, '#f8f2e8');
    // sill
    V.fillRound(ctx, Wd.x0 - 22, Wd.bottom - 8, Wd.x1 - Wd.x0 + 44, 22, 5, '#fbf6ee', INK, 4);
    // a little cactus on the sill
    V.fillRound(ctx, Wd.x1 - 92, Wd.bottom - 40, 34, 32, 6, '#d9774a', INK, 3);
    V.fillRound(ctx, Wd.x1 - 86, Wd.bottom - 82, 22, 46, 11, '#5aa35a', INK, 3);
    V.fillRound(ctx, Wd.x1 - 98, Wd.bottom - 70, 12, 22, 6, '#5aa35a', INK, 2.5);
  }
  // curtains: drawn in the room pass (and partially re-covered after the glass re-draw at night)
  function curtainShape(side, c) {
    // side -1 left, +1 right; c = closedness 0..1. returns { outer, inner, tie }
    const rodL = 790, rodR = 1310, mid = 1050;
    const outer = side < 0 ? rodL : rodR;
    const innerOpen = side < 0 ? 902 : 1198;
    const inner = V.lerp(innerOpen, mid + side * 2, c);
    return { outer, inner, tie: 1 - c };
  }
  function drawCurtain(ctx, side, c, col) {
    const s = curtainShape(side, c);
    const top = BR.window.rodY + 4, bot = 574;
    const tieY = 400;
    const pinch = s.tie * (side < 0 ? 54 : -54); // inner edge pulled toward the outer side at the tie
    ctx.beginPath();
    ctx.moveTo(s.outer, top);
    ctx.lineTo(s.inner, top);
    ctx.quadraticCurveTo(s.inner - pinch * 0.4, tieY - 120, s.inner - pinch, tieY);
    ctx.quadraticCurveTo(s.inner - pinch * 0.2, tieY + 90, s.inner + (side < 0 ? 14 : -14) * s.tie, bot);
    ctx.lineTo(s.outer - side * 8, bot + 4);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // folds
    const n = 5;
    for (let i = 0; i < n; i++) {
      const fx = V.lerp(s.outer, s.inner, (i + 0.5) / n);
      ctx.fillStyle = 'rgba(0,0,0,0.13)';
      ctx.fillRect(fx - 6, top, 10, bot - top + 10);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(fx + 6, top, 6, bot - top + 10);
    }
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (s.tie > 0.3) {
      const tx = s.inner - pinch;
      V.fillRound(ctx, Math.min(tx, s.outer) - 4, tieY - 9, Math.abs(tx - s.outer) + 8, 18, 8, '#f6c945', INK, 3);
    }
  }
  function drawCurtains(ctx, o) {
    const col = '#3f7393';
    drawCurtain(ctx, -1, V.clamp(o.curtain), col);
    drawCurtain(ctx, 1, V.clamp(o.curtain), col);
    // rod
    V.fillRound(ctx, 776, BR.window.rodY - 6, 548, 12, 6, '#5a4636', INK, 3);
    V.circle(ctx, 772, BR.window.rodY, 11, '#5a4636', INK, 3);
    V.circle(ctx, 1328, BR.window.rodY, 11, '#5a4636', INK, 3);
    for (let i = 0; i < 8; i++) {
      V.circle(ctx, 800 + i * 14, BR.window.rodY + 2, 5, null, '#3a2c22', 2);
      V.circle(ctx, 1300 - i * 14, BR.window.rodY + 2, 5, null, '#3a2c22', 2);
    }
  }

  // ---------------------------------------------------------------- posters & wall decor
  function drawPosters(ctx) {
    // space poster (above the nightstand)
    let p = BR.posterSpace;
    V.fillRound(ctx, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 4, '#1c2550', INK, 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x0 + 8, p.y0 + 8, p.x1 - p.x0 - 16, p.y1 - p.y0 - 16);
    ctx.clip();
    const g = ctx.createLinearGradient(0, p.y0, 0, p.y1);
    g.addColorStop(0, '#1a1f4a');
    g.addColorStop(1, '#5a2f6e');
    ctx.fillStyle = g;
    ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
    for (let i = 0; i < 16; i++) V.circle(ctx, p.x0 + 12 + V.rand(i * 5.3) * 140, p.y0 + 12 + V.rand(i * 2.1) * 180, 1.5 + V.rand(i) * 1.8, '#ffffff');
    // ringed planet
    const px = p.x0 + 58, py = p.y0 + 70;
    V.circle(ctx, px, py, 34, '#f39a3d', INK, 3);
    V.ellipse(ctx, px - 8, py - 10, 14, 8, 'rgba(255,255,255,0.35)');
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(px, py, 58, 14, -0.35, 0.1 * Math.PI, 0.9 * Math.PI, true);
    ctx.stroke();
    // rocket
    ctx.save();
    ctx.translate(p.x0 + 116, p.y0 + 140);
    ctx.rotate(0.45);
    V.fillRound(ctx, -14, -48, 28, 74, 14, '#f2f2f2', INK, 3);
    V.circle(ctx, 0, -18, 7, '#5fb2ef', INK, 2.5);
    poly(ctx, [[-14, 14], [-26, 34], [-12, 26]], '#e2463c', INK, 2.5);
    poly(ctx, [[14, 14], [26, 34], [12, 26]], '#e2463c', INK, 2.5);
    poly(ctx, [[-8, 28], [0, 52], [8, 28]], '#f6c945', null);
    ctx.restore();
    ctx.restore();
    V.circle(ctx, (p.x0 + p.x1) / 2, p.y0 + 4, 5, '#e2463c', INK, 2);

    // football poster (right of the window)
    p = BR.posterFootball;
    V.fillRound(ctx, p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0, 4, '#f8f4ea', INK, 4);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x0 + 10, p.y0 + 10, p.x1 - p.x0 - 20, p.y1 - p.y0 - 20);
    ctx.clip();
    const gg = ctx.createLinearGradient(0, p.y0, 0, p.y1);
    gg.addColorStop(0, '#2f8f4e');
    gg.addColorStop(1, '#1f6b3a');
    ctx.fillStyle = gg;
    ctx.fillRect(p.x0, p.y0, p.x1 - p.x0, p.y1 - p.y0);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(p.x0 + i * 34, p.y0, 34, p.y1 - p.y0);
    }
    // player silhouette kicking
    const cx = p.x0 + 82, cy = p.y0 + 150;
    ctx.strokeStyle = '#e2463c';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 46);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.stroke();
    ctx.strokeStyle = '#1f1f27';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy + 4);
    ctx.lineTo(cx - 16, cy + 46);
    ctx.lineTo(cx - 8, cy + 82);
    ctx.moveTo(cx + 4, cy + 4);
    ctx.lineTo(cx + 40, cy + 18);
    ctx.lineTo(cx + 62, cy + 6);
    ctx.stroke();
    ctx.strokeStyle = '#e9b48f';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 40);
    ctx.lineTo(cx - 34, cy - 60);
    ctx.moveTo(cx + 2, cy - 38);
    ctx.lineTo(cx + 36, cy - 30);
    ctx.stroke();
    V.circle(ctx, cx - 2, cy - 64, 15, '#e9b48f');
    V.ellipse(ctx, cx - 6, cy - 74, 15, 9, '#4a2e1c');
    // ball
    const bx = p.x0 + 148, by = p.y0 + 136;
    V.circle(ctx, bx, by, 22, '#ffffff', INK, 3);
    poly(ctx, [[bx, by - 8], [bx + 8, by - 2], [bx + 5, by + 8], [bx - 5, by + 8], [bx - 8, by - 2]], INK, null);
    V.line(ctx, bx - 30, by + 2, bx - 46, by + 4, 'rgba(255,255,255,0.7)', 3);
    V.line(ctx, bx - 28, by + 12, bx - 40, by + 16, 'rgba(255,255,255,0.6)', 3);
    ctx.restore();
    V.text(ctx, 'גול!', (p.x0 + p.x1) / 2, p.y1 - 34, { size: 40, weight: 900, color: '#f6c945', stroke: INK, strokeWidth: 6 });
    V.circle(ctx, p.x0 + 14, p.y0 + 14, 4, '#3b7dd8');
    V.circle(ctx, p.x1 - 14, p.y0 + 14, 4, '#3b7dd8');

    // pennant above the desk
    ctx.save();
    ctx.translate(1590, 250);
    poly(ctx, [[0, 0], [0, 70], [150, 40]], '#3b7dd8', INK, 3);
    V.line(ctx, 0, 0, 0, 70, '#f8f4ea', 8, 'butt');
    ctx.restore();
    V.text(ctx, 'ROCK', 1655, 285, { size: 22, weight: 900, color: '#ffffff', rtl: false });
  }

  // ---------------------------------------------------------------- nightstand + clock
  function drawNightstand(ctx) {
    const n = BR.nightstand;
    const w = n.x1 - n.x0;
    V.groundShadow(ctx, (n.x0 + n.x1) / 2, BR.floorY - 4, w * 0.55, 0.25);
    V.fillRound(ctx, n.x0 + 8, 878, 16, 22, 3, '#7a4a2c', INK, 3);
    V.fillRound(ctx, n.x1 - 24, 878, 16, 22, 3, '#7a4a2c', INK, 3);
    V.fillRound(ctx, n.x0, n.top + 12, w, 882 - n.top - 12, 6, '#b8794a', INK, 4);
    V.fillRound(ctx, n.x0 + 14, n.top + 28, w - 28, 46, 6, '#c98b58', INK, 3);
    V.fillRound(ctx, (n.x0 + n.x1) / 2 - 18, n.top + 46, 36, 10, 5, '#e9c25a', INK, 2.5);
    // open cubby with books
    V.fillRound(ctx, n.x0 + 14, n.top + 84, w - 28, 30, 4, '#5a3620', INK, 3);
    ['#e2463c', '#3b7dd8', '#f6c945'].forEach((c, i) => V.fillRound(ctx, n.x0 + 24 + i * 16, n.top + 88, 13, 26, 2, c, INK, 2));
    // top slab
    V.fillRound(ctx, n.x0 - 8, n.top, w + 16, 16, 5, '#a86a3e', INK, 4);
    // glass of water
    const gx = n.x0 + 26;
    V.fillRound(ctx, gx - 14, n.top - 44, 28, 44, 5, 'rgba(200,230,255,0.55)', INK, 3);
    V.fillRound(ctx, gx - 11, n.top - 26, 22, 24, 3, 'rgba(120,180,240,0.45)');
  }
  function drawClockAt(ctx, o, glow) {
    const c = BR.clock;
    const sq = V.clamp(o.clockSquash || 0);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1 + sq * 0.14, 1 - sq * 0.22);
    V.alarmClock(ctx, 0, 0, c.s, o.clockTime, { ring: o.clockRing, t: o.t, glow, spill: false });
    ctx.restore();
  }
  V.env.bedroomClock = (ctx, o) => {
    o = opts(o);
    ctx.save();
    V.env.bedroomCam(ctx, o.cam);
    drawClockAt(ctx, o, 1);
    ctx.restore();
  };

  // ---------------------------------------------------------------- bed
  function drawBed(ctx, o) {
    const b = BR.bed;
    const sq = o.bedSquash || 0;
    const wood = '#9c6440', woodD = '#7c4b2d';
    // shadow under the bed
    ctx.fillStyle = 'rgba(30,15,8,0.35)';
    ctx.fillRect(b.headX1, 860, b.footX0 - b.headX1, 40);
    V.groundShadow(ctx, (b.headX0 + b.footX1) / 2, BR.floorY - 2, 420, 0.22);
    // headboard
    ctx.beginPath();
    ctx.moveTo(b.headX0, 900);
    ctx.lineTo(b.headX0, b.headTop + 26);
    ctx.quadraticCurveTo(b.headX0, b.headTop, b.headX0 + 24, b.headTop);
    ctx.quadraticCurveTo(b.headX1, b.headTop, b.headX1, b.headTop + 26);
    ctx.lineTo(b.headX1, 900);
    ctx.closePath();
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    V.line(ctx, b.headX0 + 16, b.headTop + 40, b.headX0 + 16, 840, 'rgba(0,0,0,0.18)', 4);
    V.line(ctx, b.headX0 + 32, b.headTop + 40, b.headX0 + 32, 840, 'rgba(255,255,255,0.12)', 4);
    V.circle(ctx, (b.headX0 + b.headX1) / 2, b.headTop + 18, 7, '#e9c25a', INK, 2.5);
    // frame + legs
    V.fillRound(ctx, b.mattressX0 + 10, 868, 22, 32, 3, woodD, INK, 3);
    V.fillRound(ctx, b.footX0 - 30, 868, 22, 32, 3, woodD, INK, 3);
    V.fillRound(ctx, b.headX1 - 14, 824, b.footX0 - b.headX1 + 30, 48, 8, wood, INK, 4);
    V.line(ctx, b.headX1, 842, b.footX0 + 6, 842, 'rgba(255,255,255,0.12)', 4);
    // mattress + fitted sheet
    const mt = b.mattressTop + sq;
    V.fillRound(ctx, b.mattressX0, mt, b.mattressX1 - b.mattressX0, b.mattressBottom - mt + 2, 18, '#e7edf6', INK, 4);
    V.line(ctx, b.mattressX0 + 14, mt + 30, b.mattressX1 - 14, mt + 30, 'rgba(90,110,150,0.25)', 3);
    for (let x = b.mattressX0 + 40; x < b.mattressX1 - 20; x += 64) V.circle(ctx, x, b.mattressBottom - 14, 2.5, 'rgba(90,110,150,0.3)');
    // pillow
    drawPillow(ctx, o);
    // footboard
    V.fillRound(ctx, b.footX0, b.footTop, b.footX1 - b.footX0, 900 - b.footTop, 14, wood, INK, 4);
    V.line(ctx, b.footX0 + 14, b.footTop + 24, b.footX0 + 14, 880, 'rgba(0,0,0,0.18)', 4);
    V.circle(ctx, (b.footX0 + b.footX1) / 2, b.footTop + 16, 6, '#e9c25a', INK, 2.5);
  }
  function drawPillow(ctx, o) {
    const b = BR.bed;
    const sq = o.bedSquash || 0;
    const x0 = b.pillowX0, x1 = b.pillowX1, y0 = b.pillowTop + sq * 0.6, y1 = b.mattressTop + 8 + sq;
    const dent = o.pillowDent === undefined ? 10 : o.pillowDent;
    ctx.beginPath();
    ctx.moveTo(x0 + 10, y1);
    ctx.quadraticCurveTo(x0 - 10, (y0 + y1) / 2, x0 + 14, y0 + 4);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 8 + dent, x1 - 14, y0 + 2);
    ctx.quadraticCurveTo(x1 + 12, (y0 + y1) / 2, x1 - 8, y1);
    ctx.quadraticCurveTo((x0 + x1) / 2, y1 + 8, x0 + 10, y1);
    ctx.closePath();
    ctx.fillStyle = '#fbfbff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    V.line(ctx, x0 + 40, y1 - 14, x1 - 50, y1 - 18, 'rgba(120,140,180,0.35)', 3);
    V.line(ctx, x0 + 24, y0 + 16, x0 + 34, y0 + 26, 'rgba(120,140,180,0.35)', 3);
  }

  // ---------------------------------------------------------------- blanket
  // o.blanket = { edge, lumps: [[x, h]...], heap: 0..1 }
  function blanketHeight(B, x) {
    let h = 12;
    const L = B.lumps;
    if (L && L.length) {
      let v;
      if (x <= L[0][0]) v = L[0][1] * V.clamp(1 - (L[0][0] - x) / 40);
      else if (x >= L[L.length - 1][0]) v = L[L.length - 1][1] * V.clamp(1 - (x - L[L.length - 1][0]) / 40);
      else {
        for (let i = 0; i < L.length - 1; i++) {
          if (x >= L[i][0] && x <= L[i + 1][0]) {
            const k = (x - L[i][0]) / Math.max(1, L[i + 1][0] - L[i][0]);
            v = V.lerp(L[i][1], L[i + 1][1], (1 - Math.cos(Math.PI * k)) / 2);
            break;
          }
        }
      }
      h = Math.max(h, v || 0);
    }
    const heap = B.heap || 0;
    if (heap > 0) {
      const e = B.edge;
      const span = BR.bed.footX0 - e;
      const k = V.clamp((x - e) / Math.max(40, span));
      const env = Math.sin(Math.PI * Math.min(1, k * 1.15));
      h += heap * env * (20 + 10 * Math.sin(x * 0.06 + 1) + 7 * Math.sin(x * 0.15));
    }
    return h;
  }
  function drawBlanket(ctx, o) {
    const B = o.blanket;
    if (B === false) return;
    const bl = Object.assign({ edge: 980, lumps: null, heap: 0 }, B || {});
    const b = BR.bed;
    const mt = b.mattressTop + (o.bedSquash || 0);
    const x0 = V.clamp(bl.edge, b.mattressX0 + 30, b.footX0 - 60);
    bl.edge = x0;
    const x1 = b.footX0 + 4;
    const pts = [];
    for (let x = x0; x <= x1; x += 8) pts.push([x, mt - blanketHeight(bl, x)]);
    pts.push([x1, mt - blanketHeight(bl, x1)]);
    const drapeY = (x) => b.mattressBottom + 26 + 5 * Math.sin(x * 0.03) + (x - x0 < 30 ? -4 : 0);
    const col = '#e98c3a', colD = '#c96f26', colL = '#f6ae5f';
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x0, drapeY(x0));
      ctx.lineTo(x0, pts[0][1] + 10);
      ctx.quadraticCurveTo(x0, pts[0][1], x0 + 10, pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.quadraticCurveTo(x1 + 14, last[1] + 4, x1 + 10, last[1] + 30);
      ctx.lineTo(x1 + 8, drapeY(x1));
      for (let x = x1; x > x0; x -= 24) ctx.lineTo(x, drapeY(x));
      ctx.closePath();
    };
    path();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.save();
    ctx.clip();
    // top-surface highlight band following the contour
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 2) : ctx.moveTo(p[0], p[1] + 2)));
    ctx.strokeStyle = colL;
    ctx.lineWidth = 22;
    ctx.stroke();
    // stripes across the drape
    ctx.fillStyle = '#fbe7c6';
    ctx.fillRect(x0, mt + 20, x1 - x0 + 20, 10);
    ctx.fillRect(x0, mt + 38, x1 - x0 + 20, 5);
    ctx.fillStyle = colD;
    ctx.fillRect(x0, mt + 58, x1 - x0 + 20, 60);
    // quilting stitches
    ctx.fillStyle = 'rgba(120,50,10,0.35)';
    for (let x = x0 + 50; x < x1; x += 70) {
      const yy = mt - blanketHeight(bl, x) + 26;
      ctx.fillRect(x, Math.min(yy, mt - 4), 3, 3);
    }
    // folded-down sheet hem at the edge (narrower when the blanket is bunched up)
    const hemW = 26 - 12 * V.clamp(bl.heap || 0);
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(x0 - 2, 0, hemW, 2000);
    ctx.fillStyle = 'rgba(120,130,160,0.28)';
    ctx.fillRect(x0 + hemW - 5, 0, 5, 2000);
    ctx.restore();
    path();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // fold creases
    if (bl.heap > 0.2) {
      ctx.strokeStyle = 'rgba(110,45,10,0.5)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const fx = x0 + 60 + i * 70;
        if (fx > x1 - 30) break;
        const fy = mt - blanketHeight(bl, fx) + 14;
        ctx.beginPath();
        ctx.moveTo(fx - 18, fy + 4);
        ctx.quadraticCurveTo(fx, fy - 6, fx + 22, fy + 8);
        ctx.stroke();
      }
    }
  }
  V.env.bedroomBlanket = (ctx, o) => {
    o = opts(o);
    ctx.save();
    V.env.bedroomCam(ctx, o.cam);
    drawBlanket(ctx, o);
    ctx.restore();
  };
  // lump profile for a hero lying (or sitting with straight legs) under the blanket, from joints
  V.env.bedroomLumps = (j, breathe = 0) => {
    const mt = BR.bed.mattressTop;
    const h = (y, pad) => Math.max(12, mt - y + pad);
    const L = [];
    const chest = j.shoulder[0] < j.hip[0] ? j.shoulder : null;
    if (chest && Math.abs(chest[1] - j.hip[1]) < 60) L.push([chest[0] - 10, h(j.hip[1] - 52, 4) + breathe]);
    L.push([j.hip[0], h(j.hip[1] - 40, 4) + breathe * 0.5]);
    const knee = (j.nearKnee[0] + j.farKnee[0]) / 2;
    L.push([knee, h(Math.min(j.nearKnee[1], j.farKnee[1]) - 18, 4)]);
    const ank = Math.max(j.nearAnkle[0], j.farAnkle[0]);
    L.push([ank - 18, h(Math.min(j.nearAnkle[1], j.farAnkle[1]) - 16, 4)]);
    const toe = Math.max(j.nearToe[0], j.farToe[0]);
    L.push([toe, h(Math.min(j.nearToe[1], j.farToe[1]) - 8, 6)]);
    L.sort((a, b) => a[0] - b[0]);
    // a body under a blanket is never taller than ~105 px (guards against raised legs)
    return L.map(([x, hh]) => [x, Math.min(hh, 105)]);
  };

  // ---------------------------------------------------------------- desk, chair, shelf, lamp
  function drawDesk(ctx, o) {
    const d = BR.desk;
    const wood = '#c48a56', woodD = '#a06a3c';
    V.groundShadow(ctx, (d.x0 + d.x1) / 2, BR.floorY - 4, 250, 0.22);
    // back legs / modesty panel
    V.fillRound(ctx, d.x0 + 14, d.top + 20, 22, 900 - d.top - 20, 4, woodD, INK, 3);
    // drawer unit
    V.fillRound(ctx, d.x1 - 176, d.top + 18, 164, 900 - d.top - 18, 6, wood, INK, 4);
    for (let i = 0; i < 3; i++) {
      const y = d.top + 34 + i * 70;
      V.fillRound(ctx, d.x1 - 164, y, 140, 60, 5, '#d39c66', INK, 3);
      V.fillRound(ctx, d.x1 - 112, y + 24, 36, 10, 5, '#f6f1e6', INK, 2);
    }
    // top
    V.fillRound(ctx, d.x0 - 10, d.top, d.x1 - d.x0 + 20, 24, 6, wood, INK, 4);
    V.line(ctx, d.x0, d.top + 7, d.x1, d.top + 7, 'rgba(255,255,255,0.25)', 4);
    // football under the desk
    if (o.ball) {
      const bx = 1900, by = 866, r = 32;
      V.groundShadow(ctx, bx, BR.floorY - 2, 36, 0.3);
      V.circle(ctx, bx, by, r, '#ffffff', INK, 3.5);
      poly(ctx, [[bx, by - 11], [bx + 11, by - 3], [bx + 7, by + 10], [bx - 7, by + 10], [bx - 11, by - 3]], INK, null);
      [[0, -1], [0.95, -0.3], [0.6, 0.8], [-0.6, 0.8], [-0.95, -0.3]].forEach(([ux, uy]) => V.line(ctx, bx + ux * 11, by + uy * 11, bx + ux * 26, by + uy * 26, INK, 2.5));
    }
    // items on top: book stack, notebook, pencil cup
    const ty = d.top;
    [['#3b7dd8', 70, 14], ['#e2463c', 64, 13], ['#6cbf5a', 74, 15]].forEach(([c, w, h], i) => {
      const y = ty - 14 - i * 15;
      V.fillRound(ctx, d.x0 + 6 + (i % 2) * 6, y, w, h, 3, c, INK, 2.5);
      V.line(ctx, d.x0 + 12 + (i % 2) * 6, y + h / 2, d.x0 + w - 4, y + h / 2, 'rgba(255,255,255,0.5)', 2);
    });
    // open notebook
    poly(ctx, [[1830, ty - 2], [1888, ty - 10], [1950, ty - 2], [1950, ty + 1], [1830, ty + 1]], '#fbfbf7', INK, 2.5);
    V.line(ctx, 1888, ty - 10, 1888, ty, INK, 2);
    // pencil cup
    V.fillRound(ctx, 1978, ty - 46, 36, 46, 6, '#3b7dd8', INK, 3);
    V.line(ctx, 1986, ty - 46, 1980, ty - 78, '#f6c945', 6);
    V.line(ctx, 1996, ty - 46, 2002, ty - 82, '#e2463c', 6);
    V.line(ctx, 2006, ty - 46, 2016, ty - 70, '#5aa35a', 6);
  }
  function drawLamp(ctx, o, on) {
    const L = BR.lamp;
    const col = '#2f8f8a', colD = '#226a66';
    V.ellipse(ctx, L.x, L.y - 4, 34, 9, colD);
    V.fillRound(ctx, L.x - 34, L.y - 14, 68, 14, 7, col, INK, 3);
    // arms
    ctx.lineCap = 'round';
    V.line(ctx, L.x, L.y - 12, L.x + 24, L.y - 120, INK, 13);
    V.line(ctx, L.x, L.y - 12, L.x + 24, L.y - 120, col, 7);
    V.line(ctx, L.x + 24, L.y - 120, L.head.x + 18, L.head.y + 2, INK, 13);
    V.line(ctx, L.x + 24, L.y - 120, L.head.x + 18, L.head.y + 2, col, 7);
    V.circle(ctx, L.x + 24, L.y - 120, 8, colD, INK, 3);
    // shade (cone pointing down-left)
    ctx.save();
    ctx.translate(L.head.x, L.head.y);
    ctx.rotate(-0.5);
    poly(ctx, [[16, -20], [16, 20], [-34, 38], [-34, -38]], col, INK, 3.5);
    V.ellipse(ctx, -34, 0, 9, 38, on ? '#fff3c4' : colD);
    ctx.beginPath();
    ctx.ellipse(-34, 0, 9, 38, 0, 0, Math.PI * 2);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  function drawChair(ctx) {
    const c = BR.chair;
    const seat = '#2f5d8a';
    V.groundShadow(ctx, (c.x0 + c.x1) / 2, BR.floorY - 4, 80, 0.25);
    // base star + wheels
    V.line(ctx, c.x0 + 6, 884, c.x1 - 6, 884, INK, 11);
    V.line(ctx, c.x0 + 6, 884, c.x1 - 6, 884, '#444a56', 6);
    [c.x0 + 10, (c.x0 + c.x1) / 2, c.x1 - 10].forEach((x) => V.circle(ctx, x, 891, 8, '#2a2d35', INK, 2.5));
    V.fillRound(ctx, (c.x0 + c.x1) / 2 - 7, c.seatY + 16, 14, 884 - c.seatY - 16, 4, '#7d8594', INK, 3);
    // backrest (left = behind someone sitting facing right)
    V.fillRound(ctx, c.x0 - 6, c.seatY - 4, 16, 22, 4, '#444a56', INK, 3);
    V.fillRound(ctx, c.x0 - 18, c.seatY - 230, 34, 210, 14, seat, INK, 4);
    V.line(ctx, c.x0 - 4, c.seatY - 210, c.x0 - 4, c.seatY - 40, 'rgba(255,255,255,0.15)', 5);
    // seat
    V.fillRound(ctx, c.x0, c.seatY, c.x1 - c.x0, 22, 10, seat, INK, 4);
  }
  function drawShelf(ctx) {
    const s = BR.shelf;
    // brackets
    poly(ctx, [[s.x0 + 30, s.y], [s.x0 + 30, s.y + 40], [s.x0 + 60, s.y]], '#5a4636', INK, 3);
    poly(ctx, [[s.x1 - 30, s.y], [s.x1 - 30, s.y + 40], [s.x1 - 60, s.y]], '#5a4636', INK, 3);
    // books
    const books = [['#e2463c', 22, 86], ['#3b7dd8', 18, 74], ['#f6c945', 24, 92], ['#6cbf5a', 18, 70], ['#8e5bb5', 22, 82]];
    let x = s.x0 + 24;
    books.forEach(([c, w, h]) => {
      V.fillRound(ctx, x, s.y - h, w, h, 3, c, INK, 2.5);
      V.line(ctx, x + 4, s.y - h + 12, x + w - 4, s.y - h + 12, 'rgba(255,255,255,0.5)', 2.5);
      x += w + 2;
    });
    // leaning book
    ctx.save();
    ctx.translate(x + 4, s.y);
    ctx.rotate(0.28);
    V.fillRound(ctx, 0, -78, 20, 78, 3, '#f39a3d', INK, 2.5);
    ctx.restore();
    // small framed photo
    V.fillRound(ctx, s.x0 + 210, s.y - 70, 60, 70, 4, '#f8f4ea', INK, 3);
    V.fillRound(ctx, s.x0 + 218, s.y - 62, 44, 54, 2, '#9cc7e6');
    V.circle(ctx, s.x0 + 232, s.y - 30, 9, '#e9b48f');
    V.circle(ctx, s.x0 + 250, s.y - 32, 9, '#8d5a3b');
    V.fillRound(ctx, s.x0 + 220, s.y - 22, 40, 14, 3, '#5aa35a');
    // trophy
    const tx = s.x1 - 86;
    V.fillRound(ctx, tx - 28, s.y - 22, 56, 22, 3, '#5a4636', INK, 3);
    V.fillRound(ctx, tx - 8, s.y - 44, 16, 24, 3, '#e0a92e', INK, 3);
    ctx.beginPath();
    ctx.moveTo(tx - 30, s.y - 112);
    ctx.lineTo(tx + 30, s.y - 112);
    ctx.quadraticCurveTo(tx + 28, s.y - 52, tx, s.y - 46);
    ctx.quadraticCurveTo(tx - 28, s.y - 52, tx - 30, s.y - 112);
    ctx.closePath();
    ctx.fillStyle = '#f6c945';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tx - 32, s.y - 92, 14, Math.PI * 0.5, Math.PI * 1.5);
    ctx.moveTo(tx + 32, s.y - 106);
    ctx.arc(tx + 32, s.y - 92, 14, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f6c945';
    ctx.stroke();
    V.ellipse(ctx, tx - 12, s.y - 92, 5, 14, 'rgba(255,255,255,0.55)');
    V.text(ctx, '★', tx, s.y - 80, { size: 22, color: '#e0a92e', rtl: false });
    // board
    V.fillRound(ctx, s.x0, s.y, s.x1 - s.x0, 16, 4, '#8a5a3a', INK, 3.5);
  }

  // ---------------------------------------------------------------- wardrobe
  function drawClothes(ctx, x0, x1, top) {
    // interior
    ctx.fillStyle = '#3a2b22';
    ctx.fillRect(x0, top, x1 - x0, 896 - top);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x0, top, x1 - x0, 30);
    V.line(ctx, x0 + 6, top + 56, x1 - 6, top + 56, '#b9b2a4', 6);
    const items = [
      ['#fbfbf7', 'tee'], ['#2f5d50', 'hoodie'], ['#e2463c', 'jersey'], ['#2f4f86', 'jeans'], ['#8a96a8', 'tee'], ['#f39a3d', 'tee'],
    ];
    const n = items.length;
    items.forEach(([c, kind], i) => {
      const cx = V.lerp(x0 + 40, x1 - 40, i / (n - 1));
      const ty = top + 60;
      V.line(ctx, cx, top + 50, cx, ty + 6, '#b9b2a4', 3);
      ctx.beginPath();
      ctx.moveTo(cx - 22, ty + 12);
      ctx.lineTo(cx, ty + 4);
      ctx.lineTo(cx + 22, ty + 12);
      ctx.strokeStyle = '#b9b2a4';
      ctx.lineWidth = 3;
      ctx.stroke();
      if (kind === 'jeans') {
        poly(ctx, [[cx - 22, ty + 12], [cx + 22, ty + 12], [cx + 24, ty + 190], [cx + 4, ty + 190], [cx, ty + 70], [cx - 4, ty + 190], [cx - 24, ty + 190]], c, INK, 3);
      } else {
        const L = kind === 'hoodie' ? 150 : 128;
        poly(ctx, [[cx - 24, ty + 10], [cx + 24, ty + 10], [cx + 36, ty + 40], [cx + 26, ty + 48], [cx + 24, ty + L], [cx - 24, ty + L], [cx - 26, ty + 48], [cx - 36, ty + 40]], c, INK, 3);
        if (kind === 'jersey') V.text(ctx, '10', cx, ty + 80, { size: 26, weight: 900, color: '#fff', rtl: false });
        if (kind === 'hoodie') V.fillRound(ctx, cx - 14, ty + 100, 28, 22, 5, V.shade(c, -0.15));
      }
    });
    // bottom shelf: folded clothes + sneakers
    V.fillRound(ctx, x0, 770, x1 - x0, 12, 2, '#5a4636', INK, 2.5);
    ['#7aa2d8', '#fbfbf7', '#2f4f86'].forEach((c, i) => V.fillRound(ctx, x0 + 20 + i * 4, 752 - i * 16, 90, 18, 5, c, INK, 2.5));
    V.fillRound(ctx, x1 - 130, 860, 56, 24, 10, '#f4f4f4', INK, 2.5);
    V.fillRound(ctx, x1 - 70, 860, 56, 24, 10, '#f4f4f4', INK, 2.5);
  }
  function drawWardrobe(ctx, o) {
    const w = BR.wardrobe;
    const body = '#efe4d2', bodyD = '#d9c8ad';
    V.groundShadow(ctx, (w.x0 + w.x1) / 2, BR.floorY - 2, 230, 0.25);
    V.fillRound(ctx, w.x0, w.top, w.x1 - w.x0, w.bottom - w.top, 6, body, INK, 4);
    V.fillRound(ctx, w.x0 - 14, w.top - 18, w.x1 - w.x0 + 28, 24, 5, bodyD, INK, 4);
    V.fillRound(ctx, w.x0 + 10, w.bottom - 4, 26, 8, 2, '#5a4636');
    V.fillRound(ctx, w.x1 - 36, w.bottom - 4, 26, 8, 2, '#5a4636');
    const ix0 = w.x0 + 14, ix1 = w.x1 - 14, it = w.top + 14, ib = w.bottom - 16;
    const open = V.clamp(o.wardrobeOpen);
    const half = (ix1 - ix0) / 2;
    if (open > 0.001) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ix0, it, ix1 - ix0, ib - it);
      ctx.clip();
      drawClothes(ctx, ix0, ix1, it);
      ctx.restore();
      box(ctx, ix0, it, ix1 - ix0, ib - it, null, INK, 3);
    }
    const th = open * 78 * D2R, sn = Math.sin(th), cw = half * Math.cos(th);
    const door = (side) => {
      // side -1: left door hinged at ix0; +1: right door hinged at ix1
      const hx = side < 0 ? ix0 : ix1;
      const fx = hx - side * cw;
      const topF = it - 18 * sn, botF = ib + 30 * sn;
      const P = (u, v) => [V.lerp(hx, fx, u), V.lerp(it, topF, u) + v * (V.lerp(ib, botF, u) - V.lerp(it, topF, u))];
      if (sn > 0.02) poly(ctx, [[fx, topF], [fx - side * 10 * sn, topF + 4], [fx - side * 10 * sn, botF - 4], [fx, botF]], bodyD, INK, 3);
      poly(ctx, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], '#f6eddf', INK, 4);
      poly(ctx, [P(0.12, 0.04), P(0.88, 0.04), P(0.88, 0.96), P(0.12, 0.96)], null, 'rgba(120,90,50,0.35)', 3);
      if (side > 0) {
        // mirror on the right door
        const m = [P(0.18, 0.12), P(0.82, 0.12), P(0.82, 0.6), P(0.18, 0.6)];
        poly(ctx, m, '#bcd9ea', INK, 3);
        ctx.save();
        ctx.beginPath();
        m.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.clip();
        const a = P(0.3, 0.12), b2 = P(0.5, 0.12);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b2[0], b2[1]);
        ctx.lineTo(b2[0] - 80, b2[1] + 200);
        ctx.lineTo(a[0] - 80, a[1] + 200);
        ctx.fill();
        ctx.restore();
      }
      const hd = P(0.86, 0.5);
      V.fillRound(ctx, hd[0] - 5, hd[1] - 30, 10, 60, 5, '#c9a24a', INK, 2.5);
    };
    door(-1);
    door(1);
  }

  // ---------------------------------------------------------------- floor props
  function drawRug(ctx) {
    const r = BR.rug;
    V.ellipse(ctx, r.x, r.y, r.rx, r.ry, '#b8443a');
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.rx, r.ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40,10,10,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.rx - 34, r.ry - 9, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#f2c46a';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.rx - 70, r.ry - 17, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,240,210,0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  function drawBackpack(ctx) {
    const p = BR.backpack;
    V.groundShadow(ctx, p.x, p.y - 2, 40, 0.3);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-0.08);
    V.fillRound(ctx, -34, -112, 68, 110, 20, '#3b7dd8', INK, 4);
    V.fillRound(ctx, -26, -58, 52, 44, 10, '#2f68b8', INK, 3);
    V.line(ctx, -20, -36, 20, -36, '#f6c945', 3);
    ctx.beginPath();
    ctx.moveTo(-14, -112);
    ctx.quadraticCurveTo(0, -136, 14, -112);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = '#2f68b8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  function drawBasket(ctx) {
    V.groundShadow(ctx, 2750, BR.floorY - 2, 70, 0.25);
    poly(ctx, [[2690, 780], [2810, 780], [2798, 898], [2702, 898]], '#d8b67a', INK, 4);
    for (let i = 0; i < 4; i++) V.line(ctx, 2696, 800 + i * 24, 2804, 800 + i * 24, 'rgba(110,70,20,0.4)', 3);
    V.fillRound(ctx, 2702, 762, 50, 30, 10, '#e2463c', INK, 3);
    V.fillRound(ctx, 2740, 766, 60, 26, 10, '#fbfbf7', INK, 3);
    // a sock hanging out
    poly(ctx, [[2790, 784], [2804, 786], [2810, 830], [2826, 846], [2814, 856], [2798, 838]], '#f4f4f4', INK, 3);
  }

  // ---------------------------------------------------------------- full room
  function drawRoom(ctx, o, drawClock) {
    const H = o.hide || {};
    drawShell(ctx);
    drawPosters(ctx);
    drawShelf(ctx);
    drawWindow(ctx, o);
    drawCurtains(ctx, o);
    drawDoor(ctx, o);
    drawWardrobe(ctx, o);
    drawBasket(ctx);
    drawRug(ctx);
    drawDesk(ctx, o);
    drawLamp(ctx, o, !!o.lamp);
    if (!H.chair) drawChair(ctx);
    if (o.backpack) drawBackpack(ctx);
    if (!H.nightstand) drawNightstand(ctx);
    if (!H.bed) drawBed(ctx, o);
    if (drawClock && !H.clock) drawClockAt(ctx, o, 0.3 + 0.7 * (1 - o.light));
  }
  V.env.bedroom = (ctx, o) => {
    o = opts(o);
    ctx.save();
    V.env.bedroomCam(ctx, o.cam);
    drawRoom(ctx, o, true);
    ctx.restore();
  };

  // ---------------------------------------------------------------- lighting
  // Night look = darken toward black, then a deep-blue cast. The same maths is used for the room
  // (full-frame fill) and for actors (offscreen + source-atop), so both match exactly.
  const NIGHT_A = 0.7, NIGHT_B = 0.3;
  const dimFill = (c, d, op) => {
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = op || 'source-over';
    c.fillStyle = `rgba(3,4,14,${NIGHT_A * d})`;
    c.fillRect(0, 0, V.W, V.H);
    c.fillStyle = `rgba(34,50,118,${NIGHT_B * d})`;
    c.fillRect(0, 0, V.W, V.H);
    c.restore();
  };
  let offC = null;
  const off = () => {
    if (!offC) {
      offC = document.createElement('canvas');
      offC.width = V.W;
      offC.height = V.H;
    }
    return offC;
  };
  // draw fn(ctx) (same transform as ctx) with the room's lighting; light 1 = untouched
  V.env.bedroomDimLayer = (ctx, light, fn) => {
    const d = 1 - V.clamp(light);
    if (d < 0.01) {
      fn(ctx);
      return;
    }
    const oc = off();
    const c2 = oc.getContext('2d');
    c2.save();
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, V.W, V.H);
    c2.setTransform(ctx.getTransform());
    fn(c2);
    c2.restore();
    dimFill(c2, d, 'source-atop');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(oc, 0, 0);
    ctx.restore();
  };

  // practical light sources that sit BEHIND actors (window glass, hallway, lamp bulb)
  function drawPracticals(ctx, o, d) {
    // hot core of the LED's red spill: lights the nightstand / wall / pillow but sits BEHIND the
    // actors, so someone standing in front of the clock is not lit "through" (the wide, faint
    // part of the spill stays on top in drawGlows)
    const cl = BR.clock;
    V.lightPool(ctx, cl.x, cl.y - 30, 90, '#ff3a22', (0.12 + 0.3 * d) * 0.5);
    if (d < 0.05) return;
    // the LED clock keeps its own brightness in the dark (actors drawn later still occlude it)
    if (!(o.hide && o.hide.clock)) drawClockAt(ctx, o, 1);
    // window: the sky stays bright; the frame/mullions keep the room's darkness
    const c = V.clamp(o.curtain);
    const G = BR.window.glass;
    const l = curtainShape(-1, c).inner + 6, r = curtainShape(1, c).inner - 6;
    if (r > l) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(Math.max(G.x0, l), G.y0, Math.min(G.x1, r) - Math.max(G.x0, l), G.y1 - G.y0);
      ctx.clip();
      drawGlass(ctx, o);
      drawMullions(ctx, V.mixColor('#f8f2e8', '#141a30', 0.78 * d));
      ctx.restore();
    }
    // lit hallway behind an open door
    const open = V.clamp(o.doorOpen), hl = V.clamp(o.hallLight);
    const dr = BR.door;
    if (hl > 0 && open > 0.001) {
      const g = doorGeom(open);
      ctx.save();
      ctx.globalAlpha = hl;
      ctx.beginPath();
      ctx.rect(g.xf + 10 * g.sn, dr.top, dr.x1 - g.xf - 10 * g.sn, dr.bottom - dr.top);
      ctx.clip();
      drawHall(ctx, true);
      ctx.restore();
    }
    if (hl > 0 && open < 0.2) {
      ctx.save();
      ctx.globalAlpha = hl * (1 - open / 0.2);
      ctx.fillStyle = '#ffd38a';
      ctx.fillRect(dr.x0 + 4, dr.bottom - 5, dr.x1 - dr.x0 - 8, 5);
      ctx.restore();
    }
  }

  // additive light ON TOP of everything (beams, LED, lamp)
  function drawGlows(ctx, o, d) {
    const G = BR.window.glass;
    const t = o.t || 0;
    const hh = ((o.hour % 24) + 24) % 24;
    const nk = nightK(o.hour);
    const c = V.clamp(o.curtain);
    const openK = 1 - c;
    // --- sun beams (from the upper left: morning) ---
    const sunK = V.clamp(o.light) * (1 - nk) * (hh > 6.2 && hh < 17.8 ? 1 : 0) * openK;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (sunK > 0.01) {
      const slope = hh < 12 ? 0.62 : -0.62;
      const endY = BR.floorY + 70;
      const mx = (G.x0 + G.x1) / 2, my = (G.y0 + G.y1) / 2;
      const panes = [[G.x0, G.y0, mx - 7, my - 7], [mx + 7, G.y0, G.x1, my - 7], [G.x0, my + 7, mx - 7, G.y1], [mx + 7, my + 7, G.x1, G.y1]];
      const flick = 0.9 + 0.1 * Math.sin(t * 1.3);
      panes.forEach(([x0, y0, x1, y1]) => {
        const dx0 = (endY - y0) * slope, dx1 = (endY - y1) * slope;
        const gr = ctx.createLinearGradient(0, y0, 0, endY);
        gr.addColorStop(0, `rgba(255,214,150,${0.2 * sunK * flick})`);
        gr.addColorStop(1, 'rgba(255,214,150,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y0);
        ctx.lineTo(x1 + (slope > 0 ? dx1 : dx0), endY);
        ctx.lineTo(x0 + (slope > 0 ? dx0 : dx1), endY);
        ctx.closePath();
        ctx.fill();
      });
      // dust motes drifting in the light
      for (let i = 0; i < 26; i++) {
        const u = V.rand(i * 3.7), v = (V.rand(i * 9.1) + t * (0.02 + V.rand(i) * 0.03)) % 1;
        const y = V.lerp(G.y0 + 20, BR.floorY - 40, v);
        const x = V.lerp(G.x0, G.x1, u) + (y - G.y0) * slope + Math.sin(t * 0.8 + i) * 10;
        const a = 0.55 * sunK * Math.sin(Math.PI * v);
        V.circle(ctx, x, y, 2 + V.rand(i * 1.3) * 2, `rgba(255,236,190,${a})`);
      }
      V.lightPool(ctx, (G.x0 + G.x1) / 2 - 60, (G.y0 + G.y1) / 2, 520, '#ffd9a0', 0.12 * sunK);
    }
    // --- moonlight ---
    const moonK = d * nk * openK;
    if (moonK > 0.01) {
      const slope = -0.42;
      const endY = BR.floorY + 60;
      const gr = ctx.createLinearGradient(0, G.y0, 0, endY);
      gr.addColorStop(0, `rgba(150,180,255,${0.16 * moonK})`);
      gr.addColorStop(1, 'rgba(150,180,255,0.02)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(G.x0, G.y0);
      ctx.lineTo(G.x1, G.y0);
      ctx.lineTo(G.x1 + (endY - G.y0) * slope, endY);
      ctx.lineTo(G.x0 + (endY - G.y1) * slope, endY);
      ctx.closePath();
      ctx.fill();
      V.lightPool(ctx, (G.x0 + G.x1) / 2, (G.y0 + G.y1) / 2, 420, '#8fb0ff', 0.13 * moonK);
    }
    ctx.restore();
    // --- hallway light wedge ---
    const open = V.clamp(o.doorOpen), hl = V.clamp(o.hallLight);
    if (hl > 0 && open > 0.001) {
      const g = doorGeom(open);
      const dr = BR.door;
      const a = hl * V.clamp(open * 3) * (0.35 + 0.65 * d);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(0, dr.bottom, 0, dr.bottom + 260);
      gr.addColorStop(0, `rgba(255,190,110,${0.3 * a})`);
      gr.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(g.xf + 8, dr.bottom);
      ctx.lineTo(dr.x1, dr.bottom);
      ctx.lineTo(dr.x1 + 360, dr.bottom + 260);
      ctx.lineTo(g.xf + 120, dr.bottom + 260);
      ctx.closePath();
      ctx.fill();
      V.lightPool(ctx, (g.xf + dr.x1) / 2, dr.bottom - 200, 300, '#ffbe6e', 0.12 * a);
      ctx.restore();
    } else if (hl > 0) {
      const dr = BR.door;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,200,120,${0.18 * hl * d})`;
      ctx.beginPath();
      ctx.moveTo(dr.x0, dr.bottom);
      ctx.lineTo(dr.x1, dr.bottom);
      ctx.lineTo(dr.x1 + 60, dr.bottom + 40);
      ctx.lineTo(dr.x0 + 20, dr.bottom + 40);
      ctx.fill();
      ctx.restore();
    }
    // --- desk lamp ---
    const lamp = o.lamp === true ? 1 : +o.lamp || 0;
    if (lamp > 0) {
      const L = BR.lamp;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const hx = L.head.x - 30, hy = L.head.y + 18;
      const gr = ctx.createLinearGradient(hx, hy, 1860, BR.desk.top);
      gr.addColorStop(0, `rgba(255,220,140,${0.34 * lamp})`);
      gr.addColorStop(1, `rgba(255,220,140,${0.06 * lamp})`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(hx + 10, hy - 30);
      ctx.lineTo(hx - 6, hy + 26);
      ctx.lineTo(1990, BR.desk.top + 2);
      ctx.lineTo(1760, BR.desk.top + 2);
      ctx.closePath();
      ctx.fill();
      V.lightPool(ctx, 1900, BR.desk.top - 20, 330, '#ffcf80', (0.18 + 0.32 * d) * lamp);
      V.lightPool(ctx, hx, hy, 70, '#fff3c4', 0.6 * lamp);
      ctx.restore();
    }
    // --- LED red spill, wide faint part (the clock itself is re-drawn bright and the hot core
    //     of the spill is added in drawPracticals, behind the actors) ---
    const cl = BR.clock;
    const spill = 0.12 + 0.3 * d;
    V.lightPool(ctx, cl.x, cl.y - 30, 230, '#ff3a22', spill * 0.55);
  }

  // ---------------------------------------------------------------- the one-call scene
  V.env.bedroomScene = (ctx, oIn, actors, front) => {
    const o = opts(oIn);
    const d = 1 - V.clamp(o.light);
    const dark = d > 0.05;
    ctx.save();
    // 1. room
    ctx.save();
    V.env.bedroomCam(ctx, o.cam);
    drawRoom(ctx, o, !dark);
    ctx.restore();
    // 2. night
    if (d > 0.01) dimFill(ctx, d);
    // 3. practical lights behind the actors
    ctx.save();
    V.env.bedroomCam(ctx, o.cam);
    drawPracticals(ctx, o, d);
    // 4. actors + blanket + front, lit like the room
    V.env.bedroomDimLayer(ctx, o.actorLight === undefined ? o.light : o.actorLight, (c) => {
      if (actors) actors(c);
      drawBlanket(c, o);
      if (front) front(c);
    });
    // 5. glows
    drawGlows(ctx, o, d);
    ctx.restore();
    ctx.restore();
  };
  // exposed pieces for custom compositions (camera NOT applied by these)
  V.env.bedroomParts = { drawRoom, drawNightstand, drawBed, drawBlanket, drawGlows, drawPracticals, dimFill, drawClockAt, doorGeom, nightK };

  // ---------------------------------------------------------------- IK helpers
  const toLocal = (pose, x, y, s, wx, wy) => {
    const f = pose.facing || 1;
    const lx = (wx - x) / (f * s), ly = (wy - y) / s;
    const r = -(pose.rot || 0) * D2R;
    return [lx * Math.cos(r) - ly * Math.sin(r), lx * Math.sin(r) + ly * Math.cos(r)];
  };
  const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
  const solve2 = (dx, dy, A, Bn, bendSign) => {
    let d = Math.hypot(dx, dy);
    d = V.clamp(d, Math.abs(A - Bn) + 0.5, A + Bn - 0.3);
    const phi = Math.atan2(dx, dy);
    const a = Math.acos(V.clamp((A * A + d * d - Bn * Bn) / (2 * A * d), -1, 1));
    const a1 = phi + bendSign * a;
    const jx = Math.sin(a1) * A, jy = Math.cos(a1) * A;
    const a2 = Math.atan2(dx - jx, dy - jy);
    return [a1 / D2R, a2 / D2R];
  };
  V.env.bedroomIK = {
    // ankle of a leg to world point [wx, wy]; footAngle (optional) = world foot direction in
    // degrees from straight down (90 = flat, 55 = on tiptoe). Mutates & returns pose.
    leg(pose, x, y, s, which, target, footAngle) {
      const Dm = V.boy.D;
      const key = which === 'far' ? 'legFar' : 'legNear';
      const dx0 = which === 'far' ? -5 : 5;
      const [lx, ly] = toLocal(pose, x, y, s, target[0], target[1]);
      const [ta, sa] = solve2(lx - dx0, ly, Dm.TH, Dm.SH, 1);
      const leg = { hip: ta, knee: wrap(sa - ta), foot: 0 };
      if (footAngle !== undefined) leg.foot = wrap(footAngle + (pose.rot || 0) - 90 - sa);
      pose[key] = leg;
      return pose;
    },
    // hand to world point; elbow bends the natural way (el > 0)
    arm(pose, x, y, s, which, target, flip) {
      const Dm = V.boy.D;
      const full = V.boy.pose.stand(pose);
      const j = V.boy.fk(full);
      const key = which === 'far' ? 'armFar' : 'armNear';
      const dx0 = which === 'far' ? -6 : 4;
      const [lx, ly] = toLocal(full, x, y, s, target[0], target[1]);
      const [ua, fa] = solve2(lx - (j.shoulder[0] + dx0), ly - j.shoulder[1], Dm.UA, Dm.FA, flip ? 1 : -1);
      pose[key] = { sh: ua - (full.torso || 0), el: wrap(fa - ua) };
      return pose;
    },
  };
})();
