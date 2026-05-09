import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { clearAdminAuthCookie, hasAdminAuthCookie } from "@/lib/admin-session";
import {
  deleteAllUsers,
  deleteUsersByExamName,
  getAllUsers,
  getSupportedSubjectFieldExamples,
  getUploadTemplateHeaders,
  upsertUsersFromUpload,
} from "@/lib/users";
import AdminActionButton from "./AdminActionButton";
import AdminToast from "./AdminToast";
import UploadSubmitButton from "./UploadSubmitButton";
import styles from "./page.module.css";

type AdminPageProps = {
  searchParams: Promise<{ status?: string; count?: string; exam?: string }>;
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
  const count = await upsertUsersFromUpload(rows);

  redirect(`/admin?status=uploaded-${count}`);
}

async function deleteAllResultsAction(formData: FormData): Promise<void> {
  "use server";
  void formData;

  if (!(await hasAdminAuthCookie())) {
    redirect("/admin/login");
  }

  await deleteAllUsers();
  redirect("/admin?status=deleted");
}

async function deleteExamResultsAction(formData: FormData): Promise<void> {
  "use server";

  if (!(await hasAdminAuthCookie())) {
    redirect("/admin/login");
  }

  const examName = String(formData.get("examName") ?? "").trim();

  if (!examName) {
    redirect("/admin?status=missing-exam");
  }

  const deletedCount = await deleteUsersByExamName(examName);
  redirect(`/admin?status=deleted-exam&count=${deletedCount}&exam=${encodeURIComponent(examName)}`);
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await hasAdminAuthCookie())) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const users = await getAllUsers();
  const headers = getUploadTemplateHeaders();
  const subjectExamples = getSupportedSubjectFieldExamples();
  const status = params.status ?? "";
  const count = params.count ?? "";
  const selectedExam = params.exam ?? "";
  const examNames = Array.from(
    new Set(users.map((user) => user.exam_name?.trim()).filter((examName): examName is string => Boolean(examName))),
  ).sort((first, second) => first.localeCompare(second));
  const toastMessage = status.startsWith("uploaded-")
    ? `Upload successful. Records updated: ${status.replace("uploaded-", "")}`
    : status === "deleted"
      ? "All result records deleted successfully."
      : status === "deleted-exam"
        ? `Deleted ${count || "0"} result record(s) for ${selectedExam || "the selected exam"}.`
        : status === "empty"
          ? "Please choose a file to upload."
          : status === "invalid"
            ? "Invalid file content."
            : status === "missing-exam"
              ? "Please choose an exam name to delete."
              : "";
  const toastClassName =
    status === "empty" || status === "invalid" || status === "missing-exam" ? styles.toastError : styles.toastSuccess;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        {toastMessage ? (
          <AdminToast
            key={`${status}-${count}-${selectedExam}`}
            className={toastClassName}
            message={toastMessage}
          />
        ) : null}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Panel</h1>
            <p className={styles.text}>Upload result file (Excel/CSV) to add new records or update matching roll numbers.</p>
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
        {status === "deleted" ? <p className={styles.success}>All result records deleted successfully.</p> : null}
        {status === "deleted-exam" ? (
          <p className={styles.success}>Deleted {count || "0"} result record(s) for {selectedExam || "the selected exam"}.</p>
        ) : null}
        {status === "empty" ? <p className={styles.error}>Please choose a file to upload.</p> : null}
        {status === "invalid" ? <p className={styles.error}>Invalid file content.</p> : null}
        {status === "missing-exam" ? <p className={styles.error}>Please choose an exam name to delete.</p> : null}

        <form className={styles.uploadForm} action={uploadResultsAction}>
          <div className={styles.fileField}>
            <label className={styles.label} htmlFor="resultFile">
              Result File (.xlsx, .xls, .csv)
            </label>
            <input className={styles.input} id="resultFile" name="resultFile" type="file" required />
          </div>
          <UploadSubmitButton className={styles.uploadButton} />
        </form>

        <div className={styles.actionsRow}>
          <AdminActionButton
            action={deleteAllResultsAction}
            buttonClassName={styles.deleteAllButton}
            confirmMessage="Are you sure you want to delete all results? This cannot be undone."
            idleLabel="Delete All Results"
            pendingLabel="Deleting..."
          />
        </div>

        <div className={styles.filterCard}>
          <div className={styles.filterHeader}>
            <strong>Delete By Exam Name</strong>
            <span className={styles.filterHint}>Only records matching the selected exam name will be deleted.</span>
          </div>
          <AdminActionButton
            action={deleteExamResultsAction}
            buttonClassName={styles.deleteFilteredButton}
            confirmMessage="Are you sure you want to delete all results for the selected exam name? This cannot be undone."
            formClassName={styles.filterForm}
            idleLabel="Delete Selected Exam Results"
            pendingLabel="Deleting..."
          >
            <div className={styles.selectField}>
              <label className={styles.label} htmlFor="examName">
                Exam Name
              </label>
              <select
                className={styles.select}
                id="examName"
                name="examName"
                defaultValue={selectedExam}
              >
                <option value="">Select exam name</option>
                {examNames.map((examName) => (
                  <option key={examName} value={examName}>
                    {examName}
                  </option>
                ))}
              </select>
            </div>
          </AdminActionButton>
        </div>

        <div className={styles.helpBlock}>
          <strong>Required headers:</strong> {headers.join(", ")}
        </div>
        <div className={styles.helpBlock}>
          <strong>Subject columns:</strong> Add one set per subject, for example{" "}
          {subjectExamples.join(", ")}.
        </div>
        <div className={styles.helpBlock}>
          <strong>Common fields:</strong> Rollnumber, DOB, Name, exam_name, TTM, TIM, TCM, GT, P, R, NOSF, S.
        </div>
        <div className={styles.templateCard}>
          <div>
            <strong className={styles.templateTitle}>CSV Template</strong>
            <p className={styles.templateText}>Download the sample file before uploading if you want the correct column structure.</p>
          </div>
          <a className={styles.downloadLink} href="/admin/template.csv">
            Download CSV Template
          </a>
        </div>

        <div className={styles.meta}>Total records: {users.length}</div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Exam Name</th>
                <th>Rollnumber</th>
                <th>DOB</th>
                <th>Name</th>
                <th>Grand Total</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 100).map((user, index) => (
                <tr key={`${user.Rollnumber}-${user.id}`}>
                  <td>{index + 1}</td>
                  <td>{user.exam_name ?? "-"}</td>
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
