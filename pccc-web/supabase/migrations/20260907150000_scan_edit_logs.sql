-- Table for tracking edits and discrepancies on scanned TagIDs
create table if not exists scan_edit_logs (
  id uuid default gen_random_uuid() primary key,
  tag_id text not null,
  action text not null,
  old_value text,
  new_value text,
  difference numeric default 0,
  note text,
  operator text default 'Kiểm kê viên',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table scan_edit_logs enable row level security;

-- Allow read and write for anon
create policy "Allow anon all on scan_edit_logs" on scan_edit_logs for all using (true) with check (true);
