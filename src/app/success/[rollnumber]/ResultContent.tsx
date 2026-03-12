"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { UserRecord } from "@/lib/users";
import styles from "./page.module.css";

type Html2PdfInstance = {
  set: (config: object) => Html2PdfInstance;
  from: (element: HTMLElement) => Html2PdfInstance;
  save: () => void;
};

type Html2PdfFactory = () => Html2PdfInstance;

declare global {
  interface Window {
    html2pdf?: Html2PdfFactory;
  }
}

type ResultContentProps = {
  user: UserRecord;
};

function loadHtmlToPdfScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.html2pdf) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load html2pdf library"));
    document.body.appendChild(script);
  });
}

export default function ResultContent({ user }: ResultContentProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadHtmlToPdfScript().catch(() => undefined);
  }, []);

  const downloadAsPDF = async (): Promise<void> => {
    setIsDownloading(true);

    try {
      await loadHtmlToPdfScript();
      const element = document.getElementById("result-table-container");

      if (!element || !window.html2pdf) {
        return;
      }

      window
        .html2pdf()
        .set({
          margin: 10,
          filename: "RESULT-BVOC.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className={styles.page}>
      <Image
        className={styles.cornerLogo}
        src="/images/LOGO FOR WEBSITE-01_1683719447.webp"
        alt="Company Logo"
        width={350}
        height={90}
        priority
      />

      <div id="result-table-container" className={styles.tableContainer}>
        <div className={styles.logo}>
          <Image
            src="/images/LOGO FOR WEBSITE-01_1683719447.webp"
            alt="Company Logo"
            className={styles.logoImage}
            width={200}
            height={80}
          />
        </div>
        <h1 className={styles.resultHeading}>B VOC - First Semester Result</h1>
        <h4>NAME: {user.Name}</h4>
        <h4>ROLLNUMBER: {user.Rollnumber}</h4>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <tbody>
            <tr>
              <th></th>
              <th>U E Marks</th>
              <th>IA/CA Marks</th>
              <th>Total Marks</th>
              <th>Grade</th>
            </tr>
            {user.subjects.map((subject) => (
              <tr key={subject.key}>
                <th>{subject.label}</th>
                <td>{subject.ueMark}</td>
                <td>{subject.iaMark}</td>
                <td>{subject.totalMark}</td>
                <td>{subject.grade}</td>
              </tr>
            ))}
            <tr className={styles.spacerRow}>
              <td className={styles.spacerCell} colSpan={5}></td>
            </tr>
            <tr>
              <th colSpan={2}>Total theory marks</th>
              <td colSpan={4} className={styles.center}>
                {user.TTM}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Total internal marks</th>
              <td colSpan={4} className={styles.center}>
                {user.TIM}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Total CA Marks</th>
              <td colSpan={4} className={styles.center}>
                {user.TCM}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Grand Total</th>
              <td colSpan={4} className={styles.center}>
                {user.GT}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Percentage</th>
              <td colSpan={4} className={styles.center}>
                {user.P}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>Result</th>
              <td colSpan={4} className={styles.center}>
                {user.R}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>No of Subject failed</th>
              <td colSpan={4} className={styles.center}>
                {user.NOSF ?? ""}
              </td>
            </tr>
            <tr>
              <th colSpan={2}>SGPA</th>
              <td colSpan={4} className={styles.center}>
                {user.S ?? ""}
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.downloadContainer} style={{ display: isDownloading ? "none" : "block" }}>
        <button className={styles.downloadButton} onClick={downloadAsPDF} type="button">
          Download Result
        </button>
      </div>
    </main>
  );
}
