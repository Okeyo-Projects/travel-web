export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;

  if (expected && authHeader !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";
  const urls = ["/ar", "/en/explore", "/ar/explore", "/ar/blog"];

  await Promise.all(
    urls.map((u) =>
      fetch(`${baseUrl}${u}`, { cache: "no-store" }).catch(() => undefined),
    ),
  );

  return Response.json({ ok: true });
}
