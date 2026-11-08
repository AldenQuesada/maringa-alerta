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
