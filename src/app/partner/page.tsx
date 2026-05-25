import { FooterSection } from "@/components/home/FooterSection";
import { PartnerLeadForm } from "@/components/partner/PartnerLeadForm";
import { partnerPageCopy } from "@/components/partner/copy";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { buildKeywords } from "@/lib/seo/page-metadata";
import { SUPPORT_EMAIL, SUPPORT_PHONE_NUMBER } from "@/types/support";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Building2,
  Headset,
  Mail,
  MapPinned,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Image from "next/image";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 3600;

async function getPartnerPageContext() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  return {
    locale,
    copy: partnerPageCopy[locale],
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, copy } = await getPartnerPageContext();
  const keywords = buildKeywords(
    copy.seo.title,
    copy.seo.description,
    copy.hero.title,
    ...copy.hero.audience,
    ...copy.benefits.items.map((item) => item.title),
    copy.contact.title,
    copy.form.establishmentLabel,
  );

  return {
    title: copy.seo.title,
    description: copy.seo.description,
    keywords,
    creator: "Okeyo Travel",
    publisher: "Okeyo Travel",
    category: "Travel and hospitality",
    alternates: buildLocaleAlternates("/partner", locale),
    openGraph: {
      title: copy.seo.title,
      description: copy.seo.description,
      url: localizeHref("/partner", locale),
      type: "website",
      images: [
        {
          url: "/hero-video-poster.jpg",
          width: 1200,
          height: 900,
          alt: copy.hero.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.seo.title,
      description: copy.seo.description,
      images: ["/hero-video-poster.jpg"],
    },
  };
}

const benefitIcons = [BrainCircuit, MapPinned, Headset, ShieldCheck] as const;
const processIcons = [Users, PhoneCall, BadgeCheck] as const;

const DISPLAY_PHONE_NUMBER = "+212 625 555 493";

export default async function PartnerPage() {
  const { locale, copy } = await getPartnerPageContext();
  const partnerUrl = `${SITE_URL}${localizeHref("/partner", locale)}`;

  const contactCards = [
    {
      title: copy.contact.emailTitle,
      description: copy.contact.emailDescription,
      value: SUPPORT_EMAIL,
      href: `mailto:${SUPPORT_EMAIL}`,
      icon: Mail,
    },
    {
      title: copy.contact.phoneTitle,
      description: copy.contact.phoneDescription,
      value: DISPLAY_PHONE_NUMBER,
      href: `tel:${SUPPORT_PHONE_NUMBER}`,
      icon: PhoneCall,
    }
  ];

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: copy.seo.title,
            description: copy.seo.description,
            url: partnerUrl,
            inLanguage: locale,
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: copy.hero.title,
            description: copy.hero.description,
            provider: {
              "@type": "Organization",
              name: "Okeyo Travel",
              url: SITE_URL,
            },
            areaServed: "MA",
            availableLanguage: locale,
            url: partnerUrl,
          },
        ]}
      />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_34%),linear-gradient(135deg,#08090d_0%,#111827_46%,#6f1237_100%)] px-6 pb-16 pt-6 text-white">
        <div className="absolute inset-0 bg-[url('/ai-pattern.png')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-6xl">
          <MarketingHeader />

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                <Sparkles className="size-3.5" />
                {copy.hero.eyebrow}
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {copy.hero.title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/76 sm:text-lg">
                  {copy.hero.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {copy.hero.audience.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/88 backdrop-blur"
                  >
                    <Store className="size-4" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-full bg-white px-6 text-slate-950 hover:bg-white/90"
                >
                  <a href="#partner-lead-form">
                    {copy.hero.primaryCta}
                    <ArrowRight className="ml-2 size-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#ff8aa8]/20 blur-3xl" />
              <div className="absolute -left-4 bottom-6 h-28 w-28 rounded-full bg-cyan-400/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[34px] border border-white/12 bg-white/10 p-4 shadow-[0_30px_90px_rgba(7,10,20,0.35)] backdrop-blur">
                <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0f172a]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#09090f]/55 via-transparent to-[#d12d61]/25" />
                  <Image
                    src="/hero-video-poster.jpg"
                    alt={copy.showcase.title}
                    width={1200}
                    height={900}
                    className="h-[320px] w-full object-cover sm:h-[380px]"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="rounded-[24px] border border-white/12 bg-black/45 p-5 backdrop-blur-md">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
                        <Building2 className="size-3.5" />
                        {copy.showcase.eyebrow}
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                        {copy.showcase.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-white/74">
                        {copy.showcase.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 rounded-[28px] border border-slate-200 bg-[#0f172a] p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.2)] sm:p-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
                <PhoneCall className="size-3.5" />
                {copy.contact.eyebrow}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                {copy.contact.title}
              </h2>
              <p className="text-sm leading-6 text-white/70">
                {copy.contact.description}
              </p>
            </div>

            <div className="space-y-4">
              {contactCards.map((card) => {
                const Icon = card.icon;

                return (
                  <a
                    key={card.title}
                    href={card.href}
                    className="group block rounded-[24px] border border-white/10 bg-white/6 p-5 transition-transform duration-200 hover:-translate-y-1 hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="rounded-2xl bg-white/10 p-3 text-white">
                        <Icon className="size-5" />
                      </div>
                      <ArrowRight className="size-4 text-white/55 transition-transform group-hover:translate-x-1" />
                    </div>
                    <div className="mt-5 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
                        {card.title}
                      </p>
                      <h3
                        className={
                          card.icon === PhoneCall
                            ? "text-2xl font-semibold tracking-tight"
                            : "text-xl font-semibold tracking-tight"
                        }
                        dir={card.icon === PhoneCall ? "ltr" : undefined}
                      >
                        {card.value}
                      </h3>
                      <p className="text-sm leading-6 text-white/70">
                        {card.description}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <PartnerLeadForm locale={locale} copy={copy.form} />
        </section>

      </main>

      <FooterSection />
    </div>
  );
}
