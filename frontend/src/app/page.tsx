import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <p className="eyebrow">Hello world</p>
      <h1>Find a place. Ride there. Ask on the way.</h1>
      <p className="lede">
        NYC Companion is a starting point for Discover, CityPilot navigation, and a chat assistant
        backed by the FastAPI service.
      </p>
      <div className="actions">
        <Link href="/discover">Discover</Link>
        <Link href="/navigate">Navigate</Link>
        <Link href="/assistant">Assistant</Link>
        <Link href="/profile">Profile</Link>
      </div>
    </>
  );
}
