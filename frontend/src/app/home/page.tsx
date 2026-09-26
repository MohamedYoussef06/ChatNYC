import { Hero } from "@/components/home/Hero";
import { JustAskOck } from "@/components/home/QuickActions";
import { OckRecommendations } from "@/components/home/Recommendations";

// Demo switch for previewing the returning-user homepage state.
const hasOckHistory = false;

export default function HomePage() {
  return (
    <div className="home-dashboard">
      <Hero />
      {hasOckHistory ? <OckRecommendations /> : <JustAskOck />}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e0e2df] py-7 text-xs text-[#6a6e72]">
        <p className="font-semibold tracking-tight text-[#43484d]">ChatNYC <span className="ml-2 font-normal">A city of possibilities. A companion for yours.</span></p>
        <p>Made for the five boroughs <span className="ml-1 text-[#0039a6]" aria-hidden="true">↗</span></p>
      </footer>
    </div>
  );
}
