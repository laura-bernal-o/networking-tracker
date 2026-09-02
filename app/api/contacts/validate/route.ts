import { NextResponse } from "next/server";
import { validateContact } from "@/lib/validation";

// Backend validation for contact create/edit forms.
//
// The frontend calls the Neon Data API directly for the actual database
// write (so Postgres RLS applies), but every create/edit first round-trips
// through this route handler so that "required fields and priority values"
// are validated in trusted server code, not just in the browser — a request
// crafted to skip the UI still gets rejected here with a clear, field-level
// error message. The `priority` CHECK constraint and NOT NULL `name` check
// in db/schema.sql are the second, unbypassable layer of defense at the
// database level.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, errors: { form: "Request body must be a JSON object" } },
      { status: 400 }
    );
  }

  const result = validateContact(body);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result, { status: 200 });
}
