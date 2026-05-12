import { redirect } from "next/navigation";
import { CreateMixdForm } from "@/components/create-mixd-form";
import { getSession } from "@/lib/session";

export default async function CreatePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/create");
  }

  return <CreateMixdForm />;
}
