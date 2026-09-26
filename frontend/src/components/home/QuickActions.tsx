import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

const actions = [
  {
    title: "Discover NYC",
    description: "Your next favorite spot is out there.",
    href: "/discover",
    icon: "compass",
    color: "text-[#0039A6]",
    background: "bg-[#eef3fc]",
  },
  {
    title: "Plan a Trip",
    description: "A smarter way from here to there.",
    href: "/navigate",
    icon: "route",
    color: "text-[#00814a]",
    background: "bg-[#eaf5ee]",
  },
  {
    title: "Ask AI",
    description: "A little local knowledge, on demand.",
    href: "/assistant",
    icon: "sparkles",
    color: "text-[#ba4d06]",
    background: "bg-[#fff1e5]",
  },
] as const;

type Action = (typeof actions)[number];

function QuickActionCard({ action }: { action: Action }) {
  return (
    <Link
      href={action.href}
      prefetch={false}
      className="group flex items-center gap-4 rounded-[14px] border border-[#e4e5e2] bg-white px-5 py-5 transition-colors hover:border-[#b6c6e4] hover:bg-[#fdfefe] sm:px-6 sm:py-6"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${action.background} ${action.color}`} aria-hidden="true">
        <Icon name={action.icon} size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[16px] leading-tight font-bold tracking-[-0.025em] text-[#151719]">{action.title}</h2>
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#656b70] sm:text-[12px]">{action.description}</p>
      </div>
      <Icon name="arrow-up-right" size={18} className="shrink-0 text-[#777e83] transition-colors group-hover:text-[#0039A6]" />
    </Link>
  );
}

export function QuickActions() {
  return (
    <nav aria-label="Explore your NYC companion" className="grid gap-3 pb-12 sm:gap-4 md:grid-cols-3 sm:pb-14">
      {actions.map((action) => <QuickActionCard key={action.href} action={action} />)}
    </nav>
  );
}
