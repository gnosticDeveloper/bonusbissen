import { BottomNav } from "@/components/bottom-nav";
import { CustomerHeader } from "@/components/customer-header";
import { SideMenu } from "@/components/side-menu";
import { getMe } from "@/app/b/actions";
import { getSessionToken, verifySession } from "@/lib/auth/session";
import { UserProvider } from "@/providers/user-provider";

export default async function DiscoverLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession(await getSessionToken());
  const userResult = session ? await getMe() : null;
  const authenticated = Boolean(session);

  return (
    <UserProvider user={userResult?.ok ? userResult.data : null}>
      <div
        className={`mx-auto min-h-svh w-full max-w-107.5 bg-background transition-colors duration-200 sm:border-x sm:border-border ${
          authenticated ? "pb-26" : "pb-10"
        }`}
      >
        <CustomerHeader authenticated={authenticated} />
        {children}
        {authenticated && (
          <>
            <SideMenu />
            <BottomNav />
          </>
        )}
      </div>
    </UserProvider>
  );
}
