/*
  # Configure Image Extraction Settings
  
  1. New Schema
    - Creates 'app' schema for application settings
  
  2. New Tables
    - `app.settings`: Stores application configuration
      - key (text, primary key)
      - value (text)
      - description (text)
  
  3. Default Settings
    - Edge function URL
    - Service role key
  
  4. Functions
    - `extract_product_images`: Extracts images from provided URLs
  
  5. Security
    - Enables RLS on settings table
    - Adds read-only policy for authenticated users
*/

-- Create app schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

-- Insert default configuration values with a default value if not set
DO $$
BEGIN
  -- Insert edge function URL
  INSERT INTO app.settings (key, value, description)
  VALUES (
    'edge_function_url',
    'https://qtiknlfjwgcshfrcqznk.functions.supabase.co/extract-product-images',
    'URL for Edge Functions'
  )
  ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value;

  -- Insert service role key with a fallback
  INSERT INTO app.settings (key, value, description)
  VALUES (
    'service_role_key',
    COALESCE(
      current_setting('app.settings.service_role_key', true),
      'default-key-needs-configuration'
    ),
    'Service Role Key for Authentication'
  )
  ON CONFLICT (key) DO UPDATE 
  SET value = COALESCE(
    current_setting('app.settings.service_role_key', true),
    EXCLUDED.value
  );
END;
$$;

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

  -- Get service role key from settings
  SELECT value INTO service_role_key 
  FROM app.settings 
  WHERE key = 'service_role_key';

  IF service_role_key IS NULL OR service_role_key = 'default-key-needs-configuration' THEN
    RAISE EXCEPTION 'Service role key not properly configured';
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

-- Create RLS policy for settings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'app' 
    AND tablename = 'settings' 
    AND policyname = 'Allow authenticated users to read settings'
  ) THEN
    CREATE POLICY "Allow authenticated users to read settings"
      ON app.settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Edge Function';