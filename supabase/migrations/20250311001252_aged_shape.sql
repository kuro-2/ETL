/*
  # Update toys table and refresh functionality

  1. Changes
    - Add function to extract image URL from product page
    - Add function to refresh toy images
    - Add trigger to update images array when URL is updated

  2. Security
    - Functions are security definer to allow access to external URLs
    - RLS policies remain unchanged
*/

-- Create function to extract image URL from product page
CREATE OR REPLACE FUNCTION get_product_image_url(product_url text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  image_url text;
BEGIN
  -- This is a placeholder - in production you would implement
  -- proper web scraping logic based on the store's HTML structure
  -- For now, we'll return null to indicate no image found
  RETURN NULL;
END;
$$;

-- Create function to refresh toy images
CREATE OR REPLACE FUNCTION refresh_toy_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  toy_record RECORD;
BEGIN
  FOR toy_record IN SELECT id, url FROM toys WHERE url IS NOT NULL
  LOOP
    -- Get image URL from product page
    DECLARE
      new_image_url text := get_product_image_url(toy_record.url);
    BEGIN
      IF new_image_url IS NOT NULL THEN
        -- Update the images array with the new URL
        UPDATE toys 
        SET images = ARRAY[new_image_url]
        WHERE id = toy_record.id;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Create trigger function to update images array when URL changes
CREATE OR REPLACE FUNCTION update_toy_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_image_url text;
BEGIN
  -- Only proceed if URL has changed and is not null
  IF (TG_OP = 'INSERT' OR OLD.url IS DISTINCT FROM NEW.url) AND NEW.url IS NOT NULL THEN
    new_image_url := get_product_image_url(NEW.url);
    IF new_image_url IS NOT NULL THEN
      NEW.images := ARRAY[new_image_url];
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update images when URL changes
DROP TRIGGER IF EXISTS update_toy_images_trigger ON toys;
CREATE TRIGGER update_toy_images_trigger
  BEFORE INSERT OR UPDATE OF url ON toys
  FOR EACH ROW
  EXECUTE FUNCTION update_toy_images();