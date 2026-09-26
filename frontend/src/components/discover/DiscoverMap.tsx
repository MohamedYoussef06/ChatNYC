import { Icon } from "@/components/ui/Icon";

export function DiscoverMap() {
  return (
    <section aria-labelledby="discover-map-title" className="relative flex h-[560px] items-center justify-center overflow-hidden rounded-xl border border-[#dfe2e4] bg-[#f1f3f4] px-6 text-center lg:sticky lg:top-28 lg:h-[600px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(0deg, transparent 49.5%, #e1e5e7 49.8%, #e1e5e7 50.2%, transparent 50.5%), linear-gradient(90deg, transparent 49.5%, #e1e5e7 49.8%, #e1e5e7 50.2%, transparent 50.5%)", backgroundSize: "56px 56px" }} />
      <div className="relative z-[1] flex max-w-sm flex-col items-center">
        <span className="flex size-14 items-center justify-center rounded-2xl border border-[#d8e0ec] bg-white text-[#0039a6] shadow-sm"><Icon name="pin" size={27} /></span>
        <h2 id="discover-map-title" className="mt-5 text-xl font-semibold tracking-[-0.025em] text-[#252a2e]">Interactive NYC Map</h2>
        <p className="mt-2 text-sm leading-6 text-[#646c72]">Live place and transit data will appear here.</p>
      </div>
    </section>
  );
}
