import { notFound } from "next/navigation";
import { db } from "@/db";
import { gyms, routes } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ gymSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gymSlug } = await params;
  const gym = await db.query.gyms.findFirst({
    where: and(eq(gyms.slug, gymSlug), isNull(gyms.deletedAt)),
  });
  if (!gym) return { title: "Gym Not Found | Crushd" };
  return {
    title: `${gym.name} | Crushd`,
    description: gym.description ?? `Bouldering routes at ${gym.name}`,
  };
}

export default async function GymHubPage({ params }: Props) {
  const { gymSlug } = await params;

  const gym = await db.query.gyms.findFirst({
    where: and(eq(gyms.slug, gymSlug), isNull(gyms.deletedAt)),
  });

  if (!gym) notFound();

  const activeRoutes = await db.query.routes.findMany({
    where: and(eq(routes.gymId, gym.id), eq(routes.isActive, true)),
    orderBy: (routes, { desc }) => [desc(routes.createdAt)],
    limit: 30,
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{gym.name}</h1>
        {gym.description && (
          <p className="text-muted-foreground mt-2">{gym.description}</p>
        )}
        {gym.city && (
          <p className="text-sm text-muted-foreground">
            {gym.city}{gym.state ? `, ${gym.state}` : ""}
          </p>
        )}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Routes ({activeRoutes.length})</h2>
          <a
            href={`/gyms/${gymSlug}/routes/new`}
            className="text-sm font-medium underline"
          >
            + New Route
          </a>
        </div>
        {activeRoutes.length === 0 ? (
          <p className="text-muted-foreground">No active routes yet.</p>
        ) : (
          <ul className="space-y-3">
            {activeRoutes.map((route) => (
              <li key={route.id}>
                <a
                  href={`/gyms/${gymSlug}/routes/${route.id}`}
                  className="block border rounded-lg p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{route.name ?? "Unnamed Route"}</span>
                    <span className="text-sm text-muted-foreground">
                      {route.holdColor ?? ""}
                    </span>
                  </div>
                  {route.wallSection && (
                    <p className="text-sm text-muted-foreground mt-1">{route.wallSection}</p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
