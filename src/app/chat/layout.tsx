"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChatProvider } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/use-auth";

export default function ChatLayout({ children }: { children: ReactNode }) {
  const { user, loading, openAuthModal, signOut } = useAuth();

  return (
    <ChatProvider>
      <SidebarProvider defaultOpen>
        <ConversationSidebar />
        <SidebarInset className="h-[calc(100vh)] flex flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 md:px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SidebarTrigger />
              <MessageSquare className="h-4 w-4" />
              <span>Conversations</span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/collections">Collections</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/explore">Explore</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/offers">Offres</Link>
              </Button>
              {user ? (
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  Logout
                </Button>
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
