"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Layers } from "lucide-react";
import ThemeToggle from "@/features/boards/components/theme/ThemeToggle";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white/70 px-6 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/50">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 transition-colors">
          <Layers size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          Inkspace
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle className="text-zinc-600 hover:bg-black/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white" />
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              Get Started
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/"
            className="mr-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            My Boards
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-9 w-9 border border-zinc-300 dark:border-zinc-700",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}