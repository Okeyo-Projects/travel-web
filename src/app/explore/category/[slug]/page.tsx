import { permanentRedirect } from "next/navigation";

export default async function DeprecatedCategorySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/explore/region/${slug}`);
}
