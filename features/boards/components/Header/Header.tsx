"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Layers } from "lucide-react";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 transition-colors">
          <Layers size={20} className="text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Inkspace
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Log in
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
              Get Started
            </button>
          </SignUpButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors mr-2"
          >
            My Boards
          </Link>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-9 w-9 border border-zinc-700",
              },
            }}
          />
        </Show>
      </div>
    </header>
  );
}
