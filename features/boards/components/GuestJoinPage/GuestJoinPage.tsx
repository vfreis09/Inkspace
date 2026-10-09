"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface GuestJoinPageProps {
  boardId: string;
  token: string;
  boardName: string;
}

export function GuestJoinPage({ boardId, token }: GuestJoinPageProps) {
  const router = useRouter();

  useEffect(() => {
    const grants = JSON.parse(localStorage.getItem("board_grants") || "{}");
    grants[boardId] = token;
    localStorage.setItem("board_grants", JSON.stringify(grants));
    router.replace(`/board/${boardId}`);
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-[#0a0a0a] dark:text-zinc-400">
      Joining board...
    </div>
  );
}