"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

interface InvalidInvitePageProps {
  reason?: "private";
}

export function InvalidInvitePage({ reason }: InvalidInvitePageProps) {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-[#0a0a0a] text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-rose-500/10 p-4 text-rose-500">
          <ShieldX size={32} />
        </div>
        <h2 className="text-lg font-semibold">Invalid invite link</h2>
        <p className="text-sm text-zinc-500">
          {reason === "private"
            ? "This board is private and cannot be joined with this link."
            : "This link is invalid or the board no longer exists."}
        </p>
      </div>
      <button
        onClick={() => router.push("/")}
        className="rounded-xl bg-white/5 px-6 py-3 text-sm font-medium transition-colors hover:bg-white/10"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
