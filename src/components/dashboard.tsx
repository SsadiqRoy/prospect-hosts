"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FiUsers,
  FiClock,
  FiCheck,
  FiStar,
  FiUpload,
  FiPlus,
  FiArchive,
  FiSearch,
  FiFilter,
  FiEye,
  FiMoreHorizontal,
  FiEdit2,
  FiTrash2,
  FiRotateCcw,
  FiChevronLeft,
  FiChevronRight,
  FiInfo,
  FiLogOut,
  FiSettings,
  FiUserPlus,
  FiArrowDown,
  FiArrowUp,
  FiLink,
  FiPhone,
  FiMail,
  FiMapPin,
  FiX,
} from "react-icons/fi";
import { statuses, types, certifications, areas, initials, statusClass, displayDate, today, safeUrl, type Prospect } from "@/lib/prospects";
import { changeProspect, logout } from "@/app/actions";
import { Modal, Field } from "./ui";
import ProspectForm from "./prospect-form";
import ImportDialog from "./import-dialog";
import { AccountDialog, UsersDialog, type Account } from "./account-dialog";
import { ContactLinks } from "./contact-links";
const defaultFilters = {
  status: "",
  location: "",
  type: "",
  area: "",
  certification: "",
  followup: "",
  phone: false,
  email: false,
  whatsapp: false,
};
function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + statusClass(status)}>
      <span className="dot" />
      {status}
    </span>
  );
}
export default function Dashboard({ prospects, account }: { prospects: Prospect[]; account: Account }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [draft, setDraft] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{
    key: "name" | "location" | "created_at";
    asc: boolean;
  }>({ key: "created_at", asc: false });
  const [dialog, setDialog] = useState("");
  const [selected, setSelected] = useState<Prospect>();
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [accountMenu, setAccountMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", key);
    menuRef.current?.querySelector<HTMLElement>("a,button,select")?.focus();
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", key);
    };
  }, [menu]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => setPage(1), [query, filters, archived]);
  const active = prospects.filter((p) => !p.archived);
  const locations = Array.from(new Set(prospects.map((p) => p.location).filter(Boolean))).sort();
  const date = today();
  const filtered = useMemo(
    () =>
      prospects
        .filter(
          (p) =>
            p.archived === archived &&
            (!query || [p.name, p.location, ...p.emails, ...p.phones].join(" ").toLowerCase().includes(query.toLowerCase())) &&
            (!filters.status || p.status === filters.status) &&
            (!filters.location || p.location === filters.location) &&
            (!filters.type || p.type === filters.type) &&
            (!filters.area || p.area_group === filters.area) &&
            (!filters.certification || p.certification === filters.certification) &&
            (!filters.phone || !!p.phones.length) &&
            (!filters.email || !!p.emails.length) &&
            (!filters.whatsapp || !!p.whatsapp) &&
            (!filters.followup ||
              (filters.followup === "none"
                ? !p.next_follow_up
                : filters.followup === "today"
                  ? p.next_follow_up === date
                  : filters.followup === "overdue"
                    ? !!p.next_follow_up && p.next_follow_up < date
                    : !!p.next_follow_up && p.next_follow_up >= date)),
        )
        .sort((a, b) => (sort.asc ? 1 : -1) * a[sort.key].localeCompare(b[sort.key])),
    [prospects, query, archived, filters, sort, date],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const chosen = prospects.find((p) => p.id === menu?.id);
  const filterCount = Object.values(filters).filter(Boolean).length;
  function open(name: string, p?: Prospect) {
    setSelected(p);
    setDialog(name);
    setMenu(null);
    setAccountMenu(false);
  }
  function saved(message = "Prospect saved.") {
    setDialog("");
    setToast(message);
    router.refresh();
  }
  async function mutate(p: Prospect, change: Parameters<typeof changeProspect>[1]) {
    setBusy(true);
    setError("");
    try {
      const result = await changeProspect(p.id, change);
      if (result.error) setError(result.error);
      else {
        saved(change === "remove" ? "Prospect removed." : "Prospect updated.");
        setMenu(null);
      }
    } catch {
      setError("Unable to update prospect. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  function openMenu(e: React.MouseEvent<HTMLButtonElement>, p: Prospect) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({
      id: p.id,
      x: Math.max(8, Math.min(r.right - 264, window.innerWidth - 280)),
      y: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - 540)),
    });
  }
  function order(key: "name" | "location") {
    setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  }
  const filterSelect = (
    key: "status" | "location" | "type" | "area" | "certification" | "followup",
    label: string,
    options: string[],
    modal = false,
  ) => {
    const value = modal ? draft : filters;
    const update = modal ? setDraft : setFilters;
    return (
      <select aria-label={label} value={value[key]} onChange={(e) => update((v) => ({ ...v, [key]: e.target.value }))}>
        <option value="">{label}</option>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    );
  };
  return (
    <>
      <header className="app-header">
        <a href="/" className="logo-wrap" aria-label="SupaSpace home">
          <img src="/theme=light.png" width="144" height="42" alt="SupaSpace" />
        </a>
        <span className="header-separator" />
        <span className="workspace-label">Host workspace</span>
        <div className="header-right">
          <span className="workspace-pill">
            <FiUsers />
            Private workspace
          </span>
          <div className="account-control">
            <button className="avatar" aria-label="Account menu" aria-expanded={accountMenu} onClick={() => setAccountMenu(!accountMenu)}>
              {initials(account.name)}
            </button>
            {accountMenu && (
              <div className="account-menu">
                <strong>{account.name}</strong>
                <small>{account.email}</small>
                <button onClick={() => open("account")}>
                  <FiSettings />
                  Your account
                </button>
                {account.role === "admin" && (
                  <button onClick={() => open("users")}>
                    <FiUserPlus />
                    Manage users
                  </button>
                )}
                <button onClick={() => void logout()}>
                  <FiLogOut />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="workspace">
        <section className="page-heading">
          <div>
            <h1>Host prospects</h1>
            <p>Turn your next conversation into a new SupaSpace host.</p>
          </div>
          <div className="heading-actions">
            <button onClick={() => open("import")}>
              <FiUpload />
              Import data
            </button>
            <button className="primary" onClick={() => open("add")}>
              <FiPlus />
              Add prospect
            </button>
          </div>
        </section>
        <section className="metrics" aria-label="Workspace overview">
          {[
            {
              label: "Total prospects",
              value: active.length,
              caption: "Your growing host network",
              Icon: FiUsers,
              tone: "purple",
            },
            {
              label: "Pending",
              value: active.filter((p) => p.status === "Pending").length,
              caption: "Conversations to follow up",
              Icon: FiClock,
              tone: "amber",
            },
            {
              label: "Joined",
              value: active.filter((p) => p.status === "Joined").length,
              caption: "Hosts now on SupaSpace",
              Icon: FiCheck,
              tone: "green",
            },
            {
              label: "Customers",
              value: active.filter((p) => p.status === "Customer").length,
              caption: "Active host relationships",
              Icon: FiStar,
              tone: "pink",
            },
          ].map(({ label, value, caption, Icon, tone }) => (
            <div className="metric" key={label}>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{caption}</small>
              </div>
              <div className={"metric-icon " + tone}>
                <Icon />
              </div>
            </div>
          ))}
        </section>
        {error && (
          <div className="error" role="alert">
            {error}
            <button className="icon-button" onClick={() => setError("")} aria-label="Dismiss error">
              <FiX />
            </button>
          </div>
        )}
        <section className="directory">
          <div className="directory-tabs">
            <button className={!archived ? "selected" : ""} onClick={() => setArchived(false)}>
              <FiUsers />
              Active prospects
            </button>
            <button className={archived ? "selected" : ""} onClick={() => setArchived(true)}>
              <FiArchive />
              Archived
            </button>
            <small>{archived ? "Archived prospects stay here until restored or removed." : "Your host network, in one place."}</small>
          </div>
          <div className="toolbar">
            <div className="search">
              <FiSearch />
              <input
                aria-label="Search prospects"
                placeholder="Search name, location, email or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="quick-filters">
              {filterSelect("status", "All statuses", [...statuses])}
              {filterSelect("location", "All locations", locations)}
              {filterSelect("type", "All types", [...types])}
            </div>
            <button
              onClick={() => {
                setDraft(filters);
                open("filters");
              }}
            >
              <FiFilter />
              More filters{filterCount ? ` (${filterCount})` : ""}
            </button>
            {filterCount > 0 && (
              <button className="icon-button" aria-label="Clear filters" onClick={() => setFilters(defaultFilters)}>
                <FiX />
              </button>
            )}
          </div>
          <div className="desktop-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <button onClick={() => order("name")}>Prospect {sort.key === "name" && sort.asc ? <FiArrowUp /> : <FiArrowDown />}</button>
                  </th>
                  <th>
                    <button onClick={() => order("location")}>
                      Location {sort.key === "location" && sort.asc ? <FiArrowUp /> : <FiArrowDown />}
                    </button>
                  </th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={p.next_follow_up && p.next_follow_up <= date ? "due-row" : ""}>
                    <td>
                      <div className="identity">
                        <span className="initials">{initials(p.name)}</span>
                        <div>
                          <button className="text-button name" onClick={() => open("details", p)}>
                            {p.name}
                          </button>
                          <small className={p.next_follow_up && p.next_follow_up <= date ? "due" : ""}>
                            {p.next_follow_up
                              ? `Follow up · ${p.next_follow_up === date ? "Today" : displayDate(p.next_follow_up)}`
                              : `Added · ${displayDate(p.created_at)}`}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.location || "No location added"}
                      <small>{p.area_group || "—"}</small>
                    </td>
                    <td>{p.type}</td>
                    <td>
                      {p.emails[0] || <span className="muted">No email added</span>}
                      <small>{p.phones[0] || "No phone added"}</small>
                    </td>
                    <td>
                      <Badge status={p.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-button" aria-label={`View ${p.name}`} onClick={() => open("details", p)}>
                          <FiEye />
                        </button>
                        <button className="icon-button" aria-label={`More actions for ${p.name}`} onClick={(e) => openMenu(e, p)}>
                          <FiMoreHorizontal />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mobile-cards">
            {visible.map((p) => (
              <article key={p.id}>
                <button className="text-button name" onClick={() => open("details", p)}>
                  {p.name}
                </button>
                <p>
                  {p.type} · {p.location || "No location"}
                </p>
                <div className="card-status">
                  <Badge status={p.status} />
                  <small className="due">
                    {p.next_follow_up ? `Follow up ${p.next_follow_up === date ? "today" : displayDate(p.next_follow_up)}` : "No follow-up scheduled"}
                  </small>
                </div>
                <div className="card-bottom">
                  <small>
                    <FiPhone />
                    {p.phones.length || p.emails.length ? "Contact available" : "No contact added"}
                  </small>
                  <button className="icon-button" aria-label={`View ${p.name}`} onClick={() => open("details", p)}>
                    <FiEye />
                  </button>
                  <button className="icon-button" aria-label={`More actions for ${p.name}`} onClick={(e) => openMenu(e, p)}>
                    <FiMoreHorizontal />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!visible.length && (
            <div className="empty-state">
              <FiUsers />
              <h3>{query || filterCount ? "No matching prospects" : archived ? "No archived prospects" : "Your next host starts here"}</h3>
              <p>
                {query || filterCount
                  ? "Try a different search or clear your filters."
                  : archived
                    ? "Archived prospects will appear here."
                    : "Add a prospect or import your existing host list."}
              </p>
              {!archived && !query && !filterCount && (
                <button className="primary" onClick={() => open("add")}>
                  <FiPlus />
                  Add prospect
                </button>
              )}
            </div>
          )}
          <footer className="pagination">
            <span>
              Showing {filtered.length ? (currentPage - 1) * 6 + 1 : 0}–{Math.min(currentPage * 6, filtered.length)} of {filtered.length} prospects
            </span>
            <div>
              <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <FiChevronLeft />
                Previous
              </button>
              <span className="page-number">{currentPage}</span>
              <span>of {pageCount}</span>
              <button disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                Next
                <FiChevronRight />
              </button>
            </div>
          </footer>
        </section>
        <footer className="workspace-footer">
          <span>
            <FiInfo />
            Only workspace members can access your prospects.
          </span>
          <span>Built for your next host.</span>
        </footer>
      </main>
      {menu && chosen && (
        <div className="action-menu" ref={menuRef} style={{ left: menu.x, top: menu.y }} aria-label={`Actions for ${chosen.name}`}>
          <small>{chosen.name.toUpperCase()}</small>
          <ContactLinks p={chosen} />
          <hr />
          <label className="status-select">
            Status
            <select value={chosen.status} disabled={busy} onChange={(e) => void mutate(chosen, { status: e.target.value })}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button onClick={() => open("edit", chosen)}>
            <FiEdit2 />
            Update
          </button>
          <button disabled={busy} onClick={() => void mutate(chosen, { archived: !chosen.archived })}>
            {chosen.archived ? <FiRotateCcw /> : <FiArchive />}
            {chosen.archived ? "Restore" : "Archive"}
          </button>
          <hr />
          <button className="danger-text" onClick={() => open("remove", chosen)}>
            <FiTrash2 />
            Remove
          </button>
        </div>
      )}
      {(dialog === "add" || dialog === "edit") && (
        <ProspectForm prospect={dialog === "edit" ? selected : undefined} onClose={() => setDialog("")} onSaved={() => saved()} />
      )}
      {dialog === "import" && <ImportDialog onClose={() => setDialog("")} onSaved={saved} existing={prospects} />}
      {dialog === "account" && <AccountDialog account={account} onClose={() => setDialog("")} onSaved={saved} />}
      {dialog === "users" && <UsersDialog onClose={() => setDialog("")} />}
      {dialog === "details" && selected && (
        <Modal title="Prospect details" onClose={() => setDialog("")} drawer>
          <h2 className="prospect-title">{selected.name}</h2>
          <div className="detail-meta">
            <Badge status={selected.status} />
            <span>
              {selected.type} · {selected.area_group || selected.location}
            </span>
          </div>
          <div className="contact-actions">
            <ContactLinks p={selected} />
          </div>
          <section className="detail-section">
            <h3>Contact & location</h3>
            {selected.phones.map((p) => (
              <p key={p}>
                <FiPhone />
                {p}
              </p>
            ))}
            {selected.emails.map((e) => (
              <p key={e}>
                <FiMail />
                {e}
              </p>
            ))}
            <p>
              <FiMapPin />
              {selected.location || "No location added"}
            </p>
          </section>
          <section className="detail-section">
            <h3>Follow-up</h3>
            <div className="form-grid">
              <div>
                <small>Last contacted</small>
                <p>{displayDate(selected.last_contacted)}</p>
              </div>
              <div>
                <small>Next follow-up</small>
                <p className="due">{displayDate(selected.next_follow_up)}</p>
              </div>
            </div>
            <div className="notes">
              <small>Notes</small>
              <p>{selected.notes || "No notes added."}</p>
            </div>
          </section>
          <section className="detail-section">
            <h3>Certification</h3>
            <p>{selected.certification}</p>
            {selected.certification === "Not verified" && <small>Certification has not been independently confirmed.</small>}
            <h3>Sources & evidence</h3>
            {selected.sources.length ? (
              selected.sources.map((s, i) => (
                <a className="source-link" key={i} href={safeUrl(s)} target="_blank" rel="noopener noreferrer">
                  <FiLink />
                  {s}
                </a>
              ))
            ) : (
              <p className="muted">No sources added.</p>
            )}
          </section>
          <footer className="form-footer">
            <button className="primary" onClick={() => open("edit", selected)}>
              <FiEdit2 />
              Update prospect
            </button>
            <button onClick={() => open("remove", selected)}>
              <FiTrash2 />
              Remove
            </button>
          </footer>
        </Modal>
      )}
      {dialog === "remove" && selected && (
        <Modal title="Remove this prospect?" subtitle={selected.name} onClose={() => setDialog("")}>
          <p>This permanently removes the prospect and their notes. This cannot be undone. Archive instead if you may need them later.</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <footer className="form-footer">
            <button disabled={busy} onClick={() => setDialog("")}>
              Cancel
            </button>
            <button disabled={busy} onClick={() => void mutate(selected, { archived: true })}>
              <FiArchive />
              Archive instead
            </button>
            <button className="danger" disabled={busy} onClick={() => void mutate(selected, "remove")}>
              <FiTrash2 />
              Remove
            </button>
          </footer>
        </Modal>
      )}
      {dialog === "filters" && (
        <Modal title="Filter prospects" subtitle="Focus on the hosts you want to reach next." onClose={() => setDialog("")}>
          <div className="form-grid">
            <Field label="Status">{filterSelect("status", "All statuses", [...statuses], true)}</Field>
            <Field label="Prospect type">{filterSelect("type", "All types", [...types], true)}</Field>
            <Field label="Location">{filterSelect("location", "All locations", locations, true)}</Field>
            <Field label="Area group">{filterSelect("area", "All area groups", [...areas], true)}</Field>
            <Field label="Certification">{filterSelect("certification", "Any certification", [...certifications], true)}</Field>
            <Field label="Next follow-up">
              <select value={draft.followup} onChange={(e) => setDraft({ ...draft, followup: e.target.value })}>
                <option value="">Any date</option>
                <option value="today">Today</option>
                <option value="overdue">Overdue</option>
                <option value="upcoming">Today and upcoming</option>
                <option value="none">Not scheduled</option>
              </select>
            </Field>
          </div>
          <h3>Contact available</h3>
          <div className="contact-filters">
            {(["phone", "email", "whatsapp"] as const).map((key) => (
              <label key={key}>
                <input type="checkbox" checked={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
                {key === "whatsapp" ? "WhatsApp" : key === "phone" ? "Phone" : "Email"}
              </label>
            ))}
          </div>
          <footer className="form-footer">
            <button onClick={() => setDraft(defaultFilters)}>
              <FiRotateCcw />
              Reset filters
            </button>
            <button
              className="primary"
              onClick={() => {
                setFilters(draft);
                setDialog("");
              }}
            >
              <FiFilter />
              Apply filters
            </button>
          </footer>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <FiCheck />
          {toast}
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast("")}>
            <FiX />
          </button>
        </div>
      )}
    </>
  );
}
