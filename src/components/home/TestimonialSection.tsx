'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'

type TestimonialItem = {
  id: string
  quote: string
  name: string
  role: string
  avatar: string
  rate: number
}

const WEBSITE_TESTIMONIALS_BUCKET = 'website-testimonials'

const FALLBACK_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'savannah-1',
    quote:
      'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.',
    name: 'Savannah Nguyen',
    role: 'Traveler',
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80',
    rate: 4,
  },
  {
    id: 'savannah-2',
    quote:
      'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.',
    name: 'Savannah Nguyen',
    role: 'Traveler',
    avatar:
      'https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?auto=format&fit=crop&w=180&q=80',
    rate: 4,
  },
  {
    id: 'savannah-3',
    quote:
      'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint. Velit officia consequat duis enim velit mollit.',
    name: 'Savannah Nguyen',
    role: 'Traveler',
    avatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=180&q=80',
    rate: 4,
  },
]

type DbTestimonial = Pick<
  Tables<'website_testimonials'>,
  'id' | 'avatar_key' | 'name' | 'role' | 'message' | 'rate'
>

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)
const clampRate = (value: number) => Math.max(1, Math.min(5, Math.round(value)))

const resolveAvatarUrl = (
  supabase: ReturnType<typeof createClient>,
  avatarKey: string
) => {
  if (!avatarKey) {
    return ''
  }

  if (isAbsoluteUrl(avatarKey)) {
    return avatarKey
  }

  const { data } = supabase.storage
    .from(WEBSITE_TESTIMONIALS_BUCKET)
    .getPublicUrl(avatarKey)

  return data.publicUrl
}

const mapDbTestimonial = (
  supabase: ReturnType<typeof createClient>,
  row: DbTestimonial
): TestimonialItem => ({
  id: row.id,
  quote: row.message,
  name: row.name,
  role: row.role,
  avatar: resolveAvatarUrl(supabase, row.avatar_key),
  rate: clampRate(row.rate),
})

export function TestimonialSection() {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(
    FALLBACK_TESTIMONIALS
  )

  useEffect(() => {
    let cancelled = false

    const fetchTestimonials = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('website_testimonials')
        .select('id, avatar_key, name, role, message, rate')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (error) {
        console.error('Failed to load website testimonials:', error)
        setTestimonials(FALLBACK_TESTIMONIALS)
        return
      }

      if (!data || data.length === 0) {
        setTestimonials(FALLBACK_TESTIMONIALS)
        return
      }

      setTestimonials(data.map((row) => mapDbTestimonial(supabase, row)))
    }

    fetchTestimonials()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className='relative overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-24'>
      <div
        className='pointer-events-none absolute inset-0 opacity-40'
        style={{
          backgroundImage: "url('/testimonial-pattern.svg')",
          backgroundSize: 'cover',
        }}
      />

      <div className='relative z-10 mx-auto max-w-[1380px]'>
        <p className='text-center text-2xl text-primary'>
          Clients Testimonials
        </p>
        <h2 className='mt-3 text-center text-4xl font-black leading-tight text-black sm:text-5xl'>
          What Our Travelers Say
        </h2>

        <div className='mt-14 grid gap-10 md:grid-cols-2 xl:grid-cols-3'>
          {testimonials.map((item) => (
            <article key={item.id} className='space-y-6'>
              <p className='text-lg leading-relaxed text-[#03233a]'>
                {item.quote}
              </p>

              <div className='flex items-center gap-3'>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`${item.id}-star-${index + 1}`}
                    className='h-5 w-5 text-primary'
                    fill={index < item.rate ? 'currentColor' : 'none'}
                  />
                ))}
              </div>

              <div className='flex items-center gap-4'>
                <img
                  src={item.avatar}
                  alt={item.name}
                  className='h-12 w-12 rounded-full object-cover'
                />
                <div>
                  <p className='text-2xl font-bold text-black'>{item.name}</p>
                  <p className='text-sm text-[#03233a]/80'>{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
