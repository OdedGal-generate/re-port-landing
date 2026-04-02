import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import LogoBar from "@/components/sections/LogoBar";
import Problem from "@/components/sections/Problem";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";
import ContactCTA from "@/components/sections/ContactCTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogoBar />
        <Problem />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}
