"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import RevealOnScroll from "../animations/RevealOnScroll";
import Button from "../ui/Button";

const WHATSAPP_FALLBACK = "972500000000";

export default function ContactCTA() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    agency: "",
    clients: "50-100",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "נא להזין שם מלא";
    if (!/^05\d{8}$/.test(form.phone.replace(/-/g, "")))
      errs.phone = "נא להזין מספר טלפון תקין (05X-XXXXXXX)";
    if (form.agency.trim().length < 2) errs.agency = "נא להזין שם סוכנות";
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      setSubmitted(true);
      window.open(data.whatsappUrl || `https://wa.me/${WHATSAPP_FALLBACK}`, "_blank");
    } catch {
      // Fallback: open WhatsApp directly if API fails
      const message = encodeURIComponent(
        `שלום, אני ${form.name} מסוכנות ${form.agency}.\nטלפון: ${form.phone}\nמספר לקוחות משוער: ${form.clients}\nאשמח לפרטים נוספים על Re-PORT.`
      );
      setSubmitted(true);
      window.open(`https://wa.me/${WHATSAPP_FALLBACK}?text=${message}`, "_blank");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section
        id="contact"
        className="py-20 sm:py-28 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-turquoise-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-turquoise-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-4">
              הפרטים נשלחו בהצלחה!
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              נחזור אליכם בהקדם. אם WhatsApp לא נפתח, לחצו על הכפתור:
            </p>
            <Button
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              size="lg"
            >
              פתחו WhatsApp
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="contact"
      className="py-20 sm:py-28 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-turquoise-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-electric-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <RevealOnScroll direction="right">
            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
                מוכנים לחסוך
                <br />
                <span className="text-gradient">שעות עבודה?</span>
              </h2>
              <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                השאירו פרטים ונחזור אליכם תוך דקות עם הכל מוכן להתחיל. בלי
                התחייבות, בלי מנוי חודשי.
              </p>
              <div className="space-y-4">
                {[
                  "הגדרה תוך דקות",
                  "תמיכה טכנית צמודה",
                  "ללא התחייבות",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-turquoise-500/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-turquoise-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </RevealOnScroll>

          {/* Form */}
          <RevealOnScroll direction="left">
            <form
              onSubmit={handleSubmit}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8"
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    שם מלא
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent transition-all"
                    placeholder="ישראל ישראלי"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    טלפון נייד
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent transition-all"
                    placeholder="050-1234567"
                    dir="ltr"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    שם הסוכנות
                  </label>
                  <input
                    type="text"
                    value={form.agency}
                    onChange={(e) =>
                      setForm({ ...form, agency: e.target.value })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent transition-all"
                    placeholder='סוכנות לביטוח בע"מ'
                  />
                  {errors.agency && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.agency}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    מספר לקוחות משוער
                  </label>
                  <select
                    value={form.clients}
                    onChange={(e) =>
                      setForm({ ...form, clients: e.target.value })
                    }
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-transparent transition-all"
                  >
                    <option value="50-100" className="bg-navy-900">
                      50-100
                    </option>
                    <option value="100-200" className="bg-navy-900">
                      100-200
                    </option>
                    <option value="200-500" className="bg-navy-900">
                      200-500
                    </option>
                    <option value="500+" className="bg-navy-900">
                      500+
                    </option>
                  </select>
                </div>

                <Button type="submit" size="lg" className="w-full mt-2" disabled={submitting}>
                  {submitting ? "שולח..." : "שלחו פרטים והתחילו"}
                </Button>

                <p className="text-gray-500 text-xs text-center">
                  בלחיצה על הכפתור תועברו ל-WhatsApp עם הפרטים שמילאתם
                </p>
              </div>
            </form>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
