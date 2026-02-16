"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { localizeHref } from "@/lib/routing/locale-path";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    router.push(localizeHref("/preorder", pathname));
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="text-center">
        <div className="animate-spin size-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted-foreground">
          Redirection vers la page de pré-commande...
        </p>
      </div>
    </div>
  );
}
