-- Enable RLS
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rides enable row level security;
alter table public.bookings enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

-- Profiles: users can read all, update themselves
create policy "read profiles" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Events: readable by all
create policy "read events" on public.events for select using (true);

-- Rides: public read; owner can insert/update/delete
create policy "read rides" on public.rides for select using (true);
create policy "insert ride" on public.rides for insert with check (auth.uid() = user_id);
create policy "update own ride" on public.rides for update using (auth.uid() = user_id);
create policy "delete own ride" on public.rides for delete using (auth.uid() = user_id);

-- Bookings: owner (passenger) can manage; driver can read/manage status of their rides
create policy "insert booking" on public.bookings for insert with check (auth.uid() = passenger_id);
create policy "read own bookings" on public.bookings for select using (auth.uid() = passenger_id or auth.uid() in (select user_id from rides where id=ride_id));
create policy "update booking status" on public.bookings for update using (
  auth.uid() = passenger_id or auth.uid() in (select user_id from rides where id=ride_id)
);

-- Messages: participants only
create policy "insert message" on public.messages for insert with check (
  auth.uid() in (
    select passenger_id from bookings where id=booking_id
  ) or auth.uid() in (
    select user_id from rides r join bookings b on b.ride_id=r.id where b.id=booking_id
  )
);
create policy "read message" on public.messages for select using (
  auth.uid() in (
    select passenger_id from bookings where id=booking_id
  ) or auth.uid() in (
    select user_id from rides r join bookings b on b.ride_id=r.id where b.id=booking_id
  )
);

-- Notifications: owner only
create policy "own notifications" on public.notifications for select using (auth.uid() = user_id);

-- Reports: authenticated can insert, read own
create policy "insert report" on public.reports for insert with check (auth.role() = 'authenticated');
create policy "read reports own" on public.reports for select using (auth.uid() = reporter_id);
