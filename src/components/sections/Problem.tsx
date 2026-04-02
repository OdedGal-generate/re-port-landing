"use client";

import RevealOnScroll from "../animations/RevealOnScroll";
import CountUp from "../animations/CountUp";

const stats = [
  {
    number: 15,
    suffix: " דקות",
    label: "זמן ממוצע להורדת דוח לקוח אחד ידנית",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: 100,
    prefix: "₪",
    suffix: "+",
    label: "עלות שעת עבודה ממוצעת של סוכן ביטוח",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: 200,
    suffix: "+ לקוחות?",
    label: "תעשו את החשבון. זה שבועות של עבודה.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Problem() {
  return (
    <section className="py-20 sm:py-28 bg-navy-950 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-72 h-72 bg-turquoise-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-electric-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              הבעיה שכולם מכירים
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              כל שנה אותו סיפור — לקוחות שרוצים דוחות, חברות ביטוח שכל אחת עם מערכת אחרת, והזמן שלכם נגמר.
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid sm:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <RevealOnScroll key={i} delay={i * 0.15}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-colors">
                <div className="text-turquoise-400 flex justify-center mb-4">
                  {stat.icon}
                </div>
                <div className="text-4xl sm:text-5xl font-black text-white mb-3">
                  <CountUp
                    target={stat.number}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>
                <p className="text-gray-400">{stat.label}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={0.5}>
          <p className="text-center text-xl font-bold text-turquoise-400 mt-12">
            כל שנה מחדש, אותו סיוט. עד עכשיו.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
