import { redirect } from "next/navigation";
import { MixdHome } from "@/components/mixd-home";
import { listMixds } from "@/lib/mixd-store";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const mixds = (await listMixds()).filter((mixd) =>
    mixd.participants.some(
      (participant) => participant.participantId === session.participantId
    )
  );

  return <MixdHome mixds={mixds} session={session} />;
}
