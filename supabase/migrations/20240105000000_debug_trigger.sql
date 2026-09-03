-- Create a debug table
CREATE TABLE IF NOT EXISTS public.debug_logs (
    id serial primary key,
    message text,
    created_at timestamp default now()
);

-- Modify trigger to catch exceptions
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
    RAISE EXCEPTION '%', SQLERRM;
  END;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
