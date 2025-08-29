/*
  # Create extract_product_images function and settings

  1. Extensions
    - Enable http extension for making HTTP requests

  2. Settings
    - Create custom settings for edge function URL and service role key
    - Set default values for development environment

  3. Functions
    - `http_header`: Helper function for creating HTTP headers
    - `http`: Function for making HTTP requests
    - `extract_product_images`: Extracts product images from provided URLs
      - Input: Array of URLs
      - Output: Array of objects containing image URLs and product titles

  4. Security
    - Functions are accessible to authenticated users only
    - Uses security definer to ensure proper permissions
*/

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http;

-- Create custom settings
DO $$ 
BEGIN
  -- Create app.settings namespace if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'app'
  ) THEN
    CREATE SCHEMA app;
  END IF;
END $$;

-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text
);

-- Insert default settings with placeholder values
INSERT INTO app.settings (key, value, description)
VALUES 
  ('edge_function_url', 'https://qtiknlfjwgcshfrcqznk.supabase.co/functions/v1', 'URL for Edge Functions'),
  ('service_role_key', 'default_key', 'Service Role Key for authentication')
ON CONFLICT (key) DO NOTHING;

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

-- Create http_header type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_header') THEN
    CREATE TYPE http_header AS (
      field_name text,
      field_value text
    );
  END IF;
END $$;

-- Create http_header function
CREATE OR REPLACE FUNCTION http_header(field_name text, field_value text)
RETURNS http_header
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROW(field_name, field_value)::http_header;
$$;

-- Create http_request type if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_request') THEN
    CREATE TYPE http_request AS (
      method text,
      url text,
      headers http_header[],
      content_type text,
      content text
    );
  END IF;
END $$;

-- Create http function
CREATE OR REPLACE FUNCTION http(request http_request)
RETURNS TABLE (
  status integer,
  content text,
  headers http_header[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is just a wrapper around the http extension's functions
  RETURN QUERY SELECT 
    http_get.status,
    http_get.content::text,
    http_get.headers
  FROM http_get(request.url, request.headers);
END;
$$;

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
  -- Get configuration values from settings table
  edge_function_url := app.get_setting('edge_function_url');
  service_role_key := app.get_setting('service_role_key');

  IF edge_function_url IS NULL OR service_role_key IS NULL THEN
    RAISE EXCEPTION 'Missing required configuration settings';
  END IF;

  -- Make HTTP request to Edge Function
  SELECT content::jsonb->'data' INTO result
  FROM http((
    'POST',
    edge_function_url || '/extract-product-images',
    ARRAY[http_header('Authorization', 'Bearer ' || service_role_key)],
    'application/json',
    jsonb_build_object('urls', urls)::text
  )::http_request);
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to extract images: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION extract_product_images(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION http_header(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION http(http_request) TO authenticated;

-- Grant access to settings functions
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.get_setting(text) TO authenticated;
GRANT SELECT ON TABLE app.settings TO authenticated;

-- Add comment
COMMENT ON FUNCTION extract_product_images(text[]) IS 'Extracts product images from provided URLs using Puppeteer';