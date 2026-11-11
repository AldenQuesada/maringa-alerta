begin;
-- Monitoramento animal: abertura que mostra a cidade inteira. Os limites são os dos 113 bairros cadastrados
-- (IBGE 2022), arredondados para fora. A câmera do mapa de Ajuda continua igual e segue no perfil como reserva.
update public.ma_configuracao
 set documento=jsonb_set(documento,'{monitoramento-animal,enquadramento}','[[-23.4730,-52.0231],[-23.3513,-51.8579]]'::jsonb),versao=versao+1
 where id='mapas' and documento ? 'monitoramento-animal';
do $$begin
 if not exists(select 1 from public.ma_configuracao where id='mapas' and documento#>'{monitoramento-animal,enquadramento}' is not null)
  then raise exception 'Perfil do Monitoramento animal ausente';end if;
end$$;
commit;
