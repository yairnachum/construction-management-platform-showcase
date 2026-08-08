-- Sanitized extract from the private production application.
-- Business-specific data and identifiers are intentionally omitted.

-- Helper: role of the authenticated user.
CREATE OR REPLACE FUNCTION current_role_value() RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper: is the authenticated user assigned to a project?
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY profiles_select_office ON profiles
  FOR SELECT USING (current_role_value() = 'office');

CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all ON profiles
  FOR ALL USING (
    current_role_value() = 'office'
    AND (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_office_all ON projects
  FOR ALL USING (current_role_value() = 'office')
  WITH CHECK (current_role_value() = 'office');

CREATE POLICY projects_field_select ON projects
  FOR SELECT USING (
    current_role_value() = 'foreman'
    AND is_project_member(id)
  );

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_members_office_all ON project_members
  FOR ALL USING (current_role_value() = 'office')
  WITH CHECK (current_role_value() = 'office');

CREATE POLICY project_members_field_select_self ON project_members
  FOR SELECT USING (user_id = auth.uid());
