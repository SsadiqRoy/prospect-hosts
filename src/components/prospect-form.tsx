"use client";
import { useState } from "react";
import { FiUsers, FiCalendar, FiPlus, FiCheck, FiX, FiTrash2, FiInfo } from "react-icons/fi";
import { Modal, Field } from "./ui";
import { statuses, types, certifications, areas, platforms, emptyProspect, type Prospect, type ProspectInput } from "@/lib/prospects";
import { saveProspect } from "@/app/actions";

export default function ProspectForm({ prospect, onClose, onSaved }: { prospect?: Prospect; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<ProspectInput>(prospect ?? { ...emptyProspect, name: "" });
  const [tab, setTab] = useState("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function set<K extends keyof ProspectInput>(key: K, value: ProspectInput[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
  }
  const input = (
    key: "name" | "location" | "area_group" | "whatsapp" | "website" | "last_contacted" | "next_follow_up",
    label: string,
    type = "text",
  ) => (
    <Field label={label}>
      <input
        value={p[key]}
        onChange={(e) => set(key, e.target.value)}
        type={type}
        required={key === "name"}
        maxLength={key === "name" ? 200 : 2000}
        disabled={busy}
      />
    </Field>
  );

  return (
    <Modal
      title={prospect ? "Update prospect" : "Add prospect"}
      subtitle={prospect ? prospect.name : "Start with a name. Add the contact details you have."}
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const r = await saveProspect(
              {
                ...p,
                emails: p.emails.map((v) => v.trim()).filter(Boolean),
                phones: p.phones.map((v) => v.trim()).filter(Boolean),
                sources: p.sources.map((v) => v.trim()).filter(Boolean),
                socials: p.socials.filter((v) => v.value.trim()),
              },
              prospect?.id,
            );
            if (r.error) setError(r.error);
            else onSaved();
          } catch {
            setError("Unable to save. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-tabs">
          <button type="button" className={tab === "details" ? "selected" : ""} onClick={() => setTab("details")}>
            <FiUsers />
            Details & contacts
          </button>
          <button type="button" className={tab === "outreach" ? "selected" : ""} onClick={() => setTab("outreach")}>
            <FiCalendar />
            Outreach & evidence
          </button>
        </div>
        <div hidden={tab !== "details"}>
          <div className="form-grid">
            {input("name", "Name *")}
            <Field label="Type">
              <select value={p.type} onChange={(e) => set("type", e.target.value as ProspectInput["type"])}>
                {types.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            {input("location", "Location")}
            <Field label="Area group">
              <select value={p.area_group} onChange={(e) => set("area_group", e.target.value)}>
                <option value="">Select area group</option>
                {areas.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Email addresses (one per line)">
              <textarea value={p.emails.join("\n")} onChange={(e) => set("emails", e.target.value.split("\n"))} rows={2} />
            </Field>
            <Field label="Phone numbers (one per line)">
              <textarea value={p.phones.join("\n")} onChange={(e) => set("phones", e.target.value.split("\n"))} rows={2} />
            </Field>
            {input("whatsapp", "WhatsApp number")}
            {input("website", "Website")}
          </div>
          <h3>Social accounts</h3>
          <p className="muted small">Add a profile URL or username for each platform.</p>
          {p.socials.map((s, i) => (
            <div className="social-row" key={i}>
              <select
                aria-label={`Platform ${i + 1}`}
                value={s.platform}
                onChange={(e) =>
                  set(
                    "socials",
                    p.socials.map((v, j) =>
                      j === i
                        ? {
                            ...v,
                            platform: e.target.value as typeof s.platform,
                          }
                        : v,
                    ),
                  )
                }
              >
                {platforms.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <input
                aria-label={`Profile URL or username ${i + 1}`}
                value={s.value}
                onChange={(e) =>
                  set(
                    "socials",
                    p.socials.map((v, j) => (j === i ? { ...v, value: e.target.value } : v)),
                  )
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Remove social account"
                onClick={() =>
                  set(
                    "socials",
                    p.socials.filter((_, j) => j !== i),
                  )
                }
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => set("socials", [...p.socials, { platform: "Instagram", value: "" }])}>
            <FiPlus />
            Add social account
          </button>
          <div className="form-grid spaced">
            <Field label="Certification">
              <select value={p.certification} onChange={(e) => set("certification", e.target.value as ProspectInput["certification"])}>
                {certifications.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select value={p.status} onChange={(e) => set("status", e.target.value as ProspectInput["status"])}>
                {statuses.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div hidden={tab !== "outreach"}>
          <div className="form-grid">
            {input("last_contacted", "Last contacted", "date")}
            {input("next_follow_up", "Next follow-up", "date")}
          </div>
          <Field label="Evidence / follow-up notes">
            <textarea rows={5} value={p.notes} onChange={(e) => set("notes", e.target.value)} maxLength={10000} disabled={busy} />
          </Field>
          <Field label="Source URLs (one per line)">
            <textarea rows={3} value={p.sources.join("\n")} onChange={(e) => set("sources", e.target.value.split("\n"))} disabled={busy} />
          </Field>
          <p className="notice">
            <FiInfo />
            “Not verified” means certification is unconfirmed. It does not mean the business is operating illegally.
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="form-footer">
          <span className="muted small">* Required</span>
          <button type="button" onClick={onClose} disabled={busy}>
            <FiX />
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setP((v) => ({
                ...v,
                emails: v.emails.map((x) => x.trim()).filter(Boolean),
                phones: v.phones.map((x) => x.trim()).filter(Boolean),
                sources: v.sources.map((x) => x.trim()).filter(Boolean),
                socials: v.socials.filter((x) => x.value.trim()),
              }));
              if (!p.name.trim()) setTab("details");
            }}
          >
            <FiCheck />
            {busy ? "Saving…" : prospect ? "Save changes" : "Add prospect"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
