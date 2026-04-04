import { NextResponse } from "next/server";

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "972500000000";
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, agency, clients } = body;

    // Basic validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "שם לא תקין" }, { status: 400 });
    }
    if (!phone || !/^05\d{8}$/.test(phone.replace(/-/g, ""))) {
      return NextResponse.json({ error: "טלפון לא תקין" }, { status: 400 });
    }
    if (!agency || agency.trim().length < 2) {
      return NextResponse.json({ error: "שם סוכנות לא תקין" }, { status: 400 });
    }

    // Send to n8n webhook (fire-and-forget — don't block user)
    if (N8N_WEBHOOK_URL) {
      fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          name: name.trim(),
          phone: phone.replace(/-/g, ""),
          agency: agency.trim(),
          clients: clients || "50-100",
          status: "חדש",
        }),
      }).catch(() => {
        // Silently fail — don't break user flow
      });
    }

    // Build WhatsApp deep link
    const message = encodeURIComponent(
      `שלום, אני ${name} מסוכנות ${agency}.\nטלפון: ${phone}\nמספר לקוחות משוער: ${clients}\nאשמח לפרטים נוספים על Re-PORT.`
    );
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    return NextResponse.json({ whatsappUrl });
  } catch {
    return NextResponse.json(
      { error: "שגיאה בשליחת הטופס" },
      { status: 500 }
    );
  }
}
