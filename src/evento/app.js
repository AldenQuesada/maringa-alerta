/* Entrada única do Mapa de Evento. */
void AlertaEventoControladores.criar().iniciar().catch(error=>{console.error('Não foi possível iniciar o mapa',error);const alvo=document.getElementById('map');if(alvo){const aviso=document.createElement('p');aviso.setAttribute('role','alert');aviso.textContent='Não foi possível carregar o mapa. Recarregue a página.';alvo.appendChild(aviso);}});
