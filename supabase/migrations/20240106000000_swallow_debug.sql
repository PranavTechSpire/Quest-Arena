-- Create a debug table
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id serial primary key,
    message text,
    created_at timestamp default now()
);

-- Modify trigger to catch exceptions and NOT raise them
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, username, email, exam_preference, created_at, updated_at)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
      new.email,
      COALESCE((new.raw_user_meta_data->>'exam_preference')::exam_type, 'UPSC_GS1'::exam_type),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO public.debug_logs (message) VALUES (SQLERRM);
    -- Intentionally NOT raising exception so we can read the log!
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
