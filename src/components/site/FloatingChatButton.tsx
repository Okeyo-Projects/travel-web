"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { localizeHref, stripLocalePrefix } from "@/lib/routing/locale-path";

export function FloatingChatButton() {
  const pathname = usePathname();
  const normalizedPathname = stripLocalePrefix(pathname);
  const isChatPage =
    normalizedPathname === "/chat" || normalizedPathname.startsWith("/chat/");

  if (isChatPage) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 md:bottom-6 md:right-6">
      <Button
        asChild
        className="h-12 w-12 rounded-full p-0 shadow-lg shadow-black/20"
      >
        <Link
          href={localizeHref("/chat", pathname)}
          aria-label="Open AI assistant chat"
        >
          <Bot className="h-10 w-10" />
        </Link>
      </Button>
    </div>
  );
}
