import { AssistantWorkspace } from "@/components/assistant/AssistantWorkspace";

type AssistantPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const params = await searchParams;
  const queryParam = params.q;
  const initialQuery = Array.isArray(queryParam) ? queryParam[0] : queryParam;

  return <AssistantWorkspace key={initialQuery ?? ""} initialQuery={initialQuery ?? ""} />;
}
