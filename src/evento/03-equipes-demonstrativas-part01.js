/* ---------- equipes da prefeitura (recursos/equipamentos) ---------- */
const recursoTipos = ["Motosserra","Caminhão basculante","Retroescavadeira","Kit de resgate","Gerador móvel","Caminhão-pipa","Eletricistas","Ambulância"];
let equipePrefIdCursor = 1;
const equipesPrefeitura = [];
function nomesVolEquipe(){ return ["Juliano Mesquita","Camila Dutra","Osvaldo Reis","Tainá Borges","Wesley Cunha","Aline Pacheco","Diego Farah","Yasmin Rezende"]; }

if(adminSaved && adminSaved.equipes && adminSaved.equipes.length){
  adminSaved.equipes.forEach(e=> equipesPrefeitura.push(e));
  equipePrefIdCursor = Math.max(...adminSaved.equipes.map(e=>parseInt(e.id.replace('eq',''))||0)) + 1;
} else {
  bairros.forEach(b=>{
    const n = Math.floor(rnd(1,3));
    for(let i=0;i<n;i++){
      const recursos = [];
      const nRec = Math.floor(rnd(2,4));
      const usados = new Set();
      for(let j=0;j<nRec;j++){
        let tipo = pick(recursoTipos);
        if(usados.has(tipo)) continue;
        usados.add(tipo);
        const qtd = Math.floor(rnd(1,4));
        recursos.push({ tipo, qtd, emUso: Math.floor(rnd(0, qtd+1)) });
      }
      equipesPrefeitura.push({
        id:"eq"+(equipePrefIdCursor++),
        nome:`Equipe ${b.nome} ${i+1}`,
        zona: b.nome,
        recursos,
        membros: [pick(nomesVolEquipe()), pick(nomesVolEquipe())],
        status: Math.random()<0.6 ? "disponível" : "em campo",
      });
    }
  });
}

/* opcoes de contribuicao: numeradas de proposito, para o morador poder digitar so o numero no whatsapp.
   o rotulo e o "tipo" canonico sao separados porque o tipo e o que entra na conta de itensEssenciaisZona. */
const tiposContribuicao = [
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
];
const tiposAjuda = tiposContribuicao.map(t=>t.tipo);
// quanto desse tipo uma zona precisa ter, somando os colaboradores cadastrados que oferecem aquele tipo
const itensEssenciaisZona = [
  {tipo:"Motosserra", minimo:2}, {tipo:"Caminhão", minimo:1}, {tipo:"Transporte de pessoas", minimo:1},
  {tipo:"Mão de obra", minimo:5}, {tipo:"Comida", minimo:2}, {tipo:"Roupas/cobertores", minimo:2}, {tipo:"Gerador", minimo:1},
];
function itensQueFaltamNaZona(zona){
  return itensEssenciaisZona.map(it=>{
    const tem = voluntarios.filter(v=>v.bairro===zona && (v.contribuicoes||[]).includes(it.tipo)).length;
    return { tipo:it.tipo, tem, minimo:it.minimo, falta: Math.max(0, it.minimo-tem) };
  }).filter(r=>r.falta>0);
}
const PREF_ALERTA = { antes:"Antes do evento (alertas preventivos)", durante:"Durante o evento (convocação ativa)", depois:"Só depois (para ajudar na reconstrução)", todos:"Em todas as fases" };
function validaCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma += parseInt(cpf[i])*(10-i);
  let resto = (soma*10)%11; if(resto===10) resto=0;
  if(resto!==parseInt(cpf[9])) return false;
  soma=0; for(let i=0;i<10;i++) soma += parseInt(cpf[i])*(11-i);
  resto = (soma*10)%11; if(resto===10) resto=0;
  return resto===parseInt(cpf[10]);
}
function fmtCPF(cpf){ cpf=(cpf||'').replace(/\D/g,''); return cpf.length===11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : cpf; }
function maskCPF(cpf){ if(!cpf) return '—'; const d=cpf.replace(/\D/g,''); return d.length===11 ? `***.***.${d.slice(6,9)}-${d.slice(9)}` : '—'; }
const nomesVol = ["Antônio Silva","Beatriz Nunes","Carlos Eduardo","Débora Franco","Elias Martins","Fabiana Rocha","Gustavo Peres","Helena Duarte","Igor Salles","Joana Ribas","Kleber Souza","Larissa Toledo","Maurício Teles","Natália Viegas","Otávio Brandão","Priscila Farias"];
const tiposOcorrencia = [
  {tipo:"Distribuição de água e alimentos", icone:"🤝", gravBase:1, resp:["publica"]},
  {tipo:"Árvore caída sobre via", icone:"🌳", gravBase:2, resp:["publica","publica","mista"]},
  {tipo:"Telhado destruído", icone:"🏠", gravBase:2, resp:["privada","privada","mista"]},
  {tipo:"Alagamento residencial", icone:"🌊", gravBase:2, resp:["mista","privada","publica"]},
  {tipo:"Poste de energia caído", icone:"⚡", gravBase:2, resp:["publica"]},
  {tipo:"Deslizamento de barranco", icone:"⛰️", gravBase:3, resp:["publica","mista"]},
  {tipo:"Família ilhada", icone:"🚨", gravBase:3, resp:["publica"]},
  {tipo:"Rede elétrica exposta", icone:"⚠️", gravBase:3, resp:["publica"]},
];
const GRAV_LABEL = {1:"Baixa", 2:"Média", 3:"Alta"};
const GRAV_COLOR = {1:"#8b9aad", 2:"#f2c230", 3:"#ff3b3b"};
const RESP_LABEL = {publica:"Pública", privada:"Privada", mista:"Mista"};
const RESP_COLOR = {publica:"#3ba7ff", privada:"#b06bff", mista:"#2ecf78"};
const STATUS_COLOR = {ativa:"#ff3b3b", em_atendimento:"#ffb020", resolvida:"#2ecf78"};
