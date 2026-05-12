import { redirect } from "next/navigation";
import { LoginClient } from "@/components/login-client";
import { clearSession, getSession } from "@/lib/session";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ redirect?: string; logout?: string }>;
}) {
  const params = await searchParams;

  if (params.logout === "1") {
    await clearSession();
  }

  const session = await getSession();

  if (session && !params.logout) {
    redirect(params.redirect || "/");
  }

  return <LoginClient />;
}
