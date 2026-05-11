import { join, isAbsolute } from "node:path";

const DEFAULT_DATABASE_URL = "./data/business-guardian.sqlite";

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}

export function getSqliteFilePath() {
  const databaseUrl = getDatabaseUrl();
  const filePath = databaseUrl.startsWith("file:")
    ? databaseUrl.replace(/^file:/, "")
    : databaseUrl;

  return isAbsolute(filePath) ? filePath : join(process.cwd(), filePath);
}
