CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email, exam_preference, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE((new.raw_user_meta_data->>'exam_preference')::public.exam_type, 'UPSC_GS1'::public.exam_type),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also let's run a quick patch to insert the user who just signed up but failed to get inserted!
-- Since they are in auth.users but not in public.users.
INSERT INTO public.users (id, username, email, exam_preference)
SELECT id, split_part(email, '@', 1), email, 'UPSC_GS1'::public.exam_type
FROM auth.users 
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT DO NOTHING;
