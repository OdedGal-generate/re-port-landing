"use client";

import RevealOnScroll from "../animations/RevealOnScroll";

const features = [
  {
    title: "הורדה אוטומטית",
    description:
      "מתחבר לכל חברות הביטוח ובתי ההשקעות ומוריד דוחות שנתיים ואישורי מס בקליק אחד.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    gradient: "from-turquoise-500 to-turquoise-600",
  },
  {
    title: "כל החברות, מקום אחד",
    description:
      "כל חברות הביטוח ובתי ההשקעות תחת מערכת אחת. בלי לעבור בין אתרים, בלי לזכור סיסמאות.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    gradient: "from-electric-500 to-electric-400",
  },
  {
    title: "חיסכון מטורף בזמן",
    description:
      "מה שלוקח שעות — נגמר בדקות. תפנו זמן ללקוחות במקום לבירוקרטיה.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: "from-turquoise-400 to-electric-500",
  },
  {
    title: "מאובטח ואמין",
    description:
      "הנתונים שלכם מוגנים. חיבור מאובטח לכל חברה עם שמירת פרטי התחברות מוצפנים.",
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    gradient: "from-electric-400 to-turquoise-500",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 mb-4">
              מה Re-PORT עושה בשבילכם
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              מערכת אחת שמחליפה שעות של עבודה ידנית מול חברות הביטוח
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid sm:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <RevealOnScroll key={i} delay={i * 0.1}>
              <div className="group relative bg-gray-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-turquoise-200">
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-navy-950 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
