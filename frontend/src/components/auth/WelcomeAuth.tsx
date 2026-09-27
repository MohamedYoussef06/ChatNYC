"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuthMode } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";

type AuthView = "welcome" | "login" | "signup";

export function WelcomeAuth({ initialView = "welcome" }: { initialView?: AuthView }) {
  const [view, setView] = useState<AuthView>(initialView);
  const [error, setError] = useState("");
  const router = useRouter();
  const { setUserMode } = useAuthMode();

  function enterApp(mode: "authenticated" | "guest") {
    setUserMode(mode);
    router.push("/home");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email") ?? "").trim();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailLooksValid) {
      setError("Enter a valid email address.");
      return;
    }

    if (view === "signup") {
      const name = String(fields.get("name") ?? "").trim();
      const password = String(fields.get("password") ?? "");
      const confirmation = String(fields.get("confirmPassword") ?? "");
      if (!name) {
        setError("Enter your name.");
        return;
      }
      if (!password || !confirmation) {
        setError("Complete both password fields.");
        return;
      }
      if (password !== confirmation) {
        setError("Those passwords don’t match yet.");
        return;
      }
    } else if (!String(fields.get("password") ?? "")) {
      setError("Enter your password.");
      return;
    }

    // Frontend demo only: no credentials are verified or retained.
    enterApp("authenticated");
  }

  return (
    <div className="relative left-1/2 -mt-12 grid min-h-[100dvh] w-screen -translate-x-1/2 bg-[#faf9f6] lg:grid-cols-[minmax(0,1.12fr)_minmax(460px,0.88fr)]">
      <section className="relative flex min-h-[580px] flex-col overflow-hidden bg-[#f1efe8] px-6 pb-7 pt-8 sm:px-10 sm:pb-10 lg:min-h-[100dvh] lg:px-14 lg:pb-12 lg:pt-12 xl:px-20">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-[#0039a6] text-white">
            <svg viewBox="0 0 26.2 20.4" width={30} height={23} aria-hidden="true">
              <path d="M0.4 13.4 L0.4 12.2 L2.7 10.7 L3.2 9.5 L2.8 8.6 L2.7 7.9 L4.8 7.5 L7.4 7.9 L9.4 7.9 L11.5 6.9 L11.8 5.0 L11.4 4.2 L12.8 3.2 L14.7 1.3 L16.6 0.4 L21.0 0.4 L20.8 2.6 L21.0 5.6 L21.3 6.6 L21.2 10.2 L20.5 13.2 L20.5 15.1 L20.3 16.4 L20.0 17.7 L19.8 18.1 L23.4 17.8 L25.7 17.4 L23.7 18.6 L21.1 19.4 L19.0 19.6 L18.0 19.9 L18.2 19.3 L18.9 18.7 L19.2 17.7 L16.7 16.2 L15.5 14.3 L14.5 13.4Z" fill="currentColor" stroke="currentColor" strokeWidth={0.6} strokeLinejoin="round" />
            </svg>
          </span>
          <Wordmark className="text-[28px] font-extrabold tracking-[-0.07em] text-[#151719]" />
        </div>

        <div className="relative z-10 mt-12 max-w-xl sm:mt-16 lg:mt-[clamp(3rem,9vh,7rem)]">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#0039a6]">A companion for the five boroughs</p>
          <h1 className="max-w-lg text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.065em] text-[#151719] sm:text-[3.6rem] lg:text-[4.3rem]">Make NYC yours.</h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#51575c] sm:text-base">Your NYC sidekick for finding places, making plans, getting around, and figuring out what&apos;s next.</p>
        </div>

        <div className="relative mt-8 min-h-[220px] flex-1 overflow-hidden rounded-[18px] border border-[#d9d8d1] bg-[#d9d7d0] sm:min-h-[280px] lg:mt-10">
          <Image src="/images/nyc/hero.jpg" alt="A New York City street scene" fill priority sizes="(max-width: 1023px) 100vw, 56vw" className="object-cover" />
          <div className="absolute left-4 top-4 rounded-full border border-white/70 bg-[#faf9f6]/95 px-3 py-1.5 text-[9px] font-bold tracking-[0.13em] text-[#30363b]">ONE CITY · FIVE BOROUGHS</div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-[#faf9f6]/95 px-3 py-2 text-[10px] font-semibold text-[#273039]">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#0039a6] text-white"><Icon name="bagel" size={11} /></span>
            Ock for the city · NextStop for the ride
          </div>
        </div>

        <div className="relative z-10 mt-5 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.13em] text-[#555b60]">
          <span className="size-2 rounded-full bg-[#0039a6]" /> Ock
          <span className="mx-1 h-px w-7 bg-[#b9bdc0]" />
          <span className="size-2 rounded-full bg-[#008044]" /> NextStop
          <span className="ml-auto hidden sm:inline">Made for New York</span>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10 lg:px-12">
        <div className="w-full max-w-[420px]">
          {view === "welcome" ? (
            <>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#0039a6]">Your city, a little closer</p>
              <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-[#151719] sm:text-[36px]">Welcome to ChatNYC</h2>
              <p className="mt-3 text-sm leading-6 text-[#62666b]">Your city gets better when Ock gets to know you.</p>

              <div className="mt-8 grid gap-3">
                <button type="button" onClick={() => { setError(""); setView("login"); }} className="flex min-h-12 items-center justify-center rounded-[10px] bg-[#0039a6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">Log in</button>
                <button type="button" onClick={() => { setError(""); setView("signup"); }} className="flex min-h-12 items-center justify-center rounded-[10px] border border-[#cfd4d8] bg-white px-5 text-sm font-semibold text-[#252a2e] transition-colors hover:border-[#0039a6] hover:text-[#0039a6]">Create account</button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#858a8e]"><span className="h-px flex-1 bg-[#e0e2df]" />or<span className="h-px flex-1 bg-[#e0e2df]" /></div>
              <button type="button" onClick={() => enterApp("guest")} className="flex min-h-12 w-full items-center justify-center rounded-[10px] border border-[#cfd4d8] bg-transparent px-5 text-sm font-semibold text-[#30363b] transition-colors hover:bg-white">Continue as guest</button>
              <p className="mt-3 text-center text-[11px] leading-5 text-[#73797e]">Guest conversations and preferences won&apos;t be saved after your session.</p>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setError(""); setView("welcome"); }} className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-[#586068] hover:text-[#0039a6]"><Icon name="arrow-right" size={14} className="rotate-180" /> Back</button>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.17em] text-[#0039a6]">ChatNYC</p>
              <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-[#151719] sm:text-[36px]">{view === "login" ? "Welcome back." : "Make NYC yours."}</h2>
              <p className="mt-3 text-sm leading-6 text-[#62666b]">{view === "login" ? "Pick up where you left off with Ock." : "An account lets Ock remember your conversations and preferences over time."}</p>

              <form className="mt-7 grid gap-4" onSubmit={handleSubmit} noValidate>
                {view === "signup" && <label className="grid gap-1.5 text-xs font-semibold text-[#383e43]">Name<input name="name" type="text" autoComplete="name" required className="min-h-11 rounded-[9px] border border-[#d6d9d8] bg-white px-3 text-sm font-normal outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/15" /></label>}
                <label className="grid gap-1.5 text-xs font-semibold text-[#383e43]">Email<input name="email" type="email" autoComplete="email" required className="min-h-11 rounded-[9px] border border-[#d6d9d8] bg-white px-3 text-sm font-normal outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/15" /></label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#383e43]">Password<input name="password" type="password" autoComplete={view === "login" ? "current-password" : "new-password"} required className="min-h-11 rounded-[9px] border border-[#d6d9d8] bg-white px-3 text-sm font-normal outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/15" /></label>
                {view === "signup" && <label className="grid gap-1.5 text-xs font-semibold text-[#383e43]">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required className="min-h-11 rounded-[9px] border border-[#d6d9d8] bg-white px-3 text-sm font-normal outline-none focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/15" /></label>}
                {error && <p role="alert" className="text-xs font-medium text-[#a22c25]">{error}</p>}
                <button type="submit" className="mt-1 flex min-h-12 items-center justify-center rounded-[10px] bg-[#0039a6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">{view === "login" ? "Log in" : "Create account"}</button>
              </form>
              <p className="mt-5 text-center text-xs text-[#646b70]">Demo only — credentials aren&apos;t verified or stored.</p>
              <p className="mt-4 text-center text-xs text-[#646b70]">
                {view === "login" ? "Don’t have an account? " : "Already have an account? "}
                <button type="button" onClick={() => { setError(""); setView(view === "login" ? "signup" : "login"); }} className="font-semibold text-[#0039a6] hover:underline">{view === "login" ? "Create one" : "Log in"}</button>
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
