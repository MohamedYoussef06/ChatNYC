"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

const suggestions = [
  { label: "Plan a cheap date tonight", query: "Plan a cheap date tonight" },
  { label: "Find live music near me", query: "Find live music near me" },
  { label: "I have 3 hours in Brooklyn", query: "I have 3 hours in Brooklyn" },
];

export function Hero() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function search(value: string) {
    const prompt = value.trim();
    if (!prompt) return;
    router.push(`/assistant?q=${encodeURIComponent(prompt)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(query);
  }

  return (
    <section
      aria-labelledby="hero-title"
      className="grid items-center gap-9 pb-10 pt-9 sm:gap-12 sm:pb-12 sm:pt-12 lg:grid-cols-[1.08fr_1fr] lg:gap-14 lg:pb-12 lg:pt-14"
    >
      <div>
        <p className="mb-5 flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] text-[#585f63] sm:text-[11px]">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#0039A6]" aria-hidden="true" />
          OCK · YOUR NYC SIDEKICK
        </p>

        <h1
          id="hero-title"
          className="text-[56px] leading-[0.98] font-black tracking-[-0.065em] text-[#151719] sm:text-[76px] lg:text-[84px] xl:text-[90px]"
        >
          <span className="block">Make NYC</span>{" "}
          <span className="block text-[#0039A6]">yours.</span>
        </h1>

        <p className="mt-5 max-w-[440px] text-[15px] leading-[1.75] text-[#62666b] sm:text-[16px]">
          Your NYC sidekick for finding places, making plans, getting around, and figuring out what&apos;s next.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex items-center gap-2 rounded-[14px] border border-[#d9ddde] bg-white p-2 pl-4 shadow-[0_3px_12px_rgba(20,28,38,0.035)] sm:pl-5"
          role="search"
        >
          <Icon name="sparkles" size={19} className="shrink-0 text-[#0039A6]" />
          <label htmlFor="nyc-search" className="sr-only">
            Ask Ock anything about New York...
          </label>
          <input
            id="nyc-search"
            name="query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask Ock anything about New York..."
            className="min-w-0 flex-1 rounded px-1 py-3 text-[13px] text-[#151719] placeholder:text-[#71777b] sm:text-[14px]"
          />
          <button
            type="submit"
            aria-label="Start a conversation with Ock"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[9px] bg-[#0039A6] text-white transition-colors hover:bg-[#002e86]"
          >
            <Icon name="arrow-right" size={21} />
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap items-center gap-2" role="group" aria-label="Try a search">
          <span className="mr-0.5 text-[11px] text-[#62666b]">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.query}
              type="button"
              onClick={() => {
                setQuery(suggestion.query);
                search(suggestion.query);
              }}
              className="cursor-pointer rounded-full border border-[#e1e3e1] bg-[#f4f4f0] px-2.5 py-1.5 text-[10px] font-medium text-[#555c61] transition-colors hover:border-[#bbc7dc] hover:bg-[#edf2fb] hover:text-[#0039A6] sm:text-[11px]"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[280px] overflow-hidden rounded-[20px] bg-[#d8dde0] sm:h-[350px] lg:h-[410px]">
        <Image
          src="/images/nyc/hero.jpg"
          alt="A yellow cab on a tree-lined Manhattan avenue with the Chrysler Building in the distance"
          fill
          priority
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 90vw, 550px"
          className="object-cover"
        />

        <div className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[10px] font-semibold tracking-[0.06em] text-[#151719]">
          <Icon name="pin" size={12} className="text-[#0039A6]" />
          NEW YORK, NEW POSSIBILITIES
        </div>

        <svg
          viewBox="0 0 170 220"
          fill="none"
          className="pointer-events-none absolute right-0 bottom-0 h-[215px] w-[165px]"
          aria-hidden="true"
        >
          <path
            d="M170 12H122C106 12 94 24 94 40V84C94 100 81 113 65 113H48C32 113 20 126 20 142V220"
            stroke="white"
            strokeWidth="12"
          />
          <path
            d="M170 12H122C106 12 94 24 94 40V84C94 100 81 113 65 113H48C32 113 20 126 20 142V220"
            stroke="#0039A6"
            strokeWidth="7"
          />
          <circle cx="94" cy="64" r="7" fill="white" stroke="#0039A6" strokeWidth="3.5" />
          <circle cx="20" cy="176" r="7" fill="white" stroke="#0039A6" strokeWidth="3.5" />
        </svg>

        <div className="absolute bottom-5 left-5 flex max-w-[calc(100%_-_6rem)] items-center gap-3 rounded-[12px] bg-white px-4 py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] sm:bottom-6 sm:left-6 sm:px-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0039A6] text-white" aria-hidden="true">
            <Icon name="arrow-up-right" size={24} />
          </span>
          <div>
            <p className="mb-1 text-[10px] font-bold tracking-[0.12em] text-[#6a7176]">NEXT STOP</p>
            <p className="text-[18px] leading-tight font-bold tracking-[-0.025em] text-[#151719] sm:text-[20px]">Your New York.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
