-- Restore strict feedback.rating: required integer 1-5 (for DBs that applied an earlier nullable-rating draft).

UPDATE public.feedback
SET rating = 3
WHERE rating IS NULL;

ALTER TABLE public.feedback
  DROP CONSTRAINT IF EXISTS feedback_rating_check;

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_rating_check
  CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE public.feedback
  ALTER COLUMN rating SET NOT NULL;
