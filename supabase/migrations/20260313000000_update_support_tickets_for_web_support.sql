alter type public.issue_type add value if not exists 'feature_request';
alter type public.issue_type add value if not exists 'payment_issue';
alter type public.issue_type add value if not exists 'account_issue';

alter table public.support_tickets
  add column if not exists subject text not null default 'Support request',
  add column if not exists contact_email text;

alter table public.support_tickets
  alter column subject drop default;

create policy "Anonymous users can create tickets"
  on public.support_tickets
  for insert
  to anon
  with check (user_id is null);

grant insert on public.support_tickets to anon;
grant usage on type public.issue_type to anon;
grant usage on type public.ticket_status to anon;
