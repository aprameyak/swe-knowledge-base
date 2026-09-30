"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Textarea } from "@/components/ui";

export function MemoryActions({
  memoryId,
  content,
}: {
  memoryId: string;
  content: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save() {
    setBusy(true);
    try {
      await fetch(`/api/memories/${memoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this memory permanently?")) return;
    setBusy(true);
    try {
      await fetch(`/api/memories/${memoryId}`, { method: "DELETE" });
      router.push("/app");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => void save()} disabled={busy}>
            Save & re-analyze
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue(content);
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-2 border-t border-[var(--line)] pt-4">
      <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="danger"
        disabled={busy}
        onClick={() => void remove()}
      >
        Delete
      </Button>
    </div>
  );
}
