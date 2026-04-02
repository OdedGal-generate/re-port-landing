"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import RevealOnScroll from "../animations/RevealOnScroll";
import Button from "../ui/Button";

const tiers = [
  {
    name: "סטנדרטי",
    price: "12.50",
    unit: '₪ לכל מספר ת"ז',
    description: "מתאים לסוכנים עצמאיים וסוכנויות קטנות",
    features: [
      "בנקים של 50 מספרי ת\"ז",
      "הורדה מכל חברות הביטוח",
      "שמירת פרטי התחברות",
      "תמיכה טכנית",
    ],
    recommended: false,
  },
  {
    name: "מקצועי",
    price: "10",
    unit: '₪ לכל מספר ת"ז',
    description: "לסוכנויות עם 200+ לקוחות",
    features: [
      'מ-200 מספרי ת"ז ומעלה',
      "הורדה מכל חברות הביטוח",
      "שמירת פרטי התחברות",
      "תמיכה טכנית בעדיפות",
      "חיסכון של 20% למספר ת\"ז",
    ],
    recommended: true,
  },
];

function SavingsCalculator() {
  const [clients, setClients] = useState(100);

  const pricePerClient = clients >= 200 ? 10 : 12.5;
  const totalCost = clients * pricePerClient;
  const timeSavedMinutes = clients * 12.5;
  const timeSavedHours = timeSavedMinutes / 60;
  const moneySaved = timeSavedHours * 100;
  const netSaving = moneySaved - totalCost;

  return (
    <div className="bg-navy-950 rounded-2xl p-8 sm:p-10 mt-12">
      <h3 className="text-2xl font-bold text-white text-center mb-8">
        כמה תחסכו? בדקו בעצמכם
      </h3>

      <div className="max-w-md mx-auto mb-8">
        <label className="block text-gray-400 text-sm mb-2 text-center">
          כמה לקוחות יש לכם?
        </label>
        <input
          type="range"
          min={50}
          max={1000}
          step={10}
          value={clients}
          onChange={(e) => setClients(Number(e.target.value))}
          className="w-full h-2 bg-navy-800 rounded-lg appearance-none cursor-pointer accent-turquoise-500"
        />
        <div className="text-center mt-2">
          <span className="text-3xl font-black text-turquoise-400">
            {clients}
          </span>
          <span className="text-gray-400 text-sm me-2"> לקוחות</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <motion.div
          key={`cost-${totalCost}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-white/5 rounded-xl p-6 text-center"
        >
          <div className="text-gray-400 text-sm mb-2">עלות Re-PORT</div>
          <div className="text-2xl font-bold text-white">
            ₪{totalCost.toLocaleString()}
          </div>
        </motion.div>

        <motion.div
          key={`hours-${timeSavedHours}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-white/5 rounded-xl p-6 text-center"
        >
          <div className="text-gray-400 text-sm mb-2">שעות עבודה שנחסכות</div>
          <div className="text-2xl font-bold text-turquoise-400">
            {Math.round(timeSavedHours)} שעות
          </div>
        </motion.div>

        <motion.div
          key={`saved-${netSaving}`}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="bg-turquoise-500/10 border border-turquoise-500/30 rounded-xl p-6 text-center"
        >
          <div className="text-turquoise-300 text-sm mb-2">חיסכון נטו</div>
          <div className="text-2xl font-bold text-turquoise-400">
            ₪{Math.round(netSaving).toLocaleString()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 mb-4">
              תמחור שקוף, בלי הפתעות
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              שלמו רק על מה שאתם משתמשים. בלי מנוי חודשי, בלי התחייבות.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {tiers.map((tier, i) => (
            <RevealOnScroll key={i} delay={i * 0.15}>
              <div
                className={`relative rounded-2xl p-8 border-2 transition-all hover:shadow-xl ${
                  tier.recommended
                    ? "border-turquoise-500 bg-turquoise-500/5 shadow-lg"
                    : "border-gray-200 bg-white"
                }`}
              >
                {tier.recommended && (
                  <span className="absolute -top-3 right-6 bg-turquoise-500 text-navy-950 text-xs font-bold px-3 py-1 rounded-full">
                    מומלץ
                  </span>
                )}

                <h3 className="text-xl font-bold text-navy-950 mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-500 text-sm mb-6">{tier.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-black text-navy-950">
                    {tier.price}
                  </span>
                  <span className="text-gray-500 text-sm me-1">
                    {tier.unit}
                  </span>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-gray-600">
                      <svg
                        className="w-5 h-5 text-turquoise-500 flex-shrink-0"
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
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  href="#contact"
                  variant={tier.recommended ? "primary" : "outline"}
                  className="w-full"
                >
                  התחילו עכשיו
                </Button>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.3}>
          <SavingsCalculator />
        </RevealOnScroll>
      </div>
    </section>
  );
}
