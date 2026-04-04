"use client";

import RevealOnScroll from "../animations/RevealOnScroll";

const steps = [
  {
    number: "1",
    title: 'הזינו מספר ת"ז',
    description:
      "הזינו את מספר תעודת הזהות של הלקוח ובחרו את חברות הביטוח ובתי ההשקעות הרלוונטיים.",
    image: "/images/steps/step1-id.png",
  },
  {
    number: "2",
    title: 'לחצו "הורד"',
    description:
      "Re-PORT ניגש אוטומטית לכל חברות הביטוח ובתי ההשקעות שנבחרו ושולף את כל הדוחות.",
    image: "/images/steps/step2-click.png",
  },
  {
    number: "3",
    title: "קבלו הכל מסודר",
    description:
      "כל הדוחות ואישורי המס מאורגנים ומוכנים לשליחה לרואה החשבון. פשוט ככה.",
    image: "/images/steps/step3-pdf.png",
  },
];

function CurvedArrow({ flip }: { flip?: boolean }) {
  return (
    <svg
      className={`w-20 h-14 text-turquoise-500 ${flip ? "scale-x-[-1]" : ""}`}
      viewBox="0 0 80 50"
      fill="none"
    >
      <path
        d="M5 40 C 20 40, 25 8, 40 8 S 60 40, 75 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <polygon points="70,2 78,8 70,14" fill="currentColor" />
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
        <div className="hidden md:flex items-start justify-center gap-4">
          {steps.map((step, i) => (
            <RevealOnScroll key={i} delay={i * 0.2}>
              <div className="flex items-start gap-4">
                {/* Card */}
                <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 w-[280px] text-center hover:shadow-lg transition-shadow">
                  {/* Step number */}
                  <span className="text-5xl font-black text-navy-950 block mb-4">
                    {step.number}
                  </span>

                  {/* Icon image */}
                  <div className="flex justify-center mb-6">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-28 h-28 object-contain"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-navy-950 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>

                {/* Arrow between cards (not after last) */}
                {i < steps.length - 1 && (
                  <div className="flex items-center pt-32">
                    <CurvedArrow />
                  </div>
                )}
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
                <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex gap-4 items-center">
                  {/* Icon image */}
                  <div className="flex-shrink-0">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-20 h-20 object-contain"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-black text-navy-950">
                        {step.number}
                      </span>
                      <h3 className="text-lg font-bold text-navy-950">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-500 leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Down arrow between cards on mobile */}
                {i < steps.length - 1 && (
                  <div className="flex justify-center py-2">
                    <svg
                      className="w-6 h-6 text-turquoise-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
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
