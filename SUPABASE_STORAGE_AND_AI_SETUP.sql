
-- Create storage bucket for news images
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

-- Enable RLS on AI tables
alter table ai_models enable row level security;
alter table model_metrics enable row level security;
alter table model_logs enable row level security;
alter table model_health enable row level security;

-- Allow public read access to AI tables (for monitoring)
create policy "Allow public read access to ai_models"
  on ai_models for select to anon using (true);

create policy "Allow public read access to model_metrics"
  on model_metrics for select to anon using (true);

create policy "Allow public read access to model_logs"
  on model_logs for select to anon using (true);

create policy "Allow public read access to model_health"
  on model_health for select to anon using (true);

-- Allow anon insert for logging
create policy "Allow public insert to model_metrics"
  on model_metrics for insert to anon with check (true);

create policy "Allow public insert to model_logs"
  on model_logs for insert to anon with check (true);

create policy "Allow public insert to model_health"
  on model_health for insert to anon with check (true);

-- Initialize AI models if they don't exist
insert into ai_models (id, name, version, provider, description)
values 
  ('11111111-1111-1111-1111-111111111111', 'gemini-2.5-flash', '2.5', 'Google', 'Fast text generation with Google Search')
on conflict (id) do nothing;

insert into ai_models (id, name, version, provider, description)
values 
  ('22222222-2222-2222-2222-222222222222', 'gemini-2.5-flash-image', '2.5', 'Google', 'Fast image generation (Nano Banana)')
on conflict (id) do nothing;
