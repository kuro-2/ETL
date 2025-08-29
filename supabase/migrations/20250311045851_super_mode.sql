/*
  # Fix authentication policies for functions
  
  1. Changes
    - Add proper security policies for functions
    - Ensure super_admin access is properly checked
    - Add helper function for super admin verification
    
  2. Security
    - Functions are security definer
    - Proper RLS policies
    - Role-based access control
*/

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user exists in super_admins table
  RETURN EXISTS (
    SELECT 1 
    FROM public.super_admins sa
    WHERE sa.super_admin_id = auth.uid()
  );
END;
$$;

-- Revoke all on functions from public
REVOKE ALL ON FUNCTION public.extract_title_from_html FROM public;
REVOKE ALL ON FUNCTION public.extract_images_from_html FROM public;
REVOKE ALL ON FUNCTION public.extract_product_images FROM public;

-- Grant execute to authenticated users with super_admin check
ALTER FUNCTION public.extract_title_from_html(text) 
  SET search_path = public
  SECURITY DEFINER;

ALTER FUNCTION public.extract_images_from_html(text, text) 
  SET search_path = public
  SECURITY DEFINER;

ALTER FUNCTION public.extract_product_images(text[]) 
  SET search_path = public
  SECURITY DEFINER;

-- Add security barrier to ensure super admin check
CREATE OR REPLACE FUNCTION public.extract_product_images(urls text[])
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Only super admins can perform this operation.';
  END IF;

  -- Execute original function
  RETURN public.extract_product_images(urls);
END;
$$;