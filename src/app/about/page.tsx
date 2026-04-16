import {
  ArrowRight,
  BrainCircuit,
  Compass,
  HeartHandshake,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { FooterSection } from "@/components/home/FooterSection";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const revalidate = 3600;

async function getRequestTranslator() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  return {
    locale,
    t: createTranslator(locale),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getRequestTranslator();

  return {
    title: t("seo.about.title"),
    description: t("seo.about.description"),
    alternates: buildLocaleAlternates("/about", locale),
    openGraph: {
      title: t("seo.about.title"),
      description: t("seo.about.description"),
      url: localizeHref("/about", locale),
    },
  };
}

export default async function AboutPage() {
  const { locale, t } = await getRequestTranslator();

  const aboutUrl = `${SITE_URL}${localizeHref("/about", locale)}`;
  const exploreHref = localizeHref("/explore", locale);
  const chatHref = localizeHref("/chat", locale);
  const supportHref = localizeHref("/support", locale);

  const stats = [
    {
      value: t("about.page.stats.languages.value"),
      label: t("about.page.stats.languages.label"),
    },
    {
      value: t("about.page.stats.curation.value"),
      label: t("about.page.stats.curation.label"),
    },
    {
      value: t("about.page.stats.planning.value"),
      label: t("about.page.stats.planning.label"),
    },
  ];

  const principles = [
    {
      icon: Compass,
      title: t("about.page.principles.curation.title"),
      description: t("about.page.principles.curation.description"),
    },
    {
      icon: BrainCircuit,
      title: t("about.page.principles.guidance.title"),
      description: t("about.page.principles.guidance.description"),
    },
    {
      icon: ShieldCheck,
      title: t("about.page.principles.trust.title"),
      description: t("about.page.principles.trust.description"),
    },
  ];

  const steps = [
    {
      title: t("about.page.howItWorks.stepOne.title"),
      description: t("about.page.howItWorks.stepOne.description"),
    },
    {
      title: t("about.page.howItWorks.stepTwo.title"),
      description: t("about.page.howItWorks.stepTwo.description"),
    },
    {
      title: t("about.page.howItWorks.stepThree.title"),
      description: t("about.page.howItWorks.stepThree.description"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: t("seo.about.title"),
            description: t("seo.about.description"),
            url: aboutUrl,
            inLanguage: locale,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: t("app.name"),
            url: SITE_URL,
            description: t("about.page.hero.description"),
          },
        ]}
      />

      <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#08090d_0%,#141a26_48%,#57132b_100%)] px-6 pb-14 pt-6 text-white">
        <div className="mx-auto max-w-6xl">
          <MarketingHeader />

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                <Sparkles className="size-3.5" />
                {t("about.page.hero.eyebrow")}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t("about.page.hero.title")}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
                  {t("about.page.hero.description")}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-12 rounded-full bg-white px-6 text-slate-950 hover:bg-white/90"
                >
                  <Link href={exploreHref}>
                    {t("about.page.hero.primaryCta")}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={chatHref}>
                    {t("about.page.hero.secondaryCta")}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur"
                >
                  <p className="text-3xl font-semibold tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                <HeartHandshake className="size-3.5" />
                {t("about.page.story.eyebrow")}
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {t("about.page.story.title")}
              </h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                {t("about.page.story.paragraphOne")}
              </p>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                {t("about.page.story.paragraphTwo")}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-[#fff7fa] p-6 shadow-[0_18px_50px_rgba(209,45,97,0.08)] sm:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#d12d61]">
                <MapPinned className="size-3.5" />
                {t("about.page.presence.eyebrow")}
              </div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {t("about.page.presence.title")}
              </h2>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">
                {t("about.page.presence.description")}
              </p>
              <div className="rounded-[24px] border border-white bg-white p-5 text-sm leading-7 text-slate-600">
                {t("about.page.presence.note")}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t("about.page.principles.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {t("about.page.principles.title")}
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {principles.map((principle) => {
              const Icon = principle.icon;

              return (
                <div
                  key={principle.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.04)]"
                >
                  <div className="inline-flex rounded-2xl bg-slate-100 p-3 text-slate-900">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">
                    {principle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {principle.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:px-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
              {t("about.page.howItWorks.eyebrow")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              {t("about.page.howItWorks.title")}
            </h2>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[24px] border border-white/10 bg-white/5 p-5"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/45">
                  {t("about.page.howItWorks.stepLabel", {
                    count: index + 1,
                  })}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t("about.page.cta.eyebrow")}
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                {t("about.page.cta.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                {t("about.page.cta.description")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-full px-6">
                <Link href={exploreHref}>{t("about.page.cta.primaryCta")}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full px-6"
              >
                <Link href={supportHref}>
                  {t("about.page.cta.secondaryCta")}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
