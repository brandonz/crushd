import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Crushd</h1>
        <p className="text-xl text-muted-foreground">
          Your community bouldering hub. Track routes, vote on grades, and
          connect with your gym&apos;s climbing community.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          {userId ? (
            <Link
              href="/gyms"
              className="bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Browse Gyms
            </Link>
          ) : (
            <SignInButton mode="modal">
              <button className="bg-foreground text-background px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity">
                Get Started
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </main>
  );
}
