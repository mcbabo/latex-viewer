import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Extracts the filename from a path (handles both / and \ separators). */
export function getFilename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Converts an unknown thrown value to a descriptive string. */
export function formatError(err: unknown, fallback = "An error occurred"): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  return fallback;
}
