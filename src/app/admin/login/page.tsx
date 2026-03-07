import { redirect } from "next/navigation";
import { hasAdminAuthCookie, isValidAdmin, setAdminAuthCookie } from "@/lib/admin-session";
import styles from "./page.module.css";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

async function doAdminLogin(formData: FormData): Promise<void> {
  "use server";

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isValidAdmin(username, password)) {
    redirect("/admin/login?error=1");
  }

  await setAdminAuthCookie();
  redirect("/admin");
}

export default async function AdminLoginPage({ searchParams }: Props) {
  if (await hasAdminAuthCookie()) {
    redirect("/admin");
  }

  const params = await searchParams;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Admin Login</h1>
        {params.error ? <div className={styles.error}>Invalid credentials</div> : null}
        <form action={doAdminLogin}>
          <div className={styles.group}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>
            <input className={styles.input} id="username" name="username" type="text" required />
          </div>
          <div className={styles.group}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input className={styles.input} id="password" name="password" type="password" required />
          </div>
          <button className={styles.button} type="submit">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
