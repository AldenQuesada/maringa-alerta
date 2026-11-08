/* Fronteira remota: nenhuma identidade, resposta ou transição é inventada no navegador. */
(function(root){'use strict';
function criar(client,municipio){
 async function rpc(name,args){const {data,error}=await client.rpc(name,{municipio,...args});if(error)throw error;return data;}
 return {
  listar:f=>rpc('ma_contatos_listar',{busca:f.busca,categoria:f.categoria,etapa:f.etapa,pagina:f.pagina}),
  detalhe:(chave,antes=null)=>rpc('ma_contato_detalhe',{chave,antes}),
  excluir:(chave,revisao)=>rpc('ma_contato_excluir',{chave,revisao}),
  async imagem(media){if(media?.bucket!=='ma-whatsapp'||!media.path)throw Error('media');const {data,error}=await client.storage.from(media.bucket).createSignedUrl(media.path,120);if(error)throw error;return data.signedUrl;}
 };
}
root.AlertaContatosServico={criar};
})(globalThis);
/* Templates pequenos; rótulos, categorias, etapas e perguntas chegam pelo contrato do banco. */
(function(root){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={view:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',delete:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>'};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+icons[k]+'</svg>';
const date=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const value=v=>Array.isArray(v)?v.join(', '):v===null||v===undefined?'':typeof v==='object'?'':String(v);
const button=(action,label,attrs='')=>'<button type="button" class="btn" data-ct-action="'+action+'" '+attrs+'>'+esc(label)+'</button>';
function linhas(items,c){const l=c.labels;
 return items.length?items.map(r=>'<tr data-ct-row="'+esc(r.id)+'">'+c.columns.map(col=>{
  let body=esc(r[col.key]||l.missing);
  if(col.key==='name')body='<strong>'+esc(r.name)+'</strong><small>'+esc(r.name_source==='unnamed'?r.origin:(l[r.name_source]||r.origin))+'</small>';
  if(col.key==='stage_label')body='<span class="ct-badge">'+esc(r.stage_label)+'</span>'+(r.total?'<small>'+r.completed_steps+' / '+r.total+'</small>':'');
  if(col.key==='category_label')body='<span class="ct-category" data-category="'+esc(r.category)+'">'+body+'</span>';
  if(col.key==='updated_at')body=esc(date(r.updated_at));
  if(col.key==='address')body+='<small>'+esc([r.neighborhood,r.zone].filter(Boolean).join(' · '))+'</small>';
  return '<td>'+body+'</td>';
 }).join('')+'<td><div class="ct-actions">'+['view',...(r.can_delete?['delete']:[])].map(action=>'<button type="button" class="icon-btn '+(action==='delete'?'ct-danger':'')+'" data-ct-action="'+action+'" data-key="'+esc(r.id)+'" title="'+esc(l[action])+'" aria-label="'+esc(l[action]+' · '+r.name)+'">'+icon(action)+'</button>').join('')+'</div></td></tr>').join(''):'<tr><td colspan="'+(c.columns.length+1)+'"><p class="ct-empty">'+esc(l.empty)+'</p></td></tr>';
}
function resumo(d,c){const l=c.labels,r=d.contact;
 const fields=[['category',r.category_label],['address',r.address],['neighborhood',r.neighborhood],['zone',r.zone],['offer',r.summary],['stage',r.stage_label],['origin',r.origin],['first',date(r.first_at)],['updated',date(r.updated_at)],['verified_phone',r.session_id?r.phone:null],['declared_phone',r.declared_phone],['current_question',r.current_question],['progress',r.total?r.completed_steps+' / '+r.total:null],['status',r.operational_status]];
 return '<dl class="ct-grid">'+fields.map(([k,v])=>'<div><dt>'+esc(l[k])+'</dt><dd>'+esc(v||l.missing)+'</dd></div>').join('')+'</dl><h3>'+esc(l.history)+'</h3>'+(d.records.length?'<ul class="ct-records">'+d.records.map(x=>'<li>'+esc(x.label||x.collection)+' · '+esc(date(x.confirmed_at))+(x.status?' · '+esc(x.status):'')+'</li>').join('')+'</ul>':'<p>'+esc(l.none)+'</p>');
}
function respostas(d,c){const l=c.labels;return '<p class="ct-note">'+esc(l.current_cycle)+'</p><dl class="ct-answers">'+d.answers.map(a=>'<div><dt>'+esc(a.question||a.label)+'</dt><dd>'+(a.kind==='photo'&&a.value?'<div class="ct-photo" data-media="'+esc(JSON.stringify(a.value))+'"></div>':esc(!a.answered?l.unanswered:a.value===null?l.skipped:value(a.value)||l.missing))+'</dd></div>').join('')+'</dl>';}
function mensagens(items,c){const l=c.labels;return items.map(m=>'<article class="ct-message ct-'+m.direction+'" data-message="'+esc(m.key)+'"><small>'+esc(l[m.direction])+' · '+esc(date(m.at))+(m.state?' · '+esc(c.delivery[m.state]||m.state):'')+'</small>'+(m.payload.text?'<p>'+esc(m.payload.text)+'</p>':'')+
 (m.payload.image?'<div class="ct-photo" data-public-image="'+esc(JSON.stringify(m.payload.image))+'"></div>':'')+
 (m.payload.media?'<div class="ct-photo" data-media="'+esc(JSON.stringify(m.payload.media))+'"></div>':m.payload.image_pending?'<p>'+esc(l.photo_pending)+'</p>':'')+
 (m.payload.buttons?.length?'<div class="ct-sent-buttons">'+m.payload.buttons.map(b=>'<span>'+esc(b.full_label||b.label)+'</span>').join('')+'</div>':'')+'</article>').join('');}
root.AlertaContatosApresentacao={esc,date,value,button,linhas,resumo,respostas,mensagens};
})(globalThis);
/* Um único dialog modal, com três abas no mesmo nível e confirmação dentro dele. */
(function(root){'use strict';
function criar({service,config,onDeleted,onEdit}){
 const U=root.AlertaContatosApresentacao,l=config.labels;let dialog=null,origin=null,current=null,tab='summary',mode='view',busy=false,signature='',generation=0,messages=[];
 function close(){generation++;dialog?.close();dialog?.remove();dialog=null;current=null;origin?.isConnected&&origin.focus();}
 function shell(item,action){close();origin=document.activeElement;mode=action;tab='summary';signature='';messages=[];
  dialog=document.createElement('dialog');dialog.className='ct-dialog';dialog.setAttribute('aria-labelledby','ct-dialog-title');
  dialog.innerHTML='<header><div><small data-subtitle></small><h2 id="ct-dialog-title">'+U.esc(item.name)+'</h2></div>'+U.button('close',l.close)+'</header><p class="ct-dialog-error" role="alert"></p><div class="ct-dialog-body"></div>';
  document.body.appendChild(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)close();});
  dialog.addEventListener('click',click);dialog.showModal();dialog.querySelector('button').focus();return dialog;
 }
 function photoNodes(){const target=dialog;for(const el of target?.querySelectorAll('.ct-photo')||[]){if(el.dataset.ready)continue;el.dataset.ready='1';
  (async()=>{try{const data=JSON.parse(el.dataset.media||el.dataset.publicImage);let url=el.dataset.media?await service.imagem(data):data.url;
   const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw Error('url');
   if(!el.isConnected||dialog!==target)return;const img=document.createElement('img');img.src=u.href;img.alt=data.alt||l.image;img.loading='lazy';img.onerror=()=>{el.textContent=l.media_error;};el.appendChild(img);
  }catch(_){if(el.isConnected)el.textContent=l.media_error;}})();
 }}
 function content(){if(!dialog||!current)return;const r=current.contact;dialog.querySelector('#ct-dialog-title').textContent=r.name;dialog.querySelector('[data-subtitle]').textContent=[...new Set([r.category_label,r.stage_label,r.phone].filter(Boolean))].join(' · ');
  const area=dialog.querySelector('.ct-dialog-body'),scroll=area.scrollTop;
  if(mode==='delete'){area.innerHTML='<section class="ct-confirm"><h3>'+U.esc(l.delete_title)+'</h3><p>'+U.esc(l.delete_description)+'</p><div class="ct-confirm-actions">'+U.button('cancel-delete',l.cancel)+U.button('confirm-delete',l.confirm_delete)+'</div></section>';return;}
  const body=tab==='summary'?U.resumo(current,config):tab==='answers'?U.respostas(current,config):
   (!current.history_allowed?'<p>'+U.esc(l.forbidden)+'</p>':(current.conversation.more?U.button('older',l.older):'')+'<div class="ct-messages">'+(messages.length?U.mensagens(messages,config):'<p>'+U.esc(l.no_messages)+'</p>')+'</div>');
  area.innerHTML='<div class="ct-tabs" role="tablist" aria-label="'+U.esc(l.view)+'">'+['summary','answers','conversation'].map(k=>'<button type="button" role="tab" id="ct-tab-'+k+'" aria-controls="ct-panel" aria-selected="'+(tab===k)+'" tabindex="'+(tab===k?'0':'-1')+'" data-ct-action="tab" data-tab="'+k+'">'+U.esc(l[k])+'</button>').join('')+'</div><section id="ct-panel" role="tabpanel" aria-labelledby="ct-tab-'+tab+'" tabindex="0">'+body+'</section>'+(r.can_edit?U.button('edit',l.edit):'');
  area.scrollTop=scroll;photoNodes();
  area.querySelector('[role=tablist]').onkeydown=e=>{const tabs=[...area.querySelectorAll('[role=tab]')];let i=tabs.indexOf(e.target);if(i<0)return;if(e.key==='ArrowRight')i=(i+1)%tabs.length;else if(e.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')i=0;else if(e.key==='End')i=tabs.length-1;else return;e.preventDefault();tab=tabs[i].dataset.tab;content();area.querySelector('#ct-tab-'+tab).focus();};
 }
 async function refresh(older=false){if(!dialog||!current||busy||mode==='delete')return;const key=current.contact.id,g=++generation;busy=true;
  try{const detail=await service.detalhe(key,older?current.conversation.cursor:null);if(g!==generation||!dialog)return;
   const next=JSON.stringify(detail);if(!older&&signature===next)return;
   const focused=dialog.contains(document.activeElement)?document.activeElement:null,action=focused?.dataset.ctAction,focusTab=focused?.dataset.tab;
   const map=new Map(messages.map(m=>[m.key,m]));for(const m of detail.conversation.items)map.set(m.key,m);messages=[...map.values()].sort((a,b)=>a.key.localeCompare(b.key));
   if(!older&&current.conversation.cursor&&messages.length>50)detail.conversation={...detail.conversation,cursor:current.conversation.cursor,more:current.conversation.more};
   current=detail;signature=next;content();if(action)dialog.querySelector('[data-ct-action="'+action+'"]'+(focusTab?'[data-tab="'+focusTab+'"]':''))?.focus();
  }catch(_){if(dialog)dialog.querySelector('[role=alert]').textContent=l.error;}finally{busy=false;}
 }
 async function open(item,action='view'){const target=shell(item,action),g=++generation;busy=true;target.querySelector('.ct-dialog-body').textContent=l.loading;
  try{const detail=await service.detalhe(item.id);if(g!==generation||dialog!==target)return;current=detail;messages=detail.conversation.items;signature=JSON.stringify(detail);content();}
  catch(_){if(dialog===target)target.querySelector('[role=alert]').textContent=l.error;}finally{busy=false;}
 }
 async function click(e){const b=e.target.closest('[data-ct-action]');if(!b||busy)return;const a=b.dataset.ctAction;
  if(a==='close'||a==='cancel-delete'){close();return;}
  if(a==='tab'){tab=b.dataset.tab;content();dialog.querySelector('#ct-tab-'+tab).focus();return;}
  if(a==='older'){await refresh(true);return;}
  if(a==='edit'){const id=current.contact.record_id;close();onEdit(id);return;}
  if(a==='confirm-delete'){busy=true;b.disabled=true;try{await service.excluir(current.contact.id,(config.deletion?.revision_prefix||'')+current.contact.revision);close();onDeleted();}
   catch(error){if(dialog)dialog.querySelector('[role=alert]').textContent=error.message||l.error;}finally{busy=false;b.disabled=false;}}
 }
 return {open,refresh,close,isOpen:()=>Boolean(dialog)};
}
root.AlertaContatosDialogo={criar};
})(globalThis);
/* Orquestração: paginação no servidor e atualização somente enquanto a tela está visível. */
(function(root){'use strict';let mounted=null;
function desmontar(){mounted?.();mounted=null;}
function montar({target,db,onEdit}){desmontar();const U=root.AlertaContatosApresentacao,service=root.AlertaContatosServico.criar(root.AlertaSupabaseClient,db.municipioAtivo().id);
 let active=true,busy=false,seq=0,timer=null,debounce=null,config=null,dialog=null,items=[],snapshot='',filters={busca:'',categoria:'',etapa:'',pagina:1};
 target.innerHTML='<p role="status">Carregando contatos…</p>';
 function skeleton(result){config=result.config;const l=config.labels;dialog=root.AlertaContatosDialogo.criar({service,config,onEdit,onDeleted:()=>{snapshot='';void update();}});
  const select=(id,label,options)=>'<label>'+U.esc(label)+'<select id="'+id+'"><option value="">'+U.esc(l.all)+'</option>'+options.map(o=>'<option value="'+U.esc(o.key)+'">'+U.esc(o.label)+'</option>').join('')+'</select></label>';
  target.innerHTML='<section class="ct-page"><div class="heading-row"><div><h1 class="page-title">'+U.esc(config.title)+'</h1><p class="page-subtitle">'+U.esc(config.description)+'</p></div>'+(db.pode('voluntarios','gravar')?'<button type="button" class="btn ct-new" data-new="voluntarios" aria-label="'+U.esc(l.new)+'"><span aria-hidden="true">+</span> '+U.esc(l.new)+'</button>':'')+'</div><p class="ct-note">'+U.esc(l.all_categories)+'</p><section class="table-shell"><div class="ct-toolbar"><label class="ct-search">'+U.esc(l.search)+'<input type="search" id="ct-search" autocomplete="off"></label>'+select('ct-category',l.category,[{key:'untriaged',label:l.not_chosen},...result.categories.sort((a,b)=>a.position-b.position)])+select('ct-stage',l.stage,config.stages)+U.button('refresh',l.refresh)+'</div><p class="ct-feedback" role="status"></p><div class="table-scroll"><table class="ct-table"><thead><tr>'+config.columns.map(c=>'<th scope="col">'+U.esc(c.label)+'</th>').join('')+'<th scope="col">'+U.esc(l.actions)+'</th></tr></thead><tbody></tbody></table></div><footer class="ct-pagination"><span></span><div>'+U.button('previous',l.previous)+U.button('next',l.next)+'</div></footer></section></section>';
  target.querySelector('#ct-search').oninput=e=>{filters.busca=e.target.value;filters.pagina=1;clearTimeout(debounce);debounce=setTimeout(()=>update(),300);};
  target.querySelector('#ct-category').onchange=e=>{filters.categoria=e.target.value;filters.pagina=1;void update();};
  target.querySelector('#ct-stage').onchange=e=>{filters.etapa=e.target.value;filters.pagina=1;void update();};
  target.addEventListener('click',click);
 }
 async function update(){if(!active)return;if(busy){seq++;return;}busy=true;const request=++seq;
  try{const result=await service.listar({...filters});if(!active)return;if(request!==seq)return;
   if(!config)skeleton(result);const l=config.labels;
   if(filters.pagina>1&&!result.items.length){filters.pagina--;seq++;return;}
   const next=JSON.stringify(result.items);items=result.items;
   if(snapshot!==next){const focus=target.contains(document.activeElement)?document.activeElement:null,key=focus?.dataset.key,action=focus?.dataset.ctAction;
    target.querySelector('tbody').innerHTML=U.linhas(items,config);snapshot=next;
    if(key){[...target.querySelectorAll('[data-key]')].find(b=>b.dataset.key===key&&b.dataset.ctAction===action)?.focus();}
   }
   target.querySelector('[role=status]').textContent='';target.querySelector('.ct-pagination span').textContent=result.total+' '+(result.total===1?(l.total_singular||l.total):l.total)+' · '+l.page+' '+result.page;
   target.querySelector('[data-ct-action=previous]').disabled=filters.pagina===1;target.querySelector('[data-ct-action=next]').disabled=filters.pagina*config.page_size>=result.total;
  }catch(_){if(active){const el=target.querySelector('[role=status]');if(el)el.textContent=config?.labels.error||'Não foi possível carregar os contatos.';}}
  finally{busy=false;if(active){clearTimeout(timer);if(request!==seq)void update();else timer=setTimeout(poll,config?.poll_ms||8000);}}
 }
 async function poll(){if(!document.hidden){await update();await dialog?.refresh();}else timer=setTimeout(poll,config?.poll_ms||8000);}
 function click(e){const b=e.target.closest('[data-ct-action]');if(!b)return;const a=b.dataset.ctAction;
  if(a==='refresh'){void update();void dialog?.refresh();}
  if(a==='previous'||a==='next'){filters.pagina+=a==='next'?1:-1;void update();}
  if(a==='view'||a==='delete'){const item=items.find(r=>r.id===b.dataset.key);if(item)void dialog.open(item,a);}
 }
 function visible(){if(!document.hidden){void update();void dialog?.refresh();}}
 document.addEventListener('visibilitychange',visible);
 mounted=()=>{active=false;seq++;clearTimeout(timer);clearTimeout(debounce);target.removeEventListener('click',click);document.removeEventListener('visibilitychange',visible);dialog?.close();};
 void update();
}
root.AlertaContatos={montar,desmontar};
})(globalThis);
