"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useChatContext } from "@/contexts/ChatContext";
import {
  useArchiveConversation,
  useConversations,
} from "@/hooks/use-conversations";

export function ConversationSidebar() {
  const { data: conversations = [], isLoading } = useConversations();
  const archiveConversation = useArchiveConversation();
  const { conversationId, startNewConversation } = useChatContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleNewConversation = () => {
    startNewConversation();
    router.push("/chat");
  };

  const handleArchive = async (
    e: React.MouseEvent,
    targetConversationId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await archiveConversation.mutateAsync(targetConversationId);

    const activeConversationId = pathname.startsWith("/chat/")
      ? pathname.split("/")[2] || null
      : conversationId;

    if (targetConversationId === activeConversationId) {
      startNewConversation();
      router.push("/chat");
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4 gap-3">
        <Link
          href="/"
          aria-label="Go to home page"
          className="inline-flex w-fit rounded-md px-1 py-1 hover:bg-muted"
        >
          <Image
            src="/logo.png"
            alt="Okeyo Travel"
            width={112}
            height={40}
            className="h-auto w-24"
            priority
          />
        </Link>
        <SidebarMenuButton
          className="w-full justify-start gap-2"
          onClick={handleNewConversation}
          size="lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nouvelle conversation</span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Chargement...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Aucune conversation
                </div>
              ) : (
                conversations.map((conv: any) => {
                  const isActive =
                    pathname === `/chat/${conv.id}` ||
                    conversationId === conv.id;
                  const title = conv.title || "Nouvelle conversation";
                  const preview = conv.first_message || "";
                  const timeAgo = formatDistanceToNow(
                    new Date(conv.updated_at),
                    {
                      addSuffix: true,
                      locale: fr,
                    },
                  );

                  return (
                    <SidebarMenuItem key={conv.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="h-auto py-3"
                      >
                        <Link href={`/chat/${conv.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 pr-5">
                              <p className="text-sm font-medium truncate">
                                {title}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {preview}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {timeAgo}
                            </p>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuAction
                        showOnHover
                        onClick={(e) => handleArchive(e, conv.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </SidebarMenuAction>
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
