import { WelcomeAuth } from "@/components/auth/WelcomeAuth";

type WelcomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;
  const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const initialView = requestedMode === "signup" || requestedMode === "login" ? requestedMode : "welcome";

  return <WelcomeAuth initialView={initialView} />;
}
