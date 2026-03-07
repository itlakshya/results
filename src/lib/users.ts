import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";

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
const DATABASE_URL = process.env.DATABASE_URL;
const USE_POSTGRES = Boolean(DATABASE_URL && /^postgres(ql)?:\/\//i.test(DATABASE_URL));

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

async function ensurePostgresTable(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "result_user" (
        "id" SERIAL PRIMARY KEY,
        "Rollnumber" VARCHAR(300) NOT NULL,
        "DOB" VARCHAR(300) NOT NULL,
        "Name" VARCHAR(300) NOT NULL DEFAULT '',
        "EFFP_UEM" VARCHAR(300) NOT NULL DEFAULT '',
        "EFFP_IAM" VARCHAR(300) NOT NULL DEFAULT '',
        "EFFP_TM" VARCHAR(300) NOT NULL DEFAULT '',
        "EFFP_G" VARCHAR(300) NOT NULL DEFAULT '',
        "AIB_UEM" VARCHAR(300) NOT NULL DEFAULT '',
        "AIB_IAM" VARCHAR(300) NOT NULL DEFAULT '',
        "AIB_TM" VARCHAR(300) NOT NULL DEFAULT '',
        "AIB_G" VARCHAR(300) NOT NULL DEFAULT '',
        "FA_UEM" VARCHAR(300) NOT NULL DEFAULT '',
        "FA_IAM" VARCHAR(300) NOT NULL DEFAULT '',
        "FA_TM" VARCHAR(300) NOT NULL DEFAULT '',
        "FA_G" VARCHAR(300) NOT NULL DEFAULT '',
        "AGO_UEM" VARCHAR(300) NOT NULL DEFAULT '',
        "AGO_IAM" VARCHAR(300) NOT NULL DEFAULT '',
        "AGO_TM" VARCHAR(300) NOT NULL DEFAULT '',
        "AGO_G" VARCHAR(300) NOT NULL DEFAULT '',
        "SGO_UEM" VARCHAR(300) NOT NULL DEFAULT '',
        "SGO_IAM" VARCHAR(300) NOT NULL DEFAULT '',
        "SGO_TM" VARCHAR(300) NOT NULL DEFAULT '',
        "SGO_G" VARCHAR(300) NOT NULL DEFAULT '',
        "TTM" VARCHAR(300) NOT NULL DEFAULT '',
        "TIM" VARCHAR(300) NOT NULL DEFAULT '',
        "TCM" VARCHAR(300) NOT NULL DEFAULT '',
        "GT" VARCHAR(300) NOT NULL DEFAULT '',
        "P" VARCHAR(300) NOT NULL DEFAULT '',
        "R" VARCHAR(300) NOT NULL DEFAULT '',
        "NOSF" VARCHAR(300),
        "S" VARCHAR(300)
      );
    `);
  } finally {
    client.release();
  }
}

function toPostgresParams(user: UserRecord): Array<string | null> {
  return [
    user.Rollnumber,
    user.DOB,
    user.Name,
    user.EFFP_UEM,
    user.EFFP_IAM,
    user.EFFP_TM,
    user.EFFP_G,
    user.AIB_UEM,
    user.AIB_IAM,
    user.AIB_TM,
    user.AIB_G,
    user.FA_UEM,
    user.FA_IAM,
    user.FA_TM,
    user.FA_G,
    user.AGO_UEM,
    user.AGO_IAM,
    user.AGO_TM,
    user.AGO_G,
    user.SGO_UEM,
    user.SGO_IAM,
    user.SGO_TM,
    user.SGO_G,
    user.TTM,
    user.TIM,
    user.TCM,
    user.GT,
    user.P,
    user.R,
    user.NOSF,
    user.S,
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
        AND UPPER(TRIM("DOB")) = UPPER(TRIM($2))
      LIMIT 1
      `,
      [rollnumber, dob],
    );

    if (res.rows.length === 0) {
      return null;
    }

    return sanitizeRecord(res.rows[0], 1);
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
          "Rollnumber","DOB","Name","EFFP_UEM","EFFP_IAM","EFFP_TM","EFFP_G",
          "AIB_UEM","AIB_IAM","AIB_TM","AIB_G",
          "FA_UEM","FA_IAM","FA_TM","FA_G",
          "AGO_UEM","AGO_IAM","AGO_TM","AGO_G",
          "SGO_UEM","SGO_IAM","SGO_TM","SGO_G",
          "TTM","TIM","TCM","GT","P","R","NOSF","S"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,
          $12,$13,$14,$15,
          $16,$17,$18,$19,
          $20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,$30,$31
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
  return ["id", ...USER_FIELD_KEYS];
}
