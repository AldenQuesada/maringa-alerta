/* Funções sem estado operacional: apresentação, identificação e sorteio demonstrativo. */
(function(root){
'use strict';
function validaCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma += parseInt(cpf[i])*(10-i);
  let resto = (soma*10)%11; if(resto===10) resto=0;
  if(resto!==parseInt(cpf[9])) return false;
  soma=0; for(let i=0;i<10;i++) soma += parseInt(cpf[i])*(11-i);
  resto = (soma*10)%11; if(resto===10) resto=0;
  return resto===parseInt(cpf[10]);
}
function fmtCPF(cpf){ cpf=(cpf||'').replace(/\D/g,''); return cpf.length===11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : cpf; }
function maskCPF(cpf){ if(!cpf) return '—'; const d=cpf.replace(/\D/g,''); return d.length===11 ? `***.***.${d.slice(6,9)}-${d.slice(9)}` : '—'; }
function sortGravidade(base){
  const r = Math.random();
  const g = base + (r<0.15?-1:r>0.85?1:0);
  return Math.max(1, Math.min(3, g));
}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function initials(nome){ return nome.split(' ').map(p=>p[0]).slice(0,2).join(''); }
function escHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function minutosDesde(ts){ return Math.max(0, Math.round((Date.now()-ts)/60000)); }
function fmtDist(m){ return m<1000 ? Math.round(m)+"m" : (m/1000).toFixed(1)+"km"; }
function randPointInBox(poly){
  const lats = poly.map(p=>p[0]), lngs = poly.map(p=>p[1]);
  return [ rnd(Math.min(...lats),Math.max(...lats)), rnd(Math.min(...lngs),Math.max(...lngs)) ];
}
root.AlertaEventoFormatacao={validaCPF,fmtCPF,maskCPF,sortGravidade,rnd,pick,initials,escHtml,minutosDesde,fmtDist,randPointInBox};
})(globalThis);
