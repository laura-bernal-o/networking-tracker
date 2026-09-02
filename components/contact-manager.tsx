"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { neon, type Contact, type Priority } from "@/lib/neon";
import type { ContactInput } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PriorityBadge } from "@/components/priority-badge";
import { ContactFormDialog } from "@/components/contact-form-dialog";

type SortField = "name" | "company" | "priority" | "created_at";
type SortDirection = "asc" | "desc";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

async function validateOnBackend(input: unknown) {
  const response = await fetch("/api/contacts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await response.json()) as
    | { success: true; data: ContactInput }
    | { success: false; errors: Record<string, string> };
}

export function ContactManager() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);

  async function loadContacts() {
    setLoadError(null);
    const { data, error } = await neon.from("contacts").select("*");

    if (error) {
      setLoadError(error.message || "Couldn't load your contacts. Please try again.");
      return;
    }

    setContacts(data ?? []);
  }

  useEffect(() => {
    // Fetch is the "external system" here (the Neon Data API) — this is the
    // standard data-on-mount effect, not derivable state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadContacts();
  }, []);

  const visibleContacts = useMemo(() => {
    if (!contacts) return [];

    const filtered = contacts.filter((contact) => {
      if (priorityFilter !== "all" && contact.priority !== priorityFilter) {
        return false;
      }
      if (!query.trim()) return true;
      const haystack = `${contact.name} ${contact.company} ${contact.role} ${contact.notes}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === "priority") {
        comparison = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      } else if (sortField === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        comparison = a[sortField].localeCompare(b[sortField]);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [contacts, priorityFilter, query, sortField, sortDirection]);

  function openCreateDialog() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEditDialog(contact: Contact) {
    setEditingContact(contact);
    setDialogOpen(true);
  }

  async function handleFormSubmit(values: ContactInput) {
    const validation = await validateOnBackend(values);
    if (!validation.success) {
      return { success: false as const, errors: validation.errors };
    }

    const payload = validation.data;

    if (editingContact) {
      const { data, error } = await neon
        .from("contacts")
        .update(payload)
        .eq("id", editingContact.id)
        .select()
        .single();

      if (error) {
        return { success: false as const, errors: { form: error.message } };
      }

      setContacts((prev) =>
        (prev ?? []).map((contact) => (contact.id === editingContact.id ? data : contact))
      );
      toast.success("Contact updated");
      return { success: true as const };
    }

    const { data, error } = await neon.from("contacts").insert(payload).select().single();

    if (error) {
      return { success: false as const, errors: { form: error.message } };
    }

    setContacts((prev) => [data, ...(prev ?? [])]);
    toast.success("Contact added");
    return { success: true as const };
  }

  async function handleConfirmDelete() {
    if (!deletingContact) return;
    const { error } = await neon.from("contacts").delete().eq("id", deletingContact.id);

    if (error) {
      toast.error(error.message || "Couldn't delete this contact.");
      return;
    }

    setContacts((prev) => (prev ?? []).filter((contact) => contact.id !== deletingContact.id));
    toast.success("Contact deleted");
    setDeletingContact(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts ? `${contacts.length} total` : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus /> Add contact
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, role, or notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as Priority | "all")}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={`${sortField}:${sortDirection}`}
          onValueChange={(value) => {
            const [field, direction] = value.split(":") as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(direction);
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Newest first</SelectItem>
            <SelectItem value="created_at:asc">Oldest first</SelectItem>
            <SelectItem value="name:asc">Name (A–Z)</SelectItem>
            <SelectItem value="name:desc">Name (Z–A)</SelectItem>
            <SelectItem value="company:asc">Company (A–Z)</SelectItem>
            <SelectItem value="priority:asc">Priority (high first)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadError && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadContacts}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!contacts && !loadError && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {contacts && contacts.length === 0 && !loadError && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first contact to start keeping track of the people you
              want to stay connected with.
            </p>
            <Button onClick={openCreateDialog} className="mt-2">
              <Plus /> Add your first contact
            </Button>
          </CardContent>
        </Card>
      )}

      {contacts && contacts.length > 0 && visibleContacts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No contacts match your search or filter.
          </CardContent>
        </Card>
      )}

      {visibleContacts.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Met at</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.company || "—"}</TableCell>
                    <TableCell>{contact.role || "—"}</TableCell>
                    <TableCell>{contact.met_at || "—"}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={contact.priority} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(contact)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeletingContact(contact)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {visibleContacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[contact.role, contact.company].filter(Boolean).join(" @ ") || "—"}
                      </p>
                    </div>
                    <PriorityBadge priority={contact.priority} />
                  </div>
                  {contact.met_at && (
                    <p className="text-sm text-muted-foreground">Met at {contact.met_at}</p>
                  )}
                  {contact.notes && <p className="text-sm">{contact.notes}</p>}
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive"
                      onClick={() => setDeletingContact(contact)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={Boolean(deletingContact)} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingContact?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. This contact will be permanently removed
              from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
