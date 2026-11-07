/* Controlador equipes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('equipes',{
 dependencias:{
  "rnd": "contexto",
  "pick": "contexto",
  "bairros": "regioes",
  "adminSaved": "cadastros",
  "voluntarios": "cadastro-territorial"
},
 criar(dependencias){
 let recursoTipos,equipePrefIdCursor,equipesPrefeitura,tiposContribuicao,tiposAjuda,itensEssenciaisZona,PREF_ALERTA,nomesVol,tiposOcorrencia,GRAV_LABEL,GRAV_COLOR,RESP_LABEL,RESP_COLOR,STATUS_COLOR;
 function nomesVolEquipe(){ return ["Juliano Mesquita","Camila Dutra","Osvaldo Reis","Tainá Borges","Wesley Cunha","Aline Pacheco","Diego Farah","Yasmin Rezende"]; }
function itensQueFaltamNaZona(zona){
  return itensEssenciaisZona.map(it=>{
    const tem = dependencias.voluntarios.filter(v=>v.bairro===zona && (v.contribuicoes||[]).includes(it.tipo)).length;
    return { tipo:it.tipo, tem, minimo:it.minimo, falta: Math.max(0, it.minimo-tem) };
  }).filter(r=>r.falta>0);
}
 async function iniciar(){
 (recursoTipos=["Motosserra","Caminhão basculante","Retroescavadeira","Kit de resgate","Gerador móvel","Caminhão-pipa","Eletricistas","Ambulância"]);
(equipePrefIdCursor=1);
(equipesPrefeitura=[]);
if(dependencias.adminSaved && dependencias.adminSaved.equipes && dependencias.adminSaved.equipes.length){
  dependencias.adminSaved.equipes.forEach(e=> equipesPrefeitura.push(e));
  equipePrefIdCursor = Math.max(...dependencias.adminSaved.equipes.map(e=>parseInt(e.id.replace('eq',''))||0)) + 1;
} else {
  dependencias.bairros.forEach(b=>{
    const n = Math.floor(dependencias.rnd(1,3));
    for(let i=0;i<n;i++){
      const recursos = [];
      const nRec = Math.floor(dependencias.rnd(2,4));
      const usados = new Set();
      for(let j=0;j<nRec;j++){
        let tipo = dependencias.pick(recursoTipos);
        if(usados.has(tipo)) continue;
        usados.add(tipo);
        const qtd = Math.floor(dependencias.rnd(1,4));
        recursos.push({ tipo, qtd, emUso: Math.floor(dependencias.rnd(0, qtd+1)) });
      }
      equipesPrefeitura.push({
        id:"eq"+(equipePrefIdCursor++),
        nome:`Equipe ${b.nome} ${i+1}`,
        zona: b.nome,
        recursos,
        membros: [dependencias.pick(nomesVolEquipe()), dependencias.pick(nomesVolEquipe())],
        status: Math.random()<0.6 ? "disponível" : "em campo",
      });
    }
  });
}
(tiposContribuicao=[
  {num:1, label:"Motosserra", tipo:"Motosserra"},
  {num:2, label:"Caminhão / transporte de carga", tipo:"Caminhão"},
  {num:3, label:"Transporte de pessoas (carro/van)", tipo:"Transporte de pessoas"},
  {num:4, label:"Mão de obra (braço)", tipo:"Mão de obra"},
  {num:5, label:"Doação de comida", tipo:"Comida"},
  {num:6, label:"Doação de roupas/cobertores", tipo:"Roupas/cobertores"},
  {num:7, label:"Gerador", tipo:"Gerador"},
  {num:8, label:"Resgate de animais", tipo:"Resgate de animais"},
  {num:9, label:"Primeiros socorros / saúde", tipo:"Primeiros socorros"},
  {num:10, label:"Abrigo temporário", tipo:"Abrigo temporário"},
]);
(tiposAjuda=tiposContribuicao.map(t=>t.tipo));
(itensEssenciaisZona=[
  {tipo:"Motosserra", minimo:2}, {tipo:"Caminhão", minimo:1}, {tipo:"Transporte de pessoas", minimo:1},
  {tipo:"Mão de obra", minimo:5}, {tipo:"Comida", minimo:2}, {tipo:"Roupas/cobertores", minimo:2}, {tipo:"Gerador", minimo:1},
]);
(PREF_ALERTA={ antes:"Antes do evento (alertas preventivos)", durante:"Durante o evento (convocação ativa)", depois:"Só depois (para ajudar na reconstrução)", todos:"Em todas as fases" });
(nomesVol=["Antônio Silva","Beatriz Nunes","Carlos Eduardo","Débora Franco","Elias Martins","Fabiana Rocha","Gustavo Peres","Helena Duarte","Igor Salles","Joana Ribas","Kleber Souza","Larissa Toledo","Maurício Teles","Natália Viegas","Otávio Brandão","Priscila Farias"]);
(tiposOcorrencia=[
  {tipo:"Distribuição de água e alimentos", icone:"🤝", gravBase:1, resp:["publica"]},
  {tipo:"Árvore caída sobre via", icone:"🌳", gravBase:2, resp:["publica","publica","mista"]},
  {tipo:"Telhado destruído", icone:"🏠", gravBase:2, resp:["privada","privada","mista"]},
  {tipo:"Alagamento residencial", icone:"🌊", gravBase:2, resp:["mista","privada","publica"]},
  {tipo:"Poste de energia caído", icone:"⚡", gravBase:2, resp:["publica"]},
  {tipo:"Deslizamento de barranco", icone:"⛰️", gravBase:3, resp:["publica","mista"]},
  {tipo:"Família ilhada", icone:"🚨", gravBase:3, resp:["publica"]},
  {tipo:"Rede elétrica exposta", icone:"⚠️", gravBase:3, resp:["publica"]},
]);
(GRAV_LABEL={1:"Baixa", 2:"Média", 3:"Alta"});
(GRAV_COLOR={1:"#8b9aad", 2:"#f2c230", 3:"#ff3b3b"});
(RESP_LABEL={publica:"Pública", privada:"Privada", mista:"Mista"});
(RESP_COLOR={publica:"#3ba7ff", privada:"#b06bff", mista:"#2ecf78"});
(STATUS_COLOR={ativa:"#ff3b3b", em_atendimento:"#ffb020", resolvida:"#2ecf78"});
 return true;
 }
 return {iniciar,get recursoTipos(){return recursoTipos;},get equipePrefIdCursor(){return equipePrefIdCursor;},set equipePrefIdCursor(valor){equipePrefIdCursor=valor;},get equipesPrefeitura(){return equipesPrefeitura;},nomesVolEquipe,get tiposContribuicao(){return tiposContribuicao;},get tiposAjuda(){return tiposAjuda;},get itensEssenciaisZona(){return itensEssenciaisZona;},itensQueFaltamNaZona,get PREF_ALERTA(){return PREF_ALERTA;},get nomesVol(){return nomesVol;},get tiposOcorrencia(){return tiposOcorrencia;},get GRAV_LABEL(){return GRAV_LABEL;},get GRAV_COLOR(){return GRAV_COLOR;},get RESP_LABEL(){return RESP_LABEL;},get RESP_COLOR(){return RESP_COLOR;},get STATUS_COLOR(){return STATUS_COLOR;}};
 }
});
})(globalThis);
