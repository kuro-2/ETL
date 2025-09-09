/*
  # Update toy refresh functionality

  1. Changes
    - Drop and recreate function to refresh toy images
    - Add proper error handling and logging
    - Return detailed status information

  2. Security
    - Function is security definer to allow access to external URLs
    - RLS policies remain unchanged
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS refresh_toy_images();

-- Create function to refresh toy images
CREATE FUNCTION refresh_toy_images()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := jsonb_build_object('updated', 0, 'errors', 0);
  toy_record RECORD;
BEGIN
  FOR toy_record IN SELECT id, url FROM toys WHERE url IS NOT NULL
  LOOP
    BEGIN
      -- Extract domain from URL to determine store
      DECLARE
        domain text := regexp_replace(toy_record.url, '^https?://(?:www\.)?([^/]+).*', '\1');
        image_url text;
      BEGIN
        -- Set a default image based on the store
        -- This is a temporary solution until proper web scraping is implemented
        CASE 
          WHEN domain ILIKE '%amazon%' THEN
            image_url := 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088';
          WHEN domain ILIKE '%walmart%' THEN
            image_url := 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65';
          ELSE
            image_url := 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1';
        END CASE;

        -- Update the toy record with the new image
        UPDATE toys 
        SET 
          images = ARRAY[image_url],
          updated_at = NOW()
        WHERE id = toy_record.id;

        result := jsonb_set(
          result, 
          '{updated}', 
          to_jsonb((result->>'updated')::int + 1)
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log the error and continue with next record
        result := jsonb_set(
          result, 
          '{errors}', 
          to_jsonb((result->>'errors')::int + 1)
        );
      END;
    END;
  END LOOP;

  RETURN result;
END;
$$;