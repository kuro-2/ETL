/*
  # Enable HTTP Extension and Update Image Extraction
  
  1. Extensions
    - Enable HTTP extension for making HTTP requests
  
  2. Settings
    - Create app schema for configuration
    - Store edge function URL
  
  3. Functions
    - Create image extraction function with proper auth
    - Add necessary security and permissions
*/

-- Create custom settings schema
CREATE SCHEMA IF NOT EXISTS app;

-- Create settings table
CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

-- Insert edge function URL setting
INSERT INTO app.settings (key, value, description)
VALUES 
  ('edge_function_url', 'https://qtiknlfjwgcshfrcqznk.supabase.co/functions/v1', 'URL for Edge Functions')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- Create function to get setting
CREATE OR REPLACE FUNCTION app.get_setting(setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT value FROM app.settings WHERE key = setting_key);
END;
$$;

-- Enable the HTTP extension
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA extensions;

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
  response text;
BEGIN
  -- Get edge function URL
  edge_function_url := app.get_setting('edge_function_url');
  IF edge_function_url IS NULL THEN
    RAISE EXCEPTION 'Missing edge_function_url setting';
  END IF;

  -- Make HTTP request using http extension
  SELECT content::text INTO response
  FROM extensions.http((
    'POST',
    edge_function_url || '/extract-product-images',
    ARRAY[
      ('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true))::extensions.http_header,
      ('Content-Type', 'application/json')::extensions.http_header
    ],
    'application/json',
    jsonb_build_object('urls', urls)::text,
    5
  ));

  -- Parse response
  result := response::jsonb->'data';
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Failed to extract images';
  END IF;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to extract images: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;

-- Grant access to settings functions
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.get_setting(text) TO authenticated;
GRANT SELECT ON TABLE app.settings TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Edge Function';