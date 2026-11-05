import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth-token";

export async function requireAdminLayout() {
  const jar = await cookies();
  if (!verifySession(jar.get(ADMIN_COOKIE)?.value, process.env.ADMIN_SECRET)) redirect("/admin/login");
}
