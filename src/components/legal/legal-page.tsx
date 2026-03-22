import Link from "next/link";
import type { LegalBullet, LegalSection } from "@/components/legal/legal-data";
import { FooterSection } from "@/components/home/FooterSection";
import { PayzoneBadge } from "@/components/payment/PayzoneBadge";
import { MarketingHeader } from "@/components/site/MarketingHeader";

type LegalPageProps = {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

function BulletList({
  items,
  nested = false,
}: {
  items: LegalBullet[];
  nested?: boolean;
}) {
  return (
    <ul
      className={
        nested
          ? "mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600"
          : "mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-slate-700"
      }
    >
      {items.map((item) => (
        <li key={item.text}>
          <span>{item.text}</span>
          {item.children ? <BulletList items={item.children} nested /> : null}
        </li>
      ))}
    </ul>
  );
}

export function LegalPage({
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageProps) {
  return (
    <div className="bg-[#08090d] print:bg-white">
      <div className="print:hidden">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8">
          <MarketingHeader />
        </div>
      </div>

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,194,212,0.35),_transparent_42%),linear-gradient(180deg,#fffdfd_0%,#f6f7fb_100%)] print:bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 print:border-slate-200 print:shadow-none">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-3xl space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                  Informations légales
                </p>
                <div className="space-y-3">
                  <h1 className="font-[family:var(--font-playfair-display)] text-4xl leading-tight text-slate-950 sm:text-5xl">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                    {description}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 print:border-slate-200 print:bg-white">
                <p className="font-medium text-slate-900">
                  Dernière mise à jour
                </p>
                <p>{lastUpdated}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-600 print:hidden">
              <Link
                href="/"
                className="rounded-full border border-slate-200 px-4 py-2 transition-colors hover:border-primary hover:text-primary"
              >
                Retour à l'accueil
              </Link>
              <Link
                href="/explore"
                className="rounded-full border border-slate-200 px-4 py-2 transition-colors hover:border-primary hover:text-primary"
              >
                Explorer les offres
              </Link>
            </div>

            <PayzoneBadge
              className="mt-6 border-slate-200 bg-slate-50 print:hidden"
              titleClassName="text-slate-900"
              descriptionClassName="text-slate-600"
              imageWrapperClassName="max-w-[210px]"
            />
          </div>

          <nav
            aria-label="Table des matières"
            className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden print:hidden"
          >
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-primary hover:text-primary"
              >
                {section.title}
              </a>
            ))}
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden lg:block print:hidden">
              <div className="sticky top-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Sur cette page
                </p>
                <nav aria-label="Table des matières" className="mt-4">
                  <ol className="space-y-2 text-sm text-slate-600">
                    {sections.map((section, index) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className="flex gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-slate-50 hover:text-primary"
                        >
                          <span className="font-medium text-slate-400">
                            {(index + 1).toString().padStart(2, "0")}
                          </span>
                          <span>{section.title}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>
            </aside>

            <div className="space-y-5">
              {sections.map((section, index) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-24 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] print:break-inside-avoid print:rounded-none print:border-slate-200 print:shadow-none sm:p-8"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                        Section {(index + 1).toString().padStart(2, "0")}
                      </p>
                      <h2 className="font-[family:var(--font-playfair-display)] text-3xl leading-tight text-slate-950">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  {section.intro ? (
                    <p className="mt-5 text-base leading-8 text-slate-700">
                      {section.intro}
                    </p>
                  ) : null}

                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-4 text-base leading-8 text-slate-700"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets ? (
                    <BulletList items={section.bullets} />
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <FooterSection />
      </div>
    </div>
  );
}
