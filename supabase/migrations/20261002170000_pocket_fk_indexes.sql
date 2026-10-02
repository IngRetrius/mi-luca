-- Índices que cubren las llaves foráneas compuestas de F3 (asesor de rendimiento de Supabase, lint
-- 0001 `unindexed_foreign_keys`). Las llaves son (bank_id, client_id) y (pocket_id, client_id); los
-- índices de una sola columna de la migración pockets_cashflow no las cubren. Al borrar un banco o
-- un bolsillo, la base busca por estas columnas las filas que quedan sin banco o sin bolsillo.

drop index public.pockets_bank_id_idx;
create index pockets_bank_id_client_id_idx on public.pockets (bank_id, client_id);

drop index public.budget_items_pocket_id_idx;
create index budget_items_pocket_id_client_id_idx on public.budget_items (pocket_id, client_id);

drop index public.assets_pocket_id_idx;
create index assets_pocket_id_client_id_idx on public.assets (pocket_id, client_id);
