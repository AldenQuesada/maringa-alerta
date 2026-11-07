/* roteiro: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({BENS,arr,pessoaTipo}){
function mensagensMunicipais(municipio={}){
    const nome=municipio.nome||'seu município';
    const marca=municipio.marca||(municipio.nome?municipio.nome+' Alerta':'Atendimento municipal');
    return {
      perguntaEndereco:"Informe seu endereço seguindo este formato:\nRua ou avenida, número, complemento (se houver), bairro, cidade/UF e CEP (se souber).\n\nExemplo: Rua das Flores, 100, Centro, "+nome+"/"+(municipio.uf||'UF')+".\n\nSe não houver número, escreva s/n. 👇",
      intro:"Olá! Bem-vindo ao "+marca+".\n\nUm sistema desenvolvido pela Prefeitura de "+nome+" para que todos possam somar esforços na recuperação da nossa cidade em caso de eventos climáticos e desastres naturais.\n\nEscolha uma opção para continuar:",
      nomeIntro:"Programa de Apoio Social e Mobilização Voluntária de "+nome+"\n\n“Onde a boa vontade se transforma em ação”\n\nUnindo:\nEmpresas 🤝 Voluntários 🤝 Entidades\n\nPara começar, digite seu nome e sobrenome 👇"
    };
  }
function fluxoCadastro(p,municipio={}) {
    const {intro,nomeIntro,perguntaEndereco}=mensagensMunicipais(municipio);
    const passos = [];
    const demonstrativo=p.status_simulacao==="simulado";
    const bot = texto => passos.push({tipo:"bot",texto});
    const respond = (key, formatter) => {
      const value = p[key];
      if (value === undefined || value === null || value === "" ||
          (Array.isArray(value) && !value.length)) {
        passos.push(demonstrativo?{tipo:"pessoa",texto:Array.isArray(value)?"0 (nenhuma dessas opções)":"Não informado (demonstração)"}:{tipo:"ausente",texto:"Resposta não consta no cadastro."});
        return;
      }
      const valor = typeof formatter === "function" ? formatter(value) :
        Array.isArray(value) ? value.join(", ") : String(value);
      passos.push({tipo:"pessoa",texto:String(valor)});
    };
    const multi = (key, pergunta) => {bot(pergunta);respond(key);};
    bot(intro);
    passos.push({tipo:"selecao",texto:"Ser colaborador"});
    bot(nomeIntro);
    respond("nome");
    bot("Muito obrigado, " + (p.nome || "colaborador") +
      "! Como você gostaria de se cadastrar?\n\n◾ Pessoa física\n◾ Pessoa jurídica\n\nToque em uma das opções abaixo. 👇");
    respond("tipo_pessoa",pessoaTipo);
    bot(perguntaEndereco);
    respond("endereco");
    bot("Qual é seu telefone com DDD?");
    respond("telefone");
    multi("ajudas","Que tipo de ajuda pode oferecer para pessoas atingidas?");
    multi("maquinas","MAQUINÁRIO, equipamentos e materiais disponíveis");
    multi("empreendedores","Que tipo de apoio pode oferecer para empreendedores?");
    const temOutro = ["ajudas","maquinas","empreendedores"].some(k => arr(p[k]).includes("OUTRO"));
    if (temOutro || String(p.outros || "").trim()) {
      bot("Especifique qual outra ajuda, equipamento ou apoio você pode oferecer.");
      respond("outros");
    }
    multi("materiais","MATERIAL CONSTRUÇÃO / COMBUSTÍVEL");
    const ofereceBens = ["ajudas","maquinas","materiais"].some(k => arr(p[k]).some(v => BENS.has(v)));
    if (ofereceBens || p.forma_entrega_doacao) {
      bot("Como você disponibiliza sua doação?");
      respond("forma_entrega_doacao");
    }
    const ofertas = [...new Set(["ajudas","maquinas","empreendedores","materiais"]
      .flatMap(k => arr(p[k])))];
    bot((demonstrativo?"Cadastro demonstrativo criado para testar o fluxo.":"Cadastro de colaborador localizado na Gestão Municipal.")+" ✅\n\nOfertas registradas: " +
      ofertas.length + ".\n\nAs mensagens acima foram reconstruídas a partir dos campos salvos; não são conversas WhatsApp enviadas ou recebidas.");
    return passos;
  }
return {mensagensMunicipais,fluxoCadastro};
}
root.AlertaConversasRoteiro={criar};
})(globalThis);
