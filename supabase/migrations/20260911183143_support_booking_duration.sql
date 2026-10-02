-- O formulário já coleta a duração mesmo quando a proposta não parte de um
-- artist_service. Ela precisa ficar congelada no histórico da reserva.
alter table public.bookings
  add column duration_minutes int
    constraint bookings_duration_minutes_positive
      check (duration_minutes is null or duration_minutes > 0);

;
