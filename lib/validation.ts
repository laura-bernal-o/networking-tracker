import { z } from "zod";

export const PRIORITY_VALUES = ["high", "medium", "low"] as const;
export type PriorityValue = (typeof PRIORITY_VALUES)[number];

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),
  company: z.string().trim().optional().default(""),
  role: z.string().trim().optional().default(""),
  met_at: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  priority: z.enum(PRIORITY_VALUES),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ValidationResult =
  | { success: true; data: ContactInput }
  | { success: false; errors: Record<string, string> };

export function validateContact(input: unknown): ValidationResult {
  const result = contactSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (errors[key]) continue;

    if (key === "priority") {
      errors[key] = "Priority must be high, medium, or low";
    } else {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}
