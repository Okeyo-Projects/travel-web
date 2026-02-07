import Image from "next/image"
import { Facebook, Instagram, Send, Twitter } from "lucide-react"

const COMPANY_LINKS = ["Traveling", "About Locate", "Success", "Information"]

export function FooterSection() {
  return (
    <footer className="bg-white px-4 pb-6 sm:px-6 sm:pb-10">
      <div className="relative mx-auto max-w-[1380px] overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-r from-[#121419] via-[#191a1f] to-[#670833] px-6 py-10 text-white sm:px-10 sm:py-14">
        <img
          src="/ai-pattern.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.8fr_1.4fr]">
          <div>
            <Image
              src="/logo_white.png"
              alt="Okeyo Travel"
              width={200}
              height={80}
              className="h-auto w-[130px] sm:w-[200px]"
            />
            <p className="mt-4 max-w-[230px] text-xl leading-relaxed text-white/90">Enjoy the touring with Saly</p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary text-primary"
              >
                <Facebook className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 text-white"
              >
                <Instagram className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Twitter"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/80 text-white"
              >
                <Twitter className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-4xl font-black">Company</h3>
            <ul className="mt-5 space-y-3 text-xl text-white/90">
              {COMPANY_LINKS.map((item) => (
                <li key={item}>
                  <a href="#" className="transition-colors hover:text-white">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-4xl font-black">Sign up to our newsletter</h3>
            <p className="mt-4 max-w-[560px] text-xl leading-relaxed text-white/85">
              Reciv latest news, update, and many other things every week.
            </p>

            <form className="mt-7 flex items-center rounded-full bg-white p-2">
              <input
                type="email"
                placeholder="Enter Your email address"
                className="h-12 flex-1 border-none bg-transparent px-4 text-lg text-black outline-none placeholder:text-[#b9b9b9]"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-[0_6px_20px_rgba(255,37,102,0.45)]"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </footer>
  )
}
