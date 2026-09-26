import { Icon } from "@/components/ui/Icon";

export function CityPilotMap() {
  return (
    <section aria-labelledby="citypilot-map-title" className="relative flex h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-[#dfe2e4] bg-[#f1f3f4] px-6 text-center lg:sticky lg:top-28 lg:h-[600px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(0deg, transparent 49.5%, #e1e5e7 49.8%, #e1e5e7 50.2%, transparent 50.5%), linear-gradient(90deg, transparent 49.5%, #e1e5e7 49.8%, #e1e5e7 50.2%, transparent 50.5%)", backgroundSize: "64px 64px" }} />
      <div className="relative z-[1] flex max-w-sm flex-col items-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-[#d8e0ec] bg-white text-[#0039a6] shadow-sm"><Icon name="pin" size={27} /></span>
        <h2 id="citypilot-map-title" className="mt-5 text-xl font-semibold tracking-[-0.025em] text-[#252a2e]">Your route will appear here</h2>
        <p className="mt-2 text-sm leading-6 text-[#646c72]">A live map preview will be available when routing data is connected.</p>
      </div>
      <span className="absolute left-4 top-4 rounded-full border border-[#e0e3e5] bg-white/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#6b7278]">NextStop map</span>
    </section>
  );
}
