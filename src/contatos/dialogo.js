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
