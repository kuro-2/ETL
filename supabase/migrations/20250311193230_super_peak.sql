/*
  # Fix HTTP Request Handling
  
  1. Functions
    - Update extract_product_images function to properly handle HTTP requests
    - Fix type casting issues with http extension
    - Maintain security and permissions
*/

-- Drop existing function if it exists
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
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Get edge function URL from settings
  SELECT value INTO edge_function_url 
  FROM app.settings 
  WHERE key = 'edge_function_url';

  -- Get service role key from environment
  service_role_key := current_setting('app.settings.service_role_key', true);

  IF edge_function_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Missing required configuration';
  END IF;

  -- Make HTTP request using http extension
  SELECT content::jsonb INTO result
  FROM extensions.http((
    'POST',
    edge_function_url || '/extract-product-images',
    ARRAY[
      ('Content-Type', 'application/json'),
      ('Authorization', 'Bearer ' || service_role_key)
    ]::extensions.http_header[],
    'application/json',
    jsonb_build_object('urls', urls)::text
  )::extensions.http_request);

  -- Extract data from response
  result := result->'data';
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Failed to extract images: Invalid response format';
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to extract images: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Edge Function';