import { notFound } from "next/navigation";
import { InviteMixdClient } from "@/components/invite-mixd-client";
import { getMixdByInviteCode } from "@/lib/mixd-store";

export default async function InvitePage({
  params
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const mixd = await getMixdByInviteCode(inviteCode);

  if (!mixd) {
    notFound();
  }

  return (
    <InviteMixdClient
      inviteCode={mixd.inviteCode}
      ownerName={mixd.ownerName}
      mixdName={mixd.name}
    />
  );
}
