// Scene 12-training (5 s, 17:00, golden late-afternoon light) — football practice.
//  0.00  the coach (tracksuit, cap, clipboard) stands in the left foreground; the hero (red #10)
//        waits in a ready stance with the ball; scoreboard clock on the far side reads 17:00
//  0.30  the coach blows the whistle (cheeks puffed, sound arcs) and points: GO!
//  0.40  the hero dribbles right past a slalom of cones, camera tracking (run_steps 0.8)
//  1.45  a teammate in a yellow training bib charges in and slide-tackles; the hero flicks the ball
//        over his legs (1.5) and hurdles him (1.6-1.9)
//  2.30  plants, winds up, 2.60 SHOOTS (kick): the ball arcs, spinning, past the leaping keeper and
//        3.00 hits the back of the net — the net bulges (net) and wobbles
//  3.05  the hero jumps with both fists up, runs "airplane", knee-slides (3.85) roaring, teammates
//        run in cheering (cheer 3.1)
(function () {
  const B = V.boy, P = B.pose, E = V.env, PT = E.PITCH;
  const INK = V.pal.ink;
  const S = PT.S;
  const G = PT.goal;
  const GY = PT.GY;
  const PPL = E.KF_PEOPLE;

  // ------------------------------------------------------------------ the hero's path
  const X0 = 480;
  const V0 = 640;
  // integrated dribble speed: ramp 0.35->0.8, cruise, brake into the plant at 2.3
  function heroRunX(t) {
    const a0 = 0.35, a1 = 0.8, b0 = 2.0, b1 = 2.3;
    if (t <= a0) return X0;
    let x = X0;
    const ta = Math.min(t, a1);
    x += V0 * ((ta - a0) * (ta - a0)) / (2 * (a1 - a0));
    if (t <= a1) return x;
    x += V0 * (Math.min(t, b0) - a1);
    if (t <= b0) return x;
    const tb = Math.min(t, b1) - b0;
    x += V0 * (tb - (tb * tb) / (2 * (b1 - b0)));
    return x;
  }
  const X_PLANT = heroRunX(2.3);
  // celebration path
  function heroX(t) {
    if (t <= 2.3) return heroRunX(t);
    let x = X_PLANT;
    x += 34 * V.ep(t, 2.55, 2.85, 'out'); // follow-through step
    x += 40 * V.ep(t, 3.05, 3.45, 'linear'); // jump drifts forward
    // run 3.45 -> 3.85 then knee slide decelerating to 4.55
    const r = Math.min(Math.max(t - 3.45, 0), 0.4);
    x += 520 * r * (r / 0.4) * 0.5 + 520 * 0;
    if (t > 3.85) {
      const u = Math.min(t, 4.55) - 3.85;
      x += 520 * (u - (u * u) / (2 * 0.7));
    }
    return x;
  }

  // the kick: strike at k 0.6 (t 2.6)
  const KICK0 = 2.3, KICK1 = 2.8;
  const kickK = (t) => V.seg(t, KICK0, KICK1);
  function kickPose(t, extra) {
    return P.kick(kickK(t), Object.assign({ outfit: 'sport', torso: 0, eyes: 'open', mouth: 'grin', brows: -0.4 }, extra || {}));
  }
  // the near toe position (world, Y = 0 plane) at the moment of the strike
  const STRIKE = (() => {
    const p = kickPose(2.6);
    const x = heroX(2.6);
    const y = B.standY(GY, S, p);
    return B.joints(x, y, S, p).nearToe;
  })();
  const BALL_R = 25;
  const KICK_SPOT = STRIKE[0] + BALL_R * 0.6;
  const NET = { X: G.x + G.depth * 0.8, Y: 980, h: 240 };

  // ------------------------------------------------------------------ the ball
  // returns {X, Y, h, spin, blur}
  function ballAt(t) {
    const r = BALL_R;
    if (t < 0.35) return { X: X0 + 46, Y: -16, h: 0, spin: 0 };
    if (t < 1.36) {
      // dribble: touched ahead once per stride, rolls, the runner catches up
      const hx = heroX(t);
      const ph = B.runPhase(hx - X0, S);
      const lead = 46 + 34 * (0.5 - 0.5 * Math.cos(Math.min(1, V.seg(t, 0.35, 0.7)) * Math.PI)) + 22 * Math.sin(ph * Math.PI * 2 + 1.2);
      const X = hx + lead;
      return { X, Y: -16, h: 0, spin: X / r };
    }
    if (t < 1.82) {
      // flick over the sliding tackle
      const X1 = ballAt(1.3599).X;
      const u = V.seg(t, 1.36, 1.82);
      const X = V.lerp(X1, heroX(1.82) + 80, u);
      return { X, Y: -16, h: 165 * 4 * u * (1 - u), spin: X / r + u * 3 };
    }
    if (t < 2.6) {
      // lands, rolls on and settles at the kick spot
      const Xa = heroX(1.82) + 80;
      const u = V.ep(t, 1.82, 2.45, 'out');
      const X = V.lerp(Xa, KICK_SPOT, u);
      const hop = t < 2.04 ? 16 * Math.abs(Math.sin(V.seg(t, 1.82, 2.04) * Math.PI)) : 0;
      return { X, Y: -16, h: hop, spin: X / r };
    }
    if (t < 3.0) {
      // the shot: fast, curling, rising over the keeper's head (h ~370 as it passes him, u ~0.5,
      // his head top ~h 320) then dipping well under the crossbar (h ~323 at the goal line, bar at
      // 400) into the back of the net
      const u = V.seg(t, 2.6, 3.0);
      const X = V.lerp(KICK_SPOT, NET.X, u);
      const Y = V.lerp(-16, NET.Y, Math.pow(u, 0.9));
      const h = V.lerp(BALL_R, NET.h, u) + 250 * Math.sin(Math.PI * Math.pow(u, 0.75));
      return { X, Y, h, spin: 2.6 * 40 + u * 30, blur: true };
    }
    // in the net: pushed back with the bulge, then drops and bounces
    const push = netHit(t) * 130;
    const fall = V.seg(t, 3.12, 3.38);
    const h = t < 3.12 ? NET.h : t < 3.38 ? NET.h * (1 - fall * fall) : 34 * Math.abs(Math.sin(V.seg(t, 3.38, 3.62) * Math.PI)) * (t < 3.62 ? 1 : 0);
    return { X: NET.X + Math.max(0, push) - 30 * V.ep(t, 3.12, 3.6), Y: NET.Y, h: Math.max(0, h), spin: 110 + V.ep(t, 3.0, 3.8) * 6 };
  }
  function netHit(t) {
    if (t < 3.0) return 0;
    const u = t - 3.0;
    const rise = V.ease.out(V.seg(u, 0, 0.06));
    return rise * Math.exp(-u * 5.5) * Math.cos(u * 22);
  }

  // ------------------------------------------------------------------ the hero pose
  function heroState(t) {
    const x = heroX(t);
    let pose, lift = 0;
    const face = { outfit: 'sport', facing: 1 };
    if (t < 0.38) {
      // ready stance, bouncing on the toes
      const b = Math.sin(t * 14) * 0.5 + 0.5;
      pose = P.stand(Object.assign({}, face, {
        torso: 12, head: -4,
        legNear: { hip: 14, knee: -26 - 6 * b, foot: 0 }, legFar: { hip: -4, knee: -20 - 6 * b, foot: 0 },
        armNear: { sh: 24, el: 60 }, armFar: { sh: -20, el: 60 },
        eyes: 'open', mouth: 'neutral', brows: -0.4,
      }));
      if (t > 0.3) pose.mouth = 'grin';
    } else if (t < 2.3) {
      const ph = B.runPhase(x - X0, S);
      pose = P.run(ph, Object.assign({}, face, { torso: 16, head: 8, eyes: 'open', mouth: 'grin', brows: -0.3 }));
      if (t < 0.55) {
        const ready = P.stand(Object.assign({}, face, {
          torso: 12, head: -4,
          legNear: { hip: 14, knee: -26, foot: 0 }, legFar: { hip: -4, knee: -20, foot: 0 },
          armNear: { sh: 24, el: 60 }, armFar: { sh: -20, el: 60 }, mouth: 'grin',
        }));
        pose = E.kfPoseMix(ready, pose, V.ep(t, 0.38, 0.55));
      }
      // the hurdle over the sliding defender
      if (t > 1.4 && t < 1.78) {
        const u = V.seg(t, 1.4, 1.78);
        lift = 92 * 4 * u * (1 - u);
        const tuck = Math.sin(Math.PI * u);
        const air = P.run(0.25, Object.assign({}, face, {
          torso: 6, head: 2,
          legNear: { hip: 70, knee: -110, foot: 0 }, legFar: { hip: -30, knee: -90, foot: 0 },
          armNear: { sh: 95, el: 20 }, armFar: { sh: -80, el: 20 },
          eyes: 'wide', mouth: 'o', brows: 0.6,
        }));
        pose = E.kfPoseMix(pose, air, tuck * 1.6 > 1 ? 1 : tuck * 1.6);
      }
      // brake into the plant
      if (t > 2.1) pose = E.kfPoseMix(pose, kickPose(2.3), V.ep(t, 2.12, 2.3));
    } else if (t < 2.85) {
      pose = kickPose(t);
    } else if (t < 3.05) {
      // watching the ball fly in...
      const k = V.ep(t, 2.85, 2.95);
      pose = E.kfPoseMix(kickPose(2.8), P.stand(Object.assign({}, face, { torso: 8, head: -8, armNear: { sh: 30, el: 70 }, armFar: { sh: -30, el: 70 }, eyes: 'wide', mouth: 'o', brows: 0.8 })), k);
    } else if (t < 3.45) {
      // GOAL! jump, both fists up
      const u = V.seg(t, 3.05, 3.45);
      lift = 110 * 4 * u * (1 - u);
      const up = V.ep(t, 3.05, 3.15, 'out');
      pose = P.stand(Object.assign({}, face, {
        torso: -6, head: -14,
        legNear: { hip: 30 * up, knee: -70 * up, foot: 0 }, legFar: { hip: -10 * up, knee: -60 * up, foot: 0 },
        armNear: { sh: V.lerp(40, 168, up), el: V.lerp(70, 12, up) }, armFar: { sh: V.lerp(-40, 196, up), el: V.lerp(70, 12, up) },
        eyes: 'happy', mouth: 'open', brows: 0.8, blush: 0.3,
      }));
    } else if (t < 3.85) {
      // airplane run
      const ph = B.runPhase(x - X0, S * 0.9);
      pose = P.run(ph, Object.assign({}, face, {
        torso: 10, head: -6,
        armNear: { sh: 78, el: 6 }, armFar: { sh: -96, el: 6 },
        eyes: 'happy', mouth: 'open', brows: 0.8, blush: 0.3,
      }));
      pose = E.kfPoseMix(P.stand(Object.assign({}, face, { torso: -6, armNear: { sh: 168, el: 12 }, armFar: { sh: 196, el: 12 } })), pose, V.ep(t, 3.45, 3.55));
    } else {
      // knee slide, roaring, then fist pumps
      const k = V.ep(t, 3.85, 4.0, 'out');
      const pump = t > 4.55 ? Math.sin((t - 4.55) * 14) : 0;
      const kneel = P.stand(Object.assign({}, face, {
        torso: -18, head: -22,
        legNear: { hip: 12, knee: -104, foot: -84 }, legFar: { hip: 4, knee: -100, foot: -84 },
        armNear: { sh: 150 - 14 * pump, el: 20 + 30 * Math.max(0, pump) }, armFar: { sh: 214 + 14 * pump, el: 20 + 30 * Math.max(0, -pump) },
        eyes: t > 4.6 ? 'happy' : 'closed', mouth: 'open', brows: 0.9, blush: 0.35,
      }));
      const runP = P.run(B.runPhase(x - X0, S * 0.9), Object.assign({}, face, { torso: 10, armNear: { sh: 78, el: 6 }, armFar: { sh: -96, el: 6 } }));
      pose = E.kfPoseMix(runP, kneel, k);
      pose.mouth = 'open';
      pose.eyes = kneel.eyes;
    }
    let hipY = B.standY(GY, S, pose) - lift;
    if (t >= 3.85) {
      // knees on the turf
      const j = B.joints(0, 0, S, pose);
      const kneeLow = Math.max(j.nearKnee[1], j.farKnee[1]) + 15 * S;
      hipY = V.lerp(B.standY(GY, S, pose), GY - kneeLow, V.ep(t, 3.85, 3.98));
    }
    return { x, hipY, pose, lift };
  }

  // ------------------------------------------------------------------ supporting cast
  const withBib = (pose, bib) => Object.assign(pose, { headProp: E.kfTorsoProp(pose, E.kfBib(bib), pose.headProp) });
  function coachState(t) {
    const X = 150, Y = -300;
    const blow = V.seg(t, 0.28, 0.62);
    const up = V.ep(t, 0.05, 0.25) * (1 - V.ep(t, 0.68, 0.85));
    const point = V.ep(t, 0.62, 0.8, 'outBack');
    const puff = Math.sin(Math.PI * blow);
    const pose = P.stand({
      outfit: PPL.coach.outfit, look: PPL.coach.look, facing: 1, torso: -2 + 3 * puff, head: -2,
      armNear: { sh: V.lerp(V.lerp(8, 62, up), 92, point), el: V.lerp(V.lerp(12, 126, up), 4, point) },
      armFar: { sh: 40, el: 70 },
      eyes: blow > 0 && blow < 1 ? 'closed' : B.blink(t, 'open', 3), mouth: point > 0.5 ? 'open' : 'neutral', brows: 0.4,
    });
    pose.headProp = (c) => {
      E.whistleProp(c);
      if (puff > 0.05) {
        // puffed cheeks
        c.save();
        c.beginPath();
        c.arc(14, 14, 10 + 6 * puff, -0.6, Math.PI * 1.1);
        c.fillStyle = PPL.coach.look.skin;
        c.fill();
        c.lineWidth = 3;
        c.strokeStyle = INK;
        c.stroke();
        c.restore();
      }
      // moustache
      c.save();
      c.beginPath();
      c.moveTo(22, 15);
      c.quadraticCurveTo(32, 9, 42, 16);
      c.quadraticCurveTo(32, 20, 22, 15);
      c.fillStyle = '#2b2b2b';
      c.fill();
      c.restore();
    };
    pose.propFar = (c) => {
      // clipboard held against the chest
      E.kfAim(c, V.deg(-80));
      V.fillRound(c, -30, -26, 60, 78, 6, '#b97a4a', INK, 3);
      V.fillRound(c, -24, -16, 48, 62, 3, '#fbf7f0');
      V.fillRound(c, -10, -32, 20, 12, 3, '#c9ced6', INK, 2);
      for (let i = 0; i < 4; i++) V.line(c, -18, -4 + i * 12, 16, -4 + i * 12, 'rgba(60,80,140,0.6)', 2);
    };
    return { X, Y, pose, scale: S * 1.12, puff };
  }

  // defender: charges in from the right, slide tackle at 1.45, sits up, then joins the party
  function defenderState(t) {
    const Y = 30;
    const T0 = 0.45, TS = 1.3, SLIDE = 0.6, VD = 720;
    const XS = 1880 - VD * (TS - T0);
    const slideX = (u) => XS - (VD * u - (VD * u * u) / (2 * SLIDE));
    const XEND = slideX(SLIDE);
    let X, pose, lift = 0, rotLie = false;
    const look = PPL.mate1.look, outfit = PPL.mate1.outfit;
    // sitting on the turf: near leg stretched out along the ground, far knee up, hands propped behind
    // (both feet end up ~hip height, so standY puts the seat on the grass instead of floating)
    const groundSit = (o) => P.sit(Object.assign({
      outfit, look, facing: -1, torso: 6, head: -10,
      legNear: { hip: 88, knee: -2, foot: -40 }, legFar: { hip: 135, knee: -95, foot: -40 },
      armNear: { sh: -30, el: 10 }, armFar: { sh: -40, el: 10 },
    }, o || {}));
    if (t < TS) {
      const u = Math.max(0, t - T0);
      X = 1880 - VD * u;
      if (t < T0) pose = P.stand({ outfit, look, facing: -1, torso: 10, legNear: { hip: 10, knee: -20, foot: 0 }, legFar: { hip: -6, knee: -18, foot: 0 }, armNear: { sh: 20, el: 50 }, armFar: { sh: -20, el: 50 } });
      else pose = P.run(B.runPhase(VD * u, S), { outfit, look, facing: -1, torso: 18, mouth: 'grin', brows: -0.6 });
    } else if (t < 2.4) {
      // slide tackle: leaning back, lead leg skimming the turf, skidding to a stop
      const u = Math.min(t - TS, SLIDE);
      X = slideX(u);
      const k = V.ep(t, TS, TS + 0.1, 'out');
      // body laid back ~62 deg, lead (near) leg skimming the turf, trailing knee up, far hand planted
      // behind on the grass, near arm up for balance -> low enough for the hero to hurdle him
      const slide = P.stand({
        outfit, look, facing: -1, rot: -62 * k, torso: 4, head: 18,
        legNear: { hip: 24, knee: -2, foot: -10 }, legFar: { hip: 58, knee: -64, foot: -20 },
        armNear: { sh: 172, el: 28 }, armFar: { sh: 2, el: 14 },
        eyes: t > 1.7 ? 'wide' : 'open', mouth: t > 1.7 ? 'o' : 'grin', brows: t > 1.7 ? 0.6 : -0.6,
      });
      pose = E.kfPoseMix(P.run(B.runPhase(VD * (TS - T0), S), { outfit, look, facing: -1, torso: 18 }), slide, k);
      pose.rot = slide.rot;
      rotLie = true;
    } else if (t < 3.3) {
      // sits up, laughs it off
      X = XEND;
      const k = V.ep(t, 2.4, 2.8);
      const slid = defenderState(2.399).pose;
      pose = E.kfPoseMix(Object.assign({}, slid, { headProp: null, eyes: 'happy', mouth: 'grin' }), groundSit({ eyes: 'happy', mouth: 'grin' }), k);
      pose.rot = -62 * (1 - k);
      rotLie = true;
    } else {
      // up and running to the hero
      const k = V.ep(t, 3.3, 3.5);
      const d = 300 * V.ep(t, 3.4, 4.6, 'inOut');
      X = XEND + d;
      let p2 = P.run(B.runPhase(d, S), { outfit, look, facing: 1, torso: 8, armNear: { sh: 150, el: 20 }, armFar: { sh: 200, el: 20 }, eyes: 'happy', mouth: 'open' });
      if (t > 4.6) {
        const hop = Math.abs(Math.sin((t - 4.6) * 9));
        lift = 40 * hop;
        p2 = P.stand({ outfit, look, facing: 1, armNear: { sh: 165, el: 10 }, armFar: { sh: 200, el: 10 }, eyes: 'happy', mouth: 'open', legNear: { hip: 10, knee: -20 * hop, foot: 0 }, legFar: { hip: -6, knee: -20 * hop, foot: 0 } });
      }
      pose = E.kfPoseMix(groundSit(), p2, k);
    }
    withBib(pose, PPL.mate1.bib);
    return { X, Y, pose, lift, scale: S, ground: rotLie };
  }

  // two teammates in the background: high-knees drill, then they run in to celebrate
  function mateState(t, who, start, end, seed) {
    const P2 = PPL[who];
    const k = V.ep(t, 3.15, 4.65, 'inOut');
    const X = V.lerp(start[0], end[0], k), Y = V.lerp(start[1], end[1], k);
    let pose, lift = 0;
    if (t < 3.15) {
      const b = Math.abs(Math.sin(t * 9 + seed));
      pose = P.stand({ outfit: P2.outfit, look: P2.look, facing: seed > 1 ? -1 : 1, legNear: { hip: 60 * b, knee: -90 * b, foot: 0 }, legFar: { hip: 0, knee: -4, foot: 0 }, armNear: { sh: -30 + 60 * b, el: 70 }, armFar: { sh: 30 - 60 * b, el: 70 }, mouth: 'neutral', eyes: B.blink(t, 'open', seed) });
      lift = 10 * b;
      if (t > 3.0) pose = Object.assign(pose, { eyes: 'wide', mouth: 'o' });
    } else if (t < 4.65) {
      const dist = Math.hypot(end[0] - start[0], (end[1] - start[1]) * 0.4) * k;
      pose = P.run(B.runPhase(dist, S) + seed, { outfit: P2.outfit, look: P2.look, facing: end[0] > start[0] ? 1 : -1, torso: 10, armNear: { sh: 160, el: 20 }, armFar: { sh: 200, el: 20 }, eyes: 'happy', mouth: 'open' });
    } else {
      const hop = Math.abs(Math.sin((t - 4.65) * 9 + seed));
      lift = 46 * hop;
      pose = P.stand({ outfit: P2.outfit, look: P2.look, facing: end[2] || 1, armNear: { sh: 165, el: 10 }, armFar: { sh: 200, el: 10 }, eyes: 'happy', mouth: 'open', legNear: { hip: 14 * hop, knee: -30 * hop, foot: 0 }, legFar: { hip: -6, knee: -20 * hop, foot: 0 } });
    }
    withBib(pose, P2.bib);
    return { X, Y, pose, lift, scale: S };
  }

  function keeperState(t) {
    const X = G.x - 220, Y = 640; // a step off his line
    const P2 = PPL.keeper;
    const gl = (c) => {
      V.circle(c, 0, 0, 15, P2.gloves, INK, 3.5);
      V.fillRound(c, 6, -10, 12, 20, 6, P2.gloves, INK, 3);
    };
    // ready crouch, side-steps; the shot flies just over his head (~2.80) and only THEN he leaps,
    // too late, with both arms stretched up (the ball is already in the net at 3.0)
    const leap = V.seg(t, 2.82, 3.2);
    const lift = 120 * 4 * leap * (1 - leap) * (t < 3.2 ? 1 : 0);
    const k = V.ep(t, 2.8, 2.94, 'out') * (1 - V.ep(t, 3.2, 3.36));
    const sway = Math.sin(t * 7) * 6 * (1 - V.seg(t, 2.5, 2.7));
    const crouch = P.stand({
      outfit: P2.outfit, look: P2.look, facing: -1, torso: 20,
      legNear: { hip: 24, knee: -52, foot: 28 }, legFar: { hip: -4, knee: -48, foot: 52 },
      armNear: { sh: 50, el: 40 }, armFar: { sh: 40, el: 40 },
      eyes: t > 2.7 ? 'wide' : 'open', mouth: t > 2.7 ? 'o' : 'neutral', brows: t > 2.7 ? 0.8 : -0.5,
    });
    const stretch = P.stand({
      outfit: P2.outfit, look: P2.look, facing: -1, torso: -14, head: -16, rot: 14,
      legNear: { hip: 10, knee: -30, foot: 0 }, legFar: { hip: -20, knee: -10, foot: 0 },
      armNear: { sh: 176, el: 0 }, armFar: { sh: 190, el: 0 }, eyes: 'wide', mouth: 'o', brows: 1,
    });
    let pose = E.kfPoseMix(crouch, stretch, k);
    let hipY;
    if (t > 3.2) {
      // lands and slumps onto the turf, knees up, head in his hands (feet stay on the ground)
      const d = V.ep(t, 3.26, 3.6, 'inOut');
      const slump = P.sit({
        outfit: P2.outfit, look: P2.look, facing: -1, torso: 14, head: 24,
        legNear: { hip: 128, knee: -98, foot: -30 }, legFar: { hip: 116, knee: -92, foot: -24 },
        armNear: { sh: 128, el: 112 }, armFar: { sh: 118, el: 118 },
        eyes: 'closed', mouth: 'frown', brows: -0.6,
      });
      pose = E.kfPoseMix(Object.assign({}, pose, { eyes: 'closed', mouth: 'frown' }), slump, d);
      hipY = V.lerp(B.standY(GY, S, pose), Math.min(B.standY(GY, S, pose), GY - 22 * S), d);
    }
    pose.propNear = gl;
    pose.propFar = gl;
    return { X: X + sway, Y, pose, lift, scale: S, hipY };
  }

  // ------------------------------------------------------------------ drawing helpers
  function drawPerson(c, api, st, shadowOnly) {
    c.save();
    api.layer(c, st.Y);
    const sc = st.scale || S;
    const hipY = (st.hipY !== undefined ? st.hipY : B.standY(GY, sc, st.pose)) - (st.lift || 0);
    if (!shadowOnly) {
      const fade = 1 / (1 + (st.lift || 0) / 80);
      V.ellipse(c, st.X, GY, 54 * sc * (0.6 + 0.4 * fade), 9 * sc, `rgba(30,50,20,${0.3 * fade})`);
    }
    B.draw(c, st.X, hipY, sc, st.pose);
    c.restore();
  }
  function shadowItem(st) {
    const sc = st.scale || S;
    return { Y: st.Y, draw: (c) => B.draw(c, st.X, (st.hipY !== undefined ? st.hipY : B.standY(GY, sc, st.pose)) - (st.lift || 0), sc, st.pose) };
  }
  function cone(c, api, X, Y, knock) {
    c.save();
    api.layer(c, Y);
    c.translate(X, GY);
    c.rotate(knock || 0);
    V.ellipse(c, 6, 0, 30, 6, 'rgba(30,50,20,0.25)');
    E.kfPoly(c, [[-24, 0], [24, 0], [7, -56], [-7, -56]], '#f39a3d', INK, 3.5);
    E.kfPoly(c, [[-15, -24], [15, -24], [11, -38], [-11, -38]], '#fbf7f0');
    V.fillRound(c, -30, -6, 60, 8, 3, '#e07e22', INK, 3);
    c.restore();
  }
  function drawBall(c, api, b, t) {
    const p = api.P(b.X, b.Y, b.h + BALL_R);
    const r = BALL_R * p.k;
    api.ballShadow(c, b.X, b.Y, b.h, BALL_R);
    if (b.blur) {
      // streak behind the shot, along the real flight path (where the ball was 0.06 s ago)
      const pb = ballAt(Math.max(2.6, t - 0.06));
      const q = api.P(pb.X, pb.Y, pb.h + BALL_R);
      const g = c.createLinearGradient(q.x, q.y, p.x, p.y);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,0.8)');
      c.save();
      c.lineCap = 'round';
      c.strokeStyle = g;
      c.lineWidth = r * 1.4;
      c.beginPath();
      c.moveTo(q.x, q.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.restore();
    }
    E.football(c, p.x, p.y, r, b.spin);
  }

  function camAt(t) {
    const hx = (tt) => heroX(Math.min(tt, 2.3));
    const XE = heroX(4.6);
    let x = V.kf(t, [[0, 600], [0.45, 640], [2.3, X_PLANT + 170], [2.58, X_PLANT + 200], [2.95, G.x - 120], [3.35, G.x - 230], [4.5, XE + 80], [5.5, XE + 96]], 'inOut');
    // follow the dribble tightly
    if (t > 0.45 && t < 2.3) {
      const k = V.ep(t, 0.45, 0.9) * (1 - V.ep(t, 2.05, 2.3));
      x = V.lerp(x, hx(t) + 200, k);
    }
    const zoom = V.kf(t, [[0, 1.04], [0.4, 1.06], [1.0, 1.16], [2.3, 1.18], [2.58, 1.2], [2.95, 1.1], [3.35, 1.0], [4.5, 1.1], [5.5, 1.14]], 'inOut');
    const y = V.kf(t, [[0, 610], [1.0, 640], [2.3, 640], [2.58, 630], [2.95, 590], [3.35, 600], [4.5, 640], [5.5, 645]], 'inOut');
    return { x, y, zoom };
  }

  // grass spray during the knee slide
  function grassSpray(c, api, t, hs) {
    if (t < 3.85 || t > 4.9) return;
    c.save();
    api.layer(c, -4);
    const j = B.joints(hs.x, hs.hipY, S, hs.pose);
    const kx = Math.max(j.nearKnee[0], j.farKnee[0]) + 20;
    for (let i = 0; i < 16; i++) {
      const born = 3.85 + (i / 16) * 0.6;
      const age = t - born;
      if (age < 0 || age > 0.45) continue;
      const vx = 60 + V.rand(i * 3.1) * 140, vy = -(120 + V.rand(i * 5.3) * 200);
      const x = kx + vx * age - 30 * (i % 3);
      const y = GY - 6 + vy * age + 900 * age * age;
      if (y > GY) continue;
      c.globalAlpha = 1 - age / 0.45;
      c.save();
      c.translate(x, y);
      c.rotate(i + age * 10);
      V.fillRound(c, -6, -2, 12, 4, 2, i % 2 ? '#4f9e44' : '#7cc96a');
      c.restore();
    }
    c.restore();
  }

  function whistleFx(c, api, t, co) {
    const blow = V.seg(t, 0.28, 0.66);
    if (blow <= 0 || blow >= 1) return;
    c.save();
    api.layer(c, co.Y);
    const sc = co.scale;
    const hipY = B.standY(GY, sc, co.pose);
    const j = B.joints(co.X, hipY, sc, co.pose);
    const mx = j.mouth[0] + 40 * sc, my = j.mouth[1];
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = (blow * 3 + i / 3) % 1;
      c.globalAlpha = Math.sin(Math.PI * ph) * Math.sin(Math.PI * blow);
      c.beginPath();
      c.arc(mx, my, 24 + ph * 70, -0.6, 0.6);
      c.strokeStyle = '#fbf7f0';
      c.lineWidth = 7;
      c.stroke();
      c.strokeStyle = INK;
      c.lineWidth = 2;
      c.stroke();
    }
    c.restore();
  }

  function goalFx(c, api, t) {
    // big burst of stars + "!!" lines at the net on impact
    const k = V.seg(t, 3.0, 3.45);
    if (k <= 0 || k >= 1) return;
    const p = api.P(NET.X, NET.Y, NET.h + BALL_R);
    c.save();
    c.translate(p.x, p.y);
    c.globalAlpha = 1 - k;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const r0 = 30 + k * 80, r1 = r0 + 30 + 20 * (1 - k);
      V.line(c, Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1, '#fff6c8', 6);
    }
    c.restore();
  }

  V.registerScene('12-training', {
    sfx: [
      { t: 0.3, type: 'whistle', dur: 0.35 }, // ends with the blow (cheeks puffed 0.28-0.62)
      // foot plants: 0.76, 1.09, take-off 1.41 | hurdle (airborne, silent) | 1.78, 2.07, brake 2.22
      { t: 0.742, type: 'run_steps', dur: 0.7, rate: 3.07 },
      { t: 1.757, type: 'run_steps', dur: 0.35, rate: 3.38 },
      { t: 2.2, type: 'run_steps', dur: 0.2, rate: 2 },
      { t: 1.3, type: 'whoosh', vol: 0.4 },
      { t: 1.36, type: 'kick', vol: 0.25 },
      { t: 2.6, type: 'kick' },
      { t: 3.0, type: 'net' },
      { t: 3.1, type: 'cheer', dur: 1.8 },
      { t: 3.85, type: 'whoosh', vol: 0.3 },
    ],
    draw(ctx, t) {
      const cam = camAt(t);
      const hs = heroState(t);
      const co = coachState(t);
      const de = defenderState(t);
      const m2 = mateState(t, 'mate2', [1250, 1700], [heroX(4.6) - 290, 260, 1], 0.3);
      const m3 = mateState(t, 'mate3', [1700, 2100], [heroX(4.6) + 170, 330, -1], 1.7);
      const ke = keeperState(t);
      const ball = ballAt(t);
      const heroSt = { X: hs.x, Y: 0, pose: hs.pose, hipY: hs.hipY, lift: 0, scale: S };
      E.pitch(ctx, {
        t, cam, hour: 17.0, clock: '17:00',
        // GOAL: the home score ticks 0 -> 1 as the ball hits the net, blinking three times
        home: t >= 3.02 ? 1 : 0, homeOn: t < 3.02 || t > 3.92 || ((t - 3.02) / 0.3) % 1 < 0.6,
        netHit: netHit(t), netAt: { Y: NET.Y, h: NET.h },
        actors(c, api) {
          api.shadows(c, [shadowItem(m3), shadowItem(m2), shadowItem(ke), shadowItem(de), shadowItem(heroSt), shadowItem(co)]);
          // depth-sorted draw list (far -> near)
          const list = [
            { Y: m3.Y, fn: () => drawPerson(c, api, m3) },
            { Y: m2.Y, fn: () => drawPerson(c, api, m2) },
            { Y: G.y1, fn: () => api.goalBack(c) },
            { Y: ke.Y, fn: () => drawPerson(c, api, ke) },
            { Y: G.y0 - 1, fn: () => api.goalFront(c) },
            { Y: ball.Y + (ball.X > G.x && ball.Y > G.y0 ? 0 : 0), fn: () => drawBall(c, api, ball, t) },
            { Y: 70, fn: () => cone(c, api, 1010, 70) },
            { Y: -70, fn: () => cone(c, api, 810, -70) },
            { Y: -70.5, fn: () => cone(c, api, 1210, -70) },
            { Y: de.Y, fn: () => drawPerson(c, api, de) },
            { Y: 0, fn: () => { drawPerson(c, api, heroSt); grassSpray(c, api, t, hs); } },
            { Y: co.Y, fn: () => { drawPerson(c, api, co); whistleFx(c, api, t, co); } },
          ];
          // the ball inside the goal must sit between the back net and the keeper/front net
          list.sort((a, b) => b.Y - a.Y);
          list.forEach((it) => it.fn());
          goalFx(c, api, t);
        },
      });
    },
  });
})();
