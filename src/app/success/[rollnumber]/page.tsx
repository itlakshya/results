import { notFound, redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-session";
import { findUserByCredentials } from "@/lib/users";
import ResultContent from "./ResultContent";

type SuccessPageProps = {
  params: Promise<{ rollnumber: string }>;
};

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { rollnumber } = await params;
  const session = await getStudentSession();

  if (!session) {
    redirect("/");
  }

  const decodedRollnumber = decodeURIComponent(rollnumber);

  if (session.rollnumber.trim().toUpperCase() !== decodedRollnumber.trim().toUpperCase()) {
    notFound();
  }

  const user = await findUserByCredentials(session.rollnumber, session.dob);

  if (!user) {
    notFound();
  }

  return <ResultContent user={user} />;
}
