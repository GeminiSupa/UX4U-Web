alter table team_members add column if not exists photo_url text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio', 'studio', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true;

drop policy if exists "public read studio" on storage.objects;
create policy "public read studio" on storage.objects for select to anon, authenticated
using (bucket_id = 'studio');
