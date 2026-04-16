import { headers } from "next/headers";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";
import { TestimonialCarousel, type TestimonialItem } from "./TestimonialCarousel";

const WEBSITE_TESTIMONIALS_BUCKET = "website-testimonials";

type DbTestimonial = Pick<
  Tables<"website_testimonials">,
  "id" | "avatar_key" | "name" | "role" | "message" | "rate"
>;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
const clampRate = (value: number) =>
  Math.max(1, Math.min(5, Math.round(value)));

const resolveAvatarUrl = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  avatarKey: string,
): string => {
  if (!avatarKey) return "";
  if (isAbsoluteUrl(avatarKey)) return avatarKey;
  const { data } = supabase.storage
    .from(WEBSITE_TESTIMONIALS_BUCKET)
    .getPublicUrl(avatarKey);
  return data.publicUrl;
};

const mapDbTestimonial = (
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: DbTestimonial,
): TestimonialItem => ({
  id: row.id,
  quote: row.message,
  name: row.name,
  role: row.role,
  avatar: resolveAvatarUrl(supabase, row.avatar_key),
  rate: clampRate(row.rate),
});

export async function TestimonialSection() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  let testimonials: TestimonialItem[] = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_testimonials")
      .select("id, avatar_key, name, role, message, rate")
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load website testimonials:", error);
    } else if (data && data.length > 0) {
      testimonials = data.map((row) => mapDbTestimonial(supabase, row));
    }
  } catch (err) {
    console.error("Failed to load website testimonials:", err);
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-24">
      <div className="testimonial-pattern pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative z-10 mx-auto max-w-[1380px]">
        <p className="text-center text-2xl text-primary">
          {t("home.testimonials.eyebrow")}
        </p>
        <h2 className="mt-3 text-center text-4xl font-black leading-tight text-black sm:text-5xl">
          {t("home.testimonials.title")}
        </h2>

        <TestimonialCarousel testimonials={testimonials} />
      </div>
    </section>
  );
}
