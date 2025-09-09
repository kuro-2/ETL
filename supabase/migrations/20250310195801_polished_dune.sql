/*
  # User Comparison Analysis
  
  This migration creates functions to analyze user data and permissions
  across different tables to help diagnose access issues.
*/

-- Create a function to compare user data
CREATE OR REPLACE FUNCTION compare_users(email1 text, email2 text)
RETURNS TABLE (
  data_type text,
  email text,
  details jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return users table data
  RETURN QUERY
  SELECT 
    'users' as data_type,
    u.email,
    jsonb_build_object(
      'id', u.id,
      'user_type', u.user_type,
      'created_at', u.created_at,
      'updated_at', u.updated_at
    ) as details
  FROM users u
  WHERE u.email IN (email1, email2);

  -- Return auth schema user data
  RETURN QUERY
  SELECT 
    'auth_users' as data_type,
    au.email,
    jsonb_build_object(
      'id', au.id,
      'metadata', au.raw_user_meta_data,
      'app_metadata', au.raw_app_meta_data
    ) as details
  FROM auth.users au
  WHERE au.email IN (email1, email2);

  -- Return role-specific table data
  RETURN QUERY
  SELECT 
    'role_assignments' as data_type,
    r.email,
    jsonb_build_object(
      'role', r.role,
      'id', r.id
    ) as details
  FROM (
    SELECT 'super_admin' as role, email, super_admin_id as id
    FROM super_admins
    WHERE email IN (email1, email2)
    UNION ALL
    SELECT 'teacher' as role, email, teacher_id as id
    FROM teachers
    WHERE email IN (email1, email2)
    UNION ALL
    SELECT 'student' as role, email, student_id as id
    FROM students
    WHERE email IN (email1, email2)
    UNION ALL
    SELECT 'admin' as role, email, admin_user_id as id
    FROM admin_users
    WHERE email IN (email1, email2)
  ) r;

  -- Return session data
  RETURN QUERY
  SELECT 
    'sessions' as data_type,
    s.user_email as email,
    jsonb_build_object(
      'id', s.id,
      'user_id', s.user_id,
      'started_at', s.started_at,
      'last_active_at', s.last_active_at,
      'is_active', s.is_active
    ) as details
  FROM user_sessions s
  WHERE s.user_email IN (email1, email2)
  ORDER BY s.last_active_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION compare_users(text, text) TO authenticated;

-- Create a comment explaining the function's purpose
COMMENT ON FUNCTION compare_users(text, text) IS 'Compares user data across multiple tables for two email addresses to help diagnose permission issues';