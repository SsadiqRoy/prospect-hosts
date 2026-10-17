import { z } from "zod";
export const statuses = [
  "Not contacted",
  "Reached",
  "Pending",
  "Joined",
  "Rejected",
  "Customer",
] as const;
export const types = [
  "Individual",
  "Agent",
  "Agency",
  "Company",
  "Landlord",
  "Guesthouse",
  "B&B",
  "Other",
] as const;
export const certifications = [
  "Not verified",
  "Verified",
  "Not applicable",
] as const;
export const areas = ["Kasoa", "Nearby", "Wider Accra", "Other"] as const;
export const platforms = [
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "X",
  "YouTube",
  "Other",
] as const;
const text = z.string().trim().max(2000).default("");
const date = z.union([z.literal(""), z.string().date()]).default("");
export function safeUrl(value: string) {
  if (!value.trim()) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : "https://" + value);
    return ["https:", "http:"].includes(u.protocol) && u.hostname.includes(".")
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function socialUrl(platform: string, value: string) {
  if (/^https?:\/\//i.test(value)) return safeUrl(value);
  const bases: Record<string, string> = {
    Instagram: "https://instagram.com/",
    Facebook: "https://facebook.com/",
    TikTok: "https://tiktok.com/@",
    LinkedIn: "https://linkedin.com/in/",
    X: "https://x.com/",
    YouTube: "https://youtube.com/@",
  };
  return bases[platform] && /^[\w.\-]+$/.test(value.replace(/^@/, ""))
    ? bases[platform] + encodeURIComponent(value.replace(/^@/, ""))
    : safeUrl(value);
}
export function phoneDigits(value: string) {
  const n = value.replace(/\D/g, "");
  return n.startsWith("0") && n.length === 10 ? "233" + n.slice(1) : n;
}
export const prospectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.enum(types).default("Individual"),
  location: text,
  area_group: text,
  emails: z.array(z.email()).max(20).default([]),
  phones: z.array(z.string().trim().min(3).max(40)).max(20).default([]),
  whatsapp: text,
  website: z
    .string()
    .default("")
    .refine((v) => !v || !!safeUrl(v), "Enter a valid website URL"),
  socials: z
    .array(
      z.object({
        platform: z.enum(platforms),
        value: z.string().trim().min(1).max(2000),
      }),
    )
    .max(20)
    .default([]),
  certification: z.enum(certifications).default("Not verified"),
  status: z.enum(statuses).default("Not contacted"),
  last_contacted: date,
  next_follow_up: date,
  notes: z.string().max(10000).default(""),
  sources: z
    .array(z.string().refine((v) => !!safeUrl(v), "Invalid source URL"))
    .max(30)
    .default([]),
  archived: z.boolean().default(false),
});
export type ProspectInput = z.infer<typeof prospectSchema>;
export type Prospect = ProspectInput & {
  id: string;
  created_at: string;
  updated_at: string;
};
export const emptyProspect: ProspectInput = prospectSchema.parse({
  name: "New prospect",
});
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
export function statusClass(status: string) {
  return status.toLowerCase().replaceAll(" ", "-");
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(
    new Date(),
  );
}
export function displayDate(date: string) {
  return date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Accra",
      }).format(new Date(date))
    : "Not set";
}
export function duplicateKey(p: Pick<ProspectInput, "name" | "location">) {
  return `${p.name.trim().toLowerCase()}|${p.location.trim().toLowerCase()}`;
}
