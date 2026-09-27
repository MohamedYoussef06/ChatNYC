import { Hero } from "@/components/home/Hero";
import { JustAskOck } from "@/components/home/QuickActions";
import { OckRecommendations } from "@/components/home/Recommendations";
import { HomeFooter } from "@/components/home/HomeFooter";

// Demo switch for previewing the returning-user homepage state.
const hasOckHistory = false;

export default function HomePage() {
  return (
    <div className="home-dashboard">
      <Hero />
      {hasOckHistory ? <OckRecommendations /> : <JustAskOck />}

      <HomeFooter />
    </div>
  );
}
