import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ gymSlug: string }>;
};

export default async function NewRoutePage({ params }: Props) {
  const { gymSlug } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect(`/sign-in?redirect=/gyms/${gymSlug}/routes/new`);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">New Route</h1>
      <p className="text-muted-foreground">
        Route creation form coming soon.
      </p>
    </main>
  );
}
