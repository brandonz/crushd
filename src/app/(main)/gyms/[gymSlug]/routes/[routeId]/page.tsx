import { notFound } from "next/navigation";
import { db } from "@/db";
import { routes, gyms, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { gradeLabel, gradeDisplayMode } from "@/lib/grade-utils";
import { generateQRSVG } from "@/lib/qr";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ gymSlug: string; routeId: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { routeId } = await params;
  const route = await db.query.routes.findFirst({
    where: eq(routes.id, routeId),
  });
  if (!route) return { title: "Route Not Found | Crushd" };

  const gym = await db.query.gyms.findFirst({
    where: eq(gyms.id, route.gymId),
  });

  const gradePart = route.consensusGrade != null
    ? gradeLabel(route.consensusGrade)
    : route.setterGrade != null
      ? gradeLabel(route.setterGrade)
      : "Ungraded";

  return {
    title: `${route.name ?? "Route"} (${gradePart}) — ${gym?.name ?? "Crushd"} | Crushd`,
    description: route.description ?? `${gradePart} boulder at ${gym?.name}`,
    openGraph: {
      images: [{ url: `/api/og?routeId=${routeId}` }],
    },
  };
}

export default async function RouteHubPage({ params }: Props) {
  const { gymSlug, routeId } = await params;

  const route = await db.query.routes.findFirst({
    where: eq(routes.id, routeId),
  });
  if (!route) notFound();

  const gym = await db.query.gyms.findFirst({
    where: eq(gyms.id, route.gymId),
  });
  if (!gym || gym.slug !== gymSlug) notFound();

  const setter = route.setterId
    ? await db.query.users.findFirst({ where: eq(users.id, route.setterId) })
    : null;

  const displayGrade =
    route.consensusGrade != null
      ? gradeLabel(route.consensusGrade)
      : route.setterGrade != null
        ? gradeLabel(route.setterGrade)
        : "Ungraded";

  const mode =
    route.voteCount != null && route.consensusConfidence != null
      ? gradeDisplayMode(route.voteCount, route.consensusConfidence)
      : "setter";

  const qrSvg = await generateQRSVG(route.shortCode);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivity",
    name: route.name ?? "Boulder Route",
    location: { "@type": "SportsActivityLocation", name: gym.name },
    description: route.description ?? `${displayGrade} boulder at ${gym.name}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <a href={`/gyms/${gym.slug}`} className="hover:underline">{gym.name}</a>
          </p>
          <h1 className="text-3xl font-bold">{route.name ?? "Unnamed Route"}</h1>
          {route.holdColor && (
            <p className="text-sm text-muted-foreground mt-1">
              {route.holdColor}{route.wallSection ? ` · ${route.wallSection}` : ""}
            </p>
          )}
        </div>

        <section className="border rounded-lg p-6 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold">{displayGrade}</span>
            {mode === "community_low" && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">?</span>
            )}
            {mode === "disputed" && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">disputed</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {route.voteCount ?? 0} vote{(route.voteCount ?? 0) !== 1 ? "s" : ""}
            {setter ? ` · Set by ${setter.displayName}` : ""}
          </p>
          {route.description && (
            <p className="text-sm mt-2">{route.description}</p>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">QR Code</h2>
          <div
            className="w-48"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            crushd.app/r/{route.shortCode}
          </p>
        </section>
      </main>
    </>
  );
}
