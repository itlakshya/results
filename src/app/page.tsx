import Image from "next/image";
import { redirect } from "next/navigation";
import { findUserByCredentials } from "@/lib/users";
import styles from "./page.module.css";

type HomeProps = {
  searchParams: Promise<{ error?: string }>;
};

async function loginAction(formData: FormData): Promise<void> {
  "use server";

  const dob = String(formData.get("DOB") ?? "");
  const rollnumber = String(formData.get("Rollnumber") ?? "");
  const user = await findUserByCredentials(rollnumber, dob);

  if (!user) {
    redirect("/?error=invalid");
  }

  redirect(`/success/${encodeURIComponent(user.Rollnumber)}`);
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <main className={styles.page}>
      <Image
        src="/images/logo-new-yellow_1680778606.webp"
        alt="Logo"
        width={200}
        height={80}
        className={styles.logoMobile}
        priority
      />
      <Image
        src="/images/LOGO FOR WEBSITE-01_1683719447.webp"
        alt="Logo"
        width={350}
        height={120}
        className={styles.logoDesktop}
        priority
      />

      <div className={styles.mobileContainer}>
        <h2 className={styles.headingMobile}>IIC Lakshya Result Portal</h2>
        {hasError ? (
          <ul className={styles.messageList}>
            <li>Invalid DOB or Rollnumber!</li>
          </ul>
        ) : null}
        <form action={loginAction}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="mobile-dob">
              DOB:
            </label>
            <input className={styles.input} type="text" name="DOB" id="mobile-dob" required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="mobile-rollnumber">
              Roll Number:
            </label>
            <input className={styles.input} type="text" name="Rollnumber" id="mobile-rollnumber" required />
          </div>
          <div className={styles.formGroup}>
            <button className={styles.button} type="submit">
              Login
            </button>
          </div>
        </form>
      </div>

      <div className={styles.desktopContainer}>
        <h2 className={styles.headingDesktop}>IIC Lakshya Result Portal</h2>
        {hasError ? (
          <ul className={styles.messageList}>
            <li>Invalid DOB or Rollnumber!</li>
          </ul>
        ) : null}
        <form action={loginAction}>
          <div className={styles.desktopFormGroup}>
            <label className={styles.label} htmlFor="desktop-dob">
              DOB
            </label>
            <input className={styles.desktopInput} type="text" name="DOB" id="desktop-dob" required />
          </div>
          <div className={styles.desktopFormGroup}>
            <label className={styles.label} htmlFor="desktop-rollnumber">
              Roll Number:
            </label>
            <input
              className={styles.desktopInput}
              type="text"
              name="Rollnumber"
              id="desktop-rollnumber"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <button className={styles.desktopButton} type="submit">
              Login
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
