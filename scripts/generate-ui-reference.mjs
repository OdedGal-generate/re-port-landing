import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const outPath = "C:/projects/re-port-landing/public/images/ad/overlays/s4-tablet-ui-reference.png";
const logoPath = "C:/projects/re-port-landing/public/images/ad/report-logo.png";

const prompt = `Design a clean, high-fidelity UI mockup of a tablet application screen for a premium Israeli insurtech product. Render as a flat 4:3 landscape rectangle with dark navy background (#0a1628). No physical tablet device frame — just the screen content, edge to edge.

IMPORTANT: The logo in the top-left corner MUST match the attached reference logo image EXACTLY — "Re-" in dark navy, "PORT" in teal/turquoise, with a flowing curved connector line between them, and the subtitle "INSURTECH GATEWAY" in light grey beneath the wordmark. Preserve the exact colors, proportions, and the distinctive wavy connector line. Do not restyle or recolor the logo. For display on the dark navy screen background: change the "Re-" color from dark navy to white (so it is readable on dark background), keep "PORT" teal/turquoise, keep the wavy connector teal, and render "INSURTECH GATEWAY" subtitle in light grey.

Layout (top to bottom, right-to-left for Hebrew):
1. Top-left corner: the Re-PORT logo (as described above) at about 15% of the screen width
2. Centered Hebrew headline in large bold white sans-serif (Heebo or Rubik): "כל הדוחות. כל החברות. קליק אחד."
3. Smaller Hebrew body paragraph centered below, in light grey: "הזן את מספר תעודת הזהות ואשר — המערכת תוריד את כל הדוחות שלך"
4. Five horizontal rows, each with:
   - Hebrew company name on the right (right-aligned): מגדל, הראל, הפניקס, כלל ביטוח, אלטשולר שחם (one per row, top to bottom in this order)
   - Turquoise progress bar on the left of each row, filled to different percentages: 100%, 100%, 75%, 50%, 25% (top to bottom)
   - Small turquoise checkmark next to fully-filled rows, percentage number in white at bar end
5. Bottom row: two pill-shaped buttons side by side in the bottom-center — left pill is outlined with Hebrew label "תעודת זהות" (ID number field), right pill is solid turquoise with Hebrew label "סיום" in white

Style: clean modern fintech UI, soft turquoise glow on progress bars, subtle glassmorphism on card backgrounds, premium crisp. Hebrew text must be pixel-perfect and correctly spelled. 4:3 aspect ratio, 2K resolution.`;

function loadRef(p) {
  const data = fs.readFileSync(p).toString("base64");
  return { inlineData: { mimeType: "image/png", data } };
}

async function main() {
  console.log("Generating Re-PORT tablet UI reference with real logo...");
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ text: prompt }, loadRef(logoPath)],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "4:3", imageSize: "2K" },
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
