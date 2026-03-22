"use client";

import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import { localizeHref } from "@/lib/routing/locale-path";
import { useT } from "@/providers/translations-provider";
import { Facebook, Instagram, Send, Twitter } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function FooterSection() {
  const pathname = usePathname();
  const t = useT();
  const companyLinks = [
    { label: t("home.footer.links.explore"), href: "/explore" },
    { label: t("home.footer.links.privacy"), href: "/privacy" },
    { label: t("home.footer.links.terms"), href: "/terms" },
    { label: t("home.footer.links.support"), href: "/support" },
  ];

  return (
    <footer className="bg-white px-4 pb-6 sm:px-6 sm:pb-10">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-r from-[#121419] via-[#191a1f] to-[#670833] px-6 py-10 text-white sm:px-10 sm:py-14">
        <Image
          src="/ai-pattern.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="(min-width: 1024px) 1380px, 100vw"
          className="pointer-events-none object-cover opacity-35"
        />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.8fr_1.4fr]">
          <div>
            <Image
              src="/logo_white.png"
              alt="Okeyo Travel"
              width={200}
              height={80}
              className="h-auto w-[130px] sm:w-[200px]"
            />
            <p className="mt-4 max-w-[230px] text-xl leading-relaxed text-white/90">
              {t("home.footer.tagline")}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                aria-label={t("home.footer.social.facebook")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary"
              >
                <Facebook className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t("home.footer.social.instagram")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 text-white"
              >
                <Instagram className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={t("home.footer.social.twitter")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 text-white"
              >
                <Twitter className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-4xl font-black">
              {t("home.footer.usefulLinks")}
            </h3>
            <ul className="mt-5 space-y-3 text-xl text-white/90">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={localizeHref(item.href, pathname)}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-4xl font-black">
              {t("home.footer.newsletterTitle")}
            </h3>
            <p className="mt-4 max-w-[560px] text-xl leading-relaxed text-white/85">
              {t("home.footer.newsletterDescription")}
            </p>

            <form className="mt-7 flex items-center rounded-full bg-white p-2">
              <input
                type="email"
                placeholder={t("home.footer.emailPlaceholder")}
                className="h-12 flex-1 border-none bg-transparent px-4 text-lg text-black outline-none placeholder:text-[#b9b9b9]"
              />
              <button
                type="submit"
                aria-label={t("home.footer.subscribe")}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_20px_rgba(255,37,102,0.45)]"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
            <p className="mt-5 text-sm text-white/60">
              {t("home.footer.contact")} :{" "}
              <a
                href="mailto:contact@okeyotravel.com"
                className="underline hover:text-white/90 transition-colors"
              >
                contact@okeyotravel.com
              </a>
            </p>
            <div className="w-full flex justify-end mt-4">
              <PayzoneBadge
                className="mt-6 border-white/10 bg-white/5"
                titleClassName="text-white"
                descriptionClassName="text-white/70"
                imageWrapperClassName=""
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
