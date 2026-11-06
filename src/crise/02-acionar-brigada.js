 function acionarBrigada(zona,descricao=""){
  if(!zona||!zonas().includes(zona))throw Error("Selecione uma zona cadastrada.");
  const voluntarios=oferentes().filter(x=>norm(x.zona)===norm(zona)&&x.disponibilidade!=="Indisponível"&&x.status_simulacao!=="simulado");
  const equipes=db.lista("equipes").filter(x=>norm(x.zona)===norm(zona)&&x.status!=="Indisponível");
  const destinatarios=[...voluntarios.map(x=>({id:x.id,nome:x.nome,telefone:x.telefone,tipo:"colaborador"})),
   ...equipes.map(x=>({id:x.id,nome:x.nome,telefone:x.telefone,tipo:"equipe"}))];
  const unicos=[];const telefones=new Set();
  for(const x of destinatarios){const f=telefone(x.telefone);if(f&&telefones.has(f))continue;if(f)telefones.add(f);unicos.push(x);}
  const msg="REDE MUNICIPAL · "+(prefeitura()?.nome||"Município")+" · Brigada da zona "+zona+"\n"+(String(descricao).trim()||"Solicitação de mobilização da equipe e dos colaboradores disponíveis.")+
    "\nPara participação em campo, registre apenas CHEGUEI e TERMINEI.";
  const item=db.gravar("mobilizacoes",{nome:"Brigada · "+zona,zona,mensagem:msg,status:"Preparada",
    destinatarios:JSON.stringify(unicos),criado_em:new Date().toISOString()});
  return {mobilizacao:item,destinatarios:unicos,mensagem:msg,envios:unicos.map(x=>({nome:x.nome,tipo:x.tipo,link:waLink(x.telefone,msg)}))};
 }
 function solicitarOutraPrefeitura(destinoId,recurso){
  const origem=prefeitura(),destino=db.municipios().find(x=>x.id===destinoId);
  if(!destino||destino.id===origem?.id)throw Error("Selecione outra prefeitura cadastrada.");
  if(!String(recurso||"").trim())throw Error("Especifique o recurso ou apoio solicitado.");
  const msg="SOLICITAÇÃO INTERMUNICIPAL · SISTEMA INTEGRADO DE CRISE\nOrigem: "+origem.nome+"/"+origem.uf+
    "\nDestino: "+destino.nome+"/"+destino.uf+"\nRecurso solicitado: "+String(recurso).trim()+
    "\nSolicitação preparada no protótipo; validação institucional obrigatória.";
  const item=db.gravar("apoios",{nome:"Pedido a "+destino.nome,destino:destino.nome+" / "+destino.uf,
    destino_id:destino.id,recurso:String(recurso).trim(),mensagem:msg,status:"Preparada",criado_em:new Date().toISOString()});
  return {pedido:item,mensagem:msg,link:waLink(destino.telefone,msg),destino};
 }
 return {db,prefeitura,zonas,pontoDaZona,oferentes,pedidos,mobilizacoes,apoios,
  encontrarPessoa,encontrarIdentidade,registrarColaborador,registrarPedido,compatíveis,registrarFase,acionarBrigada, situacaoBairro,registrarCheckin,registrarSaida,
  solicitarOutraPrefeitura,mensagemParaColaborador};
}
return {criar,COMPATIBILIDADE,norm,telefone,mesmoTelefone,waLink};
});
