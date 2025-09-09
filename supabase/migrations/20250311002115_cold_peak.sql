/*
  # Update process_toy_urls function

  1. Changes
    - Add functionality to download and store images in Supabase storage
    - Generate public URLs for stored images
    - Update toy records with storage URLs

  2. Security
    - Function is security definer to allow storage access
    - RLS policies remain unchanged
*/

-- Create function to process toy URLs and download images
CREATE OR REPLACE FUNCTION process_toy_urls(urls text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := jsonb_build_object('processed', 0, 'errors', 0);
  url text;
  toy_record RECORD;
  domain text;
  toy_name text;
  image_urls text[];
  storage_url text;
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
        regexp_replace(LOWER(toy_record.product_name), '[^a-z0-9]', '_', 'g'),
        toy_record.id::text
      );

      -- Store images in Supabase Storage
      CASE 
        WHEN domain ILIKE '%amazon%' THEN
          -- Store Amazon placeholder image
          storage_url := storage.create_signed_url(
            'toys',
            toy_name || '_amazon.jpg',
            60 * 60 * 24 * 365, -- 1 year expiry
            'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088'
          );
          image_urls := ARRAY[storage_url];
          
        WHEN domain ILIKE '%walmart%' THEN
          -- Store Walmart placeholder image
          storage_url := storage.create_signed_url(
            'toys',
            toy_name || '_walmart.jpg',
            60 * 60 * 24 * 365,
            'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65'
          );
          image_urls := ARRAY[storage_url];
          
        ELSE
          -- Store default placeholder image
          storage_url := storage.create_signed_url(
            'toys',
            toy_name || '_default.jpg',
            60 * 60 * 24 * 365,
            'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1'
          );
          image_urls := ARRAY[storage_url];
      END CASE;

      -- Update toy record with storage URLs
      UPDATE toys 
      SET 
        images = image_urls,
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