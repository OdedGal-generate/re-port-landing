// Scene 05-leave (4 s, 07:52) — leaving for school.
//  0.0  establishing shot of the house in low golden morning sun (birds), slow push-in
//  0.2  the front door swings open; the hero (school outfit, blue backpack) steps over the threshold
//       and walks out onto the porch (stops at x 250, clear of the lantern / house number)
//  0.6  Mom steps into the doorway with her coffee mug
//  1.0  he turns back and waves goodbye (hand raised in front of the face); Mom waves back
//  1.32 Mom closes the door (latch at 1.6)
//  1.7  he turns toward frame-right, hitches the backpack and walks off: down the two steps (~2.0-2.3)
//       and along the sidewalk, the camera pans with him (eased), toward school = RIGHT.
(function () {
  const B = V.boy, P = B.pose, ST = V.env.STREET;
  const S = ST.heroScale;
  const SPEED = 505; // px/s at scale 1 -> 3.2 steps/s (matches the footsteps cue)
  const MOM = {
    look: { skin: '#e8b08a', hair: '#5b3421', hairStyle: 'long' },
    outfit: { shirt: '#e98aa6', sleeves: 'long', logo: false, pants: '#4b5876', pantsLen: 'long', shoes: 'socks', shoeColor: '#f3f3f3' },
  };

  // hero path ------------------------------------------------------------
  // phase 1: out of the doorway (inside layer while feet < sill). He stops at X1, right of the
  // wall lantern / house number so his head and waving hand read against plain wall.
  // 'sine' easing keeps the peak speed (~600 px/s) close to a normal walk (no scurrying legs).
  const OUT0 = 0.26, OUT1 = 0.96, X0 = -24, X1 = 250;
  const TURN1 = 0.99, TURN2 = 1.76; // facing flips (quick squash turns)
  // phase 3: walking off to the right
  const WALK0 = 1.82, RAMP = 0.32;
  function walkDist(t) {
    const u = Math.max(0, t - WALK0);
    return u < RAMP ? (SPEED * u * u) / (2 * RAMP) : SPEED * (u - RAMP / 2);
  }
  function heroX(t) {
    if (t < OUT1) return V.lerp(X0, X1, V.ease.sine(V.seg(t, OUT0, OUT1)));
    return X1 + walkDist(t);
  }
  // squash for a quick turn-around (facing flips at tt)
  const turnK = (t, tt) => 1 - 0.42 * Math.sin(Math.PI * V.seg(t, tt - 0.07, tt + 0.07));
  const squashAt = (t) => turnK(t, TURN1) * turnK(t, TURN2);
  // a friendly wave: upper arm raised forward, forearm up, the hand swaying beside / in front of
  // the face (never across it). w 0..1 = raise amount, osc -1..1 = sway.
  const waveArm = (rest, w, osc) => ({
    sh: V.lerp(rest.sh, 102 + 4 * osc, w), // elbow ahead of the chin
    el: V.lerp(rest.el, 52 + 18 * osc, w), // forearm sweeps ~130..175 deg: never past vertical
  });

  function camAt(t) {
    const push = V.ep(t, 0.0, 1.45, 'inOut');
    const base = { x: V.lerp(110, 70, push), y: V.lerp(300, 520, push), zoom: V.lerp(0.7, 0.95, push) };
    // pan: blend from the static framing into tracking the hero (lead room on the right)
    const k = V.ep(t, 1.7, 3.35, 'inOut');
    const track = heroX(t) + 220;
    return {
      x: V.lerp(base.x, track, k),
      y: V.lerp(base.y, 548, V.ep(t, 1.7, 3.0, 'inOut')),
      zoom: V.lerp(base.zoom, 1.0, V.ep(t, 1.7, 3.3, 'inOut')),
    };
  }

  function heroPose(t) {
    const blink = (o) => B.blink(t, o, 2);
    const strap = { sh: 22, el: 118 }; // far hand holding the backpack strap
    let pose, facing = 1, s = S, x = heroX(t), y, inside = false;
    if (t < TURN1) {
      // walking out of the doorway; depth: feet 804 -> 822, scale 0.92 -> 1
      const k = V.ease.sine(V.seg(t, OUT0, OUT1));
      const dist = (x - X0) * 1.09; // ~1/scale while he grows from 0.92 to 1 (no foot sliding)
      const walk = P.walk(B.walkPhase(dist + 60, S), { outfit: 'school', backpack: true, eyes: blink('open'), mouth: 'smile' });
      const stand = P.stand({ outfit: 'school', backpack: true, eyes: blink('open'), mouth: 'smile', armFar: strap });
      pose = V.env.poseMix(walk, stand, V.seg(t, OUT1 - 0.2, OUT1));
      if (t < OUT0) pose = V.env.poseMix(stand, walk, 0);
      // step OUT over the threshold first (depth), then along the porch: he must be past the sill
      // before his front edge reaches the right door jamb (he is clipped to the opening inside)
      const feet = V.lerp(804, 822, V.ease.inOut(V.seg(k, 0.0, 0.42)));
      s = S * V.lerp(0.92, 1, V.seg(feet, 804, 822));
      y = B.standY(feet, s, pose);
      inside = feet < 812;
      return { pose, x, y, s, sx: squashAt(t), inside, ground: feet };
    }
    if (t < 1.75) {
      // turned back toward the door: wave goodbye
      facing = -1;
      const w = V.ease.inOut(V.seg(t, 1.01, 1.2)) * (1 - V.ease.inOut(V.seg(t, 1.52, 1.7)));
      const osc = Math.sin((t - 1.12) * Math.PI * 2 * 2.6);
      const wave = waveArm({ sh: 6, el: 12 }, w, osc * V.seg(w, 0.6, 1));
      const talk = Math.floor((t - 1.0) * 7) % 2 === 0;
      pose = P.stand({
        outfit: 'school', backpack: true, facing,
        torso: -3 * w, head: -4 * w,
        armNear: facing === 1 ? { sh: 6, el: 12 } : wave,
        armFar: strap,
        eyes: w > 0.3 ? 'happy' : blink('open'),
        mouth: w > 0.3 && t < 1.5 ? (talk ? 'open' : 'grin') : 'smile',
        brows: 0.4 * w,
      });
      // hop of the backpack hitch before leaving
      const hitch = Math.sin(Math.PI * V.seg(t, 1.6, 1.74));
      y = B.standY(822, S, pose) - 8 * hitch;
      return { pose, x, y, s: S, sx: squashAt(t), inside: false, ground: 822 };
    }
    // turn toward the street and walk off
    facing = t < TURN2 ? -1 : 1;
    const dist = walkDist(t);
    const walk = P.walk(B.walkPhase(dist, S), { outfit: 'school', backpack: true, eyes: blink('open'), mouth: 'smile' });
    const stand = P.stand({ outfit: 'school', backpack: true, facing, eyes: blink('open'), mouth: 'smile', armFar: strap });
    pose = facing === 1 ? V.env.poseMix(stand, walk, V.seg(t, WALK0 - 0.02, WALK0 + 0.3)) : stand;
    pose.facing = facing;
    // keep holding the strap with the far hand while walking (casual)
    if (facing === 1) pose.armFar = { sh: V.lerp(strap.sh, 26 + pose.armFar.sh * 0.25, 0.5), el: strap.el };
    y = V.env.streetHipY(x, S, pose);
    return { pose, x, y, s: S, sx: squashAt(t), inside: false, ground: V.env.streetGroundY(x) };
  }

  function momPose(t) {
    // steps into the doorway from the left (inside), waves, then the door closes on her
    const k = V.ep(t, 0.55, 0.95, 'inOut');
    const x = V.lerp(-150, -38, k);
    const w = V.ease.inOut(V.seg(t, 0.93, 1.12)) * (1 - V.ease.inOut(V.seg(t, 1.42, 1.6)));
    const osc = Math.sin((t - 1.05) * Math.PI * 2 * 2.2) * V.seg(w, 0.6, 1);
    const walking = k > 0 && k < 1;
    const base = walking ? P.walk(B.walkPhase((x + 150) * 1.1, 0.9)) : P.stand();
    const fa = 18 + 112; // mug arm: sh + el (torso 0)
    const pose = Object.assign(base, {
      look: MOM.look, outfit: MOM.outfit,
      armNear: waveArm(walking ? base.armNear : { sh: 8, el: 14 }, w, osc),
      armFar: { sh: 18, el: 112 },
      eyes: w > 0.4 ? 'happy' : B.blink(t, 'open', 5),
      mouth: w > 0.4 ? (Math.floor(t * 6) % 2 ? 'open' : 'smile') : 'smile',
      brows: 0.3,
      propFar: (c) => {
        c.rotate(V.deg(fa) - Math.PI / 2);
        V.fillRound(c, -6, -34, 30, 34, 5, '#f4f1ea', V.pal.ink, 3);
        c.beginPath();
        c.arc(24, -18, 9, -Math.PI / 2, Math.PI / 2);
        c.lineWidth = 4;
        c.strokeStyle = V.pal.ink;
        c.stroke();
        V.fillRound(c, 2, -26, 14, 12, 4, '#e2463c');
        // steam
        c.globalAlpha = 0.5;
        for (let i = 0; i < 2; i++) {
          c.beginPath();
          const ph = t * 3 + i * 2;
          c.moveTo(4 + i * 10, -40);
          c.bezierCurveTo(-2 + i * 10 + Math.sin(ph) * 5, -54, 12 + i * 10, -62, 6 + i * 10 + Math.sin(ph + 1) * 5, -76);
          c.strokeStyle = '#ffffff';
          c.lineWidth = 3;
          c.stroke();
        }
        c.globalAlpha = 1;
      },
    });
    const s = 0.9;
    return { pose, x, y: B.standY(803, s, pose), s, visible: t > 0.5 };
  }

  const drawSquash = (c, h) => {
    if (h.sx !== 1) {
      c.save();
      c.translate(h.x, 0);
      c.scale(h.sx, 1);
      c.translate(-h.x, 0);
      B.draw(c, h.x, h.y, h.s, h.pose);
      c.restore();
    } else B.draw(c, h.x, h.y, h.s, h.pose);
  };

  V.registerScene('05-leave', {
    sfx: [
      { t: 0, type: 'birds', dur: 4.4, vol: 0.6 },
      { t: 0.2, type: 'door_open' },
      { t: 0.34, type: 'footsteps', dur: 0.6, rate: 3.4, vol: 0.55 }, // out of the doorway onto the porch
      { t: 1.6, type: 'door_close' },
      { t: 1.8, type: 'footsteps', dur: 2.2, rate: 3.2 },
    ],
    draw(ctx, t) {
      const hour = 7.9;
      const cam = camAt(t);
      const hero = heroPose(t);
      const mom = momPose(t);
      const doorOpen = V.ep(t, 0.2, 0.62, 'out') * (1 - V.ep(t, 1.32, 1.6, 'in'));
      const o = {
        cam, hour, t, birds: true, windowsLit: 0, interiorLit: 0.35, lamps: 0, doorOpen,
        inside(c) {
          if (mom.visible) B.draw(c, mom.x, mom.y, mom.s, mom.pose);
          if (hero.inside) drawSquash(c, hero);
        },
        actors(c) {
          if (hero.inside) return;
          V.env.streetCastShadow(c, o, hero.ground, (cc) => drawSquash(cc, hero));
          V.groundShadow(c, hero.x, hero.ground, 52 * hero.s, 0.2);
          drawSquash(c, hero);
        },
      };
      V.env.street(ctx, o);
    },
  });
})();
