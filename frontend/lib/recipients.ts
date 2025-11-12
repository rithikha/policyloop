import { promises as fs } from "fs";
import path from "path";

export type Recipient = {
  name: string;
  type: "public" | "private";
  share: number;
  address: string;
};

const cache = new Map<string, Recipient[]>();

export async function loadRecipients(relativePath: string | undefined) {
  if (!relativePath) return [];
  if (cache.has(relativePath)) return cache.get(relativePath)!;

  const absolutePath = path.resolve(process.cwd(), "../", relativePath);
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cache.set(relativePath, parsed as Recipient[]);
      return parsed as Recipient[];
    }
  } catch (error) {
    console.warn(`[recipients] failed to read ${relativePath}`, error);
  }
  cache.set(relativePath, []);
  return [];
}
