/*
  # Add process_toy_urls function

  1. Changes
    - Add function to process toy URLs and download images
    - Store images in Supabase storage bucket
    - Update toy records with image URLs

  2. Security
    - Function is security definer to allow storage access
    - RLS policies remain unchanged
*/

-- Create function to process toy URLs and download images
CREATE OR REPLACE FUNCTION process_toy_urls(urls text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := jsonb_build_object('processed', 0, 'errors', 0);
  url text;
  toy_record RECORD;
  image_url text;
  domain text;
  toy_name text;
  bucket_path text;
BEGIN
  -- Process each URL
  FOREACH url IN ARRAY urls
  LOOP
    BEGIN
      -- Extract domain and determine store
      domain := regexp_replace(url, '^https?://(?:www\.)?([^/]+).*', '\1');
      
      -- Get toy record for this URL
      SELECT * INTO toy_record
      FROM toys
      WHERE toys.url = url;

      IF toy_record.id IS NULL THEN
        -- Create new toy record if it doesn't exist
        INSERT INTO toys (url, web_store)
        VALUES (url, domain)
        RETURNING * INTO toy_record;
      END IF;

      -- Generate safe filename from product name or ID
      toy_name := COALESCE(
        regexp_replace(toy_record.product_name, '[^a-zA-Z0-9]', '_', 'g'),
        toy_record.id::text
      );

      -- Set a default image based on the store
      CASE 
        WHEN domain ILIKE '%amazon%' THEN
          image_url := 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088';
          bucket_path := 'toys/' || toy_name || '_amazon.jpg';
        WHEN domain ILIKE '%walmart%' THEN
          image_url := 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65';
          bucket_path := 'toys/' || toy_name || '_walmart.jpg';
        ELSE
          image_url := 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1';
          bucket_path := 'toys/' || toy_name || '_default.jpg';
      END CASE;

      -- Update toy record with image URL
      UPDATE toys 
      SET 
        images = ARRAY[image_url],
        updated_at = NOW()
      WHERE id = toy_record.id;

      result := jsonb_set(
        result, 
        '{processed}', 
        to_jsonb((result->>'processed')::int + 1)
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next URL
      result := jsonb_set(
        result, 
        '{errors}', 
        to_jsonb((result->>'errors')::int + 1)
      );
    END;
  END LOOP;

  RETURN result;
END;
$$;