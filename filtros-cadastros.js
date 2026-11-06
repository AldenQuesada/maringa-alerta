/* Controle compartilhado dos cadastros municipais nos três mapas. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function montar({alvo,inventario,db,recorte=()=>true,aoMudar=()=>{},localizar=()=>{},baseGestao='gestao/'}){
 const state={modulo:'todos',classe:'',busca:''}, ocultos=new Set();
 const key=x=>x.modulo+'::'+(x.categoria||'Não informado');
 const rows=()=>inventario.filtrar(inventario.registros(db),state).filter(recorte).filter(x=>!ocultos.has(key(x)));
 alvo.classList.add('municipal-filters');
 alvo.innerHTML='<button type="button" id="mun-toggle" aria-expanded="false">Cadastros da Prefeitura <span id="mun-count"></span></button><div id="mun-body" hidden><label class="mun-toggle-show"><input type="checkbox" id="mun-mostrar" checked> Mostrar unidades e recursos no mapa</label><label for="mun-camada">Cadastro<select id="mun-camada"></select></label><label for="mun-classe">Situação ou tipo<select id="mun-classe"></select></label><label for="mun-busca">Buscar<input id="mun-busca" type="search" placeholder="Unidades, abrigos, equipes, centros de doação..."></label><details class="filter-group"><summary>Tipos de unidades</summary><div class="mun-tipos"></div></details><div class="mun-acoes"><button type="button" data-tipos="todos">Mostrar todos</button><button type="button" data-tipos="nenhum">Ocultar todos</button></div><p id="mun-status" aria-live="polite"></p><div id="mun-rows" class="mun-rows"></div></div>';
 const q=s=>alvo.querySelector(s), toggle=q('#mun-toggle'),body=q('#mun-body'),campo=q('#mun-camada'),classe=q('#mun-classe');
 toggle.dataset.ready='1';
 toggle.onclick=()=>{body.hidden=!body.hidden;toggle.setAttribute('aria-expanded',String(!body.hidden));if(!body.hidden)atualizar()};
 function opcoes(){
  const groups=new Map();for(const x of inventario.resumo(db)){if(!groups.has(x.grupo))groups.set(x.grupo,[]);groups.get(x.grupo).push(x)}
  campo.innerHTML='<option value="todos">Todos os cadastros</option>'+[...groups].map(([g,xs])=>'<optgroup label="'+esc(g)+'">'+xs.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+' ('+x.total+')</option>').join('')+'</optgroup>').join('');campo.value=state.modulo;
  const items=inventario.filtrar(inventario.registros(db),{modulo:state.modulo});
  classe.innerHTML='<option value="">Todos os tipos e situações</option>'+inventario.classes(items).map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');classe.value=state.classe;
 }
 function tipos(){
  const items=inventario.registros(db).filter(x=>!x.privado&&['saude','emergencias','parceiros','bases','abrigos'].includes(x.modulo));const unique=new Map();
  for(const x of items){const k=key(x),v=unique.get(k)||{nome:x.categoria||'Não informado',grupo:x.moduloNome,total:0};v.total++;unique.set(k,v)}
  q('.mun-tipos').innerHTML=[...unique].sort((a,b)=>(a[1].grupo+a[1].nome).localeCompare(b[1].grupo+b[1].nome,'pt-BR')).map(([k,v])=>'<label><input type="checkbox" data-chave="'+esc(k)+'" '+(!ocultos.has(k)?'checked':'')+'> '+esc(v.grupo+' · '+v.nome+' ('+v.total+')')+'</label>').join('')||'<p>Nenhuma unidade cadastrada.</p>';
 }
 function atualizar(){opcoes();tipos();const xs=rows();q('#mun-count').textContent='('+xs.length+')';q('#mun-status').textContent=xs.length+' registros; '+xs.filter(x=>x.georreferenciado).length+' com ponto geográfico.';
  q('#mun-rows').innerHTML=xs.map(x=>'<div class="mun-row"><div><strong>'+esc(x.nome)+'</strong><small>'+esc(x.moduloNome)+' · '+esc(x.zona||x.bairro||'Zona não informada')+' · '+esc(x.classe)+'</small></div><div class="mun-row-actions">'+(x.georreferenciado?'<button type="button" data-mun-loc="'+esc(x.chave)+'">Localizar</button>':'<small>Sem coordenadas</small>')+'<a target="_blank" rel="noopener" href="'+baseGestao+'#'+encodeURIComponent(x.modulo)+'">Cadastro</a></div></div>').join('')||'<p class="mun-empty">Nenhum registro corresponde aos filtros.</p>';
 }
 function mudar(){atualizar();aoMudar()}
 campo.onchange=()=>{state.modulo=campo.value;state.classe='';mudar()};classe.onchange=()=>{state.classe=classe.value;mudar()};q('#mun-busca').oninput=e=>{state.busca=e.target.value;mudar()};q('#mun-mostrar').onchange=mudar;
 q('.mun-tipos').onchange=e=>{if(!e.target.dataset.chave)return;if(e.target.checked)ocultos.delete(e.target.dataset.chave);else ocultos.add(e.target.dataset.chave);mudar()};
 alvo.querySelectorAll('[data-tipos]').forEach(b=>b.onclick=()=>{ocultos.clear();if(b.dataset.tipos==='nenhum')for(const x of inventario.registros(db))if(['saude','emergencias','parceiros','bases','abrigos'].includes(x.modulo)&&!x.privado)ocultos.add(key(x));mudar()});
 q('#mun-rows').onclick=e=>{const btn=e.target.closest('[data-mun-loc]');if(btn){const x=rows().find(x=>x.chave===btn.dataset.munLoc);if(x)localizar(x)}};
 atualizar();return {atualizar,rows,aceita:x=>!ocultos.has(key(x)),mostrar:()=>q('#mun-mostrar').checked};
}
root.FiltrosCadastros={montar};
})(window);
