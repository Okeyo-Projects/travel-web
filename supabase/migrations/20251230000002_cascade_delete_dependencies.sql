-- Bookings: Allow cascade delete
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_experience_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_experience_id_fkey
FOREIGN KEY (experience_id)
REFERENCES public.experiences(id)
ON DELETE CASCADE;

-- Reviews: Allow cascade delete
ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_experience_id_fkey;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_experience_id_fkey
FOREIGN KEY (experience_id)
REFERENCES public.experiences(id)
ON DELETE CASCADE;
