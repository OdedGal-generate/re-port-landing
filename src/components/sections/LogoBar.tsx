"use client";

import RevealOnScroll from "../animations/RevealOnScroll";

const companies = [
  { name: "מגדל", file: "migdal.png" },
  { name: "הראל", file: "harel.png" },
  { name: "כלל", file: "clal.png" },
  { name: "פניקס", file: "phoenix.png" },
  { name: "מנורה", file: "menora.jpg" },
  { name: "הכשרה", file: "hachshara.png" },
  { name: "איילון", file: "ayalon.png" },
  { name: "אלטשולר שחם", file: "altshuler-shaham.png" },
  { name: "מיטב", file: "meitav.png" },
  { name: "מור", file: "mor.png" },
  { name: "אינפיניטי", file: "infinity.png" },
  { name: "אנליסט", file: "analyst.png" },
  { name: "ילין לפידות", file: "yelin-lapidot.png" },
];

function LogoItem({ name, file }: { name: string; file: string }) {
  return (
    <div className="flex-shrink-0 w-[160px] h-[60px] flex items-center justify-center mx-6">
      <img
        src={`/images/companies/${file}`}
        alt={name}
        className="max-w-full max-h-full w-auto h-auto object-contain"
      />
    </div>
  );
}

export default function LogoBar() {
  return (
    <section className="py-12 sm:py-16 bg-white border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <RevealOnScroll>
          <p className="text-center text-gray-500 font-medium text-sm sm:text-base mb-10">
            עובדים עם כל חברות הביטוח ובתי ההשקעות
          </p>
        </RevealOnScroll>
      </div>

      {/* Marquee container */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />

        {/* Scrolling track — duplicate logos for seamless loop */}
        <div className="flex items-center animate-marquee" style={{ width: "max-content" }}>
          {/* First set */}
          {companies.map((company, i) => (
            <LogoItem key={`a-${i}`} {...company} />
          ))}
          {/* Duplicate for seamless loop */}
          {companies.map((company, i) => (
            <LogoItem key={`b-${i}`} {...company} />
          ))}
        </div>
      </div>
    </section>
  );
}
