"use client";

import { useRef, useEffect, useCallback } from "react";
import RevealOnScroll from "../animations/RevealOnScroll";

const companies = [
  { name: "מגדל", file: "migdal.png" },
  { name: "הראל", file: "harel.png" },
  { name: "כלל", file: "clal.png" },
  { name: "פניקס", file: "phoenix.png" },
  { name: "מנורה", file: "menora.png" },
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
        draggable={false}
      />
    </div>
  );
}

export default function LogoBar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastTouchXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const autoScrollSpeed = 0.8; // px per frame

  const animate = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    if (!isDraggingRef.current) {
      if (Math.abs(velocityRef.current) > 0.3) {
        // Momentum deceleration
        posRef.current += velocityRef.current;
        velocityRef.current *= 0.95;
      } else {
        // Resume auto-scroll (RTL = positive direction)
        velocityRef.current = 0;
        posRef.current += autoScrollSpeed;
      }
    }

    // Seamless loop: reset when scrolled past half (one full set of logos)
    const halfWidth = track.scrollWidth / 2;
    if (posRef.current >= halfWidth) {
      posRef.current -= halfWidth;
    } else if (posRef.current < 0) {
      posRef.current += halfWidth;
    }

    track.style.transform = `translateX(${posRef.current}px)`;
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    velocityRef.current = 0;
    lastTouchXRef.current = e.touches[0].clientX;
    lastTimeRef.current = Date.now();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const x = e.touches[0].clientX;
    const delta = x - lastTouchXRef.current;
    const now = Date.now();
    const dt = now - lastTimeRef.current;

    posRef.current += delta;
    if (dt > 0) {
      velocityRef.current = delta / dt * 16; // normalize to per-frame
    }

    lastTouchXRef.current = x;
    lastTimeRef.current = now;
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Mouse handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    velocityRef.current = 0;
    lastTouchXRef.current = e.clientX;
    lastTimeRef.current = Date.now();
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const x = e.clientX;
    const delta = x - lastTouchXRef.current;
    const now = Date.now();
    const dt = now - lastTimeRef.current;

    posRef.current += delta;
    if (dt > 0) {
      velocityRef.current = delta / dt * 16;
    }

    lastTouchXRef.current = x;
    lastTimeRef.current = now;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
    }
  };

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
      <div
        className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Fade edges */}
        <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />

        {/* Scrolling track */}
        <div
          ref={trackRef}
          className="flex items-center"
          style={{ width: "max-content", willChange: "transform" }}
        >
          {companies.map((company, i) => (
            <LogoItem key={`a-${i}`} {...company} />
          ))}
          {companies.map((company, i) => (
            <LogoItem key={`b-${i}`} {...company} />
          ))}
        </div>
      </div>
    </section>
  );
}
