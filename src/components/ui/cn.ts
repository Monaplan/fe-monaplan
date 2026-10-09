import { twMerge } from "tailwind-merge";

// Gabung kelas Tailwind; kelas yang datang belakangan menang bila bertabrakan (misal w-full vs w-auto)
export function cn(...classes: (string | false | null | undefined)[]) {
  return twMerge(classes.filter(Boolean).join(" "));
}
