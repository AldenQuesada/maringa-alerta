-- Lugares da proteção animal em Maringá, de fontes públicas conferidas em 11/11/2026.
-- Depende da migração 20261111190000 (tipos do catálogo e regra de tipo). Idempotente: não substitui cadastro já editado.
-- Sem coordenada confirmada, o lugar entra sem ponto; a gestão marca o local. Não inclui coordenadas estimadas.
begin;
insert into public.ma_cadastros(municipio_id,colecao,id,dados)
select 'maringa','unidades',x.id,x.dados||jsonb_build_object('id',x.id,'municipioId','maringa','categoria','Animais','estado_operacional','a_confirmar','verificacao','Em conferência')
from (values
 ('protecao-animal-sebea',$d${"nome":"Secretaria de Proteção e Bem-Estar Animal (Sebea)","tipo":"Secretaria de Proteção e Bem-Estar Animal",
  "endereco":"Avenida Centenário, 449, Zona 08, CEP 87050-040","telefone":"(44) 3127-5251","horario":"Segunda a sexta, das 8h às 17h",
  "fonte":"Prefeitura de Maringá · página da secretaria","url_fonte":"https://sitemaringa.ingadigital.maringa.br/secretarias/Secretaria%20Municipal%20de%20Prote%C3%A7%C3%A3o%20e%20Bem%20Estar%20Animal/11"}$d$::jsonb),
 ('protecao-animal-cbea',$d${"nome":"Centro de Bem-Estar Animal (Cbea)","tipo":"Centro de Bem-Estar Animal",
  "endereco":"Rua Duzentos, s/n, Ebenezer","bairro":"Ebenezer",
  "fonte":"Notícia da revitalização, outubro de 2026","url_fonte":"https://ofatomaringa.com/novo-centro-de-bem-estar-animal-de-maringa-amplia-oferta-de-acolhimento-e-cuidados-a-pets-vitimas-de-maus-tratos"}$d$::jsonb),
 ('protecao-animal-ccz',$d${"nome":"Centro de Controle de Zoonoses de Maringá","tipo":"Centro de Controle de Zoonoses",
  "endereco":"Estrada 200, 1391","telefone":"(44) 3901-1176","lat":"-23.3483138947487","lng":"-51.90592646598816","geo_fonte":"CNES",
  "fonte":"CNES 9944184 · mantenedora Prefeitura do Município de Maringá","externalId":"cnes:9944184"}$d$::jsonb)
) x(id,dados)
where exists(select 1 from public.ma_prefeituras where id='maringa' and codigo_ibge='4115200')
on conflict (municipio_id,colecao,id) do nothing;

commit;
