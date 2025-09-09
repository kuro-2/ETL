/*
  # Create storage schema and tables for toy images

  1. Changes
    - Create custom storage schema
    - Create buckets and objects tables
    - Add necessary indexes and constraints
    - Set up RLS policies for access control

  2. Security
    - Enable RLS on all tables
    - Add policies for public access and authenticated users
*/

-- Create storage schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS storage;

-- Create buckets table
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create objects table
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  UNIQUE (bucket_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS objects_path_tokens_idx ON storage.objects USING gin (path_tokens);
CREATE INDEX IF NOT EXISTS objects_bucket_id_idx ON storage.objects (bucket_id);

-- Enable RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create toys bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('toys', 'toys', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for buckets
CREATE POLICY "Public Access"
ON storage.buckets FOR SELECT
TO public
USING (public = true);

CREATE POLICY "Authenticated users can create buckets"
ON storage.buckets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policies for objects
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN (
    SELECT id FROM storage.buckets WHERE public = true
  )
);

CREATE POLICY "Authenticated users can upload objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'toys');

CREATE POLICY "Authenticated users can update objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'toys');

CREATE POLICY "Authenticated users can delete objects"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'toys');

-- Create function to handle file uploads
CREATE OR REPLACE FUNCTION storage.upload_object(
  bucket_name text,
  object_name text,
  file_data bytea,
  content_type text DEFAULT 'application/octet-stream'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_object_id uuid;
BEGIN
  INSERT INTO storage.objects (
    bucket_id,
    name,
    size,
    mime_type
  )
  VALUES (
    bucket_name,
    object_name,
    octet_length(file_data),
    content_type
  )
  RETURNING id INTO new_object_id;

  RETURN new_object_id;
END;
$$;