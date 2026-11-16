-- Маркетплейс-интеграция (WB/Ozon) выпилена: источник товара и его наличие
-- больше не хранятся — вишлист теперь только ручной.
alter table wishlist_items drop column if exists source;
alter table wishlist_items drop column if exists in_stock;
