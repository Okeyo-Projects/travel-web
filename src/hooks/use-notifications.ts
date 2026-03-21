import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/types/notification";

const notificationKeys = {
  all: ["notifications"] as const,
  list: (userId: string | null | undefined) => ["notifications", "list", userId] as const,
  unreadCount: (userId: string | null | undefined) =>
    ["notifications", "unread-count", userId] as const,
};

export function useNotifications(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const query = useQuery({
    queryKey: notificationKeys.list(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      return (data ?? []) as NotificationRow[];
    },
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.list(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(userId),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, supabase, userId]);

  return query;
}

export function useUnreadNotificationCount(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return 0;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`notifications:count:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: notificationKeys.unreadCount(userId),
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, supabase, userId]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString(), clicked_at: new Date().toISOString() })
        .eq("id", notificationId)
        .select("id, user_id")
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(data.user_id),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(data.user_id),
        }),
      ]);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);

      if (error) {
        throw error;
      }

      return userId;
    },
    onSuccess: async (userId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: notificationKeys.list(userId),
        }),
        queryClient.invalidateQueries({
          queryKey: notificationKeys.unreadCount(userId),
        }),
      ]);
    },
  });
}
