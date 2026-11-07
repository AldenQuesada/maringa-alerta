/* Controlador janela-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('janela-colaboradores',{
 dependencias:{
  "janelaColaboradores": "painel-colaboradores",
  "barraColaboradores": "painel-colaboradores",
  "areaMapa": "painel-colaboradores",
  "arrasteColaboradores": "painel-colaboradores"
},
 criar(dependencias){

 function posicionarColaboradores(x,y){
  dependencias.janelaColaboradores.style.right='auto';
  dependencias.janelaColaboradores.style.left=Math.max(0,Math.min(x,dependencias.areaMapa.clientWidth-dependencias.janelaColaboradores.offsetWidth))+'px';
  dependencias.janelaColaboradores.style.top=Math.max(0,Math.min(y,dependencias.areaMapa.clientHeight-dependencias.janelaColaboradores.offsetHeight))+'px';
}
function ajustarJanelaColaboradores(){
  if(dependencias.janelaColaboradores.style.left) posicionarColaboradores(dependencias.janelaColaboradores.offsetLeft,dependencias.janelaColaboradores.offsetTop);
}
 async function iniciar(){
 dependencias.barraColaboradores.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;
  dependencias.arrasteColaboradores={id:e.pointerId,x:e.clientX-dependencias.janelaColaboradores.offsetLeft,y:e.clientY-dependencias.janelaColaboradores.offsetTop};
  dependencias.barraColaboradores.setPointerCapture(e.pointerId);
  dependencias.barraColaboradores.classList.add('dragging');
});
dependencias.barraColaboradores.addEventListener('pointermove',e=>{
  if(dependencias.arrasteColaboradores?.id!==e.pointerId)return;
  posicionarColaboradores(e.clientX-dependencias.arrasteColaboradores.x,e.clientY-dependencias.arrasteColaboradores.y);
});
dependencias.barraColaboradores.addEventListener('lostpointercapture',()=>{
  dependencias.arrasteColaboradores=null;
  dependencias.barraColaboradores.classList.remove('dragging');
});
new ResizeObserver(ajustarJanelaColaboradores).observe(dependencias.areaMapa);
document.getElementById('floatwin-min').onclick=e=>{
  const recolhido=dependencias.janelaColaboradores.classList.toggle('minimized');
  document.getElementById('floatwin-body').hidden=recolhido;
  e.currentTarget.textContent=recolhido?'+':'_';
  const rotulo=recolhido?'Abrir colaboradores':'Recolher colaboradores';
  e.currentTarget.title=rotulo;
  e.currentTarget.setAttribute('aria-label',rotulo);
  e.currentTarget.setAttribute('aria-expanded',String(!recolhido));
  ajustarJanelaColaboradores();
};
 return true;
 }
 return {iniciar,posicionarColaboradores,ajustarJanelaColaboradores};
 }
});
})(globalThis);
