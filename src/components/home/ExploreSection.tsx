const EXPLORE_CARDS = [
  {
    id: "panglipuran-1",
    title: "Bangli, East Bali",
    subtitle: "Cultural walk with local guides",
    label: "Panglipuran",
    image:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "panglipuran-2",
    title: "Bangli, East Bali",
    subtitle: "Cultural walk with local guides",
    label: "Panglipuran",
    image:
      "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "panglipuran-3",
    title: "Bangli, East Bali",
    subtitle: "Cultural walk with local guides",
    label: "Panglipuran",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  },
]

export function ExploreSection() {
  return (
    <section className="relative overflow-hidden bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-24">
      <img
        src="/testimonial-pattern.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-35"
      />

      <div className="relative z-10 mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[420px_1fr] lg:items-start">
        <div className="lg:pt-8">
          <p className="text-2xl text-primary">How It Works</p>
          <h2 className="mt-4 text-4xl font-black leading-[1.05] text-[#050505] sm:text-5xl lg:text-6xl">
            Not Your Boring
            <br />
            Travel Agent
          </h2>
          <p className="mt-5 max-w-[360px] text-xl leading-relaxed text-[#2b2b2f] sm:text-2xl">
            We plan chill, curated trips with good vibes and better people.
          </p>
          <button
            type="button"
            className="mt-9 inline-flex rounded-full bg-primary px-9 py-3 text-xl font-bold text-white shadow-[0_10px_24px_rgba(255,37,102,0.4)] transition-transform hover:scale-105"
          >
            Book a Seat
          </button>
        </div>

        <div>
          <div className="flex gap-5 overflow-x-auto pb-4">
            {EXPLORE_CARDS.map((card) => (
              <article key={card.id} className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px]">
                <div className="relative overflow-hidden rounded-[26px]">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-4 py-2 text-base font-semibold text-white backdrop-blur-sm">
                    {card.label}
                  </span>
                </div>
                <h3 className="mt-4 text-3xl font-black text-black">{card.title}</h3>
                <p className="mt-2 text-xl text-[#2b2b2f]">{card.subtitle}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center lg:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ececec] p-1">
              <button
                type="button"
                className="rounded-full px-5 py-2 text-lg font-semibold text-black"
              >
                ← Prev
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-5 py-2 text-lg font-semibold text-black"
              >
                → Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
