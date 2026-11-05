-- New Supabase database only. Does not read, change or import Cloudflare data.
-- ISO date strings and JSON text remain text to preserve the existing UI contract.
ALTER TABLE public.portal_accounts ADD CONSTRAINT portal_auth_user FOREIGN KEY(id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.members ADD CONSTRAINT member_auth_user FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.portal_accounts ADD CONSTRAINT portal_role CHECK(role IN ('admin','employee'));
ALTER TABLE public.portal_accounts ADD CONSTRAINT portal_identity CHECK((role='admin' AND member_id IS NULL) OR (role='employee' AND member_id IS NOT NULL));
ALTER TABLE public.portal_accounts ADD COLUMN credential_version integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX portal_single_admin ON public.portal_accounts(role) WHERE role='admin';
CREATE UNIQUE INDEX portal_email_lower ON public.portal_accounts(lower(email));
CREATE UNIQUE INDEX members_email_lower ON public.members(lower(email));
ALTER TABLE public.members ADD CONSTRAINT member_active CHECK(active IN ('yes','no'));
ALTER TABLE public.members ADD CONSTRAINT member_capacity CHECK(task_capacity ~ '^[0-9]+$' AND task_capacity::integer BETWEEN 1 AND 100);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_member FOREIGN KEY(assignee_id) REFERENCES public.members(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status CHECK(status IN ('todo','in_progress','review','completed'));
ALTER TABLE public.tasks ADD CONSTRAINT tasks_priority CHECK(priority IN ('low','normal','high','urgent'));
ALTER TABLE public.task_comments ADD CONSTRAINT comments_task FOREIGN KEY(task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_checklist ADD CONSTRAINT checklist_task FOREIGN KEY(task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_checklist ADD CONSTRAINT checklist_done CHECK(done IN ('yes','no'));
ALTER TABLE public.task_drafts ADD CONSTRAINT drafts_task FOREIGN KEY(task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.task_drafts ADD CONSTRAINT drafts_member FOREIGN KEY(member_id) REFERENCES public.members(id);
CREATE UNIQUE INDEX drafts_task_member ON public.task_drafts(task_id,member_id);
ALTER TABLE public.work_submissions ADD CONSTRAINT submissions_task FOREIGN KEY(task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.work_submissions ADD CONSTRAINT submissions_member FOREIGN KEY(member_id) REFERENCES public.members(id);
ALTER TABLE public.employee_requests ADD CONSTRAINT requests_member FOREIGN KEY(member_id) REFERENCES public.members(id);
ALTER TABLE public.employee_requests ADD CONSTRAINT requests_status CHECK(status IN ('open','in_progress','resolved'));
ALTER TABLE public.employee_requests ADD CONSTRAINT requests_category CHECK(category IN ('access','task','schedule','general'));
ALTER TABLE public.workspace_resources ADD CONSTRAINT resources_active CHECK(active IN ('yes','no'));
ALTER TABLE public.workspace_resources ADD CONSTRAINT resources_kind CHECK(kind IN ('guide','announcement'));
ALTER TABLE public.applications ADD CONSTRAINT application_stage CHECK(stage IN ('new','screening','shortlisted','interview','hired','not_selected','on_hold'));
CREATE INDEX tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX comments_task ON public.task_comments(task_id);
CREATE INDEX checklist_task ON public.task_checklist(task_id);
CREATE INDEX submissions_member ON public.work_submissions(member_id);
CREATE INDEX requests_member ON public.employee_requests(member_id);
CREATE INDEX activity_entity ON public.activity(kind,entity_id);

CREATE TABLE public.portal_limits(key text PRIMARY KEY, attempts integer NOT NULL, expires_at bigint NOT NULL);
CREATE INDEX portal_limits_expiry ON public.portal_limits(expires_at);
-- This is an access revocation ledger, not a replacement authentication system.
-- Supabase owns passwords, JWTs, refresh tokens, cookie rotation and sessions.
CREATE TABLE public.portal_revoked_sessions(session_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE INDEX portal_revoked_user ON public.portal_revoked_sessions(user_id);

CREATE SCHEMA IF NOT EXISTS portal_private;
REVOKE ALL ON SCHEMA portal_private FROM PUBLIC;
GRANT USAGE ON SCHEMA portal_private TO authenticated;
CREATE FUNCTION portal_private.current_role() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT a.role FROM public.portal_accounts a LEFT JOIN public.members m ON m.id=a.member_id
  WHERE a.id=auth.uid() AND NOT a.must_change_password AND (a.role='admin' OR m.active='yes')
    AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id::text=(auth.jwt()->>'session_id') AND s.user_id=a.id)
    AND NOT EXISTS(SELECT 1 FROM public.portal_revoked_sessions r WHERE r.session_id::text=(auth.jwt()->>'session_id'))
$$;
CREATE FUNCTION portal_private.current_member() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT member_id FROM public.portal_accounts WHERE id=auth.uid() AND portal_private.current_role()='employee'
$$;
REVOKE ALL ON FUNCTION portal_private.current_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION portal_private.current_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION portal_private.current_role(), portal_private.current_member() TO authenticated;

-- All browser/Data API writes are denied, including writes by administrators.
-- Writes go through same-origin Next.js routes with live session/role checks and
-- field/transition validation. PostgreSQL credentials and secret keys stay server-only.
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['account_profiles','activity','applications','employee_requests','members','portal_accounts','task_checklist','task_comments','task_drafts','tasks','work_submissions','workspace_resources','portal_limits','portal_revoked_sessions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',name);
  END LOOP;
END $$;
GRANT SELECT ON public.account_profiles,public.activity,public.applications,public.employee_requests,public.members,public.portal_accounts,public.task_checklist,public.task_comments,public.task_drafts,public.tasks,public.work_submissions,public.workspace_resources TO authenticated;
CREATE POLICY accounts_read ON public.portal_accounts FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR (id=auth.uid() AND portal_private.current_role()='employee'));
CREATE POLICY profiles_read ON public.account_profiles FOR SELECT TO authenticated USING(portal_private.current_role()='admin' AND account_id=auth.uid());
CREATE POLICY applications_read ON public.applications FOR SELECT TO authenticated USING(portal_private.current_role()='admin');
CREATE POLICY members_read ON public.members FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR id=portal_private.current_member());
CREATE POLICY tasks_read ON public.tasks FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR assignee_id=portal_private.current_member());
CREATE POLICY comments_read ON public.task_comments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=task_id));
CREATE POLICY checklist_read ON public.task_checklist FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=task_id));
CREATE POLICY drafts_read ON public.task_drafts FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR member_id=portal_private.current_member());
CREATE POLICY submissions_read ON public.work_submissions FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR member_id=portal_private.current_member());
CREATE POLICY requests_read ON public.employee_requests FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR member_id=portal_private.current_member());
CREATE POLICY resources_read ON public.workspace_resources FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR (portal_private.current_role()='employee' AND active='yes'));
CREATE POLICY activity_read ON public.activity FOR SELECT TO authenticated USING(portal_private.current_role()='admin' OR (kind='task' AND EXISTS(SELECT 1 FROM public.tasks t WHERE t.id=entity_id)));

-- Fixed private bucket name; set SUPABASE_STORAGE_BUCKET=portal-cvs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('portal-cvs','portal-cvs',false,5242880,ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
-- No public/employee upload, list, update or delete policies. Server signs specific
-- pending object uploads, validates bytes, then writes immutable final CV objects.
CREATE POLICY portal_cv_admin_read ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='portal-cvs' AND name LIKE 'resumes/%' AND portal_private.current_role()='admin');
