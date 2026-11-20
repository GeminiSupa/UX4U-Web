import { can } from "@/lib/access";
import { requireArea } from "@/lib/auth";
import { CHANNELS } from "@/lib/chat";
import { ChatRoom } from "@/components/ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  const user = await requireArea("chat", "view");
  const query = await searchParams;
  const channel = (CHANNELS as readonly string[]).includes(query.channel || "") ? (query.channel as string) : "general";
  return (
    <div>
      <h1 className="mb-4 font-serif text-4xl">Team chat</h1>
      {user.bootstrap ? <p className="mb-4 text-sm text-amber-900">Sign in with your own account to send messages.</p> : null}
      <ChatRoom channel={channel} channels={CHANNELS} me={user.id} canModerate={can(user, "chat", "edit")} />
    </div>
  );
}
