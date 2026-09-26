"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthMode } from "@/components/auth/AuthProvider";
import { Icon } from "@/components/ui/Icon";
import { getProfile } from "@/lib/api";
import type { UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const { userMode } = useAuthMode();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userMode !== "authenticated") return;
    let active = true;
    setLoading(true);
    getProfile()
      .then((result) => { if (active) setProfile(result); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load the profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userMode]);

  if (userMode !== "authenticated") {
    return (
      <section className="mx-auto max-w-[600px] py-8 sm:py-12">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0039a6]">Your ChatNYC profile</p>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#151719] sm:text-[40px]">You&apos;re exploring as a guest.</h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[#62666b]">Create an account to let Ock remember your preferences and conversations.</p>
        <Link href="/?mode=signup" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-[9px] bg-[#0039a6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#002d85]">
          Create account <Icon name="arrow-right" size={16} />
        </Link>
        <p className="mt-3 text-[10px] leading-5 text-[#73797e]">Your current guest experience is available across Ock and NextStop for this session.</p>
      </section>
    );
  }

  if (loading) return <><h1>Profile</h1><p className="text-sm text-[#62666b]">Loading your profile…</p></>;
  if (error) return <><h1>Profile</h1><p role="alert" className="text-sm text-[#a22c25]">{error}</p></>;
  if (!profile) return <><h1>Profile</h1><p className="text-sm text-[#62666b]">Your profile is ready for account setup.</p></>;

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
}
