import { redirect } from "next/navigation";
import { MobileHeader, MobileTabBar, Sidebar } from "@/components/app-nav";
import { getCurrentUser } from "@/lib/auth";
import { ensureCard } from "@/lib/cards";
import { hasAvatar } from "@/lib/avatars";
import { avatarUrl } from "@/lib/cards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/app");

  const card = await ensureCard(user);
  const avatar = (await hasAvatar(card.id)) ? avatarUrl(card.id) : null;

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar name={user.name} email={user.email} avatar={avatar} />
      <div className="min-w-0">
        <MobileHeader name={user.name} avatar={avatar} />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
