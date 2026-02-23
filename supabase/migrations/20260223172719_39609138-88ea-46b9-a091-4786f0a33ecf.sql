-- Add sentiment analysis columns to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS sentiment text,
ADD COLUMN IF NOT EXISTS sentiment_score numeric,
ADD COLUMN IF NOT EXISTS sentiment_flags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_score numeric;

-- Create index for faster sentiment queries in moderation
CREATE INDEX IF NOT EXISTS idx_reviews_sentiment ON public.reviews (sentiment) WHERE is_approved = false;
CREATE INDEX IF NOT EXISTS idx_reviews_not_approved ON public.reviews (created_at DESC) WHERE is_approved = false;
