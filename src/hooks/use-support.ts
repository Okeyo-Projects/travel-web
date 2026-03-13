"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type {
  SupportIssueFormValues,
  SupportSubmissionResult,
  SupportTicketInsert,
} from "@/types/support";

function toTicketReference(id: string) {
  return id.split("-")[0].toUpperCase();
}

export function useCreateSupportTicket() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      values: SupportIssueFormValues,
    ): Promise<SupportSubmissionResult> => {
      const supabase = createClient();
      const id = crypto.randomUUID();
      const normalizedEmail = values.contactEmail.trim().toLowerCase();

      const payload: SupportTicketInsert = {
        id,
        user_id: user?.id ?? null,
        subject: values.subject.trim(),
        type: values.type,
        description: values.description.trim(),
        contact_email: normalizedEmail || null,
        metadata: {
          source: "support_page_web",
          auth_state: user ? "authenticated" : "anonymous",
        },
      };

      const { error } = await supabase.from("support_tickets").insert(payload);

      if (error) {
        throw error;
      }

      return {
        id,
        reference: toTicketReference(id),
      };
    },
  });
}
