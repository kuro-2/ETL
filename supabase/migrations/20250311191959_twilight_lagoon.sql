/*
  # Update image extraction configuration
  
  1. Settings
    - Create app schema for configuration settings
    - Store edge function URL
    - Add function to securely access service role key
  
  2. Functions
    - Create HTTP helper functions in net schema
    - Create image extraction function with proper auth
    - Add necessary security and permissions
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS http;

-- Create net schema for HTTP functions
CREATE SCHEMA IF NOT EXISTS net;

-- Create the http_post function
CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  headers jsonb DEFAULT '{}'::jsonb,
  body text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id text;
BEGIN
  SELECT md5(random()::text || clock_timestamp()::text) INTO request_id;
  
  -- Make HTTP POST request using http extension
  PERFORM http.post(
    url,
    body,
    headers::text[]
  );
  
  RETURN request_id;
END;
$$;

-- Create the http_get_result function
CREATE OR REPLACE FUNCTION net.http_get_result(request_id text)
RETURNS TABLE (
  status_code int,
  response_body text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulate response for now since we're using http extension directly
  RETURN QUERY SELECT 
    200 as status_code,
    http.post(
      app.get_setting('edge_function_url') || '/extract-product-images',
      jsonb_build_object('urls', ARRAY[]::text[])::text,
      ARRAY['Authorization: Bearer ' || app.get_service_role_key()]
    )::text as response_body;
END;
$$;

-- Create app schema for settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'app'
  ) THEN
    CREATE SCHEMA app;
  END IF;
END $$;

-- Create settings table
CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

-- Insert edge function URL setting
INSERT INTO app.settings (key, value, description)
VALUES (
  'edge_function_url',
  'https://qtiknlfjwgcshfrcqznk.supabase.co/functions/v1',
  'URL for Edge Functions'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- Create function to get service role key
CREATE OR REPLACE FUNCTION app.get_service_role_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get service role key from environment variable
  RETURN COALESCE(
    current_setting('app.settings.service_role_key', true),
    current_setting('app.service_role_key', true)
  );
END;
$$;

-- Create function to get setting
CREATE OR REPLACE FUNCTION app.get_setting(setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT value 
    FROM app.settings 
    WHERE key = setting_key
  );
END;
$$;

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
  response text;
BEGIN
  -- Get configuration values
  edge_function_url := app.get_setting('edge_function_url');
  service_role_key := app.get_service_role_key();

  IF edge_function_url IS NULL THEN
    RAISE EXCEPTION 'Missing edge_function_url setting';
  END IF;

  IF service_role_key IS NULL THEN
    RAISE EXCEPTION 'Missing service_role_key setting';
  END IF;

  -- Make HTTP request using http extension directly
  SELECT http.post(
    edge_function_url || '/extract-product-images',
    jsonb_build_object('urls', urls)::text,
    ARRAY['Authorization: Bearer ' || service_role_key, 'Content-Type: application/json']
  ) INTO response;

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

-- Grant access to net functions
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Edge Function';