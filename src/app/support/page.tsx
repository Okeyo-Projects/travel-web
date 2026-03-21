import type { Metadata } from "next";
import {
  ArrowRight,
  Clock3,
  LifeBuoy,
  Mail,
  MessageCircleMore,
  PhoneCall,
} from "lucide-react";
import { FooterSection } from "@/components/home/FooterSection";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { ReportIssueForm } from "@/components/support/ReportIssueForm";
import { SupportFaq } from "@/components/support/SupportFaq";
import { Button } from "@/components/ui/button";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_NUMBER,
  SUPPORT_WHATSAPP_URL,
} from "@/types/support";

const CONTACT_CARDS = [
  {
    title: "Email support",
    description:
      "Best for detailed issues, screenshots, and booking references.",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: Mail,
  },
  {
    title: "Phone or WhatsApp",
    description: "Use urgent channels for time-sensitive travel changes.",
    value: SUPPORT_PHONE_NUMBER,
    href: SUPPORT_WHATSAPP_URL,
    icon: PhoneCall,
  },
  {
    title: "Typical response time",
    description:
      "Most tickets receive a first response within one business day.",
    value: "Within 24 hours",
    href: "#report-an-issue",
    icon: Clock3,
  },
];

export const metadata: Metadata = {
  title: "Aide & Support — Okeyo Travel",
  description:
    "Retrouvez toutes nos réponses aux questions fréquentes et contactez notre équipe d'assistance.",
  alternates: { canonical: "/support" },
  openGraph: {
    title: "Aide & Support — Okeyo Travel",
    description:
      "Retrouvez toutes nos réponses aux questions fréquentes et contactez notre équipe d'assistance.",
    url: "/support",
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <section className="bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_35%),linear-gradient(135deg,#08090d_0%,#141a26_52%,#57132b_100%)] px-6 pb-12 pt-6">
        <MarketingHeader className="mx-auto max-w-6xl" />

        <div className="mx-auto mt-14 grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              <LifeBuoy className="size-3.5" />
              Support center
            </div>

            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Help for travelers and hosts, without the dead ends.
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/75">
                Search the help center, send a detailed issue report, or jump to
                direct contact options when the situation is urgent.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 rounded-full bg-white px-6 text-slate-950 hover:bg-white/90"
              >
                <a href="#report-an-issue">
                  Report an issue
                  <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <a href="#faq">Browse FAQs</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {CONTACT_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <a
                  key={card.title}
                  href={card.href}
                  className="group rounded-[28px] border border-white/10 bg-white/10 p-6 text-white backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:bg-white/14"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="rounded-2xl bg-white/12 p-3 text-white">
                      <Icon className="size-5" />
                    </div>
                    <ArrowRight className="size-4 text-white/55 transition-transform group-hover:translate-x-1" />
                  </div>
                  <div className="mt-6 space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/55">
                      {card.title}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {card.value}
                    </h2>
                    <p className="text-sm leading-6 text-white/70">
                      {card.description}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <section id="faq">
          <SupportFaq />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6 rounded-[28px] border border-slate-200 bg-[#fff7fa] p-6 shadow-[0_18px_50px_rgba(209,45,97,0.08)] sm:p-8">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#d12d61]">
                <MessageCircleMore className="size-3.5" />
                Escalate a case
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                Can't find what you're looking for?
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Send a report with enough context for the support team to act on
                it quickly.
              </p>
            </div>

            <div className="rounded-[24px] border border-white bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                Include these details
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li className="list-disc pl-1 ml-5">
                  Booking reference, experience name, or host name
                </li>
                <li className="list-disc pl-1 ml-5">
                  What happened, what you expected, and when it occurred
                </li>
                <li className="list-disc pl-1 ml-5">
                  Screenshots or payment details when applicable
                </li>
              </ul>
            </div>

            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-5 text-sm leading-6 text-slate-600">
              Emergency travel issue? Call or message{" "}
              <a
                href={SUPPORT_WHATSAPP_URL}
                className="font-semibold text-[#d12d61] underline underline-offset-4"
              >
                support on WhatsApp
              </a>{" "}
              for the fastest response.
            </div>
          </div>

          <ReportIssueForm />
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
