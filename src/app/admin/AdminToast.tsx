"use client";

import { useEffect, useState } from "react";

type AdminToastProps = {
  className: string;
  message: string;
};

export default function AdminToast({ className, message }: AdminToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  if (!visible || !message) {
    return null;
  }

  return <div className={className}>{message}</div>;
}
