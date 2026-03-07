import { cookies } from "next/headers";

const COOKIE_NAME = "admin_auth";

export function isValidAdmin(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "admin@123";
  return username === expectedUsername && password === expectedPassword;
}

export async function setAdminAuthCookie(): Promise<void> {
  const store = await cookies();
  const maxAge = Number(process.env.ADMIN_SESSION_MAX_AGE ?? "28800");
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearAdminAuthCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function hasAdminAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}
