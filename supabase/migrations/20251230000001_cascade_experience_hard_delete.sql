-- Remove the FK constraint that sets null on delete
ALTER TABLE public.reels
DROP CONSTRAINT IF EXISTS reels_experience_id_fkey;

-- Add new FK constraint with cascade delete
ALTER TABLE public.reels
ADD CONSTRAINT reels_experience_id_fkey
FOREIGN KEY (experience_id)
REFERENCES public.experiences(id)
ON DELETE CASCADE;
