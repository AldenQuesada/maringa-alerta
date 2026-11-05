function wireList(){
 $("screen").querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>{section="municipios";renderMunicipios();openEditor(x.dataset.edit);});
 $("screen").querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>abrirMunicipio(x.dataset.open));
}
function openEditor(id=null){
 editing=id;
 const original=id?current().find(x=>x.id===id):null;
 if(id&&!original){notice("Prefeitura não encontrada.");return;}
 selectedUF=original?.uf||"PR";formCities=[];
 const el=$("city-editor");if(!el)return;el.hidden=false;
 el.innerHTML='<div class="panel-head"><h2>'+(original?"Editar Prefeitura":"Nova Prefeitura")+'</h2><span>Cadastro único · país, estado e município</span></div>'+
 '<div class="panel-body"><form id="city-form"><div class="form-grid">'+
 field("País","pais",'<select name="pais" disabled><option value="BR">Brasil</option></select><small>Outros países dependem de catálogo e backend próprios.</small>')+
 field("Estado","uf",'<select id="field-uf" name="uf"'+(original?" disabled":"")+'>'+Object.entries(ufLabels).map(([v,t])=>'<option value="'+v+'"'+(v===selectedUF?" selected":"")+'>'+esc(t)+' ('+v+')</option>').join("")+'</select>')+
 field("Município oficial / IBGE","cidade",original?
 '<input id="field-city" type="text" readonly value="'+esc(original.nome)+'"><small>Código IBGE não pode ser alterado.</small>':
 '<select id="field-city" required disabled><option value="">Consultando municípios no IBGE...</option></select>')+
 field("Código IBGE","codigo",'<input id="field-code" readonly value="'+esc(original?.codigo_ibge||"")+'">')+
 field("Administrador municipal (nome de referência)","admin",'<input name="admin" value="'+esc(original?.responsavel||"")+'" placeholder="Nome do responsável municipal">')+
 field("E-mail institucional (não envia convite)","email",'<input type="email" name="email" value="'+esc(original?.admin_municipal_email||"")+'" placeholder="contato@prefeitura.gov.br">')+
 field("Telefone institucional","telefone",'<input type="tel" name="telefone" value="'+esc(original?.telefone||"")+'">')+
 field("Situação","status",'<select name="status">'+A.STATUSES.map(x=>'<option value="'+x+'"'+((original?.status||"implantacao")===x?" selected":"")+'>'+esc(x==="implantacao"?"Em implantação":x==="ativa"?"Ativa":"Suspensa")+'</option>').join("")+'</select>')+
 '</div><div class="form-actions"><button type="button" class="btn" id="cancel-city">Cancelar</button><button class="btn primary" type="submit">Salvar Prefeitura</button></div></form></div>';
 el.scrollIntoView({block:"nearest"});
 $("cancel-city").onclick=()=>{el.hidden=true;editing=null;};
 $("field-uf").onchange=e=>{selectedUF=e.target.value;$("field-code").value="";void loadCities();};
 if(!original){void loadCities();$("field-city").onchange=()=>{
  const record=formCities.find(x=>String(x.id)===$("field-city").value);
  $("field-code").value=String(record?.id||"");
 };}
 $("city-form").onsubmit=e=>{e.preventDefault();
  const fd=new FormData(e.currentTarget),uf=original?.uf||String(fd.get("uf")||selectedUF);
  const selected=original?{id:original.codigo_ibge,nome:original.nome,uf:{sigla:uf}}:formCities.find(x=>String(x.id)===$("field-city").value);
  if(!selected){notice("Selecione uma Prefeitura consultada no IBGE.");return;}
  try{
   const p=central.gravarPrefeitura({uf,estado:nameUF(uf),cidade:selected,
     adminMunicipal:fd.get("admin"),email:fd.get("email"),telefone:fd.get("telefone"),status:fd.get("status")},editing);
   editing=null;notice("Prefeitura "+p.nome+" salva neste navegador.");renderMunicipios();
  }catch(err){notice(err.message);}
 };
}
function field(name,key,markup){return '<div class="field"><label for="'+esc(key)+'">'+esc(name)+'</label>'+markup+'</div>';}
async function loadCities(){
 const select=$("field-city");if(!select||busy)return;
 const uf=$("field-uf")?.value||selectedUF;
 select.disabled=true;select.innerHTML='<option value="">Carregando municípios do IBGE...</option>';
 try{
  let cities=cache.get(uf);
  if(!cities){
   const controller=new AbortController(),t=setTimeout(()=>controller.abort(),18000);
   try{
    const res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+uf+"/municipios",{signal:controller.signal,cache:"force-cache"});
    if(!res.ok)throw Error("IBGE HTTP "+res.status);
    cities=await res.json();if(!Array.isArray(cities)||!cities.length)throw Error("Lista do IBGE vazia");
    cache.set(uf,cities);
   }finally{clearTimeout(t);}
  }
  if(!select.isConnected||$("field-uf")?.value!==uf)return;
  formCities=cities;select.disabled=false;
  select.innerHTML='<option value="">Selecione a Prefeitura...</option>'+cities.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join("");
  if(uf==="PR"){const expected=cities.find(x=>x.nome==="Londrina");if(!expected)notice("Lista do IBGE consultada; verifique o município pretendido.");}
 }catch(err){
  formCities=[];select.disabled=true;select.innerHTML='<option>IBGE indisponível · tente novamente</option>';
  notice("Consulta IBGE falhou: "+err.message);
 }
}
function abrirMunicipio(id){
 try{
  const p=central.acessarMunicipio(id);
  location.href="../gestao/?municipio="+encodeURIComponent(p.id);
 }catch(err){notice(err.message);}
}
