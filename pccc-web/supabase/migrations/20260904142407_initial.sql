create table if not exists stock_balances (
  id uuid default gen_random_uuid() primary key,
  stock_code text not null,
  warehouse text not null,
  createdate text not null,
  batch text not null,
  bin text not null,
  qty numeric not null,
  tag_id text unique null
);

create table if not exists stock_scans (
  id uuid default gen_random_uuid() primary key,
  tag_id text not null,
  quantity numeric not null,
  position text not null,
  source_id uuid references stock_balances(id) null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table stock_balances enable row level security;
alter table stock_scans enable row level security;

-- Allow public / anon read and write
create policy "Allow anon all on stock_balances" on stock_balances for all using (true) with check (true);
create policy "Allow anon all on stock_scans" on stock_scans for all using (true) with check (true);