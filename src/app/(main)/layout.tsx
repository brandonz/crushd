import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <>
      <header className="border-b">
        <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">
            Crushd
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/gyms" className="text-sm hover:underline">
              Gyms
            </Link>
            {userId ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm font-medium">Sign in</button>
              </SignInButton>
            )}
          </div>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </>
  );
}
