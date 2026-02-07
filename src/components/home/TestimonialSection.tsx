import { Star } from "lucide-react"

const TESTIMONIALS = [
  {
    id: "savannah-1",
    quote:
      "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
    name: "Savannah Nguyen",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80",
  },
  {
    id: "savannah-2",
    quote:
      "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
    name: "Savannah Nguyen",
    avatar:
      "https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?auto=format&fit=crop&w=180&q=80",
  },
  {
    id: "savannah-3",
    quote:
      "Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.",
    name: "Savannah Nguyen",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80",
  },
]

export function TestimonialSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ backgroundImage: "url('/testimonial-pattern.svg')", backgroundSize: "cover" }}
      />

      <div className="relative z-10 mx-auto max-w-[1380px]">
        <p className="text-center text-2xl text-primary">Clients Testimonials</p>
        <h2 className="mt-3 text-center text-4xl font-black leading-tight text-black sm:text-5xl">
          What Our Travelers Say
        </h2>

        <div className="mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article key={item.id} className="space-y-6">
              <p className="text-lg leading-relaxed text-[#03233a]">{item.quote}</p>

              <div className="flex items-center gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    // biome-ignore lint/suspicious/noArrayIndexKey: visual-only static stars
                    key={index}
                    className="h-5 w-5 text-primary"
                    fill={index < 4 ? "currentColor" : "none"}
                  />
                ))}
              </div>

              <div className="flex items-center gap-4">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <p className="text-2xl font-bold text-black">{item.name}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
