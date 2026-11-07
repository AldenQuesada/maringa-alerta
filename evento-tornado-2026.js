/* Referência histórica versionada, com identidade municipal explícita. */
(function(root){'use strict';root.AlertaEventoHistoricoConfiguracao={
  "codigo_ibge": "4115200",
  "dados": {
    "nome": "Tornado de Maringá — 2 de novembro de 2026",
    "tipo": "Tornado",
    "status": "A confirmar",
    "inicio": "2026-11-02T03:00:00-03:00",
    "descricao": "Tornado classificado pelo Simepar como F2. Início aproximado: madrugada de 2 de novembro de 2026.",
    "fonte": "Simepar · publicado em 04/11/2026",
    "url_fonte": "https://www.simepar.br/simepar/post/79990",
    "externalId": "simepar-tornado-maringa-2026-11-02",
    "referencias": "Simepar, 04/11: tornado F2, trajeto estimado de 15 km.\nDefesa Civil Estadual, 02/11: telhado do prédio administrativo do 5º Batalhão de Bombeiros danificado e cinco viaturas atingidas; sem militares feridos. https://www.defesacivil.pr.gov.br/Noticia/Governo-do-Parana-mobiliza-equipes-para-atender-cidades-atingidas-por-tempestades-e\nAgência Estadual de Notícias, 04/11: árvores e galhos caídos no Parque do Ingá dificultaram o acesso. https://www.parana.pr.gov.br/aen/Noticia/Policia-Penal-mobiliza-70-apenados-para-ajudar-na-recuperacao-de-Maringa-apos-tornado\nCopel, tarde de 04/11: 302 postes danificados em Maringá; 186 substituídos. Balanço geral, sem endereços individuais. https://www.copel.com/site/noticias/apos-tornado-copel-religa-mais-de-60-dos-clientes-afetados-e-mantem-forca-tarefa-para-reconstruir-rede-eletrica-em-maringa/\nAvenida Colombo: há relato jornalístico de bloqueios em 02/11; trecho exato e situação atual a confirmar. https://jornalreporterdovale.com/prf-alerta-para-situacao-critica-em-maringa-apos-fortes-chuvas/\nEstas referências são históricas. Não indicam situação atual, atendimento concluído nem ponto preciso."
  },
  "tipos": [
    "Árvore caída",
    "Poste danificado",
    "Fiação danificada",
    "Destelhamento",
    "Edificação danificada",
    "Via bloqueada",
    "Serviço interrompido",
    "Parque ou área pública danificada",
    "Veículo danificado"
  ]
};})(globalThis);
/* Importação explícita e idempotente de referência histórica no cadastro local. */
(function(root){'use strict';
function criar({codigo_ibge,dados,tipos}){
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 function importar(db){
  if(String(db.municipioAtivo()?.codigo_ibge)!==String(codigo_ibge))throw Error('Esta referência pertence a outra prefeitura.');
  if(db.tipo==='supabase')throw Error('A referência demonstrativa não é importada no banco remoto.');
  let evento=db.lista('eventos').find(x=>x.externalId===dados.externalId||norm(x.nome)===norm(dados.nome));
  if(!evento)evento=db.gravar('eventos',dados);
  const existentes=new Set(db.lista('ocorrencias').map(x=>norm(x.nome)));
  for(const nome of tipos)if(!existentes.has(norm(nome))){db.gravar('ocorrencias',{nome});existentes.add(norm(nome));}
  return evento;
 }
 return {dados,tipos,importar};
}
root.AlertaReferenciaHistorica={criar};
})(globalThis);
/* Alias público preservado para o botão histórico existente. */
(function(root){'use strict';const api=root.AlertaReferenciaHistorica.criar(root.AlertaEventoHistoricoConfiguracao);root.EventoTornado2026=api;if(typeof module==='object'&&module.exports)module.exports=api;})(globalThis);
