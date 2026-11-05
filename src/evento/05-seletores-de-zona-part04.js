function posicionarColaboradores(x,y){
  janelaColaboradores.style.right='auto';
  janelaColaboradores.style.left=Math.max(0,Math.min(x,areaMapa.clientWidth-janelaColaboradores.offsetWidth))+'px';
  janelaColaboradores.style.top=Math.max(0,Math.min(y,areaMapa.clientHeight-janelaColaboradores.offsetHeight))+'px';
}
function ajustarJanelaColaboradores(){
  if(janelaColaboradores.style.left) posicionarColaboradores(janelaColaboradores.offsetLeft,janelaColaboradores.offsetTop);
}
barraColaboradores.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;
  arrasteColaboradores={id:e.pointerId,x:e.clientX-janelaColaboradores.offsetLeft,y:e.clientY-janelaColaboradores.offsetTop};
  barraColaboradores.setPointerCapture(e.pointerId);
  barraColaboradores.classList.add('dragging');
});
barraColaboradores.addEventListener('pointermove',e=>{
  if(arrasteColaboradores?.id!==e.pointerId)return;
  posicionarColaboradores(e.clientX-arrasteColaboradores.x,e.clientY-arrasteColaboradores.y);
});
barraColaboradores.addEventListener('lostpointercapture',()=>{
  arrasteColaboradores=null;
  barraColaboradores.classList.remove('dragging');
});
new ResizeObserver(ajustarJanelaColaboradores).observe(areaMapa);
document.getElementById('floatwin-min').onclick=e=>{
  const recolhido=janelaColaboradores.classList.toggle('minimized');
  document.getElementById('floatwin-body').hidden=recolhido;
  e.currentTarget.textContent=recolhido?'+':'_';
  const rotulo=recolhido?'Abrir colaboradores':'Recolher colaboradores';
  e.currentTarget.title=rotulo;
  e.currentTarget.setAttribute('aria-label',rotulo);
  e.currentTarget.setAttribute('aria-expanded',String(!recolhido));
  ajustarJanelaColaboradores();
};

