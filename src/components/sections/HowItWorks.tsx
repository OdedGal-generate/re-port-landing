"use client";

import RevealOnScroll from "../animations/RevealOnScroll";

const steps = [
  {
    number: "01",
    title: 'הזינו מספר ת"ז',
    description: "הזינו את מספר תעודת הזהות של הלקוח ובחרו את חברות הביטוח ובתי ההשקעות הרלוונטיים.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    number: "02",
    title: 'לחצו "הורד"',
    description: "Re-PORT ניגש אוטומטית לכל חברות הביטוח ובתי ההשקעות שנבחרו ושולף את כל הדוחות.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "קבלו הכל מסודר",
    description: "כל הדוחות מאורגנים ומוכנים לשליחה לרואה החשבון. פשוט ככה.",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-950 mb-4">
              איך זה עובד? פשוט מאוד.
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              שלושה צעדים פשוטים וכל הדוחות אצלכם
            </p>
          </div>
        </RevealOnScroll>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 right-[16.67%] left-[16.67%] h-0.5 bg-gradient-to-l from-turquoise-500 via-electric-500 to-turquoise-500 opacity-30" />

          {steps.map((step, i) => (
            <RevealOnScroll key={i} delay={i * 0.2}>
              <div className="relative text-center">
                {/* Step number circle */}
                <div className="relative mx-auto w-20 h-20 bg-gradient-to-br from-turquoise-500 to-electric-500 rounded-full flex items-center justify-center text-white mb-6 shadow-lg shadow-turquoise-500/25">
                  {step.icon}
                  <span className="absolute -top-2 -right-2 w-8 h-8 bg-navy-950 text-turquoise-400 text-sm font-bold rounded-full flex items-center justify-center border-2 border-turquoise-500">
                    {step.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-navy-950 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
