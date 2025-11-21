-- Table pour stocker chaque tuile d'actualité générée
create table if not exists news_tiles (
  id uuid default gen_random_uuid() primary key,
  article_id text not null unique,
  search_key text not null,
  article jsonb not null,
  image_storage_path text,
  created_at timestamptz default now()
);

create index if not exists news_tiles_search_key_idx
  on news_tiles (search_key, created_at desc);

-- Sécurité : lecture publique
alter table news_tiles enable row level security;

create policy "Allow public read access to news_tiles"
  on news_tiles
  for select
  to anon
  using (true);

create policy "Allow public upsert access to news_tiles"
  on news_tiles
  for insert
  to anon
  with check (true);

create policy "Allow public update for news_tiles"
  on news_tiles
  for update
  to anon
  using (true)
  with check (true);

create policy "Allow cleanup of stale tiles"
  on news_tiles
  for delete
  to anon
  using ( created_at < now() - interval '2 days' );

