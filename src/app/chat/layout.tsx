"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { UserMenu } from "@/components/site/UserMenu";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatProvider } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { user, loading, openAuthModal } = useAuth();
  const pathname = usePathname();

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen>
        <ConversationSidebar />
        <SidebarInset className="h-dvh min-h-dvh max-h-dvh flex flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-2 sm:px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
              <SidebarTrigger className="size-8" />
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Conversations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link href={localizeHref("/collections", pathname)}>
                    Collections
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={localizeHref("/explore", pathname)}>Explore</Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={localizeHref("/offers", pathname)}>Offres</Link>
                </Button>
              </div>
              {user ? (
                <UserMenu variant="light" />
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  disabled={loading}
                  onClick={() => openAuthModal({ mode: "login" })}
                >
                  Login
                </Button>
              )}
            </div>
          </header>
          <div className="min-h-0 flex-1">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ChatProvider>
  );
}
