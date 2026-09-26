import { PlaceCard } from "@/components/PlaceCard";
import { getPlaces } from "@/lib/api";

export default async function DiscoverPage() {
  try {
    const places = await getPlaces();
    return (
      <>
        <h1>Discover</h1>
        {places.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load places.";
    return (
      <>
        <h1>Discover</h1>
        <p className="error">{message}</p>
      </>
    );
  }
}
