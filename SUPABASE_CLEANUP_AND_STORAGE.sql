
-- Create a storage bucket for news images if it doesn't exist
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

-- Set up security policies for the storage bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'news-images' );

create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'news-images' );

create policy "Cleanup old news images"
  on storage.objects for delete
  using ( bucket_id = 'news-images' );

-- Drop unused tables
drop table if exists ai_models;
drop table if exists model_metrics;
drop table if exists model_logs;
drop table if exists model_health;
