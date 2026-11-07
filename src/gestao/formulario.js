/* Ciclo do formulário: campos, seleção IBGE, edição e restauração do foco. */
(function(root){
'use strict';
function criar({db,D,document,esc,structures,getCurrentPage,onDenied=()=>{}}){
const $=id=>document.getElementById(id),DRAWER=$('drawer-overlay');
let edicao=null,drawerModulo=null,ultimoFoco=null;
const cidadesPorUf=new Map();
async function carregarIBGE(uf){
 if(!D.UFS.includes(uf))return;
 const lista=$("ibge-cidades");if(!lista)return;
 let cidades=cidadesPorUf.get(uf);
 try{
  if(!cidades){
   const res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+encodeURIComponent(uf)+"/municipios",{cache:"force-cache"});
   if(!res.ok)throw Error("Não foi possível consultar o IBGE.");
   cidades=await res.json();cidadesPorUf.set(uf,cidades);
  }
  if(!DRAWER.hidden&&$("field-uf")?.value===uf&&$("ibge-cidades")){
   $("ibge-cidades").innerHTML=cidades.map(x=>'<option value="'+esc(x.nome)+'"></option>').join("");
   atualizarCodigoIBGE();
  }
 }catch(_){/* Permitir preenchimento manual do código IBGE quando a API estiver indisponível. */}
}
function atualizarCodigoIBGE(){
 const uf=$("field-uf")?.value,cidade=$("field-nome")?.value?.trim(),codigo=$("field-codigo_ibge");
 if(!uf||!cidade||!codigo)return;
 const normal=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
 const found=(cidadesPorUf.get(uf)||[]).find(x=>normal(x.nome)===normal(cidade));
 if(found)codigo.value=String(found.id);
}

function campoHTML(f,valor){
 const id="field-"+f.key,v=esc(valor??""),required=f.required?' required':"";
 const label='<label for="'+id+'">'+esc(f.label)+(f.required?' <span class="required">*</span>':"")+'</label>';
 if(f.type==="hidden")return '<input type="hidden" id="'+id+'" name="'+esc(f.key)+'" value="'+v+'">';
 if(f.type==="multi"){const current=Array.isArray(valor)?valor:String(valor||"").split(";").map(x=>x.trim()).filter(Boolean);
 return '<fieldset class="field multi-field"><legend>'+esc(f.label)+'</legend><div class="multi-choices">'+(f.options||[]).map(opt=>'<label class="multi-option"><input type="checkbox" name="'+esc(f.key)+'" value="'+esc(opt)+'"'+(current.includes(opt)?' checked':'')+'/><span>'+esc(opt)+'</span></label>').join("")+'</div></fieldset>';}
 if(f.type==="textarea")return '<div class="field">'+label+'<textarea id="'+id+'" name="'+esc(f.key)+'"'+required+'>'+v+'</textarea></div>';
 if(f.type==="colaborador"||f.type==="municipio"||f.type==="select"||f.type==="uf"||f.type==="zone"||f.type==="team"||f.type==="person"||f.type==="structure"||f.type==="eventoMapa"){
  const options=f.type==="colaborador"?db.lista("voluntarios").map(x=>({id:x.id,nome:x.nome})):f.type==="municipio"?db.municipios().filter(x=>x.id!==db.municipioAtivo()?.id&&x.status==="ativa"):f.type==="eventoMapa"?db.lista("eventos").filter(x=>x.id!==edicao):f.type==="uf"?D.UFS:f.type==="zone"?db.lista("zonas").map(x=>x.nome):f.type==="team"?db.lista("equipes").map(x=>({id:x.id,nome:x.nome})):f.type==="person"?db.lista("pessoas").map(x=>({id:x.id,nome:x.nome})):f.type==="structure"?structures().map(x=>({id:x.id,nome:x.nome})):f.options||[];
  return '<div class="field">'+label+'<select id="'+id+'" name="'+esc(f.key)+'"'+required+'><option value="">Selecionar</option>'+options.map(o=>'<option value="'+esc(o.id??o)+'"'+(String(o.id??o)===String(valor)?" selected":"")+'>'+esc(o.nome??o)+'</option>').join("")+'</select></div>';
 }
 const type=f.type==="number"?"number":f.type==="date"?"date":f.type==="tel"?"tel":f.type==="email"?"email":"text";
 const attr=type==="number"?' min="'+esc(f.min??0)+'" step="'+esc(f.step??'any')+'"':"";
 const list=f.type==="city"?' list="ibge-cidades" autocomplete="off"':"";
 return '<div class="field">'+label+'<input id="'+id+'" name="'+esc(f.key)+'" type="'+type+'" value="'+v+'"'+required+attr+list+'></div>';
}
function abrirDrawer(id=null,modulo=getCurrentPage(),prefill=null){
 if(modulo==="inicio")return;
 if(db.tipo==='supabase'&&!db.pode(modulo,'gravar')){onDenied('Você não tem permissão para alterar este cadastro.');return false;}
 drawerModulo=modulo;
 const def=D.ESQUEMAS[modulo];
 const item=id?db.registro(modulo,id):null;
 if(id&&!item)return;
 edicao=id;
 ultimoFoco=document.activeElement;
 $("drawer-eyebrow").textContent=def.label;
 $("drawer-title").textContent=(id?"Editar ":"Novo cadastro · ")+def.singular;
 $("cadastro-campos").innerHTML=def.fields.map(f=>campoHTML(db.tipo==='supabase'?root.AlertaPermissoesUI.campo(f,item,def.collection,root.AlertaRegrasOperacionais):f,item?.[f.key]??prefill?.[f.key])).join("")+(modulo==="prefeituras"?'<datalist id="ibge-cidades"></datalist>':"");
 if(modulo==="relatos" && typeof item?.foto==="string" && /^data:image\/jpeg;base64,/.test(item.foto)){
  const foto=document.createElement("img");
  foto.src=item.foto;foto.alt="Foto da ocorrência informada pelo cidadão";
  foto.style.cssText="display:block;width:min(100%,340px);max-height:260px;object-fit:contain;border-radius:12px;margin:12px auto;background:#eef1f0";
  $("cadastro-campos").prepend(foto);
 }
 const bairro=$("field-bairro");
 if(bairro&&(modulo==="pessoas"||modulo==="voluntarios")){
  bairro.required=true;
  bairro.setAttribute("list","bairros-origem");
  const lista=document.createElement("datalist");
  lista.id="bairros-origem";
  const nomes=new Set(db.lista("bairros").map(x=>x.nome));
  const preencher=()=>{lista.replaceChildren(...[...nomes].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(nome=>new Option(nome)));};
  bairro.after(lista);
  preencher();
  if(D.config.referencias(db.municipioAtivo()).catalogoBairros&&globalThis[D.config.referencias(db.municipioAtivo()).catalogoBairros]){
   globalThis[D.config.referencias(db.municipioAtivo()).catalogoBairros].carregar().then(({bairros})=>{
    bairros.features.forEach(f=>nomes.add(f.properties.nome));
    preencher();
   }).catch(()=>{});
  }
 }
 $("form-error").textContent="";
 DRAWER.hidden=false;
 if(modulo==="prefeituras"){
  $("field-uf").addEventListener("change",()=>{ $("field-nome").value="";$("field-codigo_ibge").value="";carregarIBGE($("field-uf").value); });
  $("field-nome").addEventListener("change",()=>atualizarCodigoIBGE());
  if($("field-uf").value)carregarIBGE($("field-uf").value);
 }
 $("cadastro-campos").querySelector("input,select,textarea")?.focus();
}
function fecharDrawer(){
 DRAWER.hidden=true;edicao=null;drawerModulo=null;
 const foco=ultimoFoco;ultimoFoco=null;
 if(foco?.isConnected&&foco.focus)foco.focus({preventScroll:true});
}

return {abrirDrawer,fecharDrawer,get edicao(){return edicao;},get modulo(){return drawerModulo;}};
}
root.AlertaGestaoFormulario={criar};
})(globalThis);
