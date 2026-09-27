import { CityPilot } from "@/components/citypilot/CityPilot";
import type { RouteMode } from "@/lib/route-metrics";

type NavigatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected ?? "";
}

function mode(value: string): RouteMode {
  if (value === "drive") return "Drive";
  if (value === "walk") return "Walk";
  return "Transit";
}

export default async function NavigatePage({ searchParams }: NavigatePageProps) {
  const params = await searchParams;

  return (
    <CityPilot
      initialOrigin={first(params.origin)}
      initialDestination={first(params.destination)}
      initialArriveBy={first(params.arrive)}
      initialMode={mode(first(params.mode))}
    />
  );
}
