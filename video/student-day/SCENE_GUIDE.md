# "יום בחיים של נער בן 15" — scene builder guide

A ~94-second flat-cartoon film rendered from code: every frame is drawn on a 1920×1080
`<canvas>` by plain JavaScript, captured by headless Chromium and encoded by ffmpeg.
The hero is a 15-year-old boy. The film follows his day minute by minute, and every scene
carries a movie-style time stamp (bottom-right, typewriter digits) — the bedside LED alarm
clock is the recurring motif.

## Layout

```
timeline.json        scene order, durations, transitions, time stamps   (DO NOT EDIT)
index.html           loads everything                                    (DO NOT EDIT)
src/core.js          engine: math, easing, timeline, transitions          (DO NOT EDIT)
src/draw.js          palette, shapes, text, clocks, sky, trees, lamps     (DO NOT EDIT)
src/boy.js           the character rig                                    (DO NOT EDIT)
env/<group>.js       shared props/sets for one location group             (owned by that group)
scenes/NN-name.js    one file per scene                                   (owned by that group)
scenes/_test.js      rig demo sheet — read it for usage examples
tools/render.mjs     previews / perf / full render
tools/audio.py       sound design (music + sfx), driven by the scenes' `sfx` cues
```

Only edit the files your task assigns to you. If you need a generic helper, put it in your
group's `env/*.js` under `V.env.<something>` (never in `src/`). Several builders work in this
folder at the same time.

## Previewing (you can look at PNGs with the Read tool)

Run from `video/student-day/`:

```
node tools/render.mjs sheet 06-school-in --step 0.5          # contact sheet -> previews/06-school-in-sheet.png
node tools/render.mjs sheet 06-school-in --step 0.25 --cols 6 # denser, for checking motion
node tools/render.mjs stills 06-school-in 1.5,3.2            # full-size frames -> previews/06-school-in-1.50.png
node tools/render.mjs perf 06-school-in                      # ms per frame (keep under ~60)
```

The command exits non-zero and prints `PAGE ERRORS` if any script throws — a syntax error in
one scene file breaks the whole page, so always run a render after editing.
Previews include the time-stamp overlay and letterbox exactly as in the final film.

## Scene API

```js
V.registerScene('06-school-in', {
  // sound cues, in scene-local seconds (see "Sound cues" below)
  sfx: [{ t: 0.0, type: 'birds', dur: 6 }, { t: 3.8, type: 'school_bell', dur: 1.6 }],
  // optional: override the stamp text over time (default: timeline.json stamp, interpolated if it has "to")
  // stampTime: (t) => V.lerpTime('21:00', '01:30', V.seg(t, 3, 8)),
  draw(ctx, t, info) {
    // t: scene-local seconds. info.dur: scene length.
    // Must render a complete frame (paint the whole canvas — start with a background fill).
  },
});
```

Hard rules:

* **Deterministic**: a frame depends only on `t`. No `Math.random()`, `Date`, or state carried
  between calls. Use `V.rand(seed)` for pseudo-randomness.
* **`t` can run past `info.dur`** by up to 0.5 s (cross-fades keep the outgoing scene running).
  Everything must still look right there — clamp/hold your animation, don't let things fly off.
* **Paint the full frame** each call (the engine clears to black first).
* **Safe area**: black letterbox bars cover y < 64 and y > 1016. The time stamp occupies the
  bottom-right (roughly x > 1400, y > 840) — keep faces and key action out of that corner.
* Keep `ctx.save()/restore()` balanced. Draw time per frame should stay < 60 ms.
* Hebrew text: use `V.text(ctx, 'בית ספר', x, y, {size, color, weight})` — it switches to RTL
  automatically. Never mirror text with a negative scale.

## Engine helpers (src/core.js, src/draw.js)

* Timing: `V.seg(t, a, b)` → 0..1 progress; `V.ep(t, a, b, 'inOut'|'out'|'in'|'sine'|'outBack'|'outElastic')`
  eased progress; `V.kf(t, [[t0, v0], [t1, v1], ...], ease)` keyframes; `V.lerp`, `V.clamp`,
  `V.osc(t, hz)` sine wave, `V.rand(seed)`.
* Time strings: `V.lerpTime('18:30', '20:00', k)` → 'HH:MM' (wraps past midnight), `V.toMin`, `V.fmtMin`.
* Colour: `V.pal` (shared palette — use it), `V.shade(c, ±k)`, `V.mixColor(a, b, k)`, `V.rgba(c, a)`.
* Shapes: `V.roundRect`, `V.fillRound(ctx, x, y, w, h, r, fill, stroke, lw)`, `V.circle`,
  `V.ellipse`, `V.line`, `V.groundShadow(ctx, x, y, rx)`.
* Text: `V.text(ctx, str, x, y, {size, weight, color, align, stroke, shadow, alpha, mono})`.
* Clocks: `V.alarmClock(ctx, x, yBottom, scale, '07:30', {ring: 0..1, t, glow, colon})` (the
  film's bedside LED clock — red 7-segment digits, shakes + ring lines when `ring>0`);
  `V.sevenSeg(ctx, '17:00', x, y, digitHeight, {on, off, glow})` (scoreboards);
  `V.wallClock(ctx, x, y, r, hours, minutes)` / `V.wallClockStr(ctx, x, y, r, '15:20')`;
  `V.phone(ctx, x, y, scale, '21:00', {label})`.
* Sky & weather: `V.sky(ctx, hour, x, y, w, h)` gradient for a time of day (7.5 = morning,
  15 = afternoon, 18 = dusk, 21+ = night), `V.skyColors(hour)`, `V.sun`, `V.moon`,
  `V.stars(ctx, seed, n, x, y, w, h, t)`, `V.cloud(ctx, x, y, s)`.
* Scenery: `V.tree(ctx, x, groundY, s)`, `V.streetLamp(ctx, x, groundY, s, lit)`.
* Light: `V.tint(ctx, color, alpha, 'multiply')` (night mood), `V.lightPool(ctx, x, y, r, color, alpha)` (additive glow).
* Fun: `V.floaters(ctx, x, y, t, {char:'Z', n, rise, size, color})` — floating Zs / music notes ('♪').

## The character rig (src/boy.js)

```js
const B = V.boy, P = B.pose;
const pose = P.walk(B.walkPhase(distanceTravelled, s), { outfit: 'school', backpack: true, facing: 1 });
const hipY = B.standY(groundY, s, pose);          // feet on the ground
V.groundShadow(ctx, x, groundY, 60 * s);
B.draw(ctx, x, hipY, s, pose);                    // (x, hipY) is the HIP
const j = B.joints(x, hipY, s, pose);             // j.nearHand, j.mouth, j.head ... world coords
```

* Scale: at `s = 1` a standing figure is ~430 px tall, hip ~195 px above the feet.
  Full-body medium shot ≈ s 1.3–1.6; close-up ≈ s 2.5–3.5 (place the hip below the frame).
* Pose presets: `stand()`, `walk(phase)`, `run(phase)`, `sit()` (hip on a seat ~ thigh level),
  `lie()` (rot -90: lying on the back; head ends up on the side opposite `facing`), `kick(k 0..1)`.
  Every preset takes overrides: `P.stand({ armNear: {sh: -150, el: 20}, eyes: 'happy' })`.
* Angles in degrees. Limbs measured from straight down, positive = toward the facing direction.
  Arms: `armNear/armFar: {sh, el}` (el bends positive). Legs: `legNear/legFar: {hip, knee, foot}`
  (knee bends NEGATIVE). Also `torso` (lean forward +), `head` (tilt), `rot` (whole body).
  Arm straight up: `{sh: 180, el: 0}`; straight forward: `{sh: 90, el: 0}`; hand at the
  mouth/chin: `{sh: 60, el: 125}`. Check hand positions with `B.joints()`.
* Walk without foot-sliding: phase = `B.walkPhase(pixelsTravelled, s)`; run: `B.runPhase`.
* Face: `eyes`: open | closed | sleep | half | wide | happy — use `B.blink(t, 'open', seed)`
  so eyes blink naturally. `mouth`: smile | neutral | open | o | grin | teeth | yawn | chew | frown.
  `brows` (+ raised / − frown), `blush` 0..1.
* Props: `propNear: (ctx) => {...}` / `propFar` draw in the hand's frame (origin = hand centre,
  +x points along the forearm). `headProp: (ctx) => {...}` draws in the head frame
  (origin = head centre, face toward +x; mouth ≈ (27, 25), eyes ≈ (18..33, −6)).
* Outfits: 'pajamas', 'towel' (bare chest + towel round the waist), 'school' (white tee with
  school logo, jeans, sneakers), 'sport' (red #10 jersey, shorts, red socks, cleats),
  'home' (grey tee, shorts, socks), 'evening' (green hoodie, jeans). Or an object overriding
  fields: `{ ...V.boy.OUTFITS.sport, shirt: '#2f7fd8' }`.
  `backpack: true` (blue) or a colour.
* Other people (classmates, teammates, coach, friends): same rig with a different `look`
  and outfit: `look: { skin: '#8d5a3b', hair: '#111', hairStyle: 'curly' }`. Hair styles:
  messy (the hero only), short, curly, buzz, long, ponytail, cap (`capColor`). Make background
  people smaller / partly occluded so the hero always reads as the hero.

## Style bible (keep the film coherent)

* Flat cartoon, ink outlines `V.pal.ink` (~3.5 px at s=1) on characters and key props, soft
  ground shadows, simple gradients only for sky/light. Warm, friendly, slightly comic.
* The HERO always looks the same: light-tan skin, dark-brown messy spiky hair (the rig default).
* Cinematic camera: use push-ins, pans, close-ups and over-the-shoulder framing via
  `ctx.translate/scale` — not just a static stage. Ease every camera move.
* Movement must be continuous and readable: anticipation → action → settle. No popping
  (unless it is a deliberate comic "smash cut"). Characters never slide while walking.
* Light follows the clock: morning cool/golden, afternoon bright, dusk orange-purple,
  night deep blue with warm practical lights. Interiors: warm wall colours, visible window
  showing the sky for that hour.
* Every in-world clock must agree with the time stamp in timeline.json.

## Continuity table

| scene | stamp | hero outfit / props | location & light |
|---|---|---|---|
| 01-wake | 07:30 | pajamas, in bed under a blanket | bedroom, dark → morning light through window |
| 02-shower | 07:35 | towel/bare (head+shoulders above the curtain), shampoo foam | bathroom, morning |
| 03-teeth | 07:42 | towel round waist, toothbrush | bathroom sink + mirror, morning |
| 04-dress | 07:48 | towel/pajamas → school outfit + blue backpack | bedroom by the wardrobe |
| 05-leave | 07:52 | school + blue backpack | house front door, morning street |
| 06-school-in | 08:00 | school + blue backpack | school gate & building, morning |
| 07-timelapse | 08:00→15:00 | — | school exterior, sun arcs across the sky |
| 08-school-out | 15:00 | school + blue backpack | school gate, afternoon |
| 09-walk-home | 15:00→15:15 | school + blue backpack | sidewalk → house front door |
| 10-lunch | 15:20 | school tee, no backpack | kitchen table: schnitzel + fries |
| 11-gear-up | 16:40 | changes into sport kit, black/red sports bag, football | home entrance / hallway |
| 12-training | 17:00 | sport kit | football pitch, late afternoon |
| 13-back-home | 18:00 | sport kit, sweaty, bag + ball | house front door, dusk |
| 14-shower-2 | 18:05 | bare/towel, foam | bathroom, dark-blue window |
| 15-homework | 18:30→20:00 | home outfit | bedroom desk + lamp, window darkens |
| 16-friends | 21:00→01:30 | evening hoodie | night street corner / plaza with 3 friends |
| 17-sleep | 01:30 | evening hoodie → under blanket | dark bedroom, moonlight, LED clock |

Shared sets: the **bedroom** (01, 04, 15, 17) lives in `env/bedroom.js`; the **bathroom**
(02, 03, 14) in `env/bathroom.js`; the **house front + street** (05, 09, 13) in
`env/street.js`; **school** (06, 07, 08) in `env/school.js`; **kitchen, hallway, pitch**
(10, 11, 12) in `env/kitchen-field.js`; the **night plaza** (16) in `env/night.js`.

## Sound cues

Each scene lists sound effects in `sfx` (scene-local times). `tools/audio.py` turns them into
the soundtrack, so put a cue on every visible sound event and time it to the frame. Types
(`dur` = seconds, for sustained sounds):

```
alarm{dur} slap shower{dur} brush{dur} spit splash whoosh zipper door_open door_close
footsteps{dur, rate} run_steps{dur} birds{dur} school_bell{dur} crowd{dur} clock_fast{dur}
timewarp{dur} tick{dur} clink chew{dur} gulp whistle kick net cheer{dur} pencil{dur} page
ding crickets{dur} clap creak plop snore{dur} pop sparkle car_pass
```

Optional `vol` (0..1, default 1) on any cue.
