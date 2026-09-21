CREATE POLICY "Admins read corpus shards"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'corpus-shards' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins upload corpus shards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'corpus-shards' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update corpus shards"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'corpus-shards' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'corpus-shards' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete corpus shards"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'corpus-shards' AND public.has_role(auth.uid(), 'admin'::app_role));