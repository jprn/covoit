-- SportRide schema (Postgres / Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  city text,
  created_at timestamp with time zone default now()
);

create table if not exists public.events (
  id bigserial primary key,
  name text not null,
  sport text not null,
  date date not null,
  city text not null,
  location text,
  dest_lat double precision,
  dest_lng double precision,
  created_at timestamptz default now()
);

create table if not exists public.rides (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id bigint not null references public.events(id) on delete cascade,
  ride_type text check (ride_type in ('go','return','roundtrip')) not null,
  depart_at timestamptz not null,
  origin_text text not null,
  origin_lat double precision,
  origin_lng double precision,
  seats_total int not null check (seats_total between 1 and 8),
  max_detour_km int default 0,
  price_suggested int default 0,
  note text,
  rules jsonb default '{}'::jsonb,
  status text default 'active' check (status in ('active','inactive','cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.bookings (
  id bigserial primary key,
  ride_id bigint not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats int not null check (seats>0),
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz default now(),
  unique(ride_id, passenger_id) -- un passager ne peut pas réserver 2 fois le même trajet
);

create table if not exists public.messages (
  id bigserial primary key,
  booking_id bigint not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz default now(),
  read boolean default false
);

create table if not exists public.reports (
  id bigserial primary key,
  reporter_id uuid references public.profiles(id) on delete set null,
  target_type text check (target_type in ('user','ride','message')),
  target_id text,
  reason text,
  created_at timestamptz default now()
);

-- View to aggregate ride + event + driver + seats booked
create or replace view public.rides_view as
select r.*, e.name as event_name, e.city as event_city,
  (select coalesce(sum(seats),0) from bookings b where b.ride_id=r.id and b.status in ('pending','accepted')) as seats_booked,
  (select concat(coalesce(p.first_name,''),' ',coalesce(p.last_name,'')) from profiles p where p.id=r.user_id) as driver_name
from rides r
join events e on e.id = r.event_id;

-- Basic functions to update notifications on booking status changes
create or replace function public.handle_booking_status_notify() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    insert into notifications(user_id, title, body)
    values ((select user_id from rides where id=new.ride_id), 'Nouvelle demande', 'Un passager souhaite rejoindre votre trajet');
  elsif TG_OP = 'UPDATE' then
    if old.status<>new.status then
      insert into notifications(user_id, title, body)
      values (new.passenger_id, 'Mise à jour réservation', 'Statut: '||new.status);
    end if;
  end if;
  return new;
end;$$ language plpgsql;

create trigger trg_booking_notify
after insert or update on public.bookings
for each row execute function public.handle_booking_status_notify();
