/*
  # Create extract_product_images function

  1. New Functions
    - `extract_product_images`: Extracts product images from provided URLs
      - Input: Array of URLs
      - Output: Array of objects containing image URLs and product titles

  2. Security
    - Function is accessible to authenticated users only
    - Uses security definer to ensure proper permissions
*/

-- Drop the function if it exists
DROP FUNCTION IF EXISTS extract_product_images(text[]);

-- Create the function to extract product images
CREATE OR REPLACE FUNCTION extract_product_images(urls text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call Edge Function to extract images
  SELECT content::jsonb->'data' INTO result
  FROM http((
    'POST',
    current_setting('app.settings.edge_function_url') || '/extract-product-images',
    ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))],
    'application/json',
    jsonb_build_object('urls', urls)
  )::http_request);
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Puppeteer';