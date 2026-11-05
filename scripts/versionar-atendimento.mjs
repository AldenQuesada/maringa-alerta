import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {createHash} from "node:crypto";

// A rota permanece única. Cada arquivo muda de versão quando seu conteúdo muda.
const ASSETS={
  "./chat.css":"atendimento/chat.css",
  "../gestao/dados.js":"gestao/dados.js",
  "../crise/core.js":"crise/core.js",
  "./chat.js":"atendimento/chat.js"
};
const hashArquivo=conteudo=>createHash("sha1")
  .update("blob "+Buffer.byteLength(conteudo)+"\0").update(conteudo).digest("hex").slice(0,12);

export function versionarAtendimento(root,checking=false){
  const file=resolve(root,"atendimento/index.html");
  const atual=readFileSync(file,"utf8");
  let novo=atual;
  for(const [url,arquivo] of Object.entries(ASSETS)){
    const hash=hashArquivo(readFileSync(resolve(root,arquivo)));
    const escaped=url.replaceAll(".","\\.");
    const pattern=new RegExp('((?:href|src)="'+escaped+')\\?v=[^"]+(")',"g");
    if(!pattern.test(novo))throw Error("Recurso do simulador não localizado: "+url);
    novo=novo.replace(pattern,(_,inicio,fim)=>inicio+"?v="+hash+fim);
  }
  if(novo===atual){console.log("OK atendimento/index.html (versões de conteúdo)");return 0;}
  if(checking){console.error("DESATUALIZADO atendimento/index.html: execute node scripts/build-modulos.mjs");return 1;}
  writeFileSync(file,novo);
  console.log("Atualizado atendimento/index.html (versões de conteúdo)");
  return 0;
}
