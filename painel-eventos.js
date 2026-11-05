/* Controle de exibição e posicionamento do painel, sem alterar os filtros ativos. */
(function(root){
'use strict';
function iniciar({painel,barra,abrir,fechar,area,aoAbrir}){
 let arraste=null;
 const minimizar=painel.querySelector("#eventos-minimizar"),corpo=painel.querySelector("#eventos-painel-body");
 minimizar.addEventListener("click",()=>{
  const recolhido=!corpo.hidden;
  corpo.hidden=recolhido;
  minimizar.textContent=recolhido?"+":"−";
  minimizar.setAttribute("aria-expanded",String(!recolhido));
  minimizar.setAttribute("aria-label",recolhido?"Expandir filtros de eventos":"Minimizar filtros de eventos");
  minimizar.title=recolhido?"Expandir":"Minimizar";
  if(!recolhido&&painel.style.left)posicionar(painel.offsetLeft,painel.offsetTop);
 });
 function posicionar(x,y){
  const maxX=Math.max(0,area.clientWidth-painel.offsetWidth),maxY=Math.max(0,area.clientHeight-painel.offsetHeight);
  painel.style.left=Math.max(0,Math.min(x,maxX))+'px';painel.style.top=Math.max(0,Math.min(y,maxY))+'px';
 }
 function mostrar(){painel.hidden=false;abrir.setAttribute('aria-expanded','true');aoAbrir?.();if(painel.style.left)posicionar(painel.offsetLeft,painel.offsetTop);}
 function encerrar(){painel.hidden=true;abrir.setAttribute('aria-expanded','false');abrir.focus({preventScroll:true});}
 abrir.addEventListener('click',()=>painel.hidden?mostrar():encerrar());
 fechar.addEventListener('click',encerrar);
 barra.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;arraste={id:e.pointerId,x:e.clientX-painel.offsetLeft,y:e.clientY-painel.offsetTop};barra.setPointerCapture(e.pointerId);barra.classList.add('arrastando');});
 barra.addEventListener('pointermove',e=>{if(arraste?.id===e.pointerId)posicionar(e.clientX-arraste.x,e.clientY-arraste.y);});
 barra.addEventListener('lostpointercapture',()=>{arraste=null;barra.classList.remove('arrastando');});
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(!painel.hidden&&painel.style.left)posicionar(painel.offsetLeft,painel.offsetTop);}).observe(area);
}
root.PainelEventos={iniciar};
})(window);
