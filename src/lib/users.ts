import { promises as fs } from "fs";
import path from "path";

export type UserRecord = {
  id: number;
  Rollnumber: string;
  DOB: string;
  Name: string;
  EFFP_UEM: string;
  EFFP_IAM: string;
  EFFP_TM: string;
  EFFP_G: string;
  AIB_UEM: string;
  AIB_IAM: string;
  AIB_TM: string;
  AIB_G: string;
  FA_UEM: string;
  FA_IAM: string;
  FA_TM: string;
  FA_G: string;
  AGO_UEM: string;
  AGO_IAM: string;
  AGO_TM: string;
  AGO_G: string;
  SGO_UEM: string;
  SGO_IAM: string;
  SGO_TM: string;
  SGO_G: string;
  TTM: string;
  TIM: string;
  TCM: string;
  GT: string;
  P: string;
  R: string;
  NOSF: string | null;
  S: string | null;
};

type UserInput = Partial<UserRecord> & Record<string, unknown>;

const DATA_FILE_PATH =
  process.env.RESULT_DATA_FILE ?? path.join(process.cwd(), "src", "data", "users.json");

const USER_FIELD_KEYS: Array<keyof Omit<UserRecord, "id">> = [
  "Rollnumber",
  "DOB",
  "Name",
  "EFFP_UEM",
  "EFFP_IAM",
  "EFFP_TM",
  "EFFP_G",
  "AIB_UEM",
  "AIB_IAM",
  "AIB_TM",
  "AIB_G",
  "FA_UEM",
  "FA_IAM",
  "FA_TM",
  "FA_G",
  "AGO_UEM",
  "AGO_IAM",
  "AGO_TM",
  "AGO_G",
  "SGO_UEM",
  "SGO_IAM",
  "SGO_TM",
  "SGO_G",
  "TTM",
  "TIM",
  "TCM",
  "GT",
  "P",
  "R",
  "NOSF",
  "S",
];

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

function sanitizeRecord(record: UserInput, fallbackId: number): UserRecord {
  return {
    id: Number(record.id ?? fallbackId),
    Rollnumber: toStringValue(record.Rollnumber),
    DOB: toStringValue(record.DOB),
    Name: toStringValue(record.Name),
    EFFP_UEM: toStringValue(record.EFFP_UEM),
    EFFP_IAM: toStringValue(record.EFFP_IAM),
    EFFP_TM: toStringValue(record.EFFP_TM),
    EFFP_G: toStringValue(record.EFFP_G),
    AIB_UEM: toStringValue(record.AIB_UEM),
    AIB_IAM: toStringValue(record.AIB_IAM),
    AIB_TM: toStringValue(record.AIB_TM),
    AIB_G: toStringValue(record.AIB_G),
    FA_UEM: toStringValue(record.FA_UEM),
    FA_IAM: toStringValue(record.FA_IAM),
    FA_TM: toStringValue(record.FA_TM),
    FA_G: toStringValue(record.FA_G),
    AGO_UEM: toStringValue(record.AGO_UEM),
    AGO_IAM: toStringValue(record.AGO_IAM),
    AGO_TM: toStringValue(record.AGO_TM),
    AGO_G: toStringValue(record.AGO_G),
    SGO_UEM: toStringValue(record.SGO_UEM),
    SGO_IAM: toStringValue(record.SGO_IAM),
    SGO_TM: toStringValue(record.SGO_TM),
    SGO_G: toStringValue(record.SGO_G),
    TTM: toStringValue(record.TTM),
    TIM: toStringValue(record.TIM),
    TCM: toStringValue(record.TCM),
    GT: toStringValue(record.GT),
    P: toStringValue(record.P),
    R: toStringValue(record.R),
    NOSF: toNullableString(record.NOSF),
    S: toNullableString(record.S),
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

export async function getAllUsers(): Promise<UserRecord[]> {
  return readUsers();
}

export async function findUserByCredentials(
  rollnumber: string,
  dob: string,
): Promise<UserRecord | null> {
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
  const users = await readUsers();
  const normalizedRoll = normalizeValue(rollnumber);
  const match = users.find((user) => normalizeValue(user.Rollnumber) === normalizedRoll);
  return match ?? null;
}

export async function replaceUsersFromUpload(rows: UserInput[]): Promise<number> {
  const cleanRows = rows
    .map((row, index) => sanitizeRecord(row, index + 1))
    .filter((row) => row.Rollnumber.length > 0 && row.DOB.length > 0);

  await writeUsers(cleanRows.map((row, index) => ({ ...row, id: index + 1 })));
  return cleanRows.length;
}

export function getUploadTemplateHeaders(): string[] {
  return ["id", ...USER_FIELD_KEYS];
}
