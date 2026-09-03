-- Function to increment user score atomically
CREATE OR REPLACE FUNCTION increment_user_score(u_id UUID, score_val FLOAT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users 
    SET total_score = COALESCE(total_score, 0) + score_val,
        highest_score = GREATEST(COALESCE(highest_score, 0), COALESCE(total_score, 0) + score_val)
    WHERE id = u_id;
END;
$$;

-- Function to increment user streak atomically
CREATE OR REPLACE FUNCTION increment_user_streak(u_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users 
    SET current_streak = COALESCE(current_streak, 0) + 1,
        longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1)
    WHERE id = u_id;
END;
$$;
