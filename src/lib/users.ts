import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";

export type SubjectRecord = {
  key: string;
  label: string;
  ueMark: string;
  iaMark: string;
  totalMark: string;
  grade: string;
};

export type UserRecord = {
  id: number;
  Rollnumber: string;
  DOB: string;
  Name: string;
  TTM: string;
  TIM: string;
  TCM: string;
  GT: string;
  P: string;
  R: string;
  NOSF: string | null;
  S: string | null;
  subjects: SubjectRecord[];
  rawData: Record<string, string>;
};

type UserInput = Partial<UserRecord> &
  Record<string, unknown> & {
    rawData?: Record<string, unknown>;
    subjects?: unknown;
  };

const DATA_FILE_PATH =
  process.env.RESULT_DATA_FILE ?? path.join(process.cwd(), "src", "data", "users.json");
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = Boolean(DATABASE_URL && /^postgres(ql)?:\/\//i.test(DATABASE_URL));

const STATIC_FIELDS = ["Rollnumber", "DOB", "Name", "TTM", "TIM", "TCM", "GT", "P", "R", "NOSF", "S"] as const;
const COMMON_FIELD_ALIASES: Record<string, string[]> = {
  TTM: ["TotalTheoryMarks"],
  TIM: ["TotalInternalMarks"],
  TCM: ["TotalCAMarks"],
  GT: ["GrandTotal"],
  P: ["Percentage"],
  R: ["Result"],
  NOSF: ["NumberOfSubjectsFailed"],
  S: ["SGPA"],
};
const SUBJECT_SUFFIX_ALIASES = {
  ueMark: ["UniversityExamMark", "UEI", "UEM"],
  iaMark: ["InternalAssessmentMark", "IAI", "IAM"],
  totalMark: ["TotalMark", "TM"],
  grade: ["Grade", "G"],
} as const;
const SUBJECT_SUFFIX_TO_FIELD = new Map<string, keyof Omit<SubjectRecord, "key" | "label">>([
  ["UNIVERSITYEXAMMARK", "ueMark"],
  ["UEI", "ueMark"],
  ["UEM", "ueMark"],
  ["INTERNALASSESSMENTMARK", "iaMark"],
  ["IAI", "iaMark"],
  ["IAM", "iaMark"],
  ["TOTALMARK", "totalMark"],
  ["TM", "totalMark"],
  ["GRADE", "grade"],
  ["G", "grade"],
]);

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL?.includes("sslmode=require")
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
    });
  }
  return pool;
}

function normalizeValue(value: string): string {
  return value.trim().toUpperCase();
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  return String(value).trim();
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateParts(day: number, month: number, year: number): string {
  return `${padDatePart(day)}-${padDatePart(month)}-${year}`;
}

function excelSerialToDate(serial: number): string {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const utcDate = new Date(excelEpoch + Math.round(serial) * millisecondsPerDay);

  return formatDateParts(utcDate.getUTCDate(), utcDate.getUTCMonth() + 1, utcDate.getUTCFullYear());
}

function normalizeDobValue(value: unknown): string {
  const normalized = toStringValue(value);

  if (!normalized) {
    return "";
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const numericValue = Number(normalized);

    if (numericValue >= 20000 && numericValue <= 60000) {
      return excelSerialToDate(numericValue);
    }
  }

  const separatorMatch = normalized.match(/^(\d{1,4})[\/.-](\d{1,2})[\/.-](\d{1,4})$/);

  if (separatorMatch) {
    const first = Number(separatorMatch[1]);
    const second = Number(separatorMatch[2]);
    const third = Number(separatorMatch[3]);

    if (separatorMatch[1].length === 4) {
      return formatDateParts(third, second, first);
    }

    return formatDateParts(first, second, third);
  }

  return normalized;
}

function normalizeRecordEntries(record: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(record)
    .filter(([key]) => key !== "id" && key !== "rawData" && key !== "subjects")
    .map(([key, value]) => [String(key).trim(), toStringValue(value)]);
}

function buildRawData(record: UserInput): Record<string, string> {
  const rawDataSource =
    record.rawData && typeof record.rawData === "object"
      ? normalizeRecordEntries(record.rawData as Record<string, unknown>)
      : normalizeRecordEntries(record);
  const rawData = Object.fromEntries(rawDataSource);

  for (const [canonicalKey, aliases] of Object.entries(COMMON_FIELD_ALIASES)) {
    if (toStringValue(rawData[canonicalKey]).length > 0) {
      continue;
    }

    for (const alias of aliases) {
      const aliasValue = toStringValue(rawData[alias]);
      if (aliasValue.length > 0) {
        rawData[canonicalKey] = aliasValue;
        break;
      }
    }
  }

  return rawData;
}

function formatSubjectLabel(subjectKey: string): string {
  return subjectKey.replace(/_/g, " ").trim();
}

function buildSubjectsFromRawData(rawData: Record<string, string>): SubjectRecord[] {
  const subjects = new Map<string, SubjectRecord>();

  for (const [fieldName, value] of Object.entries(rawData)) {
    const trimmedFieldName = fieldName.trim();
    const separatorIndex = trimmedFieldName.lastIndexOf("_");

    if (separatorIndex <= 0) {
      continue;
    }

    const subjectKey = trimmedFieldName.slice(0, separatorIndex).trim();
    const suffix = trimmedFieldName.slice(separatorIndex + 1).trim().replace(/\s+/g, "").toUpperCase();
    const targetField = SUBJECT_SUFFIX_TO_FIELD.get(suffix);

    if (!subjectKey || !targetField) {
      continue;
    }

    const existing =
      subjects.get(subjectKey) ??
      ({
        key: subjectKey,
        label: formatSubjectLabel(subjectKey),
        ueMark: "",
        iaMark: "",
        totalMark: "",
        grade: "",
      } satisfies SubjectRecord);

    existing[targetField] = value;
    subjects.set(subjectKey, existing);
  }

  return Array.from(subjects.values());
}

function sanitizeSubjects(subjects: unknown, rawData: Record<string, string>): SubjectRecord[] {
  if (!Array.isArray(subjects)) {
    return buildSubjectsFromRawData(rawData);
  }

  const cleanSubjects = subjects
    .filter((subject): subject is Record<string, unknown> => Boolean(subject && typeof subject === "object"))
    .map((subject) => ({
      key: toStringValue(subject.key),
      label: toStringValue(subject.label) || formatSubjectLabel(toStringValue(subject.key)),
      ueMark: toStringValue(subject.ueMark),
      iaMark: toStringValue(subject.iaMark),
      totalMark: toStringValue(subject.totalMark),
      grade: toStringValue(subject.grade),
    }))
    .filter((subject) => subject.key.length > 0);

  return cleanSubjects.length > 0 ? cleanSubjects : buildSubjectsFromRawData(rawData);
}

function sanitizeRecord(record: UserInput, fallbackId: number): UserRecord {
  const rawData = buildRawData(record);
  const subjects = sanitizeSubjects(record.subjects, rawData);

  return {
    id: Number(record.id ?? fallbackId),
    Rollnumber: toStringValue(rawData.Rollnumber ?? record.Rollnumber),
    DOB: normalizeDobValue(rawData.DOB ?? record.DOB),
    Name: toStringValue(rawData.Name ?? record.Name),
    TTM: toStringValue(rawData.TTM ?? record.TTM),
    TIM: toStringValue(rawData.TIM ?? record.TIM),
    TCM: toStringValue(rawData.TCM ?? record.TCM),
    GT: toStringValue(rawData.GT ?? record.GT),
    P: toStringValue(rawData.P ?? record.P),
    R: toStringValue(rawData.R ?? record.R),
    NOSF: toNullableString(rawData.NOSF ?? record.NOSF),
    S: toNullableString(rawData.S ?? record.S),
    subjects,
    rawData: {
      ...rawData,
      DOB: normalizeDobValue(rawData.DOB ?? record.DOB),
    },
  };
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
    await fs.writeFile(DATA_FILE_PATH, "[]", "utf-8");
  }
}

async function readUsers(): Promise<UserRecord[]> {
  await ensureDataFile();
  const file = await fs.readFile(DATA_FILE_PATH, "utf-8");
  const parsed = JSON.parse(file) as UserInput[];
  return parsed.map((item, index) => sanitizeRecord(item, index + 1));
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await fs.writeFile(DATA_FILE_PATH, JSON.stringify(users, null, 2), "utf-8");
}

async function ensurePostgresTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "result_user" (
        "id" SERIAL PRIMARY KEY,
        "Rollnumber" VARCHAR(300) NOT NULL,
        "DOB" VARCHAR(300) NOT NULL,
        "Name" VARCHAR(300) NOT NULL DEFAULT '',
        "TTM" VARCHAR(300) NOT NULL DEFAULT '',
        "TIM" VARCHAR(300) NOT NULL DEFAULT '',
        "TCM" VARCHAR(300) NOT NULL DEFAULT '',
        "GT" VARCHAR(300) NOT NULL DEFAULT '',
        "P" VARCHAR(300) NOT NULL DEFAULT '',
        "R" VARCHAR(300) NOT NULL DEFAULT '',
        "NOSF" VARCHAR(300),
        "S" VARCHAR(300),
        "rawData" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "subjects" JSONB NOT NULL DEFAULT '[]'::jsonb
      );
    `);

    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "rawData" JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "subjects" JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "TTM" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "TIM" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "TCM" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "GT" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "P" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "R" VARCHAR(300) NOT NULL DEFAULT '';
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "NOSF" VARCHAR(300);
    `);
    await client.query(`
      ALTER TABLE "result_user"
      ADD COLUMN IF NOT EXISTS "S" VARCHAR(300);
    `);
  } finally {
    client.release();
  }
}

function toPostgresParams(user: UserRecord): Array<string | object | null> {
  return [
    user.Rollnumber,
    user.DOB,
    user.Name,
    user.TTM,
    user.TIM,
    user.TCM,
    user.GT,
    user.P,
    user.R,
    user.NOSF,
    user.S,
    JSON.stringify(user.rawData),
    JSON.stringify(user.subjects),
  ];
}

async function readUsersFromPostgres(): Promise<UserRecord[]> {
  await ensurePostgresTable();
  const client = await getPool().connect();
  try {
    const res = await client.query('SELECT * FROM "result_user" ORDER BY "id" ASC');
    return res.rows.map((row, index) => sanitizeRecord(row, index + 1));
  } finally {
    client.release();
  }
}

async function findUserByCredentialsFromPostgres(
  rollnumber: string,
  dob: string,
): Promise<UserRecord | null> {
  await ensurePostgresTable();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `
      SELECT * FROM "result_user"
      WHERE UPPER(TRIM("Rollnumber")) = UPPER(TRIM($1))
      `,
      [rollnumber],
    );

    const normalizedDob = normalizeValue(normalizeDobValue(dob));
    const match = res.rows
      .map((row, index) => sanitizeRecord(row, index + 1))
      .find((user) => normalizeValue(normalizeDobValue(user.DOB)) === normalizedDob);

    return match ?? null;
  } finally {
    client.release();
  }
}

async function findUserByRollnumberFromPostgres(rollnumber: string): Promise<UserRecord | null> {
  await ensurePostgresTable();
  const client = await getPool().connect();
  try {
    const res = await client.query(
      `
      SELECT * FROM "result_user"
      WHERE UPPER(TRIM("Rollnumber")) = UPPER(TRIM($1))
      LIMIT 1
      `,
      [rollnumber],
    );

    if (res.rows.length === 0) {
      return null;
    }

    return sanitizeRecord(res.rows[0], 1);
  } finally {
    client.release();
  }
}

async function replaceUsersInPostgres(rows: UserInput[]): Promise<number> {
  await ensurePostgresTable();
  const cleanRows = rows
    .map((row, index) => sanitizeRecord(row, index + 1))
    .filter((row) => row.Rollnumber.length > 0 && row.DOB.length > 0);

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query('TRUNCATE TABLE "result_user" RESTART IDENTITY');

    for (const user of cleanRows) {
      await client.query(
        `
        INSERT INTO "result_user" (
          "Rollnumber","DOB","Name","TTM","TIM","TCM","GT","P","R","NOSF","S","rawData","subjects"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb
        )
        `,
        toPostgresParams(user),
      );
    }

    await client.query("COMMIT");
    return cleanRows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAllUsers(): Promise<UserRecord[]> {
  if (USE_POSTGRES) {
    return readUsersFromPostgres();
  }
  return readUsers();
}

export async function findUserByCredentials(
  rollnumber: string,
  dob: string,
): Promise<UserRecord | null> {
  if (USE_POSTGRES) {
    return findUserByCredentialsFromPostgres(rollnumber, dob);
  }
  const users = await readUsers();
  const normalizedRoll = normalizeValue(rollnumber);
  const normalizedDob = normalizeValue(dob);

  const match = users.find(
    (user) =>
      normalizeValue(user.Rollnumber) === normalizedRoll && normalizeValue(user.DOB) === normalizedDob,
  );

  return match ?? null;
}

export async function findUserByRollnumber(rollnumber: string): Promise<UserRecord | null> {
  if (USE_POSTGRES) {
    return findUserByRollnumberFromPostgres(rollnumber);
  }
  const users = await readUsers();
  const normalizedRoll = normalizeValue(rollnumber);
  const match = users.find((user) => normalizeValue(user.Rollnumber) === normalizedRoll);
  return match ?? null;
}

export async function replaceUsersFromUpload(rows: UserInput[]): Promise<number> {
  if (USE_POSTGRES) {
    return replaceUsersInPostgres(rows);
  }
  const cleanRows = rows
    .map((row, index) => sanitizeRecord(row, index + 1))
    .filter((row) => row.Rollnumber.length > 0 && row.DOB.length > 0);

  await writeUsers(cleanRows.map((row, index) => ({ ...row, id: index + 1 })));
  return cleanRows.length;
}

export function getUploadTemplateHeaders(): string[] {
  return [
    "Rollnumber",
    "DOB",
    "Name",
    "[Subject]_UniversityExamMark",
    "[Subject]_InternalAssessmentMark",
    "[Subject]_TotalMark",
    "[Subject]_Grade",
    "TotalTheoryMarks",
    "TotalInternalMarks",
    "TotalCAMarks",
    "GrandTotal",
    "Percentage",
    "Result",
    "NumberOfSubjectsFailed",
    "SGPA",
  ];
}

export function getSupportedSubjectFieldExamples(): string[] {
  return [
    `English_${SUBJECT_SUFFIX_ALIASES.ueMark[0]}`,
    `English_${SUBJECT_SUFFIX_ALIASES.iaMark[0]}`,
    `English_${SUBJECT_SUFFIX_ALIASES.totalMark[0]}`,
    `English_${SUBJECT_SUFFIX_ALIASES.grade[0]}`,
  ];
}

export function getUploadTemplateCsv(): string {
  const headers = [
    "Rollnumber",
    "DOB",
    "Name",
    "English_UniversityExamMark",
    "English_InternalAssessmentMark",
    "English_TotalMark",
    "English_Grade",
    "Subject2_UniversityExamMark",
    "Subject2_InternalAssessmentMark",
    "Subject2_TotalMark",
    "Subject2_Grade",
    "TotalTheoryMarks",
    "TotalInternalMarks",
    "TotalCAMarks",
    "GrandTotal",
    "Percentage",
    "Result",
    "NumberOfSubjectsFailed",
    "SGPA",
  ];

  const sampleRow = [
    "24BVR00001",
    "01-01-2006",
    "Student Name",
    "45",
    "25",
    "70",
    "A",
    "40",
    "22",
    "62",
    "B+",
    "110",
    "47",
    "0",
    "157",
    "78.5",
    "PASS",
    "0",
    "8.1",
  ];

  return `${headers.join(",")}\n${sampleRow.join(",")}\n`;
}
