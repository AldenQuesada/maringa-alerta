/* Ocorrências operacionais: toda mutação passa pelo repositório confirmado pelo banco. */
(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let atual=null;
function instalar(ctx){
 const db=root.AlertaGestaoDados.criar(undefined,{municipioId:ctx.tenantId});
 if(!root.AlertaGestaoDados.ESQUEMAS.incidentes||!root.AlertaRegrasOperacionais?.ocorrenciasMapa)return;
 const tipos=()=>db.lista('ocorrencias'),bairros=()=>db.lista('bairros');
 const orgs=()=>['saude','emergencias','parceiros','equipes'].flatMap(modulo=>db.lista(modulo).map(x=>({...x,modulo,value:(modulo==='equipes'?'equipes':'instituicoes')+':'+x.id})));
 const aviso=message=>{const el=document.getElementById('cadastro-ocorrencia-aviso');el.textContent=message;el.hidden=false;};
 const estado=record=>({...record,remota:true,gravidade:Number(record.gravidade),registro:record,tipo:record.nome,icone:'📍',pos:[Number(record.lat),Number(record.lng)],eventoId:record.evento_id,evento:db.registro('eventos',record.evento_id)?.nome||'',confirmado:record.status!=='Em triagem',status:record.status==='Resolvida'?'resolvida':record.status==='Arquivada'?'arquivada':'ativa',reportadoEm:new Date(record.quando).getTime(),responsavel:ctx.responsavelDaOcorrencia(record.bairro),voluntariosProx:[],timeline:[],organizacoes:record.organizacoes||[]});
 function sincronizar(){
  const array=ctx.obterOcorrencias();for(const o of array.filter(x=>x.remota))o.marker?.remove();
  const rows=db.lista('incidentes').map(estado);array.splice(0,array.length,...array.filter(x=>!x.remota),...rows);
  for(const o of rows)if(!['resolvida','arquivada'].includes(o.status)){
   o.marker=L.marker(o.pos,{icon:ctx.ocIcon(o.status)}).addTo(ctx.ocLayer);o.marker.on('click',()=>abrir(o));ctx.refreshOcTooltip(o);
  }
  ctx.atualizarFluxo();return rows;
 }
 function abrir(o){
  const record=db.registro('incidentes',o.id);if(!record)return;
  const panel=document.getElementById('panel'),body=document.getElementById('panel-body');
  panel.classList.remove('com-ficha-ponto');panel.classList.add('open');
  document.getElementById('panel-title').textContent=record.nome+' · '+record.status;
  body.innerHTML='<p>'+esc(record.protocolo)+'</p><p>'+esc(record.bairro)+' · '+esc(record.endereco)+'</p><p>'+esc(record.descricao)+'</p><p>Registrado em '+esc(record.criado_em)+'</p><h3>Organizações selecionadas</h3><p>'+esc((record.organizacoes||[]).map(x=>x.nome).join(', ')||'Nenhuma')+'</p><p>Registro no banco. Nenhuma mensagem ou convocação foi enviada automaticamente.</p><p>'+esc((record.relatos||[]).length)+' relatos vinculados · '+esc((record.fotos||[]).length)+' fotos privadas</p><div id="incidente-acoes"></div><p id="incidente-erro" role="alert"></p>';
  if(db.pode('incidentes','gravar'))for(const status of root.AlertaRegrasOperacionais.transicoes.incidentes.estados[record.status]||[]){
   const button=document.createElement('button');button.type='button';button.className='admin-btn';button.textContent=status;button.dataset.permissionCollection='incidentes';
   button.onclick=async()=>{button.disabled=true;try{await db.gravar('incidentes',{...record,status},record.id);const saved=sincronizar().find(x=>x.id===record.id);abrir(saved);}catch(e){document.getElementById('incidente-erro').textContent=e.message;}finally{button.disabled=false;}};
   body.querySelector('#incidente-acoes').appendChild(button);
  }
 }
 const preparar=d=>{
  const tipo=tipos().find(x=>x.id===d.tipo),bairro=bairros().find(x=>x.nome===d.bairro);
  if(!tipo||!bairro)throw Error('Escolha tipo e bairro cadastrados.');
  return {tipo_id:tipo.id,evento_id:d.evento,bairro_id:bairro.id,nome:tipo.nome,bairro:bairro.nome,endereco:d.endereco,descricao:d.descricao,gravidade:String(d.gravidade),responsabilidade:d.responsabilidade,lat:String(d.pos[0]),lng:String(d.pos[1]),afetados:d.afetados||0,quando:new Date(d.quando).toISOString(),acesso:d.acesso,riscos:d.riscos,origem:d.origem,comunicante:d.comunicante,contato:d.contato,fotos:d.fotos||[],relatos:[],organizacoes:d.organizacoes.map(value=>{const org=orgs().find(x=>x.value===value);if(!org)throw Error('Organização não disponível.');return {colecao:org.modulo==='equipes'?'equipes':'instituicoes',id:org.id};})};
 };
 root.CadastroOcorrencia.iniciar({
  connected:true,limits:root.AlertaRegrasOperacionais.ocorrenciasMapa,canCreate:()=>db.pode('incidentes','gravar'),canCreateType:()=>db.pode('ocorrencias','gravar'),canCreateOrganization:()=>['equipes','saude','emergencias','parceiros'].some(x=>db.pode(x,'gravar')),trigger:document.getElementById('demo-new'),center:ctx.MUNICIPIO_CENTER||[ctx.map.getCenter().lat,ctx.map.getCenter().lng],municipio:db.municipioAtivo(),onClose:ctx.fecharMenuMobile,feedback:aviso,
  types:()=>tipos().map(x=>({value:x.id,label:x.nome})),events:()=>db.lista('eventos').filter(x=>x.status!=='Encerrado').map(x=>({value:x.id,label:x.nome})),selectedEvent:ctx.obterEventoSelecionado,
  neighborhoods:()=>bairros().map(x=>({value:x.nome,label:x.nome})),neighborhood:pos=>root.CadastroOcorrencia.encontrarBairro(ctx.areas,pos),
  isWithinMunicipality:pos=>!!root.CadastroOcorrencia.encontrarBairro(ctx.areas,pos),
  organizations:()=>orgs().map(x=>({id:x.value,nome:x.nome,zona:x.zona||x.bairro})),suggest:()=>[],
  createType:async(nome,prioridade)=>{if(!db.pode('ocorrencias','gravar'))throw Error('Sem permissão para cadastrar tipos.');return db.gravar('ocorrencias',{nome,prioridade});},
  createOrganization:async(nome,modulo,bairro)=>{if(!['equipes','saude','emergencias','parceiros'].includes(modulo)||!db.pode(modulo,'gravar'))throw Error('Sem permissão para cadastrar organização.');const item=await db.gravar(modulo,{nome,tipo:modulo==='equipes'?'Outra':'Outro',zona:bairro,status:'Disponível'});return (modulo==='equipes'?'equipes':'instituicoes')+':'+item.id;},
  findDuplicates:d=>db.lista('incidentes').filter(x=>!['Resolvida','Arquivada'].includes(x.status)&&x.tipo_id===d.tipo&&Math.abs(new Date(x.quando)-new Date(d.quando))<=d.janela*3600000&&(d.pos&&ctx.map.distance(d.pos,[Number(x.lat),Number(x.lng)])<=d.raio)).map(x=>({id:x.id,tipo:x.nome,local:x.endereco,origem:'Cadastro municipal',descricao:x.descricao,situacao:x.status,vinculavel:true})),
  link:async(id,d)=>{const registro=db.registro('incidentes',id);if(!registro)throw Error('Registro não disponível.');const relato=preparar(d);await db.gravar('incidentes',{...registro,relatos:[...(registro.relatos||[]),relato]},id);abrir(sincronizar().find(x=>x.id===id));},
  save:async(d,acao)=>{const saved=await db.gravar('incidentes',{...preparar(d),status:acao==='confirmar'?'Confirmada':'Em triagem'});ctx.setEventoFiltro(saved.evento_id);ctx.atualizarFiltroEventos();const o=sincronizar().find(x=>x.id===saved.id);ctx.map.setView(o.pos,15);abrir(o);aviso('Ocorrência registrada no banco.');}
 });
 atual={abrir};const carregadas=sincronizar();
 const params=new URLSearchParams(location.search);
 if(params.get('incidente')){const registro=carregadas.find(x=>x.id===params.get('incidente'));if(registro)abrir(registro);else aviso('Ocorrência indisponível para este acesso.');}
 if(params.get('novaOcorrencia')==='1'&&db.pode('incidentes','gravar'))setTimeout(()=>document.getElementById('demo-new').click(),0);
}
root.AlertaOcorrenciasServidor={instalar,abrir:o=>{if(!o?.remota||!atual)return false;atual.abrir(o);return true;}};
})(globalThis);
