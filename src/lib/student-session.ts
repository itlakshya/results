import { cookies } from "next/headers";

const ROLL_COOKIE_NAME = "student_rollnumber";
const DOB_COOKIE_NAME = "student_dob";

export async function setStudentAuthCookie(rollnumber: string, dob: string): Promise<void> {
  const store = await cookies();
  const maxAge = Number(process.env.STUDENT_SESSION_MAX_AGE ?? "1800");
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };

  store.set(ROLL_COOKIE_NAME, rollnumber, options);
  store.set(DOB_COOKIE_NAME, dob, options);
}

export async function getStudentSession(): Promise<{ rollnumber: string; dob: string } | null> {
  const store = await cookies();
  const rollnumber = store.get(ROLL_COOKIE_NAME)?.value?.trim() ?? "";
  const dob = store.get(DOB_COOKIE_NAME)?.value?.trim() ?? "";

  if (!rollnumber || !dob) {
    return null;
  }

  return { rollnumber, dob };
}

export async function clearStudentSession(): Promise<void> {
  const store = await cookies();
  store.delete(ROLL_COOKIE_NAME);
  store.delete(DOB_COOKIE_NAME);
}
