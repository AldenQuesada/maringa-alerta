/* Ajudantes do antigo Mapa de Evento -> cadastro único de voluntários.
 * Importa os mesmos registros do navegador, quando disponíveis.
 * Na ausência de registros salvos, replica o catálogo DEMONSTRATIVO do mapa
 * (nomes, áreas e tipos de apoio, sem criar telefones/endereço reais).
 * Totalmente marcado como simulação, nunca como voluntário operacional.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.MaringaColaboradoresDemo=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root){
 "use strict";
 const municipioPadrao=root.AlertaMunicipiosConfiguracao.demonstracao;
 const referencia=municipio=>root.AlertaColaboradoresDemonstracaoConfiguracao[municipio?.codigo_ibge];
 const chaveOperacao=municipio=>'alerta_prototipo_v2_'+municipio.id+'_operacao';
 const CHAVE_OPERACAO=chaveOperacao(municipioPadrao);
 const CHAVE_MIGRACAO=referencia(municipioPadrao).chaveMigracao;
 const apenasTexto=v=>typeof v==="string"?v.trim():"";
 const telefoneValido=t=>{const n=String(t||"").replace(/\D/g,"");return n.length>=10&&n.length<=13;};
 const normal=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();
 const ajudaParaCampos=ajudas=>{
   const lista=Array.isArray(ajudas)?ajudas.filter(Boolean):[ajudas].filter(Boolean);
   const result={ajudas:[],maquinas:[],empreendedores:[],materiais:[],outros:[]};
   for(const item of [...new Set(lista.map(String))]){
     const x=normal(item);
     if(x==="comida"||x==="alimentacao")result.ajudas.push("FORNECER ALIMENTAÇÃO");
     else if(x==="motosserra")result.maquinas.push("MOTOSSERRA");
     else if(x==="gerador")result.maquinas.push("GERADOR");
     else {
       // Não inventar habilitações ou tipo específico de caminhão.
       result.ajudas.push("OUTRO");
       result.outros.push(item);
     }
   }
   result.ajudas=[...new Set(result.ajudas)];
   result.maquinas=[...new Set(result.maquinas)];
   result.outros=result.outros.join(" · ");
   return result;
 };
 function lerLegado(armazenamento,municipio=municipioPadrao){
   try{
     const dado=JSON.parse(armazenamento.getItem(chaveOperacao(municipio))||"null");
     if(dado?.versao!==1||dado.tenantId!==municipio.id||!Array.isArray(dado.voluntarios))return [];
     return dado.voluntarios.filter(v=>v&&v.id&&apenasTexto(v.nome)&&
       (!v.tenantId||v.tenantId===municipio.id));
   }catch(_){return [];}
 }
 function gerarModelo(municipio=municipioPadrao){
   const ref=referencia(municipio);if(!ref)return [];
   const {nomes:NOMES,bairros:BAIRROS,tipos:TIPOS}=ref;
   const pessoas=[];
   for(let bairroIndex=0;bairroIndex<BAIRROS.length;bairroIndex++){
     const bairro=BAIRROS[bairroIndex];
     for(let i=0;i<7;i++){
       const nome=NOMES[(bairroIndex*7+i)%NOMES.length];
       const ajuda=i===0?"Comida":i===1?"Mão de obra":TIPOS[(bairroIndex*3+i)%TIPOS.length];
       pessoas.push({id:"modelo-"+bairroIndex+"-"+i,nome,bairro,ajuda,contribuicoes:[ajuda],demo:true});
     }
   }
   return pessoas;
 }
 function zonaCanonica(v,db){
   const candidatas=db.lista("zonas").map(z=>z.nome).filter(Boolean);
   const nome=apenasTexto(v.zona||v.bairro);
   const exata=candidatas.find(z=>normal(z)===normal(nome));
   if(exata)return exata;
   const bairros=db.lista("bairros").filter(b=>normal(b.nome)===normal(v.bairro)&&b.zona);
   const unicas=[...new Set(bairros.map(b=>b.zona))];
   return unicas.length===1?unicas[0]:"";
 }
 function converter(v,db){
   const oferta=ajudaParaCampos(v.contribuicoes?.length?v.contribuicoes:v.ajuda);
   const bairro=apenasTexto(v.bairro);
   const telefone=telefoneValido(v.telefone||v.tel)?String(v.telefone||v.tel):"Não informado (demonstração)";
   return {
     nome:apenasTexto(v.nome),tipo_pessoa:"FÍSICA",
     endereco:apenasTexto(v.endereco)||"Endereço não informado (demonstração)",
     telefone,bairro,zona:zonaCanonica(v,db),
     ajudas:oferta.ajudas,maquinas:oferta.maquinas,empreendedores:oferta.empreendedores,
     materiais:oferta.materiais,outros:oferta.outros,forma_entrega_doacao:"",
     disponibilidade:"Indisponível",
     contribuicao:"Demonstração reconstruída a partir do ajudante do Mapa de Evento antigo. Não representa cadastro real nem disponibilidade confirmada.",
     status_simulacao:"simulado",origem_cadastro:"mapa_evento_demo",
     origem_id_legado:String(v.id)
   };
 }
 function garantir(db,armazenamento,{gerarExemplo=false}={}){
   const municipio=db?.municipioAtivo?.(),ref=referencia(municipio);
   if(!ref||db.tipo==='supabase')return {adicionados:0,total:0,origem:"outro_municipio"};
   if(!armazenamento||typeof armazenamento.getItem!=="function")return {adicionados:0,total:0,origem:"sem_armazenamento"};
   const gravados=db.lista("voluntarios");
   const existentes=new Set(gravados.filter(v=>v.origem_cadastro==="mapa_evento_demo")
     .map(v=>String(v.origem_id_legado)));
   if(armazenamento.getItem(ref.chaveMigracao)==="1")
     return {adicionados:0,total:gravados.filter(v=>v.status_simulacao==="simulado").length,origem:"ja_importado"};
   const legacy=lerLegado(armazenamento,municipio);
   if(!legacy.length&&!gerarExemplo)return {adicionados:0,total:gravados.length,origem:"sem_legado"};
   const modelo=legacy.length?legacy:gerarModelo(municipio);
   let adicionados=0;
   for(const v of modelo){
     const id=String(v.id);
     if(existentes.has(id))continue;
     // Não sobrescrever nem mesclar cadastros reais por coincidência de nome.
     db.gravar("voluntarios",converter(v,db));
     existentes.add(id);
     adicionados++;
   }
   // Só depois de todos os registros. Idempotência em reload e preservação de exclusões.
   armazenamento.setItem(ref.chaveMigracao,"1");
   return {adicionados,total:db.lista("voluntarios").filter(v=>v.status_simulacao==="simulado").length,
     origem:legacy.length?"mapa_local":"modelo_legado"};
 }
 return {garantir,lerLegado,gerarModelo,converter,ajudaParaCampos,CHAVE_OPERACAO,CHAVE_MIGRACAO};
});
