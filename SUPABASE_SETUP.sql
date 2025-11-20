
-- Create the table for caching news articles
create table if not exists news_cache (
  id uuid default gen_random_uuid() primary key,
  search_key text not null,
  articles jsonb not null,
  created_at timestamptz default now()
);

-- Add an index for faster lookups
create index if not exists news_cache_search_key_idx on news_cache (search_key);

-- Enable Row Level Security (RLS)
alter table news_cache enable row level security;

-- Create a policy to allow anonymous read access (so all users can see cached news)
create policy "Allow public read access"
  on news_cache
  for select
  to anon
  using (true);

-- Create a policy to allow anonymous insert access (so the app can cache new results)
-- Note: In a production app, you might want to restrict this or use a server-side function.
create policy "Allow public insert access"
  on news_cache
  for insert
  to anon
  with check (true);
