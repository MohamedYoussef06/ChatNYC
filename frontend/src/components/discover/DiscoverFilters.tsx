import { categories } from "@/lib/recommendations";

export type CategoryFilter = "For You" | (typeof categories)[number];
export type BoroughFilter = "All boroughs" | "Manhattan" | "Brooklyn" | "Queens" | "Bronx" | "Staten Island";

const categoryFilters: CategoryFilter[] = ["For You", "Food & drink", "Live music", "Events", "Outdoors", "Culture", "Neighborhoods"];
const boroughOptions: BoroughFilter[] = ["All boroughs", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

export function DiscoverFilters({ category, onCategoryChange, borough, onBoroughChange }: {
  category: CategoryFilter;
  onCategoryChange: (value: CategoryFilter) => void;
  borough: BoroughFilter;
  onBoroughChange: (value: BoroughFilter) => void;
}) {
  return (
    <div className="border-b border-[#e2e3df] py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by category" className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {categoryFilters.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => onCategoryChange(item)} className={`min-h-9 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors ${category === item ? "border-[#0039a6] bg-[#0039a6] text-white" : "border-transparent bg-transparent text-[#4f5559] hover:border-[#d9dcd9] hover:bg-white"}`}>
              {item}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-[#555a60]">
          <span className="hidden sm:inline">Borough</span>
          <select value={borough} onChange={(event) => onBoroughChange(event.target.value as BoroughFilter)} aria-label="Filter by borough" className="h-9 min-w-[145px] rounded-lg border border-[#d9dcd9] bg-white px-3 text-xs font-semibold text-[#292d31] outline-none focus:border-[#0039a6]">
            {boroughOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
