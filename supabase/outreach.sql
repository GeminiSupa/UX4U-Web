alter table leads add column if not exists current_pos text not null default '';
alter table leads add column if not exists contacted boolean not null default false;
