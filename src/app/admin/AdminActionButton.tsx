"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type AdminActionButtonProps = {
  action: (formData: FormData) => Promise<void>;
  buttonClassName: string;
  confirmMessage: string;
  formClassName?: string;
  idleLabel: string;
  pendingLabel: string;
  children?: ReactNode;
};

function SubmitButton({
  className,
  idleLabel,
  pendingLabel,
}: {
  className: string;
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export default function AdminActionButton({
  action,
  buttonClassName,
  confirmMessage,
  formClassName,
  idleLabel,
  pendingLabel,
  children,
}: AdminActionButtonProps) {
  return (
    <form
      action={action}
      className={formClassName}
      onSubmit={(event) => {
        const confirmed = window.confirm(confirmMessage);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      {children}
      <SubmitButton className={buttonClassName} idleLabel={idleLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
