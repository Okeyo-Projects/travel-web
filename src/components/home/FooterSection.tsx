"use client";

import { Facebook, Instagram, Send, Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SVGProps } from "react";
import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import { localizeHref } from "@/lib/routing/locale-path";
import { useT } from "@/providers/translations-provider";

function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.74 3c.31 1.76 1.36 3.2 3.26 3.32v2.35a5.55 5.55 0 0 1-3.15-1v5.87a5.54 5.54 0 1 1-5.31-5.53v2.43a3.12 3.12 0 1 0 2.89 3.11V3h2.31Z" />
    </svg>
  );
}

export function FooterSection() {
  const pathname = usePathname();
  const t = useT();
  const companyLinks = [
    { label: t("home.footer.links.explore"), href: "/explore" },
    { label: t("home.footer.links.about"), href: "/about" },
    { label: t("home.footer.links.partner"), href: "/partner" },
    { label: t("home.footer.links.blog"), href: "/blog" },
    { label: t("home.footer.links.privacy"), href: "/privacy" },
    { label: t("home.footer.links.terms"), href: "/terms" },
    { label: t("home.footer.links.support"), href: "/support" },
  ];
  const socialLinks = [
    {
      href: "https://web.facebook.com/OKEYOAPP",
      label: t("home.footer.social.facebook"),
      icon: Facebook,
      className: "border-primary text-primary",
    },
    {
      href: "https://www.instagram.com/okeyo.travel/",
      label: t("home.footer.social.instagram"),
      icon: Instagram,
      className: "border-white/80 text-white",
    },
    {
      href: "https://www.youtube.com/@OKEYOTRAVEL",
      label: t("home.footer.social.youtube"),
      icon: Youtube,
      className: "border-white/80 text-white",
    },
    {
      href: "https://www.tiktok.com/@okeyotravel",
      label: t("home.footer.social.tiktok"),
      icon: TikTokIcon,
      className: "border-white/80 text-white",
    },
  ];

  return (
    <footer className="bg-white px-4 pb-6 sm:px-6 sm:pb-10">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-r from-[#121419] via-[#191a1f] to-[#670833] px-6 py-10 text-white sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('/ai-pattern.png')" }}
        />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.8fr_1.4fr]">
          <div>
            <Image
              src="/logo_white.png"
              alt={t("home.footer.logoAlt")}
              width={200}
              height={80}
              className="h-auto w-[130px] sm:w-[200px]"
            />
            <p className="mt-4 max-w-[230px] text-xl leading-relaxed text-white/90">
              {t("home.footer.tagline")}
            </p>

            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map(({ href, label, icon: Icon, className }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors hover:bg-white/10 ${className}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
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
              {t("home.footer.contact")}{" "}
              <a
                href="mailto:contact@okeyo.ma"
                className="underline hover:text-white/90 transition-colors"
              >
                contact@okeyo.ma
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
