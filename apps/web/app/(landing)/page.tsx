import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RedirectIfAuthenticated } from "@/features/landing/components/redirect-if-authenticated";

export default async function RootPage() {
  const c = await cookies();
  if (!c.has("algoplan_logged_in")) {
    redirect("/login");
  }
  return <RedirectIfAuthenticated />;
}
