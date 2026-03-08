import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./use-auth";

export type SocialComment = {
  id: string;
  text: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

function socialQueryKey(experienceId: string) {
  return ["social", experienceId] as const;
}

export function useExperienceSocial(experienceId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const isEnabled = Boolean(experienceId);

  const likesCountQuery = useQuery({
    queryKey: [...(experienceId ? socialQueryKey(experienceId) : []), "likes"],
    enabled: isEnabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("social_likes")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "experience")
        .eq("target_id", experienceId as string);

      if (error) throw error;
      return count ?? 0;
    },
  });

  const likedByUserQuery = useQuery({
    queryKey: [
      ...(experienceId ? socialQueryKey(experienceId) : []),
      "likedByUser",
      user?.id ?? "anonymous",
    ],
    enabled: isEnabled && Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_likes")
        .select("id")
        .eq("target_type", "experience")
        .eq("target_id", experienceId as string)
        .eq("user_id", user?.id as string)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return Boolean(data?.id);
    },
  });

  const savedByUserQuery = useQuery({
    queryKey: [
      ...(experienceId ? socialQueryKey(experienceId) : []),
      "savedByUser",
      user?.id ?? "anonymous",
    ],
    enabled: isEnabled && Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_saves")
        .select("id")
        .eq("experience_id", experienceId as string)
        .eq("user_id", user?.id as string)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return Boolean(data?.id);
    },
  });

  const commentsQuery = useQuery({
    queryKey: [...(experienceId ? socialQueryKey(experienceId) : []), "comments"],
    enabled: isEnabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(
          `
            id,
            text,
            created_at,
            likes_count,
            replies_count,
            author:profiles!comments_author_id_fkey(
              id,
              display_name,
              avatar_url
            )
          `,
        )
        .eq("experience_id", experienceId as string)
        .is("deleted_at", null)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as SocialComment[];
    },
  });

  const invalidateSocial = async () => {
    if (!experienceId) return;
    await queryClient.invalidateQueries({ queryKey: socialQueryKey(experienceId) });
  };

  const toggleLike = useMutation({
    mutationFn: async (currentlyLiked: boolean) => {
      if (!user || !experienceId) {
        throw new Error("Authentication required");
      }

      if (currentlyLiked) {
        const { error } = await supabase
          .from("social_likes")
          .delete()
          .eq("target_type", "experience")
          .eq("target_id", experienceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("social_likes").insert({
          user_id: user.id,
          target_type: "experience",
          target_id: experienceId,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidateSocial,
  });

  const toggleSave = useMutation({
    mutationFn: async (currentlySaved: boolean) => {
      if (!user || !experienceId) {
        throw new Error("Authentication required");
      }

      if (currentlySaved) {
        const { error } = await supabase
          .from("social_saves")
          .delete()
          .eq("experience_id", experienceId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("social_saves").insert({
          user_id: user.id,
          experience_id: experienceId,
          collection_name: "default",
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidateSocial,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      if (!user || !experienceId) {
        throw new Error("Authentication required");
      }

      const body = text.trim();
      if (!body) {
        throw new Error("Comment is required");
      }

      const { error } = await supabase.from("comments").insert({
        author_id: user.id,
        experience_id: experienceId,
        text: body,
      });
      if (error) throw error;
    },
    onSuccess: invalidateSocial,
  });

  const trackShare = useMutation({
    mutationFn: async (platform: string = "link") => {
      if (!user || !experienceId) return;

      const { error } = await supabase.from("social_shares").insert({
        user_id: user.id,
        experience_id: experienceId,
        platform,
      });
      if (error) throw error;
    },
    onSuccess: invalidateSocial,
  });

  return {
    likesCount: likesCountQuery.data ?? 0,
    likesLoading: likesCountQuery.isLoading,
    likedByUser: likedByUserQuery.data ?? false,
    savedByUser: savedByUserQuery.data ?? false,
    comments: commentsQuery.data ?? [],
    commentsLoading: commentsQuery.isLoading,
    toggleLike,
    toggleSave,
    addComment,
    trackShare,
  };
}
