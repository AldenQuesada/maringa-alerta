/* Filtros de ocorrência: modelo serializável independente da interface e da origem dos dados. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FiltrosOcorrencias=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const defaults=()=>({situacoes:[],tipos:[],gravidades:[],horas:'',inicio:'',fim:'',responsabilidade:'',origem:'',organizacao:'',espera:'',atribuicao:''});
const situacao=o=>o.confirmado===false?'triagem':o.status==='ativa'?'aguardando':o.status;
function corresponde(o,f,now=Date.now()){
 const fset=(a,v)=>!a?.length||a.includes(String(v??''));
 if(!fset(f.situacoes,situacao(o))||!fset(f.tipos,o.tipo)||!fset(f.gravidades,o.gravidade))return false;
 if(f.responsabilidade&&f.responsabilidade!==o.responsabilidade)return false;
 if(f.origem&&f.origem!==o.origem)return false;
 const orgs=Array.isArray(o.organizacoes)?o.organizacoes:[];
 if(f.organizacao&&!orgs.some(x=>String(x.id)===f.organizacao))return false;
 const atribuido=orgs.length>0||!!o.atendimentoEquipe||(o.participacoes||[]).length>0;
 if(f.atribuicao==='com'&&!atribuido||f.atribuicao==='sem'&&atribuido)return false;
 const timestamp=typeof o.reportadoEm==='number'?o.reportadoEm:Date.parse(o.reportadoEm);
 if(f.horas&&(!Number.isFinite(timestamp)||timestamp<now-Number(f.horas)*3600000||timestamp>now))return false;
 if(f.inicio&&(!Number.isFinite(timestamp)||timestamp<new Date(f.inicio+'T00:00:00').getTime()))return false;
 if(f.fim&&(!Number.isFinite(timestamp)||timestamp>=new Date(f.fim+'T00:00:00').getTime()+86400000))return false;
 if(f.espera&&(situacao(o)!=='aguardando'||!Number.isFinite(timestamp)||now-timestamp<Number(f.espera)*60000))return false;
 return true;
}
function montar({target,obterDados,aoMudar}){
 let state=defaults();const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 target.innerHTML=`<button type="button" id="fil-toggle" class="filter-title" aria-expanded="false">Filtros de ocorrências <span id="fil-count"></span></button><div id="fil-body" hidden>
 <div id="fil-options"></div><label>Período<select data-key="horas"><option value="">Todo o período</option><option value="2">Últimas 2 horas</option><option value="6">Últimas 6 horas</option><option value="24">Últimas 24 horas</option><option value="168">Últimos 7 dias</option><option value="custom">Período personalizado</option></select></label>
 <div id="fil-dates" hidden><label>De<input type="date" data-key="inicio"></label><label>Até<input type="date" data-key="fim"></label></div>
 <details class="filter-more"><summary>Mais filtros</summary><label>Responsabilidade<select data-key="responsabilidade"><option value="">Todas</option><option value="publica">Pública</option><option value="privada">Privada</option><option value="mista">Mista</option></select></label><label>Origem<select data-key="origem" id="fil-origem"></select></label><label>Organização ou equipe<select data-key="organizacao" id="fil-organizacao"></select></label><label>Tempo de espera<select data-key="espera"><option value="">Qualquer tempo</option><option value="30">Mais de 30 minutos</option><option value="60">Mais de 1 hora</option></select></label><label>Equipe atribuída<select data-key="atribuicao"><option value="">Todas</option><option value="com">Com equipe</option><option value="sem">Sem equipe</option></select></label></details>
 <button type="button" id="fil-clear" class="filter-clear">Limpar filtros</button></div><div id="fil-active" aria-live="polite"></div>`;
 const q=s=>target.querySelector(s), option=(value,label)=>`<option value="${esc(value)}">${esc(label)}</option>`;
 function options(){
  const d=obterDados(),tipos=[...new Set([...(d.tipos||[]),...d.ocorrencias.map(x=>x.tipo)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const groups=[['situacoes','Situação',[['triagem','Em triagem'],['aguardando','Aguardando'],['em_atendimento','Em atendimento'],['resolvida','Resolvidas']]],['tipos','Tipo',tipos.map(x=>[x,x])],['gravidades','Gravidade',[['3','Alta'],['2','Média'],['1','Baixa']]]];
  q('#fil-options').innerHTML=groups.map(([key,label,vals])=>`<details class="filter-group"><summary>${label}${state[key].length?' · '+state[key].length:''}</summary><div>${vals.map(([v,n])=>`<label><input type="checkbox" data-array="${key}" value="${esc(v)}" ${state[key].includes(String(v))?'checked':''}> ${esc(n)}</label>`).join('')}</div></details>`).join('');
  const origins=[...new Set(['Operador','WhatsApp','Telefone','Cidadão','Equipe em campo','Outro',...d.ocorrencias.map(x=>x.origem)].filter(Boolean))];
  q('#fil-origem').innerHTML=option('','Todas')+origins.map(x=>option(x,x)).join('');q('#fil-origem').value=state.origem;
  const orgs=new Map((d.organizacoes||[]).map(x=>[String(x.id),x.nome]));d.ocorrencias.flatMap(x=>x.organizacoes||[]).forEach(x=>orgs.set(String(x.id),x.nome));
  q('#fil-organizacao').innerHTML=option('','Todas')+[...orgs].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR')).map(([id,n])=>option(id,n)).join('');q('#fil-organizacao').value=state.organizacao;
 }
 function updateSummary(){
  const labels={triagem:'Em triagem',aguardando:'Aguardando',em_atendimento:'Em atendimento',resolvida:'Resolvidas','1':'Baixa','2':'Média','3':'Alta'};
  const names=[...state.situacoes,...state.tipos,...state.gravidades].map(x=>labels[x]||x);
  for(const k of ['horas','responsabilidade','origem','organizacao','espera','atribuicao'])if(state[k]){const el=q(`[data-key="${k}"]`);names.push(el?.selectedOptions[0]?.textContent||state[k]);}
  if(state.inicio||state.fim)names.push([state.inicio||'início',state.fim||'hoje'].join(' a '));
  q('#fil-count').textContent=names.length?`(${names.length})`:'';q('#fil-active').textContent=names.join(' · ');
 }
 q('#fil-toggle').onclick=e=>{const body=q('#fil-body');body.hidden=!body.hidden;e.currentTarget.setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden)options();};
 target.addEventListener('change',e=>{const el=e.target;if(el.dataset.array){const a=state[el.dataset.array];state[el.dataset.array]=el.checked?[...a,el.value]:a.filter(x=>x!==el.value);}
 else if(el.dataset.key){const k=el.dataset.key;state[k]=el.value;if(k==='horas'){q('#fil-dates').hidden=el.value!=='custom';state.inicio='';state.fim='';if(el.value==='custom')state.horas='';}}
 updateSummary();aoMudar();});
 q('#fil-clear').onclick=()=>{state=defaults();target.querySelectorAll('[data-key]').forEach(el=>el.value='');q('#fil-dates').hidden=true;options();updateSummary();aoMudar();};
 options();updateSummary();
 return {obter:()=>({...state,situacoes:[...state.situacoes],tipos:[...state.tipos],gravidades:[...state.gravidades]}),corresponde:o=>corresponde(o,state),atualizarOpcoes:options,descricao:()=>q('#fil-active').textContent||'Sem filtros de ocorrência',reset:()=>q('#fil-clear').click()};
}
return {defaults,situacao,corresponde,montar};
});
