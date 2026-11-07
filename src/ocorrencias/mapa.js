/* mapa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({api,bairro,error,overlay,preencherOrganizacoes,state,verificar}){
function marcar(latlng){
  if(!api.isWithinMunicipality([latlng.lat,latlng.lng])){if(state.marker&&state.pos)state.marker.setLatLng(state.pos);error.textContent='Selecione um ponto dentro da área de navegação do município.';return;}
  error.textContent='';state.pos=[latlng.lat,latlng.lng];
  if(state.marker) state.marker.setLatLng(latlng);else state.marker=L.marker(latlng,{draggable:true}).addTo(state.map).on('dragend',()=>marcar(state.marker.getLatLng()));
  overlay.querySelector('#cad-oc-pos').textContent=`Local selecionado: ${state.pos[0].toFixed(5)}, ${state.pos[1].toFixed(5)}`;
  const sugestao=api.neighborhood(state.pos);
  if(sugestao && [...bairro.options].some(o=>o.value===sugestao))bairro.value=sugestao;
  preencherOrganizacoes();verificar();
 }
return {marcar};
}
root.AlertaOcorrenciasMapa={criar};
})(globalThis);
