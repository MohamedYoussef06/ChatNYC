import { Icon } from "@/components/ui/Icon";

export function LeaveTimeCard({ trip }: { trip: { leaveAt: string; eta: string; arriveBy: string } }) {
  return (
    <section aria-labelledby="leave-time-heading" className="overflow-hidden rounded-2xl border border-[#d8e1ee] bg-white shadow-[0_5px_20px_rgba(21,23,25,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#e6eaf0] bg-[#f5f8fc] px-5 py-3.5 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0039a6]">Your NextStop recommendation</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4ed] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#17663b]"><span className="size-1.5 rounded-full bg-[#21874e]" /> On time</span>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <p id="leave-time-heading" className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5d6368]">Leave at</p>
        <p className="mt-1 text-[3.5rem] font-semibold leading-none tracking-[-0.07em] text-[#151719] sm:text-[4.25rem]">{trip.leaveAt}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#4f555a]">
          <Icon name="clock" size={16} className="text-[#0039a6]" />
          <p>Arrive around <strong className="font-semibold text-[#22272b]">{trip.eta}</strong> <span aria-hidden="true">—</span> <span className="font-semibold text-[#17663b]">9 minutes early.</span></p>
        </div>
        <p className="mt-1.5 pl-[22px] text-[10px] text-[#73797e]">Your arrival target is {trip.arriveBy}. Times are illustrative.</p>
      </div>
    </section>
  );
}
