"use client";

import { useEffect, useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTrash, IconCheck, IconX } from "@/components/icons";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export function ManageCategoriesDrawer({
  open,
  categories,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: {
  open: boolean;
  categories: Doc<"spendCategories">[];
  onCreate: (name: string) => Promise<void>;
  onRename: (id: Doc<"spendCategories">["_id"], name: string) => Promise<void>;
  onDelete: (id: Doc<"spendCategories">["_id"]) => Promise<void>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewName("");
    setBusy(false);
  }, [open]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreate(newName.trim());
      setNewName("");
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(o: boolean) {
    if (!o) onClose();
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Manage categories</DrawerTitle>
            <DrawerDescription>
              Rename or delete. Past entries keep their category name even after deletion.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-3">
            {categories.length === 0 ? (
              <p className="text-sm text-muted py-2">No categories yet.</p>
            ) : (
              <ul className="space-y-2">
                {categories.map((c) => (
                  <CategoryRow
                    key={c._id}
                    category={c}
                    onRename={onRename}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
              <IconPlus width={14} height={14} className="text-muted" strokeWidth={1.4} />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="New category"
                className="flex-1 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-foreground/30 outline-none py-2 text-base placeholder:text-muted focus-visible:!outline-none"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={busy || !newName.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" size="lg">
                Done
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function CategoryRow({
  category,
  onRename,
  onDelete,
}: {
  category: Doc<"spendCategories">;
  onRename: (id: Doc<"spendCategories">["_id"], name: string) => Promise<void>;
  onDelete: (id: Doc<"spendCategories">["_id"]) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setEditing(false);
      setName(category.name);
      return;
    }
    setBusy(true);
    try {
      await onRename(category._id, trimmed);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(category._id);
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className="size-3 rounded-full shrink-0"
        style={{ background: category.color }}
      />
      {editing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(category.name);
                setEditing(false);
              }
            }}
            autoFocus
            className="flex-1 bg-transparent border-b border-border px-1 py-1 text-base outline-none focus:border-foreground focus-visible:!outline-none"
          />
          <button
            type="button"
            onClick={saveName}
            disabled={busy}
            aria-label="Save"
            className="text-success p-1.5"
          >
            <IconCheck width={16} height={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => {
              setName(category.name);
              setEditing(false);
            }}
            disabled={busy}
            aria-label="Cancel rename"
            className="text-muted p-1.5"
          >
            <IconX width={14} height={14} strokeWidth={1.5} />
          </button>
        </>
      ) : confirmDelete ? (
        <>
          <span className="flex-1 text-sm text-destructive">
            Delete &ldquo;{category.name}&rdquo;?
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-xs text-destructive px-2 py-1"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            disabled={busy}
            className="text-xs text-muted px-2 py-1"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-base hover:opacity-80 transition-opacity"
          >
            {category.name}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${category.name}`}
            className="text-muted hover:text-destructive transition-colors p-1.5"
          >
            <IconTrash width={14} height={14} strokeWidth={1.4} />
          </button>
        </>
      )}
    </li>
  );
}
