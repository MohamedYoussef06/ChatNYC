import { CityPilot } from "@/components/citypilot/CityPilot";

type NavigatePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NavigatePage({ searchParams }: NavigatePageProps) {
  const params = await searchParams;
  const destinationParam = params.destination;
  const destination = Array.isArray(destinationParam) ? destinationParam[0] : destinationParam;

  return <CityPilot initialDestination={destination ?? ""} />;
}
