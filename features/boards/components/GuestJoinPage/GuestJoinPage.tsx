"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface GuestJoinPageProps {
  boardId: string;
  token: string;
  boardName: string;
}

export function GuestJoinPage({
  boardId,
  token,
  boardName,
}: GuestJoinPageProps) {
  const router = useRouter();

  useEffect(() => {
    const grants = JSON.parse(localStorage.getItem("board_grants") || "{}");
    grants[boardId] = token;
    localStorage.setItem("board_grants", JSON.stringify(grants));
    router.replace(`/board/${boardId}`);
  }, []);

  return <div>Joining board...</div>;
}
