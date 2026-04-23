import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("ERROR: GEMINI_API_KEY not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const logoPath = "C:/projects/re-port-landing/public/images/logo.png";
const outPath = "C:/projects/re-port-landing/public/images/og-image-draft.png";

const prompt = `Create a premium social media Open Graph preview image for Re-PORT, a B2B insurtech SaaS product for Israeli insurance agents. Landscape format 16:9 (1200×630 target for Facebook, WhatsApp, Twitter link previews).

COMPOSITION (all critical content inside the centered square safe zone to survive WhatsApp's center-crop):

1. BACKGROUND: Deep dark navy gradient (from #0A1A2E top-left to #162B4A bottom-right), with a soft luminous teal-turquoise (#3FB5B3) radial glow emanating from behind the center of the frame. The glow should feel premium and atmospheric, like a subtle spotlight. Very subtle dust/particle motes floating in the teal light, extremely soft. No hard edges, no grid textures.

2. RE-PORT LOGO: Place the Re-PORT wordmark (provided as reference image) in the upper-middle region of the centered safe zone, horizontally centered. Preserve the logo EXACTLY as in the reference — same navy-blue "Re-", same teal "PORT" wordmark, same curved wavy connector line, same "INSURTECH GATEWAY" subtitle in light gray caps. Do NOT redraw, restyle, recolor, or modify the logo in any way. Render it at approximately 55% of the image width so the "INSURTECH GATEWAY" subtitle is clearly readable at preview size — sharp, crisp, and clean against the dark background. A very subtle teal glow halo may radiate from behind the logo.

3. HEBREW AUDIENCE TAG — rendered as a PILL BADGE (below the logo, before the main tagline):
   - Shape: a rounded pill/capsule with solid SATURATED teal fill color #3FB5B3 (matching the "PORT" teal in the logo exactly). Pill has no border, just a solid flat fill, with fully rounded end caps (border-radius = half the pill's height).
   - Inside the pill: the Hebrew text "לסוכני ביטוח" rendered in CRISP WHITE #FFFFFF, medium-bold weight, Heebo or Rubik sans-serif typography. Right-to-left Hebrew, correctly spelled.
   - Pill padding: generous horizontal padding (~40px equivalent each side), modest vertical padding (~16px equivalent), so the text reads as a deliberate badge/label, not cramped and not floating.
   - Pill size: approximately 280-320px wide × 70-80px tall at 2K. Horizontally centered.
   - This pill is the AUDIENCE IDENTIFIER. It must stand out clearly against the dark navy background AND against the teal atmospheric glow — because its teal fill is saturated and solid while the glow is soft and diffuse, contrast is created by opacity/density difference.

4. HEBREW MAIN TAGLINE (below the audience tag, prominent): Render the Hebrew headline "כל הדוחות. כל החברות. קליק אחד." in bold white (#FFFFFF), Heebo or Rubik heavy/bold weight. Right-to-left Hebrew, correctly spelled. Approximately 70-80px equivalent size — this is the hero text, must be the most prominent line in the composition. Three short phrases separated by periods, can be on a single line or split across two lines for balance. The periods matter — they create the 3-beat rhythm.

5. BOTTOM CORNER (very subtle): Small light gray text "re-port.co.il" in the BOTTOM-LEFT corner of the image, approximately 40-60px of padding from the left edge and from the bottom edge. About 24px equivalent size, low opacity (50%). Decorative only. Do NOT place it on the right side.

TEXT ACCURACY — CRITICAL:
The Hebrew must be rendered PERFECTLY, exactly as:
- "לסוכני ביטוח" (lamed-samekh-vav-kaf-nun-yod bet-yod-tet-vav-het — "for insurance agents")
- "כל הדוחות. כל החברות. קליק אחד." ("all reports. all companies. one click.")
No extra characters, no dropped letters, no ligature breaks, no mirrored glyphs.

STYLE:
- Premium fintech / insurtech aesthetic — think Stripe, Revolut, Lemonade
- Clean, confident, not crowded
- Moody dark cinematic lighting
- Focus on negative space around the text
- NO clipart, NO stock icons, NO insurance company logos, NO photos of people
- NO borders, NO frames, NO boxes around text

TECHNICAL:
- 16:9 landscape aspect
- Photorealistic rendering quality, 2K
- All key elements (logo + both Hebrew lines) must be centered and fit within a central square region (the WhatsApp thumbnail safe zone). Corners of the image can be darker/atmospheric background only.
- High contrast — white Hebrew on deep navy, maximum legibility at small preview size.`;

function loadRef(p) {
  const data = fs.readFileSync(p).toString("base64");
  const mimeType = p.toLowerCase().endsWith(".jpg") || p.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return { inlineData: { mimeType, data } };
}

async function main() {
  console.log("Generating og-image-draft.png (Re-PORT social preview)...");
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: [{ text: prompt }, loadRef(logoPath)],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "16:9", imageSize: "4K" },
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
