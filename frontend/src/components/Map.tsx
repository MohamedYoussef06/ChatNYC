export function Map({ origin, destination }: { origin: string; destination: string }) {
  return (
    <div className="map" aria-label={`Route from ${origin} to ${destination}`}>
      <span>{origin}</span>
      <span className="map-line" aria-hidden="true" />
      <span>{destination}</span>
    </div>
  );
}
