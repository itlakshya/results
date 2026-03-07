import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { clearAdminAuthCookie, hasAdminAuthCookie } from "@/lib/admin-session";
import { getAllUsers, getUploadTemplateHeaders, replaceUsersFromUpload } from "@/lib/users";
import styles from "./page.module.css";

type AdminPageProps = {
  searchParams: Promise<{ status?: string }>;
};

async function doLogout(): Promise<void> {
  "use server";
  await clearAdminAuthCookie();
  redirect("/admin/login");
}

async function uploadResultsAction(formData: FormData): Promise<void> {
  "use server";

  if (!(await hasAdminAuthCookie())) {
    redirect("/admin/login");
  }

  const file = formData.get("resultFile");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin?status=empty");
  }

  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    redirect("/admin?status=invalid");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
  const count = await replaceUsersFromUpload(rows);

  redirect(`/admin?status=uploaded-${count}`);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await hasAdminAuthCookie())) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const users = await getAllUsers();
  const headers = getUploadTemplateHeaders();
  const status = params.status ?? "";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Panel</h1>
            <p className={styles.text}>Upload latest result file (Excel/CSV) to replace all records.</p>
          </div>
          <form action={doLogout}>
            <button className={styles.logout} type="submit">
              Logout
            </button>
          </form>
        </header>

        {status.startsWith("uploaded-") ? (
          <p className={styles.success}>Upload successful. Records updated: {status.replace("uploaded-", "")}</p>
        ) : null}
        {status === "empty" ? <p className={styles.error}>Please choose a file to upload.</p> : null}
        {status === "invalid" ? <p className={styles.error}>Invalid file content.</p> : null}

        <form className={styles.uploadForm} action={uploadResultsAction}>
          <label className={styles.label} htmlFor="resultFile">
            Result File (.xlsx, .xls, .csv)
          </label>
          <input className={styles.input} id="resultFile" name="resultFile" type="file" required />
          <button className={styles.uploadButton} type="submit">
            Upload And Replace Results
          </button>
        </form>

        <div className={styles.helpBlock}>
          <strong>Required headers:</strong> {headers.join(", ")}
        </div>

        <div className={styles.meta}>Total records: {users.length}</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rollnumber</th>
                <th>DOB</th>
                <th>Name</th>
                <th>Grand Total</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 100).map((user) => (
                <tr key={`${user.Rollnumber}-${user.id}`}>
                  <td>{user.Rollnumber}</td>
                  <td>{user.DOB}</td>
                  <td>{user.Name}</td>
                  <td>{user.GT}</td>
                  <td>{user.R}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
