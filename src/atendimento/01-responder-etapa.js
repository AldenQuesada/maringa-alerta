function responderEtapa(e){
 e.preventDefault();
 const v=input.value.trim();
 if(current.required&&!v){input.focus();return;}
 if(current.key==="telefone"){
  const digits=MaringaCrise.telefone(v);
  if(digits.length<10||digits.length>13){mensagem("Por favor, informe um telefone válido com DDD.");input.focus();return;}
 }
 gravarResposta(v);
}
form.onsubmit=responderEtapa;
function concluir(){
 try{
  if(role==="colaborador"){
   const res=app.registrarColaborador(answers);
   identity={nome:res.nome,tipo_pessoa:res.tipo_pessoa,endereco:res.endereco,telefone:res.telefone,zona:res.zona};
   bot("Cadastro de colaborador concluído nesta simulação. Obrigado por ajudar!\n\nSuas ofertas aparecem no Mapa de Colaboradores por zona."+
    (res.forma_entrega_doacao?"\nDoação: "+res.forma_entrega_doacao+". A prefeitura confirmará o ponto de recebimento apropriado.":"")+
    "\nNenhuma mensagem foi enviada automaticamente.");
  }else{
   const res=app.registrarPedido(answers);
   const p=res.pedido;
   identity={nome:p.nome,tipo_pessoa:p.tipo_pessoa,endereco:p.endereco,telefone:p.telefone,zona:p.zona};
   bot("Seu pedido de "+p.necessidade+" foi registrado nesta simulação.\n\nSituação: "+p.status+".\n"+res.aviso+
   (p.necessidade==="Apoio financeiro"?"\nApoio financeiro depende de avaliação institucional. Não realizamos transferências automáticas.":"")+
   "\n\nO Mapa da Ajuda apresenta a demanda por zona, sem revelar seu endereço.");
  }
 }catch(err){
  bot("Não foi possível concluir o cadastro: "+err.message);
  optionsSimple([["Revisar do começo",()=>start(role)],["Voltar ao início",()=>startMenu()]]);
  return;
 }
 optionsSimple([
  ["Também preciso de ajuda",()=>start("solicitacao"),"submit"],
  ["Também quero colaborar",()=>start("colaborador")],
  ["Ver Mapa de Colaboradores",()=>abrir("../mapas/?tipo=colaboradores")],
  ["Ver Mapa da Ajuda",()=>abrir("../mapas/?tipo=ajuda")],
  ["Novo atendimento",()=>{identity=null;startMenu();},"secondary"]
 ]);
}
function abrir(url){window.open(url,"_blank","noopener,noreferrer");mensagem("O mapa foi aberto em outra aba.");clear();
 optionsSimple([["Voltar ao menu",()=>startMenu()]]);}
function identificar(){
 bot("Informe seu telefone com DDD para localizar seu cadastro neste navegador.");
 current={key:"identificar",required:true,kind:"tel"};
 form.hidden=false;input.type="tel";input.placeholder="(44) 99999-9999";input.focus();
 form.onsubmit=e=>{
  e.preventDefault();
  const number=input.value.trim();
  const pessoa=app.encontrarIdentidade(number);
  if(!pessoa){bot("Não encontrei um cadastro com esse número neste navegador. Você pode fazer um novo registro.");identity=null;startMenu();return;}
  identity={nome:pessoa.nome,tipo_pessoa:pessoa.tipo_pessoa,endereco:pessoa.endereco,telefone:pessoa.telefone,zona:pessoa.zona};
  bot("Encontrei o cadastro de "+identity.nome+". Você pode iniciar outro fluxo sem repetir seus dados básicos.");
  optionsSimple([["Receber ajuda",()=>start("solicitacao")],["Oferecer ajuda",()=>start("colaborador")],["Voltar ao início",()=>startMenu()]]);
 };
}
function iniciarFase(){
 bot("Este é um teste das duas confirmações do colaborador: CHEGUEI e TERMINEI. Informe o telefone usado no cadastro.");
 current={key:"faseTelefone",required:true,kind:"tel"};
 form.hidden=false;input.type="tel";input.placeholder="(44) 99999-9999";input.focus();
 form.onsubmit=e=>{
  e.preventDefault();
  const pessoa=app.encontrarPessoa(input.value);
  if(!pessoa){bot("Colaborador não localizado neste navegador.");optionsSimple([["Início",()=>startMenu()]]);return;}
  const pendentes=app.pedidos().filter(x=>x.atribuido_a===pessoa.id&&["Encaminhada","Cheguei"].includes(x.status));
  if(!pendentes.length){bot("Não há encaminhamentos ativos neste cadastro.");optionsSimple([["Início",()=>startMenu()]]);return;}
  bot("Encontrei "+pendentes.length+" encaminhamento(s). Escolha um pedido:");
  optionsSimple(pendentes.map(x=>["Pedido "+x.necessidade+" · "+(x.zona||"sem zona"),()=>escolherFase(x.id)]));
 };
}
function escolherFase(id){
 const pedido=app.pedidos().find(x=>x.id===id);
 if(!pedido){startMenu();return;}
 bot("Pedido: "+pedido.necessidade+". Situação: "+pedido.status+".\nQual confirmação deseja enviar neste teste?");
 const fase=pedido.status==="Encaminhada"?"Cheguei":"Terminei";
 optionsSimple([
  [fase.toUpperCase(),()=>{
   try{
    const salvo=app.registrarFase(id,fase);
    bot(fase==="Cheguei"?"Chegada registrada neste teste.":"Ajuda concluída neste teste. Obrigado pela colaboração!");
    optionsSimple([["Voltar ao início",()=>startMenu()]]);
   }catch(err){bot(err.message);optionsSimple([["Voltar ao início",()=>startMenu()]]);}
  },"submit"],
  ["Voltar ao início",()=>startMenu(),"secondary"]
 ]);
}
startMenu();
})();
