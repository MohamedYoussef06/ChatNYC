import { getProfile } from "@/lib/api";

export default async function ProfilePage() {
  try {
    const profile = await getProfile();
    return (
      <>
        <h1>Profile</h1>
        <article className="card">
          <p className="eyebrow">{profile.neighborhood}</p>
          <h2>{profile.name}</h2>
          <p>Hello-world profile from the API. Preferences are not stored yet.</p>
        </article>
      </>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the profile.";
    return (
      <>
        <h1>Profile</h1>
        <p className="error">{message}</p>
      </>
    );
  }
}
