-- Tipos de ocorrência de Maringá para o relato guiado pelo WhatsApp e para o mapa.
-- Depende da migração 20261112120000 (categorias em operacao.ocorrenciaCategorias).
-- Agrupamento pela Classificação e Codificação Brasileira de Desastres (Cobrade): hidrológicos (chuva), meteorológicos
-- (vento), geológicos (terra) e incêndios. Prioridade e gravidade são o padrão inicial; a Gestão ajusta em cada tipo.
-- Idempotente: não substitui tipo já cadastrado ou editado.
begin;
insert into public.ma_cadastros(municipio_id,colecao,id,dados)
select 'maringa','ocorrenciaTipos',x.id,x.dados||jsonb_build_object('id',x.id,'municipioId','maringa','visibilidade','publica')
from (values
 ('alagamento',        $d${"nome":"Alagamento","categoria":"chuva","ordem_whatsapp":1,"prioridade":"Média","gravidade_padrao":"2","cor":"#3b82f6","icone":"🌊"}$d$::jsonb),
 ('enxurrada',         $d${"nome":"Enxurrada","categoria":"chuva","ordem_whatsapp":2,"prioridade":"Alta","gravidade_padrao":"3","cor":"#1d4ed8","icone":"🌧"}$d$::jsonb),
 ('rio-transbordando', $d${"nome":"Rio ou córrego transbordando","botao_whatsapp":"Rio ou córrego cheio","categoria":"chuva","ordem_whatsapp":3,"prioridade":"Alta","gravidade_padrao":"3","cor":"#0e7490","icone":"🏞"}$d$::jsonb),
 ('granizo',           $d${"nome":"Granizo","categoria":"chuva","ordem_whatsapp":4,"prioridade":"Média","gravidade_padrao":"2","cor":"#64748b","icone":"🧊"}$d$::jsonb),
 ('queda-de-arvore',   $d${"nome":"Queda de árvore","categoria":"vento","ordem_whatsapp":1,"prioridade":"Média","gravidade_padrao":"2","cor":"#15803d","icone":"🌳"}$d$::jsonb),
 ('destelhamento',     $d${"nome":"Destelhamento","categoria":"vento","ordem_whatsapp":2,"prioridade":"Média","gravidade_padrao":"2","cor":"#b45309","icone":"🏚"}$d$::jsonb),
 ('fio-poste-caido',   $d${"nome":"Fio ou poste caído","categoria":"vento","ordem_whatsapp":3,"prioridade":"Alta","gravidade_padrao":"3","cor":"#eab308","icone":"⚡"}$d$::jsonb),
 ('deslizamento',      $d${"nome":"Deslizamento de terra","botao_whatsapp":"Deslizamento","categoria":"terra","ordem_whatsapp":1,"prioridade":"Alta","gravidade_padrao":"3","cor":"#92400e","icone":"⛰"}$d$::jsonb),
 ('erosao-cratera',    $d${"nome":"Erosão ou cratera","categoria":"terra","ordem_whatsapp":2,"prioridade":"Média","gravidade_padrao":"2","cor":"#a16207","icone":"🕳"}$d$::jsonb),
 ('desabamento',       $d${"nome":"Desabamento ou risco de desabamento","botao_whatsapp":"Desabamento","categoria":"terra","ordem_whatsapp":3,"prioridade":"Alta","gravidade_padrao":"3","cor":"#7c2d12","icone":"🏗"}$d$::jsonb),
 ('incendio-vegetacao',$d${"nome":"Incêndio em vegetação","botao_whatsapp":"Incêndio vegetação","categoria":"fogo","ordem_whatsapp":1,"prioridade":"Alta","gravidade_padrao":"3","cor":"#ea580c","icone":"🔥"}$d$::jsonb),
 ('incendio-imovel',   $d${"nome":"Incêndio em imóvel","categoria":"fogo","ordem_whatsapp":2,"prioridade":"Alta","gravidade_padrao":"3","cor":"#dc2626","icone":"🚒"}$d$::jsonb)
) x(id,dados)
where exists(select 1 from public.ma_prefeituras where id='maringa' and codigo_ibge='4115200')
on conflict (municipio_id,colecao,id) do nothing;

-- Tipos de animal: só o texto curto do botão e a ordem, sem tocar no que já está.
update public.ma_cadastros c set dados=x.extra||c.dados
from (values
 ('animal-perdido',    '{"botao_whatsapp":"Animal perdido","ordem_whatsapp":1}'::jsonb),
 ('animal-encontrado', '{"botao_whatsapp":"Animal encontrado","ordem_whatsapp":2}'::jsonb),
 ('animal-ferido',     '{"botao_whatsapp":"Animal ferido","ordem_whatsapp":3}'::jsonb),
 ('animal-maus-tratos','{"botao_whatsapp":"Maus-tratos","ordem_whatsapp":4}'::jsonb)
) x(id,extra)
where c.municipio_id='maringa' and c.colecao='ocorrenciaTipos' and c.id=x.id and not c.dados ? 'botao_whatsapp';
commit;
