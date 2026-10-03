# יום בחיים של נער בן 15

**[student-day.mp4](student-day.mp4)** — a 94-second, 1080p cartoon of a 15-year-old's day, rendered entirely from code.

| Time | Scene |
|---|---|
| 07:30 | the bedside LED alarm clock flips from 07:29 to 07:30 and rings; he slaps it and gets up |
| 07:35–07:52 | shower, brushing teeth, a speed-montage of getting dressed, leaving home |
| 08:00 | arrives at school and goes in at the bell; a time-lapse takes the day to 15:00 |
| 15:00–15:15 | school's out; walks home and arrives at 15:15 |
| 15:20 | lunch: schnitzel and fries |
| 16:40–17:00 | gets into his football kit, then 17:00 practice |
| 18:00–20:00 | home at dusk, shower, homework until 20:00 |
| 21:00–01:30 | out with three friends on a night promenade |
| 01:30 | sneaks back in and falls asleep next to the same LED clock |

## How it's made

- Every frame is drawn on a 1920×1080 `<canvas>` by plain JavaScript (`src/` engine + character rig, `env/` sets, `scenes/` one file per scene, `timeline.json` order and time stamps).
- Headless Chromium captures the frames and ffmpeg encodes them.
- The music and sound effects are synthesized procedurally by `tools/audio.py` (numpy) from each scene's `sfx` cues. No external assets are used except the Rubik and Share Tech Mono fonts (OFL).

## Rebuild

```
cd video/student-day
npm i                 # playwright-core (uses the system Chromium at /opt/pw-browsers, or set CHROME_PATH)
npm run build         # cues -> out/audio.wav -> student-day.mp4  (needs ffmpeg + python3 with numpy)
```

Preview in a browser: serve this folder over http (e.g. `npx serve`) and open `index.html` (`?scene=10-lunch` plays a single scene). `SCENE_GUIDE.md` documents the engine, the rig and the style rules; `node tools/render.mjs` has contact-sheet, still, perf and video modes.
