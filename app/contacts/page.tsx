"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { neon } from "@/lib/neon";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactManager } from "@/components/contact-manager";

export default function ContactsPage() {
  const router = useRouter();
  const { data, isPending } = neon.auth.useSession();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace("/sign-in");
    }
  }, [isPending, data, router]);

  if (isPending || !data?.user) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return <ContactManager />;
}
