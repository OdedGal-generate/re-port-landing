import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.ELEVEN_API_KEY;
if (!apiKey) {
  console.error("ERROR: ELEVEN_API_KEY not set");
  process.exit(1);
}

const outPath = "C:/projects/re-port-landing/public/images/ad/music.mp3";

const prompt = `40-second premium corporate Israeli fintech advertisement background music track, optimized for vertical social media (Instagram Reels / TikTok), cinematic and punchy, no vocals, no lyrics.

STRUCTURE (narrative arc follows the ad):

0-10s — TENSION / PROBLEM: Opens with tense minimalist piano in a minor key, slow descending arpeggios, over a low pulsing analog sub-bass. Atmosphere feels anxious, claustrophobic, repetitive — like being stuck. Very light ticking percussion (clock-like) hints at time pressure. Slowly builds.

10-13s — ESCALATION: Piano becomes more insistent, bass pulse quickens slightly. A rising string texture swells underneath. At 13 seconds, a sharp dramatic orchestral stinger hit lands — a cinematic drop marking the pivot.

13-16s — SUSPENDED TURNING POINT: Brief beat of held tension after the stinger. A single sustained note or breath. The cinematic "what if?" moment — held, awe-struck, on the edge.

16-29s — CONFIDENT SOLUTION: Transitions into an upbeat modern electronic fintech track. Driving turquoise-toned synth arpeggios, clean punchy tight drums (kick + hi-hats + snare), bright pluck leads, mid-tempo forward-moving momentum. Premium, tech-forward, positive — the product delivering results.

29-35s — TRIUMPHANT CLIMAX: Full orchestral + electronic swell. Cinematic strings join the synths, drums hit harder, brass pad or choir enters for emotional peak. Bright major-key resolution, celebratory but not cheesy.

35-40s — BRAND RESOLUTION OUTRO: Music resolves into a clean sustained brand-reveal chord. A soft reverse cymbal swell at 35s cues the logo appearing. Final 3 seconds hold a sustained major chord, then fade naturally and cleanly.

SOUND PALETTE: Piano, analog sub-bass, cinematic strings, modern electronic synths (turquoise-bright arpeggios), punchy tight drums, orchestral swells, soft brass pad. NO vocals. NO lyrics. NO dialogue.

MOOD ARC: tense -> escalating -> suspended hope -> confident/driving -> triumphant -> brand resolution.

GENRE: corporate cinematic + modern fintech electronic hybrid. Israeli advertising style — emotional, tight, bold, premium. Mix optimized for phone speakers and headphones.`;

const durationMs = 40000;

async function main() {
  console.log(`Generating ${durationMs / 1000}s music track via ElevenLabs...`);
  console.log(`Output: ${outPath}`);

  // Try the newer /v1/music endpoint first (current naming as of late 2024+)
  const endpoints = [
    { url: "https://api.elevenlabs.io/v1/music", body: { prompt, music_length_ms: durationMs } },
    { url: "https://api.elevenlabs.io/v1/music-generation", body: { prompt, duration_seconds: durationMs / 1000, prompt_influence: 0.5 } },
  ];

  let lastError = null;

  for (const { url, body } of endpoints) {
    console.log(`\nTrying: ${url}`);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.log(`  -> ${res.status}: ${errText.slice(0, 400)}`);
        lastError = `${res.status}: ${errText.slice(0, 400)}`;
        continue;
      }

      const ct = res.headers.get("content-type") || "";
      console.log(`  -> OK, content-type: ${ct}`);

      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log(`\nSAVED: ${outPath} (${buf.length} bytes = ${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
      process.exit(0);
    } catch (e) {
      console.log(`  -> ERROR: ${e.message}`);
      lastError = e.message;
    }
  }

  console.error(`\nAll endpoints failed. Last error: ${lastError}`);
  process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
