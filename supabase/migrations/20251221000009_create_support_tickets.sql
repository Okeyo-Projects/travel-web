create type issue_type as enum ('bug', 'performance', 'ui_ux', 'other');
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create table public.support_tickets (
  id uuid not null default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type issue_type not null,
  description text not null,
  status ticket_status not null default 'open',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint support_tickets_pkey primary key (id)
);

-- Enable RLS
alter table public.support_tickets enable row level security;

-- Policies
create policy "Users can create tickets"
  on public.support_tickets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own tickets"
  on public.support_tickets
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Grant permissions
grant select, insert on public.support_tickets to authenticated;
grant usage on type issue_type to authenticated;
grant usage on type ticket_status to authenticated;
