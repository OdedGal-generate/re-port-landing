"use client";

import RevealOnScroll from "../animations/RevealOnScroll";

const steps = [
  {
    number: "1",
    title: 'הזינו מספר ת"ז',
    description:
      "הזינו את מספר תעודת הזהות של הלקוח ובחרו את חברות הביטוח ובתי ההשקעות הרלוונטיים.",
    icon: (
      <svg className="w-16 h-16 text-navy-700" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1.2}>
        {/* ID Card */}
        <rect x="8" y="14" width="28" height="36" rx="3" />
        <circle cx="22" cy="28" r="6" />
        <path d="M14 42c0-4 3.5-7 8-7s8 3 8 7" />
        <line x1="14" y1="46" x2="30" y2="46" />
        {/* Fingerprint */}
        <circle cx="46" cy="32" r="12" strokeDasharray="3 2" />
        <path d="M46 24c-4.4 0-8 3.6-8 8s3.6 8 8 8" />
        <path d="M46 28c-2.2 0-4 1.8-4 4s1.8 4 4 4" />
        <circle cx="46" cy="32" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    number: "2",
    title: 'לחצו "הורד"',
    description:
      "Re-PORT ניגש אוטומטית לכל חברות הביטוח ובתי ההשקעות שנבחרו ושולף את כל הדוחות.",
    icon: (
      <svg className="w-16 h-16 text-navy-700" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1.2}>
        {/* Target/radar circles */}
        <circle cx="32" cy="32" r="20" />
        <circle cx="32" cy="32" r="14" />
        <circle cx="32" cy="32" r="8" />
        <circle cx="32" cy="32" r="2" fill="currentColor" />
        {/* Cursor arrow */}
        <path d="M38 38l4 12 3-3 5 5" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M38 38l12 4-3 3" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "קבלו הכל מסודר",
    description:
      "כל הדוחות ואישורי המס מאורגנים ומוכנים לשליחה לרואה החשבון. פשוט ככה.",
    icon: (
      <svg className="w-16 h-16 text-navy-700" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1.2}>
        {/* Main document */}
        <path d="M18 8h20l10 10v38a2 2 0 01-2 2H18a2 2 0 01-2-2V10a2 2 0 012-2z" />
        <path d="M38 8v10h10" />
        {/* PDF label */}
        <rect x="22" y="14" width="16" height="8" rx="1" fill="currentColor" opacity="0.1" stroke="currentColor" />
        <text x="30" y="21" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold" stroke="none">PDF</text>
        {/* Checkmarks */}
        <path d="M22 30l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 40l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 50l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        {/* Lines */}
        <line x1="36" y1="32" x2="44" y2="32" />
        <line x1="36" y1="42" x2="44" y2="42" />
        {/* Download arrow */}
        <path d="M44 48v6m0 0l-3-3m3 3l3-3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function CurvedArrow() {
  return (
    <svg
      className="hidden md:block absolute top-16 w-24 h-16 text-turquoise-500"
      viewBox="0 0 100 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 50 C 25 50, 30 10, 50 10 S 75 50, 95 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="90,4 98,10 90,16" fill="currentColor" />
    </svg>
  );
}

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

        {/* Desktop layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 relative items-start">
          {steps.map((step, i) => (
            <RevealOnScroll key={i} delay={i * 0.2}>
              <div className="relative flex flex-col items-center">
                {/* Arrow between cards */}
                {i < steps.length - 1 && (
                  <div className="absolute -left-14 top-16 z-10">
                    <CurvedArrow />
                  </div>
                )}

                {/* Step number */}
                <span className="text-5xl font-black text-navy-950 mb-4">
                  {step.number}
                </span>

                {/* Card */}
                <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 w-full text-center hover:shadow-lg transition-shadow">
                  {/* Icon */}
                  <div className="flex justify-center mb-6">
                    {step.icon}
                  </div>

                  <h3 className="text-xl font-bold text-navy-950 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        {/* Mobile layout */}
        <div className="md:hidden space-y-4">
          {steps.map((step, i) => (
            <RevealOnScroll key={i} delay={i * 0.15}>
              <div className="relative">
                {/* Card */}
                <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex gap-5 items-start">
                  {/* Number + Icon */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <span className="text-3xl font-black text-navy-950 mb-2">
                      {step.number}
                    </span>
                    <div className="w-14 h-14 flex items-center justify-center">
                      <svg className="w-12 h-12 text-navy-700" fill="none" viewBox="0 0 64 64" stroke="currentColor" strokeWidth={1.2}>
                        {step.number === "1" && (
                          <>
                            <rect x="8" y="14" width="28" height="36" rx="3" />
                            <circle cx="22" cy="28" r="6" />
                            <path d="M14 42c0-4 3.5-7 8-7s8 3 8 7" />
                            <circle cx="46" cy="32" r="12" strokeDasharray="3 2" />
                            <path d="M46 28c-2.2 0-4 1.8-4 4s1.8 4 4 4" />
                          </>
                        )}
                        {step.number === "2" && (
                          <>
                            <circle cx="32" cy="32" r="20" />
                            <circle cx="32" cy="32" r="14" />
                            <circle cx="32" cy="32" r="8" />
                            <circle cx="32" cy="32" r="2" fill="currentColor" />
                            <path d="M38 38l4 12 3-3 5 5" strokeWidth={1.8} strokeLinecap="round" />
                          </>
                        )}
                        {step.number === "3" && (
                          <>
                            <path d="M18 8h20l10 10v38a2 2 0 01-2 2H18a2 2 0 01-2-2V10a2 2 0 012-2z" />
                            <path d="M38 8v10h10" />
                            <path d="M22 30l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" />
                            <path d="M22 40l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" />
                            <path d="M22 50l3 3 6-6" strokeWidth={1.8} strokeLinecap="round" />
                          </>
                        )}
                      </svg>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-1">
                    <h3 className="text-lg font-bold text-navy-950 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-500 leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Down arrow between cards on mobile */}
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <svg className="w-6 h-6 text-turquoise-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
