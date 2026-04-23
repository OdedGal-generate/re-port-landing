import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const refPath = "C:/projects/re-port-landing/public/images/ad/scene2-new.jpg";
const outPath = "C:/projects/re-port-landing/public/images/ad/scene2-end.png";

const prompt = `Take the attached reference image of a male agent typing at a desk at night. Keep EVERYTHING IDENTICAL — same composition, same lighting, same turquoise lamp on the left, same hands, same keyboard, same wooden desk, same wall, same monitor position, same camera angle, same color grade. Do not change any element except the monitor screen content described below.

CHANGES TO THE MONITOR SCREEN:
1. REMOVE the entire white Excel spreadsheet currently shown on the monitor — delete all the white cells, all the gridlines, all the numeric data, all the rows and columns. The white portion of the screen should be gone completely.
2. REPLACE it with a COMPLETELY DARK / BLACK monitor screen. The screen surface should be deep black / dark navy, as if the spreadsheet is no longer visible and only the dark screen remains. PRESERVE the Excel ribbon/menu bar at the very top of the screen EXACTLY as it appears in the reference image — keep the identical tab names, icons, fonts, layout, colors, and proportions of the ribbon pixel-for-pixel. Do NOT redraw, rewrite, or modify any text or icon in the ribbon. The ribbon must look like the untouched Excel ribbon from the reference. Only the main body of the screen below the ribbon (where the spreadsheet grid was) must become solid dark black.
3. Onto the now-dark screen, place a large red glowing neon Hebrew equation floating prominently at the center:

"20 דקות × 200 לקוחות = 66.67 שעות עבודה"

Render the equation in:
- Large bold Hebrew sans-serif typography (Heebo or Rubik)
- Bright saturated red color (#ff2a2a) with strong red neon glow and bloom around each character
- Text appears luminous, glowing, floating on the dark screen
- Right-to-left Hebrew, correctly spelled
- Can be split across 2 or 3 lines if needed for readability
- Red light spills subtly onto the keyboard and hands below, casting a soft red glow

The equation must be perfectly spelled: "20 דקות × 200 לקוחות = 66.67 שעות עבודה" meaning "20 minutes × 200 clients = 66.67 work hours".

CRITICAL: No white Excel spreadsheet. No white cells. No gridlines. No numeric data visible. The screen background (behind the red text) must be dark / black — only the red neon equation should be visible against a black screen. Everything else in the room stays the same as the reference.

9:16 vertical, photorealistic 4K detail, cinematic moody lighting.`;

function loadRef(p) {
  const data = fs.readFileSync(p).toString("base64");
  const mimeType = p.toLowerCase().endsWith(".jpg") || p.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return { inlineData: { mimeType, data } };
}

async function main() {
  console.log("Generating scene2-end.png (dark screen + red neon equation)...");
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ text: prompt }, loadRef(refPath)],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "9:16", imageSize: "2K" },
    },
  });

  let saved = false;
  for (const part of response.candidates[0].content.parts) {
    if (part.thought) continue;
    if (part.text) {
      console.log("[text]:", part.text.slice(0, 300));
    } else if (part.inlineData) {
      const buf = Buffer.from(part.inlineData.data, "base64");
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log(`SAVED: ${outPath} (${buf.length} bytes)`);
      saved = true;
    }
  }
  process.exit(saved ? 0 : 1);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
