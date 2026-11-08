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
  if(col.key==='name')body='<strong>'+esc(r.name)+'</strong><small>'+esc(l[r.name_source]||r.origin)+'</small>';
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
