/* Domínio de compatibilidade: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
function criar({COMPATIBILIDADE,norm,mesmoTelefone,array,oferentes}){
function pontuacaoOferta(pedido,voluntario) {
  if(voluntario.status_simulacao==="simulado")return -1;
   if(pedido.telefone&&mesmoTelefone(pedido.telefone,voluntario.telefone))return -1;
  if(voluntario.disponibilidade==="Indisponível")return -1;
  const candidatas=COMPATIBILIDADE[pedido.necessidade]||[];
  if(!candidatas.length)return -1; // "Outros" e ajuda financeira pedem verificação.
  const recursos=[...array(voluntario.ajudas),...array(voluntario.maquinas),
    ...array(voluntario.empreendedores),...array(voluntario.materiais)];
  if(!recursos.some(x=>candidatas.some(t=>norm(t)===norm(x))))return -1;
  const mesmaZona=Boolean(pedido.zona&&voluntario.zona&&norm(pedido.zona)===norm(voluntario.zona));
  const pesos=root.AlertaRegrasOperacionais?.pesosCompatibilidade||{mesmaZona:100,outraZona:10,disponivel:5};
  return (mesmaZona?pesos.mesmaZona:pesos.outraZona)+(voluntario.disponibilidade==="Disponível"?pesos.disponivel:0);
 }
function compatíveis(pedido) {
  return oferentes().map(x=>({colaborador:x,pontos:pontuacaoOferta(pedido,x)}))
   .filter(x=>x.pontos>=0)
   .sort((a,b)=>b.pontos-a.pontos||String(a.colaborador.nome).localeCompare(String(b.colaborador.nome)))
   .map(x=>x.colaborador);
 }
return {pontuacaoOferta,compatíveis};
}
root.AlertaCriseCompatibilidade={criar};
})(globalThis);
