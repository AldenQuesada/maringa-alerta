#!/usr/bin/env node
/** Bundles canônicos; --check impede publicar código gerado divergente do fonte. */
import {gerarPoliticaAuth} from "./politica-auth.mjs";
import {Script} from "node:vm";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {createHash} from "node:crypto";
import {versionarRecursos} from "./versionar-recursos.mjs";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const safe=p=>{if(typeof p!=="string"||!/^[-A-Za-z0-9_/\\.]+$/.test(p)||p.includes(".."))throw Error("Caminho inválido");return resolve(root,p);};
const manifest=JSON.parse(readFileSync(safe("src/modulos.json"),"utf8"));
const checking=process.argv.includes("--check");
let errors=0;
gerarPoliticaAuth(root,checking);
for(const bundle of manifest.bundles){
 const content=bundle.sources.map(src=>{const source=readFileSync(safe(src),"utf8");new Script(source,{filename:src});return source;}).join("");
 const hash=createHash("sha256").update(content).digest("hex");
 if(checking){
  let previous="";try{previous=readFileSync(safe(bundle.target),"utf8")}catch{}
  if(previous!==content){console.error("DESATUALIZADO "+bundle.target);errors++}
  else console.log("OK "+bundle.target+" ("+bundle.sources.length+" módulos)");
 }else{
  mkdirSync(dirname(safe(bundle.target)),{recursive:true});
  writeFileSync(safe(bundle.target),content);
  console.log("Construído "+bundle.target+" sha256:"+hash);
 }
}
errors+=versionarRecursos(root,checking);
if(errors)process.exitCode=1;
