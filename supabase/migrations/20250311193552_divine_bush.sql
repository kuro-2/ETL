/*
  # Fix Configuration Settings
  
  1. Changes
    - Create app schema and settings table
    - Add configuration values for image extraction
    - Create function to extract product images
  
  2. Security
    - Enable RLS for settings table
    - Set up appropriate access policies
*/

-- Create app schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

-- Insert default configuration values
INSERT INTO app.settings (key, value, description)
VALUES 
  ('edge_function_url', 'https://qtiknlfjwgcshfrcqznk.functions.supabase.co/extract-product-images', 'URL for Edge Functions')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

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

  IF edge_function_url IS NULL THEN
    RAISE EXCEPTION 'Edge function URL not configured';
  END IF;

  -- Get service role key from environment variable
  service_role_key := current_setting('app.settings.service_role_key', true);

  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Service role key not configured';
  END IF;

  -- Make HTTP request using http extension
  SELECT content::jsonb INTO result
  FROM extensions.http((
    'POST',
    edge_function_url,
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT SELECT ON app.settings TO authenticated;
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;

-- Enable RLS on settings table
ALTER TABLE app.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for settings
CREATE POLICY "Allow authenticated users to read settings"
  ON app.settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Edge Function';