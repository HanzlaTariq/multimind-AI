"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

const baseInputClass =
  "w-full rounded-lg border border-line bg-surface2 px-3 py-2 text-sm text-paper outline-none focus:border-signal/50";

function ConnectionField({ field, value, onChange }) {
  const [connections, setConnections] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/connections?platform=${field.platform}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setConnections(data.connections || []);
      })
      .catch(() => {
        if (!cancelled) setConnections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [field.platform]);

  if (connections === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-mist">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading accounts…
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <p className="text-xs text-mist/70">
        No {field.platform} account connected yet.{" "}
        <Link href="/dashboard/settings" className="text-signal hover:opacity-80">
          Connect one in Settings
        </Link>
        .
      </p>
    );
  }

  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseInputClass}>
      <option value="">Select an account…</option>
      {connections.map((c) => (
        <option key={c._id} value={c._id}>
          {c.accountName || c.accountId}
        </option>
      ))}
    </select>
  );
}

export default function ConfigField({ field, value, onChange }) {
  if (field.type === "connection") {
    return <ConnectionField field={field} value={value} onChange={onChange} />;
  }

  if (field.type === "select") {
    return (
      <select value={value ?? field.default ?? ""} onChange={(e) => onChange(e.target.value)} className={baseInputClass}>
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder={field.placeholder}
        className={`${baseInputClass} resize-none`}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value ?? field.default ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className={baseInputClass}
      />
    );
  }

  if (field.type === "time") {
    return (
      <input
        type="time"
        value={value ?? field.default ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={baseInputClass}
      />
    );
  }

  // "text" and any unrecognized type fall back to a plain input.
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={baseInputClass}
    />
  );
}
