"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, MessageSquare } from "lucide-react";

export default function SearchModal({ open, onClose, onOpenConversation }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setItems([]);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    const t = setTimeout(() => {
      fetch(`/api/conversations/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setItems(data.items || []);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    function handleKeydown(e) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-ink shadow-2xl">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-mist" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your chats…"
            className="w-full bg-transparent text-sm text-paper placeholder:text-mist/60 focus:outline-none"
          />
          <button onClick={onClose} className="shrink-0 text-mist hover:text-paper">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-mist" />
            </div>
          )}
          {error && <p className="px-4 py-4 text-sm text-red-400">{error}</p>}
          {!loading && !error && query.trim() && items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-mist">No matching chats found.</p>
          )}
          {!query.trim() && (
            <p className="px-4 py-6 text-center text-xs text-mist/60">
              Type to search across all your conversations.
            </p>
          )}
          {items.map((item) => (
            <button
              key={item._id}
              onClick={() => {
                onOpenConversation(item._id);
                onClose();
              }}
              className="flex w-full items-start gap-2.5 border-b border-line/60 px-4 py-3 text-left transition last:border-0 hover:bg-surface"
            >
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-paper">{item.title}</p>
                {item.snippet && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-mist">{item.snippet}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}