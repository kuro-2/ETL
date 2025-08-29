/*
  # Add Super Admin Access Policies

  1. Changes
    - Add policies to allow super_admin role full access to all tables
    - Ensure super_admin can perform all operations (SELECT, INSERT, UPDATE, DELETE)
    
  2. Security
    - Policies check user role via get_effective_role() function
    - Only super_admin role gets full access
    - Maintains existing policies for other roles
*/

-- Function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN get_effective_role(auth.uid()) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add super_admin policies to users table
CREATE POLICY "super_admin_users_all_access" ON users
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to admin_users table
CREATE POLICY "super_admin_admin_users_all_access" ON admin_users
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to teachers table
CREATE POLICY "super_admin_teachers_all_access" ON teachers
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to students table
CREATE POLICY "super_admin_students_all_access" ON students
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to parents table
CREATE POLICY "super_admin_parents_all_access" ON parents
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to schools table
CREATE POLICY "super_admin_schools_all_access" ON schools
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to districts table
CREATE POLICY "super_admin_districts_all_access" ON districts
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to classrooms table
CREATE POLICY "super_admin_classrooms_all_access" ON classrooms
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to courses table
CREATE POLICY "super_admin_courses_all_access" ON courses
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to classroom_enrollments table
CREATE POLICY "super_admin_classroom_enrollments_all_access" ON classroom_enrollments
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to course_enrollments table
CREATE POLICY "super_admin_course_enrollments_all_access" ON course_enrollments
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to attendance_records table
CREATE POLICY "super_admin_attendance_records_all_access" ON attendance_records
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to medical_records table
CREATE POLICY "super_admin_medical_records_all_access" ON medical_records
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to individualized_needs table
CREATE POLICY "super_admin_individualized_needs_all_access" ON individualized_needs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to performance_records table
CREATE POLICY "super_admin_performance_records_all_access" ON performance_records
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to student_parents table
CREATE POLICY "super_admin_student_parents_all_access" ON student_parents
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to super_admins table
CREATE POLICY "super_admin_super_admins_all_access" ON super_admins
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to support_staff table
CREATE POLICY "super_admin_support_staff_all_access" ON support_staff
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to system_admins table
CREATE POLICY "super_admin_system_admins_all_access" ON system_admins
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to user_preferences table
CREATE POLICY "super_admin_user_preferences_all_access" ON user_preferences
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to user_sessions table
CREATE POLICY "super_admin_user_sessions_all_access" ON user_sessions
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to xp_activities table
CREATE POLICY "super_admin_xp_activities_all_access" ON xp_activities
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to xp_levels table
CREATE POLICY "super_admin_xp_levels_all_access" ON xp_levels
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to student_rewards table
CREATE POLICY "super_admin_student_rewards_all_access" ON student_rewards
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to rewards table
CREATE POLICY "super_admin_rewards_all_access" ON rewards
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to toys table
CREATE POLICY "super_admin_toys_all_access" ON toys
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to feedback table
CREATE POLICY "super_admin_feedback_all_access" ON feedback
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to app_settings table
CREATE POLICY "super_admin_app_settings_all_access" ON app_settings
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to chat_memories table
CREATE POLICY "super_admin_chat_memories_all_access" ON chat_memories
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Add super_admin policies to library table
CREATE POLICY "super_admin_library_all_access" ON library
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());