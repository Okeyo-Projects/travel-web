"use client";

import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
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
import { localizeHref, stripLocalePrefix } from "@/lib/routing/locale-path";

export function ConversationSidebar() {
  const { data: conversations = [], isLoading } = useConversations();
  const archiveConversation = useArchiveConversation();
  const { conversationId, startNewConversation } = useChatContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleNewConversation = () => {
    startNewConversation();
    router.push(localizeHref("/chat", pathname));
  };

  const handleArchive = async (
    e: React.MouseEvent,
    targetConversationId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await archiveConversation.mutateAsync(targetConversationId);

    const normalizedPathname = stripLocalePrefix(pathname);
    const activeConversationId = normalizedPathname.startsWith("/chat/")
      ? normalizedPathname.split("/")[2] || null
      : conversationId;

    if (targetConversationId === activeConversationId) {
      startNewConversation();
      router.push(localizeHref("/chat", pathname));
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4 gap-3 pt-[calc(1rem+env(safe-area-inset-top))]">
        <Link
          href={localizeHref("/", pathname)}
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
          variant="outline"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Nouvelle conversation</span>
        </SidebarMenuButton>
      </SidebarHeader>

      <SidebarContent className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                  const normalizedPathname = stripLocalePrefix(pathname);
                  const isActive =
                    normalizedPathname === `/chat/${conv.id}` ||
                    conversationId === conv.id;
                  const title = conv.title || "Nouvelle conversation";
                  const summary =
                    typeof conv.summary === "string" ? conv.summary.trim() : "";
                  const hasSummary =
                    summary.length > 0 &&
                    summary.toLocaleLowerCase() !== title.toLocaleLowerCase();
                  const hasBooking =
                    typeof conv.booking_id === "string" &&
                    conv.booking_id.length > 0;
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
                        <Link href={localizeHref(`/chat/${conv.id}`, pathname)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 pr-5">
                              <p className="text-sm font-medium truncate">
                                {title}
                              </p>
                              {hasBooking ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                              ) : null}
                            </div>
                            {hasSummary ? (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {summary}
                              </p>
                            ) : null}
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
