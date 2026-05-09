"use client";

import { useFormStatus } from "react-dom";

type UploadSubmitButtonProps = {
  className: string;
};

export default function UploadSubmitButton({ className }: UploadSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Uploading..." : "Upload Results"}
    </button>
  );
}
