-- F1: pipeline_blocks was readable and writable by anon and every authenticated
-- user via USING (true) / WITH CHECK (true). Scope it to the owner of the parent project.

DROP POLICY IF EXISTS anon_select_pipeline_blocks ON public.pipeline_blocks;
DROP POLICY IF EXISTS anon_insert_pipeline_blocks ON public.pipeline_blocks;
DROP POLICY IF EXISTS anon_update_pipeline_blocks ON public.pipeline_blocks;
DROP POLICY IF EXISTS anon_delete_pipeline_blocks ON public.pipeline_blocks;

ALTER TABLE public.pipeline_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_pipeline_blocks" ON public.pipeline_blocks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pipeline_blocks.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "insert_own_pipeline_blocks" ON public.pipeline_blocks FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pipeline_blocks.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "update_own_pipeline_blocks" ON public.pipeline_blocks FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pipeline_blocks.project_id AND p.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pipeline_blocks.project_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "delete_own_pipeline_blocks" ON public.pipeline_blocks FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pipeline_blocks.project_id AND p.user_id = auth.uid()
  ));

REVOKE ALL ON public.pipeline_blocks FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pipeline_blocks TO authenticated;
