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
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/20 blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-pulse pointer-events-none" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>

      {/* Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-8 pb-6 relative z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ScanText className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-white">
            Argus
          </span>
        </div>
        <Button asChild variant="outline" className="rounded-full px-6 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white text-white backdrop-blur-md transition-all">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Column: Text Content */}
          <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md">
              <ShieldCheck className="size-4" />
              Enterprise-grade security. 100% private.
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-balance leading-[1.1]">
              Automate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 drop-shadow-sm">
                Purchase Entries
              </span>
            </h1>

            <p className="max-w-xl text-lg md:text-xl text-zinc-400 leading-relaxed mb-10">
              Upload a pile of invoices in any format. Our AI extracts vendors, dates, totals, and line items instantly — transforming chaos into a beautifully structured CRM.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="h-14 px-8 text-base font-semibold rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1">
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
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200 lg:ml-auto">
            {/* Glow behind image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-purple-500/20 blur-3xl rounded-full transform scale-90" />

            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-2xl shadow-black/50 transform transition-transform hover:scale-[1.02] duration-500">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none" />
              <img
                src="/hero-dashboard.png"
                alt="Argus Purchase Suite Dashboard"
                className="rounded-xl w-full max-w-[600px] h-auto object-cover border border-white/5 shadow-inner"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050505] py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ScanText className="w-5 h-5 text-emerald-500" />
            <span className="font-display font-bold text-white">Argus</span>
          </div>
          <p className="text-sm text-zinc-500">
            © 2026 Argus CNC. All Rights Reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
