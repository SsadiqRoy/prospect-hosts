"use client";
import { useState, useEffect } from "react";
import { FiCheck, FiUserPlus } from "react-icons/fi";
import { Modal, Field } from "./ui";
import { updateAccount } from "@/app/actions";
export type Account = { name: string; email: string; role: string };
export function AccountDialog({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title="Your account"
      subtitle="Update your profile and sign-in details."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const r = await updateAccount({
              name: String(f.get("name")),
              email: String(f.get("email")),
              password: String(f.get("password")),
              currentPassword: String(f.get("currentPassword")),
            });
            if (r.error) setError(r.error);
            else onSaved(r.message!);
          } catch {
            setError("Unable to update account.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Name">
          <input
            name="name"
            defaultValue={account.name}
            required
            maxLength={100}
            autoComplete="name"
          />
        </Field>
        <Field label="Email">
          <input
            name="email"
            type="email"
            defaultValue={account.email}
            required
            autoComplete="email"
          />
        </Field>
        <Field label="New password (leave blank to keep current)">
          <input
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Current password">
          <input
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            <FiCheck />
            {busy ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function UsersDialog({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<(Account & { user_id: string })[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    try {
      const r = await fetch("/api/users");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load users.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <Modal
      title="Workspace users"
      subtitle="Users share this prospect directory. Only admins can add accounts."
      onClose={onClose}
    >
      <div className="user-list">
        {users.map((u) => (
          <div key={u.user_id}>
            <div>
              <strong>{u.name}</strong>
              <small>{u.email}</small>
            </div>
            <span className="badge">{u.role}</span>
          </div>
        ))}
      </div>
      <h3>Add user</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const r = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(Object.fromEntries(f)),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error);
            setMessage(
              "Account created. Share the initial password with the user securely.",
            );
            form.reset();
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not add user.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          <Field label="Name">
            <input name="name" required maxLength={100} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required />
          </Field>
          <Field label="Initial password">
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Role">
            <select name="role">
              <option value="member">Member</option>
              <option value="admin">Administrator</option>
            </select>
          </Field>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <footer className="form-footer">
          <button className="primary" disabled={busy}>
            <FiUserPlus />
            {busy ? "Adding…" : "Add user"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
