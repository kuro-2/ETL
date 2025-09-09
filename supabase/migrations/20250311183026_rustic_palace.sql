/*
  # Create extract_product_images function

  1. Extensions
    - Enable http extension for making HTTP requests

  2. New Functions
    - `extract_product_images`: Extracts product images from provided URLs
      - Input: Array of URLs
      - Output: Array of objects containing image URLs and product titles

  3. Security
    - Function is accessible to authenticated users only
    - Uses security definer to ensure proper permissions
*/

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

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
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Get configuration values
  edge_function_url := current_setting('app.settings.edge_function_url');
  service_role_key := current_setting('app.settings.service_role_key');

  -- Make HTTP request to Edge Function
  SELECT content::jsonb->'data' INTO result
  FROM http((
    'POST',
    edge_function_url || '/extract-product-images',
    ARRAY[http_header('Authorization', 'Bearer ' || service_role_key)],
    'application/json',
    jsonb_build_object('urls', urls)::text
  ));
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to extract images: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Puppeteer';