"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { data, isPending } = neon.auth.useSession();

  useEffect(() => {
    if (!isPending && data?.user) {
      router.replace("/contacts");
    }
  }, [isPending, data, router]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
        Stay connected with the people you meet at Berkeley
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        A private, secure place to track contacts, companies, roles, and where
        you met &mdash; so no connection slips through the cracks.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
