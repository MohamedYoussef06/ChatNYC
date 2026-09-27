// Dormant legacy preview. Nothing on /navigate imports this. The times and stops below are sample copy, not a live route.
import { TransitBadge, type SubwayLine } from "@/components/ui/TransitBadge";
import type { TravelMode } from "@/components/citypilot/TripPlanner";

type TimelineStep = { kind: "place" | "walk" | "transit" | "drive"; title: string; detail?: string; line?: SubwayLine };

function getSteps(origin: string, destination: string, mode: TravelMode): TimelineStep[] {
  if (mode === "Transit") return [
    { kind: "place", title: origin, detail: "Start" },
    { kind: "walk", title: "Walk", detail: "4 min to 116 St" },
    { kind: "place", title: "116 St", detail: "Board downtown" },
    { kind: "transit", title: "Downtown", detail: "24 min", line: "1" },
    { kind: "place", title: "Christopher St", detail: "Exit the train" },
    { kind: "walk", title: "Walk", detail: "5 min to destination" },
    { kind: "place", title: destination, detail: "Arrive" },
  ];
  if (mode === "Drive") return [
    { kind: "place", title: origin, detail: "Start" },
    { kind: "walk", title: "Walk to pickup", detail: "4 min" },
    { kind: "drive", title: "Drive to destination", detail: "31 min" },
    { kind: "place", title: destination, detail: "Arrive" },
  ];
  return [
    { kind: "place", title: origin, detail: "Start" },
    { kind: "walk", title: "Walk to destination", detail: "52 min" },
    { kind: "place", title: destination, detail: "Arrive" },
  ];
}

export function RouteTimeline({ origin, destination, mode }: { origin: string; destination: string; mode: TravelMode }) {
  const steps = getSteps(origin, destination, mode);

  return (
    <section aria-labelledby="route-timeline-heading" className="rounded-2xl border border-[#e1e3df] bg-white px-5 py-5 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 id="route-timeline-heading" className="text-sm font-semibold text-[#202428]">Your route</h2>
          <p className="mt-1 text-[10px] text-[#6b7176]">{origin} <span aria-hidden="true">→</span> {destination}</p>
        </div>
        <span className="rounded-full bg-[#f0f2f2] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#555c61]">{mode} · sample</span>
      </div>

      <ol className="m-0 list-none p-0">
        {steps.map((step, index) => {
          const isPlace = step.kind === "place";
          return (
            <li key={`${step.kind}-${step.title}-${index}`} className="relative grid min-h-[45px] grid-cols-[24px_minmax(0,1fr)] gap-x-3">
              {index < steps.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-[10px] top-[19px] border-l ${step.kind === "transit" ? "border-[#0039a6]" : "border-[#c9ced3]"}`} />}
              <span className="relative z-[1] flex h-5 items-center justify-center">
                {step.kind === "transit" ? <TransitBadge line={step.line ?? "1"} small /> : <span className={`rounded-full border-2 border-white ${isPlace ? "size-3 bg-[#0039a6] ring-1 ring-[#0039a6]" : "size-2.5 bg-[#747c83]"}`} />}
              </span>
              <div className={`pb-3 ${isPlace ? "" : "pt-0.5"}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                  <p className={`text-xs ${isPlace ? "font-semibold text-[#22272b]" : "font-medium text-[#41484d]"}`}>{step.title}</p>
                  {step.detail && step.kind !== "place" && <span className="text-[10px] font-medium text-[#626a70]">{step.detail}</span>}
                </div>
                {step.detail && step.kind === "place" && <p className="mt-0.5 text-[10px] text-[#747a7f]">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
