/* etapas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({api,error,overlay,state,verificar}){
function mostrarEtapa(indice){
  state.etapa=indice;
  overlay.querySelectorAll('.cad-step').forEach(sec=>{sec.hidden=Number(sec.dataset.step)!==indice;});
  overlay.querySelectorAll('[data-step-label]').forEach(el=>{el.classList.toggle('active',Number(el.dataset.stepLabel)===indice);});
  overlay.querySelector('#cad-oc-back').hidden=indice===0;
  overlay.querySelector('#cad-oc-next').hidden=indice===3;
  overlay.querySelectorAll('button[type="submit"]').forEach(el=>{el.hidden=indice!==3;});
  overlay.querySelector('.cad-step-content').scrollTop=0;
  error.textContent='';
  if(indice===1 && state.map)state.map.invalidateSize({animate:false});
  if(indice===3)verificar();
 }
function validarEtapa(indice){
  const sec=overlay.querySelector('[data-step="'+indice+'"]');
  const campo=[...sec.querySelectorAll('input,select,textarea')].find(el=>!el.disabled&&!el.closest('.cad-add-panel[hidden], #cad-criterios[hidden]')&&!el.checkValidity());
  if(campo){mostrarEtapa(indice);campo.reportValidity();return false;}
  if(indice===1&&!state.pos){mostrarEtapa(1);error.textContent='Selecione o ponto da ocorrência no mapa.';return false;}
  return true;
 }
function validarFormulario(){
  const anterior=state.etapa;
  for(let indice=0;indice<4;indice++)if(!validarEtapa(indice))return false;
  if(state.etapa!==anterior)mostrarEtapa(anterior);
  return true;
 }
function fechar(){overlay.hidden=true;api.onClose?.();api.trigger.focus();}
return {mostrarEtapa,validarEtapa,validarFormulario,fechar};
}
root.AlertaOcorrenciasEtapas={criar};
})(globalThis);
