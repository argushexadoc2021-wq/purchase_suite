import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanText, ShieldCheck, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Argus Purchase Suite — AI Invoice Capture & Invoice CRM" },
      {
        name: "description",
        content:
          "Drop in PDF or photographed invoices. AI reads every field into structured data you can review, correct, and track in a built-in invoice CRM.",
      },
      { property: "og:title", content: "Argus Purchase Suite — AI Invoice Capture & Invoice CRM" },
      {
        property: "og:description",
        content:
          "Bulk-upload invoices in any format, get structured data automatically, and manage them in one CRM.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = [
    "/hero-dashboard-soft.png",
    "/hero-dashboard-soft-2.png",
    "/hero-dashboard-soft-3.png",
    "/hero-dashboard-soft-4.png"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000); // Change image every 4 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden font-sans selection:bg-rose-500/30">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/10 blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-red-500/10 blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-8 pb-2 relative z-20">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Argus Logo" className="w-10 h-10 object-contain" />
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Argus Purchase Suite
          </span>
        </div>
        <Button asChild variant="outline" className="rounded-full px-6 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white backdrop-blur-md transition-all">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-2 pb-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Column: Text Content */}
          <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-sm font-medium text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)] backdrop-blur-md">
              <ShieldCheck className="size-4" />
              Enterprise-grade security. 100% private.
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-balance leading-[1.1]">
              Automate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-rose-300 drop-shadow-sm">
                Purchase Entries
              </span>
            </h1>

            <p className="max-w-xl text-lg md:text-xl text-zinc-400 leading-relaxed mb-10">
              Upload a pile of invoices in any format. Our AI extracts vendors, dates, totals, and line items instantly — transforming chaos into a beautifully structured CRM.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-base font-semibold rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all hover:-translate-y-1">
                <Link to="/auth">
                  Start for Free
                  <ArrowRight className="ml-2 size-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-14 px-8 text-base font-semibold rounded-full border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md transition-all hover:-translate-y-1">
                <Link to="/auth">
                  View Premium
                </Link>
              </Button>
            </div>
          </div>

          {/* Right Column: Hero Image */}
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 lg:ml-auto w-full">
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-red-500/10 blur-3xl rounded-full transform scale-90" />

            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-2xl shadow-black/50 transform transition-transform hover:scale-[1.02] duration-500 h-[400px] lg:h-[500px] max-w-[600px] w-full">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none z-10" />
              <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/5 shadow-inner">
                {heroImages.map((src, index) => (
                  <img
                    key={src}
                    src={src}
                    alt={`Argus Purchase Suite Feature ${index + 1}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentImageIndex ? "opacity-100" : "opacity-0"
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050505] py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Argus Logo" className="w-6 h-6 object-contain" />
            <span className="font-display font-bold text-white">Argus Purchase Suite</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 Argus CNC. All Rights Reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
