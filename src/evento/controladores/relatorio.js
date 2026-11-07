/* Controlador relatorio: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('relatorio',{
 dependencias:{
  "escHtml": "contexto",
  "tenantConfig": "contexto",
  "ocorrencias": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "pessoasPainel": "pessoas",
  "prontidao": "escalonamento",
  "pessoaNome": "escalonamento"
},
 criar(dependencias){
 let relatorioOverlay;
 function renderRelatorioEvento(){
  const body = document.getElementById('relatorio-body');
  const filtradas=dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel);
  const resolvidas=filtradas.filter(o=>o.status==='resolvida');
  const ativas=filtradas.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const comChegada=filtradas.filter(o=>Number.isFinite(o.confirmadoEm)&&Number.isFinite(o.reportadoEm));
  const tempoResposta=comChegada.length?Math.round(comChegada.reduce((s,o)=>s+Math.max(0,o.confirmadoEm-o.reportadoEm),0)/comChegada.length/60000):null;
  const comDuracao=resolvidas.filter(o=>Number.isFinite(o.tempoReal));
  const tempoMedioGeral=comDuracao.length?Math.round(comDuracao.reduce((s,o)=>s+o.tempoReal,0)/comDuracao.length):null;

  const porZona = (dependencias.selecao.size?dependencias.areasSelecionadas():dependencias.areas).map(b=>{
    const ocz = filtradas.filter(o=>dependencias.pertence(b,o.bairro));
    const resz = ocz.filter(o=>o.status==='resolvida');
    const tempo = resz.length ? Math.round(resz.reduce((s,o)=>s+o.tempoReal,0)/resz.length) : null;
    return { zona:b.nome, total:ocz.length, resolvidas:resz.length, ativas:ocz.length-resz.length, tempo };
  });

  const rankingColab = {};
  filtradas.forEach(o=> (o.participacoes||[]).filter(p=>p.status==='concluida').forEach(p=>{rankingColab[p.voluntarioId]=(rankingColab[p.voluntarioId]||0)+1;}));
  const topColab = Object.entries(rankingColab).sort((a,c)=>c[1]-a[1]).slice(0,5).map(([id,n])=>({nome:dependencias.pessoaNome(id), n}));

  let totalProntos=0, totalConf=0;
  const idsRecorte=new Set(dependencias.pessoasPainel().map(p=>p.id));
  Object.values(dependencias.prontidao).forEach(mapa=>{
    Object.entries(mapa).filter(([id])=>!dependencias.selecao.size||idsRecorte.has(id)).forEach(([,st])=>{ totalProntos++; if(st.status==='confirmado') totalConf++; });
  });
  const pctProntidao = totalProntos ? Math.round(totalConf/totalProntos*100) : null;

  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Gerado em ${new Date().toLocaleString('pt-BR')} · ${dependencias.escHtml(dependencias.tenantConfig.nome)} · ${dependencias.escHtml(dependencias.recorteLabel())} · ${dependencias.escHtml(document.getElementById('filtro-evento').selectedOptions[0]?.textContent||'Todos')} · ${dependencias.escHtml(dependencias.filtroOcorrencias?.descricao()||'Sem filtros de ocorrência')} · evento de demonstração. Consolidado automaticamente a partir dos registros do protótipo.</div>
    <div class="rel-grid">
      <div class="rel-tile"><b>${filtradas.length}</b><span>Ocorrências totais</span></div>
      <div class="rel-tile"><b>${resolvidas.length}</b><span>Resolvidas</span></div>
      <div class="rel-tile"><b>${ativas.length}</b><span>Ainda abertas</span></div>
      <div class="rel-tile"><b>${tempoResposta===null?'—':tempoResposta+'min'}</b><span>Tempo médio até chegada</span></div><div class="rel-tile"><b>${tempoMedioGeral===null?'—':tempoMedioGeral+'min'}</b><span>Tempo médio até conclusão</span></div>
      <div class="rel-tile"><b>${dependencias.pessoasPainel().filter(p=>!p.oficial).length}</b><span>Colaboradores cadastrados</span></div>
      <div class="rel-tile"><b>${pctProntidao!==null?pctProntidao+'%':'—'}</b><span>Prontidão confirmada pré-evento</span></div>
    </div>
    <h3 style="font-size:13px;margin-bottom:8px">Desempenho por zona</h3>
    <table class="rel-table"><thead><tr><th>Zona</th><th>Total</th><th>Resolvidas</th><th>Ainda abertas</th><th>Tempo médio</th></tr></thead><tbody>
      ${porZona.map(z=>`<tr><td>${dependencias.escHtml(z.zona)}</td><td>${z.total}</td><td>${z.resolvidas}</td><td>${z.ativas}</td><td>${z.tempo!==null?z.tempo+'min':'—'}</td></tr>`).join('')}
    </tbody></table>
    <h3 style="font-size:13px;margin-bottom:8px">Colaboradores que mais ajudaram</h3>
    <table class="rel-table"><thead><tr><th>Nome</th><th>Participações concluídas</th></tr></thead><tbody>
      ${topColab.map(c=>`<tr><td>${dependencias.escHtml(c.nome)}</td><td>${c.n}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--muted)">As participações aparecem aqui quando a pessoa confirma o término.</td></tr>'}
    </tbody></table>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Contagens das confirmações de término nesta demonstração. O agradecimento é automático, sem nota de qualidade ou comprovação adicional.</div>
  `;
}
 async function iniciar(){
 (relatorioOverlay=document.getElementById('relatorio-overlay'));
document.getElementById('open-relatorio-evento').onclick = ()=>{ relatorioOverlay.hidden=false; renderRelatorioEvento(); };
document.getElementById('relatorio-close').onclick = ()=>{ relatorioOverlay.hidden=true; };
document.getElementById('relatorio-print').onclick = ()=>{ window.print(); };
relatorioOverlay.addEventListener('click', e=>{ if(e.target===relatorioOverlay) relatorioOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get relatorioOverlay(){return relatorioOverlay;},renderRelatorioEvento};
 }
});
})(globalThis);
