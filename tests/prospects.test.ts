import test from "node:test";
import assert from "node:assert/strict";
import {
  prospectSchema,
  safeUrl,
  socialUrl,
  phoneDigits,
  duplicateKey,
} from "../src/lib/prospects";
import { normalizeImport } from "../src/lib/import";
test("rejects unsafe outbound URLs and invalid contact data", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,abc"), "");
  assert.equal(safeUrl("example.com"), "https://example.com/");
  assert.equal(
    prospectSchema.safeParse({ name: "A", emails: ["invalid"] }).success,
    false,
  );
  assert.equal(prospectSchema.safeParse({ name: " " }).success, false);
  assert.equal(
    prospectSchema.safeParse({ name: "A", next_follow_up: "2026-02-30" })
      .success,
    false,
  );
});
test("builds social links and Ghana WhatsApp numbers", () => {
  assert.equal(
    socialUrl("Instagram", "@host_gh"),
    "https://instagram.com/host_gh",
  );
  assert.equal(socialUrl("TikTok", "hostgh"), "https://tiktok.com/@hostgh");
  assert.equal(phoneDigits("024 123 4567"), "233241234567");
});
test("imports spreadsheet aliases, multiple contacts and dash status", () => {
  const { valid, errors } = normalizeImport([
    {
      name: "Host A",
      location: "Accra",
      emails: "a@example.com; b@example.com",
      phone: "024 123 4567",
      status: "-",
      legality: "Not verified",
      "Social media username": "Inst: host_gh\nTiktok: @hostgh",
    },
  ]);
  assert.equal(errors.length, 0);
  assert.equal(valid[0].status, "Not contacted");
  assert.equal(valid[0].emails.length, 2);
  assert.deepEqual(valid[0].socials, [
    { platform: "Instagram", value: "host_gh" },
    { platform: "TikTok", value: "@hostgh" },
  ]);
});
test("rejects malformed rows while preserving reviewable valid rows", () => {
  const { valid, errors } = normalizeImport([
    { name: "Valid", email: "host@example.com" },
    { name: "Broken", email: "bad" },
    {},
  ]);
  assert.equal(valid.length, 1);
  assert.equal(errors.length, 2);
});
test("duplicate keys normalize name and location without conflating areas", () => {
  assert.equal(
    duplicateKey({ name: " Host A ", location: " ACCRA " }),
    duplicateKey({ name: "host a", location: "accra" }),
  );
  assert.notEqual(
    duplicateKey({ name: "Host A", location: "Accra" }),
    duplicateKey({ name: "Host A", location: "Kasoa" }),
  );
});
test("Excel import dependency can read a workbook with date and contact cells", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Prospects");
  sheet.addRow(["name", "email", "next_follow_up"]);
  sheet.addRow([
    "Host Excel",
    "host@example.com",
    new Date("2026-10-20T00:00:00Z"),
  ]);
  const bytes = await book.xlsx.writeBuffer();
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(bytes);
  const row = copy.worksheets[0].getRow(2);
  const { valid, errors } = normalizeImport([
    {
      name: row.getCell(1).text,
      email: row.getCell(2).text,
      next_follow_up: row.getCell(3).value,
    },
  ]);
  assert.equal(errors.length, 0);
  assert.equal(valid[0].next_follow_up, "2026-10-20");
});
