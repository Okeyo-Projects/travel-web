-- Revert FK constraint on reels (Back to ON DELETE SET NULL)
ALTER TABLE public.reels
DROP CONSTRAINT IF EXISTS reels_experience_id_fkey;

ALTER TABLE public.reels
ADD CONSTRAINT reels_experience_id_fkey
FOREIGN KEY (experience_id)
REFERENCES public.experiences(id)
ON DELETE SET NULL;
