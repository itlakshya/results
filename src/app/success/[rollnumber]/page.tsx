import { notFound } from "next/navigation";
import { findUserByRollnumber } from "@/lib/users";
import ResultContent from "./ResultContent";

type SuccessPageProps = {
  params: Promise<{ rollnumber: string }>;
};

export default async function SuccessPage({ params }: SuccessPageProps) {
  const { rollnumber } = await params;
  const user = await findUserByRollnumber(decodeURIComponent(rollnumber));

  if (!user) {
    notFound();
  }

  return <ResultContent user={user} />;
}
