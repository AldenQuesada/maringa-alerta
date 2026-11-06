begin;
-- Cobertura da FK composta para manutenção do catálogo sem varredura de prefeituras.
create index ma_prefeituras_ibge_uf on public.ma_prefeituras(codigo_ibge,uf);
commit;
