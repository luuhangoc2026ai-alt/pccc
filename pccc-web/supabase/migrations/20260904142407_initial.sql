create table stock_balances (
  id uuid default gen_random_uuid() primary key,
  stock_code text not null,
  warehouse text not null,
  createdate text not null,
  batch text not null,
  bin text not null,
  qty numeric not null,
  tag_id text unique null
);

create table stock_scans (
  id uuid default gen_random_uuid() primary key,
  tag_id text not null,
  quantity numeric not null,
  position text not null,
  source_id uuid references stock_balances(id) null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);