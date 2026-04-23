import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const AD_DIR = "C:/projects/re-port-landing/public/images/ad";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

function loadRefImage(filePath) {
  const data = fs.readFileSync(filePath).toString("base64");
  return { inlineData: { mimeType: "image/png", data } };
}

async function generate({ name, prompt, refs, outPath }) {
  console.log(`\n=== Generating ${name} ===`);
  console.log(`Refs: ${refs.length}, Out: ${outPath}`);

  const contents = [{ text: prompt }, ...refs.map(loadRefImage)];

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "9:16", imageSize: "2K" },
    },
  });

  let saved = false;
  for (const part of response.candidates[0].content.parts) {
    if (part.thought) continue;
    if (part.text) {
      console.log(`[text]: ${part.text.slice(0, 200)}`);
    } else if (part.inlineData) {
      const buf = Buffer.from(part.inlineData.data, "base64");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log(`SAVED: ${outPath} (${buf.length} bytes)`);
      saved = true;
    }
  }
  if (!saved) {
    console.error(`FAILED: no image in response for ${name}`);
    console.error(JSON.stringify(response.candidates[0], null, 2).slice(0, 2000));
  }
  return saved;
}

const jobs = [
  {
    name: "S4 male agent",
    prompt:
      'Photorealistic cinematic close-up, 9:16 vertical, shallow depth of field, premium fintech ad style. A male agent\'s hands (the same man as shown in the FIRST reference image — mid-30s, Israeli, navy suit sleeves, steel-band watch on left wrist visible at the cuff) hold a modern tablet tilted toward the viewer. His right index finger hovers near a pill-shaped button at the bottom of the tablet screen. Floating holographically ABOVE the tablet screen is a semi-transparent 3D portrait of the same man from the first reference image — same face, hair, stubble, navy suit, serene confident expression, rendered in soft turquoise-cyan light matching the tablet\'s glow. The tablet screen UI should match the composition of the SECOND reference image exactly: top-left Re-PORT logo in turquoise-to-blue gradient with a small subtitle below it; centered Hebrew headline "כל הדוחות. כל החברות. קליק אחד."; a smaller Hebrew paragraph underneath; five horizontal rows below showing Hebrew company names (מגדל, הראל, הפניקס, כלל ביטוח, אלטשולר שחם) each with a turquoise progress bar filled to different levels beside it; a pill-shaped turquoise "סיום" button at the very bottom. Blurred background of a modern office with warm bokeh. Lighting: cool cyan from the tablet, warm amber behind. Photorealistic 4K detail on hands and tablet; holographic face is translucent and ethereal. IMPORTANT: the person is a MAN — do not generate female hands or a female face.',
    refs: [
      "C:/projects/re-port-landing/public/images/ad/scene5-new.png",
      "C:/projects/re-port-landing/public/images/ad/scene4-new-female.png",
    ],
    outPath: path.join(AD_DIR, "scene4-new.png"),
  },
  {
    name: "S2 clean plate",
    prompt:
      "Photorealistic cinematic 9:16 vertical, matching the composition and style of the reference image exactly. A male insurance agent at a dark wooden desk in a dim office at night. Visible elements: the same turquoise metal desk lamp on the left casting bluish-cyan light; a large curved monitor in the center displaying a CLEAN Microsoft Excel spreadsheet with many columns of numeric data (plain black text on white cells, realistic Excel ribbon at the top, nothing else overlaid on the monitor); a mechanical keyboard being typed on by two male hands (forearms partly visible, navy dress shirt sleeves rolled, silver watch on left wrist); dark wall behind. The monitor shows ONLY the plain Excel spreadsheet. No red text. No red neon glow. No Hebrew equation overlay. No floating numbers. Just a normal Excel sheet. Same cinematic moody teal-to-black color grade and shallow depth of field as the reference. Photorealistic 4K detail.",
    refs: ["C:/projects/re-port-landing/public/images/ad/scene2-new.png"],
    outPath: path.join(AD_DIR, "scene2-clean.png"),
  },
  {
    name: "S5 clean plate",
    prompt:
      "Photorealistic cinematic 9:16 vertical, matching the composition and style of the reference image exactly. A man in a navy suit, mid-30s, Israeli, short dark hair, light stubble, sitting in a modern black leather executive chair in a high-rise Tel Aviv corner office at golden hour. He holds a smartphone to his right ear with his right hand, wearing a confident smile. Behind him: floor-to-ceiling windows revealing the Tel Aviv skyline and Mediterranean sea in warm golden light. On the desk to his left: a small potted plant, and an open silver laptop. IMPORTANT: the laptop screen is completely OFF and DARK — a solid black closed-lid-looking screen with no UI, no green color, no text, no Hebrew, no timer, nothing. The laptop is just sitting there with a dark blank screen. Same warm golden hour lighting and same framing as the reference image. Photorealistic 4K cinematic detail.",
    refs: ["C:/projects/re-port-landing/public/images/ad/scene5-new.png"],
    outPath: path.join(AD_DIR, "scene5-clean.png"),
  },
];

let allOk = true;
for (const job of jobs) {
  try {
    const ok = await generate(job);
    if (!ok) allOk = false;
  } catch (e) {
    console.error(`ERROR on ${job.name}:`, e.message);
    allOk = false;
  }
}

console.log(`\n=== DONE. all_ok=${allOk} ===`);
process.exit(allOk ? 0 : 1);
