"use client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import { FiUpload, FiFile, FiInfo, FiCheck } from "react-icons/fi";
import { Modal } from "./ui";
import { normalizeImport } from "@/lib/import";
import {
  duplicateKey,
  type ProspectInput,
  type Prospect,
} from "@/lib/prospects";
import { importProspects } from "@/app/actions";
export default function ImportDialog({
  onClose,
  onSaved,
  existing,
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
  existing: Prospect[];
}) {
  const [rows, setRows] = useState<ProspectInput[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  async function read(file?: File) {
    if (!file) return;
    setBusy(true);
    setErrors([]);
    setRows([]);
    setFilename(file.name);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Maximum file size is 5 MB.");
      let data: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith(".json")) {
        const parsed = JSON.parse(await file.text());
        if (
          !Array.isArray(parsed) ||
          parsed.some((x) => !x || typeof x !== "object" || Array.isArray(x))
        )
          throw new Error("JSON must be an array of prospect objects.");
        data = parsed;
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        const result = Papa.parse<Record<string, unknown>>(await file.text(), {
          header: true,
          skipEmptyLines: "greedy",
        });
        if (result.errors.length) throw new Error(result.errors[0].message);
        data = result.data;
      } else if (file.name.toLowerCase().endsWith(".xlsx")) {
        const ExcelJS = await import("exceljs");
        const book = new ExcelJS.Workbook();
        await book.xlsx.load(await file.arrayBuffer());
        const sheet = book.worksheets[0];
        if (!sheet) throw new Error("This workbook has no worksheets.");
        const headers: string[] = [];
        sheet.getRow(1).eachCell((cell, col) => (headers[col] = cell.text));
        data = [];
        sheet.eachRow((row, n) => {
          if (n === 1) return;
          const obj: Record<string, unknown> = {};
          headers.forEach((header, col) => {
            const cell = row.getCell(col);
            obj[header] = cell.value instanceof Date ? cell.value : cell.text;
          });
          data.push(obj);
        });
      } else throw new Error("Choose an Excel (.xlsx), CSV or JSON file.");
      if (data.length > 2000)
        throw new Error("Import up to 2,000 rows at a time.");
      const result = normalizeImport(data);
      const seen = new Set(existing.map(duplicateKey));
      let duplicates = 0;
      const fresh = result.valid.filter((p) => {
        const key = duplicateKey(p);
        if (seen.has(key)) {
          duplicates++;
          return false;
        }
        seen.add(key);
        return true;
      });
      setRows(fresh);
      setErrors(result.errors);
      setSkipped(duplicates);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Unable to read file."]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Import prospects"
      subtitle="Bring your existing host list into one workspace."
      onClose={onClose}
    >
      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void read(e.dataTransfer.files[0]);
        }}
      >
        <FiUpload />
        <h3>{filename || "Drop your file here"}</h3>
        <p>Excel (.xlsx), CSV or JSON · up to 5 MB</p>
        <input
          ref={input}
          hidden
          type="file"
          accept=".xlsx,.csv,.json"
          onChange={(e) => void read(e.target.files?.[0])}
        />
        <button
          className="primary"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <FiFile />
          {busy ? "Reading…" : "Choose file"}
        </button>
      </div>
      <p className="notice">
        <FiInfo />
        Review your data before importing. Existing names with the same location
        are skipped.
      </p>
      {filename && (
        <>
          <p>
            <strong>{rows.length}</strong> ready to import · {skipped}{" "}
            duplicates skipped · {errors.length} invalid rows
          </p>
          {errors.length > 0 && (
            <div className="error" role="alert">
              Correct the invalid rows and choose the file again.
              <ul>
                {errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {rows.length > 0 && (
            <div className="import-preview">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td>{p.location || "—"}</td>
                      <td>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <p className="small">Showing the first 10 rows.</p>
              )}
            </div>
          )}
        </>
      )}
      <footer className="form-footer">
        <button onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy || !rows.length || !!errors.length}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await importProspects(rows);
              if (r.error) setErrors([r.error]);
              else
                onSaved(
                  `Imported ${r.added} prospects. ${skipped + (r.skipped ?? 0)} duplicates skipped.`,
                );
            } catch {
              setErrors(["Import failed. Please try again."]);
            } finally {
              setBusy(false);
            }
          }}
        >
          <FiCheck />
          Import {rows.length || ""} prospects
        </button>
      </footer>
    </Modal>
  );
}
