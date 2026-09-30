"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Panel } from "@/components/ui";

export function ProjectCreateForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [kind, setKind] = useState("job");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add project context
      </Button>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          organization: organization.trim() || undefined,
          kind,
        }),
      });
      setName("");
      setOrganization("");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="p-4">
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <Input
          placeholder="Project or role name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          placeholder="Organization (optional)"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 text-sm"
        >
          <option value="job">Job</option>
          <option value="internship">Internship</option>
          <option value="research">Research</option>
          <option value="side_project">Side project</option>
          <option value="hackathon">Hackathon</option>
          <option value="organization">Organization</option>
          <option value="other">Other</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
