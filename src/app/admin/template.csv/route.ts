import { getUploadTemplateCsv } from "@/lib/users";

export async function GET(): Promise<Response> {
  return new Response(getUploadTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="result-upload-template.csv"',
    },
  });
}
