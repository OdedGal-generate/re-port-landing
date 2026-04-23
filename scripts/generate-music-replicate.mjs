import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.REPLICATE_API_TOKEN;
if (!apiKey) {
  console.error("ERROR: REPLICATE_API_TOKEN not set in env");
  process.exit(1);
}

const outDir = "C:/projects/re-port-landing/public/images/ad";

const samples = [
  {
    name: "1-cinematic-corporate",
    prompt:
      "Tense minimalist piano with low pulsing sub-bass, dramatic orchestral strings swell, cinematic corporate advertisement, premium fintech mood, no vocals",
  },
  {
    name: "2-uplifting-fintech",
    prompt:
      "Uplifting modern electronic fintech, driving turquoise synth arpeggios, punchy tight drums with kick and hi-hats, bright pluck leads, premium corporate ad, no vocals",
  },
  {
    name: "3-orchestral-dramatic",
    prompt:
      "Epic cinematic trailer score, orchestral strings and brass with electronic synth bass, dramatic build with triumphant climax, Hans Zimmer style, no vocals",
  },
  {
    name: "4-hybrid-tech-emotional",
    prompt:
      "Hybrid orchestral-electronic score, piano intro merging into driving synths with cinematic string swell, emotional premium tech advertisement, no vocals",
  },
  {
    name: "5-brand-reveal-triumphant",
    prompt:
      "Triumphant major-key cinematic swell, bright orchestral strings with punchy modern drums, brass pad and shimmering synths, celebratory brand reveal music, no vocals",
  },
];

const MUSICGEN_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb";

async function createPrediction(prompt) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: MUSICGEN_VERSION,
      input: {
        prompt,
        duration: 30,
        model_version: "stereo-large",
        output_format: "mp3",
        normalization_strategy: "loudness",
        top_k: 250,
        top_p: 0,
        temperature: 1,
        classifier_free_guidance: 3,
      },
    }),
  });
  if (!res.ok) throw new Error(`create ${res.status}: ${await res.text()}`);
  return res.json();
}

async function pollPrediction(id) {
  const deadline = Date.now() + 10 * 60 * 1000; // 10 min max
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`poll ${res.status}: ${await res.text()}`);
    const j = await res.json();
    if (j.status === "succeeded") return j;
    if (j.status === "failed" || j.status === "canceled") throw new Error(`prediction ${j.status}: ${j.error || "no error"}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("prediction timed out after 10 min");
}

async function downloadTo(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  return buf.length;
}

async function runOne(sample) {
  const outPath = path.join(outDir, `music-sample-${sample.name}.mp3`);
  console.log(`\n[${sample.name}] creating prediction...`);
  const created = await createPrediction(sample.prompt);
  console.log(`[${sample.name}] id=${created.id} status=${created.status}`);

  let final = created;
  if (created.status !== "succeeded") {
    console.log(`[${sample.name}] polling...`);
    final = await pollPrediction(created.id);
  }

  const outputUrl = Array.isArray(final.output) ? final.output[0] : final.output;
  if (!outputUrl) throw new Error(`no output URL in final: ${JSON.stringify(final).slice(0, 400)}`);

  console.log(`[${sample.name}] downloading ${outputUrl}`);
  const bytes = await downloadTo(outputUrl, outPath);
  console.log(`[${sample.name}] SAVED ${outPath} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  return { name: sample.name, outPath, bytes };
}

async function main() {
  console.log(`Generating ${samples.length} music samples via Replicate MusicGen...`);
  const results = [];
  const errors = [];

  // Run in parallel for speed — Replicate handles concurrent requests fine
  const settled = await Promise.allSettled(samples.map(runOne));
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") results.push(r.value);
    else errors.push({ name: samples[i].name, error: r.reason?.message || String(r.reason) });
  });

  console.log(`\n=== RESULTS ===`);
  results.forEach((r) => console.log(`OK  ${r.name} → ${r.outPath} (${(r.bytes / 1024 / 1024).toFixed(2)} MB)`));
  errors.forEach((e) => console.log(`ERR ${e.name}: ${e.error}`));

  process.exit(errors.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
