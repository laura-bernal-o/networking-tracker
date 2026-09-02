"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Contact, Priority } from "@/lib/neon";
import type { ContactInput } from "@/lib/validation";

export type ContactFormValues = {
  name: string;
  company: string;
  role: string;
  met_at: string;
  notes: string;
  priority: Priority;
};

const EMPTY_FORM: ContactFormValues = {
  name: "",
  company: "",
  role: "",
  met_at: "",
  notes: "",
  priority: "medium",
};

type ContactFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSubmit: (values: ContactInput) => Promise<{ success: boolean; errors?: Record<string, string> }>;
};

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
}: ContactFormDialogProps) {
  const [values, setValues] = useState<ContactFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(contact);

  useEffect(() => {
    if (!open) return;
    // Reset the form to match whichever contact (or blank) is being edited
    // each time the dialog opens — this syncs local form state with the
    // `contact` prop, not something derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrors({});
    setValues(
      contact
        ? {
            name: contact.name,
            company: contact.company,
            role: contact.role,
            met_at: contact.met_at,
            notes: contact.notes,
            priority: contact.priority,
          }
        : EMPTY_FORM
    );
  }, [open, contact]);

  function updateField<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(values);
      if (!result.success) {
        setErrors(result.errors ?? { form: "Something went wrong. Please try again." });
        return;
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit contact" : "Add contact"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the details for this contact."
                : "Add someone you want to stay connected with."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={values.name}
                onChange={(event) => updateField("name", event.target.value)}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-company">Company</Label>
                <Input
                  id="contact-company"
                  value={values.company}
                  onChange={(event) => updateField("company", event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-role">Role</Label>
                <Input
                  id="contact-role"
                  value={values.role}
                  onChange={(event) => updateField("role", event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-met-at">Where you met</Label>
              <Input
                id="contact-met-at"
                value={values.met_at}
                onChange={(event) => updateField("met_at", event.target.value)}
                placeholder="e.g. Cal Hacks, career fair, CS 61B"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-priority">Priority</Label>
              <Select
                value={values.priority}
                onValueChange={(value) => updateField("priority", value as Priority)}
              >
                <SelectTrigger id="contact-priority" aria-invalid={Boolean(errors.priority)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.priority}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={values.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
              />
            </div>

            {errors.form && (
              <p role="alert" className="text-sm text-destructive">
                {errors.form}
              </p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : isEditing ? "Save changes" : "Add contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
