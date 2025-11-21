-- Table contenant les articles scrappés via Firecrawl.
create table if not exists firecrawl_articles (
  id uuid default gen_random_uuid() primary key,
  url text not null unique,
  category text not null,
  source text not null,
  title text not null,
  summary text,
  author text,
  kind text,
  published_at text,
  image_url text,
  emoji text,
  metadata jsonb,
  scraped_at timestamptz default now()
);

create index if not exists firecrawl_articles_category_idx
  on firecrawl_articles (category, scraped_at desc);

create index if not exists firecrawl_articles_scraped_idx
  on firecrawl_articles (scraped_at desc);

alter table firecrawl_articles enable row level security;

create policy "Allow public read firecrawl articles"
  on firecrawl_articles
  for select
  to anon
  using (true);

create policy "Allow public upsert firecrawl articles"
  on firecrawl_articles
  for insert
  to anon
  with check (true);

create policy "Allow public update firecrawl articles"
  on firecrawl_articles
  for update
  to anon
  using (true)
  with check (true);


