-- Horario de atendimento que vira o dia: quem toca das 23h as 3h declara
-- opens_at 23:00 e closes_at 03:00. closes_at menor que opens_at significa
-- "termina na madrugada do dia seguinte"; so inicio igual ao fim e invalido.
alter table artist_weekly_hours drop constraint artist_weekly_hours_times_consistent;

alter table artist_weekly_hours add constraint artist_weekly_hours_times_consistent check (
  (is_available and opens_at is not null and closes_at is not null and opens_at <> closes_at)
  or (not is_available and opens_at is null and closes_at is null)
);
