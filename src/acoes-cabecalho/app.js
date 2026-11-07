/* Ações de cabeçalho inspiradas na organização do ClinicAI V2.
 * Adaptação exclusiva à gestão de crise; sem alertas sanitários nem chamada interna.
 * Dados demonstrativos no navegador. Ligações somente por gesto explícito do usuário.
 */
(function (global) {
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const D=global.AlertaGestaoDados;
if(!D||!$("header-actions"))return;
const TKEY="maringa_alerta_tarefas_gestao_v1_";
const LKEY="maringa_alerta_alertas_lidos_v1_";
const paths={
 tasks:'<path d="m9 11 2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="3"/>',
 alerts:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 samu:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2c-8.6-.9-16.8-9.1-17.7-17.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.8 10a16 16 0 0 0 6.2 6.2l1.4-1.5a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
 bombeiros:'<path d="M12 22c4.4 0 7-3 7-7 0-3.3-1.9-5.3-4-7-.1 2-1 3.1-2.5 3.8.3-3.6-.7-6.4-3.6-9.8 0 3.7-1.6 5.1-3.2 7.6C4.4 11.8 5 14 5 15c0 4 2.6 7 7 7z"/><path d="M12 22c2 0 3-1.4 3-3 0-1.2-.9-2.3-2.3-3.4.2 2-.6 2.2-1.4 2.7-.4-1.2-1.4-2-2-2.9 0 1.7-1.3 2.1-1.3 3.6 0 1.6 1 3 4 3z"/>'
};
const icon=k=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+paths[k]+'</svg>';
const defs=[
 {id:"tasks",label:"Tarefas",title:"Abrir painel de tarefas",cls:""},
 {id:"alerts",label:"Alertas",title:"Ver alertas locais",cls:""},
 {id:"samu",label:"SAMU 192",title:"Orientações para ligar ao SAMU 192",cls:"emergency"},
 {id:"bombeiros",label:"Bombeiros 193",title:"Orientações para ligar aos Bombeiros 193",cls:"emergency"}
];
const wrap=$("header-actions");
wrap.innerHTML=defs.map(d=>'<button type="button" class="ma-action '+d.cls+'" data-header-action="'+d.id+'" title="'+esc(d.title)+'" aria-label="'+esc(d.title)+'" aria-haspopup="dialog" aria-expanded="false">'+icon(d.id)+'<span class="ma-action-label">'+esc(d.label)+'</span><span class="ma-count" id="ma-count-'+d.id+'" hidden></span></button>').join("");
const overlay=document.createElement("div");
overlay.className="ma-overlay";overlay.hidden=true;
overlay.innerHTML='<section class="ma-dialog" role="dialog" aria-modal="true" aria-labelledby="ma-dialog-title"><header class="ma-dialog-head"><div><span class="ma-eyebrow" id="ma-eyebrow">GESTÃO MUNICIPAL</span><h2 id="ma-dialog-title">Ações</h2></div><button class="ma-close" type="button" aria-label="Fechar painel" id="ma-dialog-close">×</button></header><div class="ma-dialog-body" id="ma-dialog-body"></div></section>';
document.body.appendChild(overlay);
const state={active:null,lastFocus:null,lastMsg:""};

const scopedDB=()=>D.criar(undefined,{municipioId:D.config.selecionar(D,global.sessionStorage)});
const getPref=()=>scopedDB().municipioAtivo();
const getId=()=>getPref()?.id||"";
const read=(key,def)=>{try{const x=JSON.parse(global.localStorage.getItem(key)||"null");return x??def;}catch(_){return def;}};
const put=(key,x)=>{try{global.localStorage.setItem(key,JSON.stringify(x));return true;}catch(_){return false;}};
const tasks=()=>{const x=read(TKEY+getId(),[]);return Array.isArray(x)?x:[];};
const taskSave=x=>put(TKEY+getId(),x);
const safeDate=iso=>{if(!iso)return "";const d=new Date(iso);return Number.isNaN(d.valueOf())?String(iso):d.toLocaleDateString("pt-BR")};

const chaveAlertas=()=>LKEY+getId()+(wrap.dataset.escopo?":"+wrap.dataset.escopo:"");
const readIds=()=>{const x=read(chaveAlertas(),[]);return new Set(Array.isArray(x)?x:[])};

const message=(txt)=>{state.lastMsg=txt;const el=$("ma-message");if(el){el.textContent=txt;el.hidden=false;}};

const {alerts,renderAlerts}=AlertaCabecalhoAlertas.criar({$,chaveAlertas,esc,getId,put,readIds,scopedDB,updateBadges:(...args)=>updateBadges(...args),wrap});
const {renderTasks,taskRow}=AlertaCabecalhoTarefas.criar({$,esc,global,message,safeDate,taskSave,tasks,updateBadges:(...args)=>updateBadges(...args)});
const {renderEmergency}=AlertaCabecalhoEmergencia.criar({$,esc,getPref,message});
const {open,close,updateBadges}=AlertaCabecalhoDialogo.criar({$,alerts:(...args)=>alerts(...args),defs,getPref,overlay,readIds,renderAlerts:(...args)=>renderAlerts(...args),renderEmergency:(...args)=>renderEmergency(...args),renderTasks:(...args)=>renderTasks(...args),state,tasks,wrap});
wrap.querySelectorAll("[data-header-action]").forEach(b=>b.onclick=()=>open(b.dataset.headerAction));
$("ma-dialog-close").onclick=close;
overlay.addEventListener("mousedown",e=>{if(e.target===overlay)close();});
document.addEventListener("keydown",e=>{
 if(overlay.hidden)return;
 if(e.key==="Escape"){e.preventDefault();close();return;}
 if(e.key==="Tab"){
  const focusable=[...overlay.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')].filter(x=>!x.closest('[hidden]'));
  if(!focusable.length)return;
  if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus();}
 }
});
global.addEventListener("storage",e=>{if(e.key===D.CHAVE||e.key?.startsWith(TKEY)||e.key?.startsWith(LKEY))updateBadges();});
global.addEventListener("focus",()=>updateBadges());
updateBadges();
})(typeof globalThis!=="undefined"?globalThis:window);
