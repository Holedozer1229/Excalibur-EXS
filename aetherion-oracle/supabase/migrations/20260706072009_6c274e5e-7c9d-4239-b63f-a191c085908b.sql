CREATE POLICY "Gallery: owner can read own objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'gallery'
  AND auth.uid()::text = (storage.foldername(name))[1]
);