import {
  prospectSchema,
  platforms,
  statuses,
  types,
  certifications,
  type ProspectInput,
} from "./prospects";
const split = (value: unknown) =>
  String(value ?? "")
    .split(/[\n;,]+/)
    .map((v) => v.trim())
    .filter((v) => v && v !== "-" && v !== "—");
export function normalizeImport(rows: Record<string, unknown>[]) {
  const valid: ProspectInput[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, ""),
        v,
      ]),
    );
    const get = (...keys: string[]) =>
      keys.map((k) => r[k]).find((v) => v !== undefined && v !== null) ?? "";
    const scalar = (...keys: string[]) => String(get(...keys)).trim();
    const enumValue = <T extends string>(
      values: readonly T[],
      value: string,
      fallback: T,
    ): T =>
      values.find((v) => v.toLowerCase() === value.toLowerCase()) ?? fallback;
    const rawSocials = get(
      "socials",
      "socialmediausername",
      "socialmediausernames",
      "socialmedia",
    );
    const socials = Array.isArray(rawSocials)
      ? rawSocials
      : split(rawSocials).flatMap((s) => {
          const [platform, ...value] = s.split(":");
          const aliases: Record<string, string> = {
            inst: "Instagram",
            ig: "Instagram",
            fb: "Facebook",
            twitter: "X",
            tiktok: "TikTok",
            linkedin: "LinkedIn",
            youtube: "YouTube",
          };
          const normalized =
            aliases[platform.trim().toLowerCase()] ?? platform.trim();
          return value.length
            ? [
                {
                  platform: enumValue(platforms, normalized, "Other"),
                  value: value.join(":").trim(),
                },
              ]
            : [];
        });
    const list = (...keys: string[]) => {
      const v = get(...keys);
      return Array.isArray(v) ? v.map(String) : split(v);
    };
    const date = (...keys: string[]) => {
      const v = get(...keys);
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      const s = String(v).trim();
      return s === "-" || s === "—" ? "" : s;
    };
    const name = scalar("name", "businessname", "prospectname");
    if (!name) {
      errors.push(`Row ${i + 2}: name is required.`);
      return;
    }
    const candidate = {
      name,
      location: scalar("location", "address"),
      type: enumValue(types, scalar("type"), "Other"),
      area_group: scalar("areagroup", "area"),
      emails: list("emails", "email"),
      phones: list("phones", "phone"),
      whatsapp: scalar("whatsapp"),
      website: scalar("website"),
      socials,
      certification: enumValue(
        certifications,
        scalar("certification", "legality"),
        "Not verified",
      ),
      status: enumValue(statuses, scalar("status"), "Not contacted"),
      last_contacted: date("lastcontacted"),
      next_follow_up: date("nextfollowup"),
      notes: scalar("notes", "evidencefollowupnotes", "evidence"),
      sources: list("sources", "sourceurls", "sourceurl"),
      archived: false,
    };
    const parsed = prospectSchema.safeParse(candidate);
    if (parsed.success) valid.push(parsed.data);
    else
      errors.push(
        `Row ${i + 2} (${name}): ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
      );
  });
  return { valid, errors };
}
