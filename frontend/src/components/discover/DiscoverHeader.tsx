import { Icon } from "@/components/ui/Icon";

export function DiscoverHeader({ query, onQueryChange }: { query: string; onQueryChange: (value: string) => void }) {
  return (
    <header className="border-b border-[#e2e3df] pb-5 pt-7 sm:pb-6 sm:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#62666b]">Borough by borough</p>
          <h1 className="text-[2rem] font-semibold leading-none tracking-[-0.05em] text-[#151719] sm:text-[2.35rem]">Discover NYC</h1>
          <p className="mt-2.5 text-sm text-[#5f6469] sm:text-[15px]">Find something worth getting off the train for.</p>
        </div>
        <span className="hidden items-center gap-2 pb-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#62666b] sm:inline-flex"><span className="size-2 rounded-full bg-[#008044]" /> Local picks · Five boroughs</span>
      </div>

      <div className="relative mt-5">
        <label htmlFor="discover-search" className="sr-only">Search places, neighborhoods, food, music, and events</label>
        <Icon name="search" size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#62666b]" />
        <input
          id="discover-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search places, neighborhoods, food, music, events..."
          className="h-[54px] w-full rounded-xl border border-[#d7d9d6] bg-white pl-12 pr-4 text-sm text-[#151719] shadow-[0_2px_8px_rgba(21,23,25,0.035)] outline-none placeholder:text-[#777c81] focus:border-[#0039a6] focus:ring-2 focus:ring-[#0039a6]/15 sm:text-[15px]"
        />
      </div>
    </header>
  );
}
