/* editor: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,D,addStage,esc,notify,renderTerritory,stage,state}){
function openEditor(x){
 if(!x)return;state.activeEdit={...x};
 const target=$("mi-editor");if(!target)return;target.hidden=false;
 target.innerHTML='<h2>Conferir e editar registro</h2><p class="page-subtitle">Os dados importados podem ser ajustados antes de salvar. Não altere a localização sem confirmar a fonte.</p>'+
 '<form id="mi-edit-form"><div class="mi-fields">'+[
 ["nome","Nome","text"],["tipo","Tipo","text"],["endereco","Endereço público","text"],["bairro","Bairro","text"],
 ["zona","Zona operacional","text"],["lat","Latitude","text"],["lng","Longitude","text"],
 ["codigo_cnes","CNES","text"],["verificacao","Verificação","select"]
 ].map(([k,label,type])=>'<label>'+esc(label)+(type==="select"?
 '<select name="'+k+'">'+["Pendente","Em conferência","Validado","Rejeitado"].map(v=>'<option value="'+v+'"'+(String(x[k])===v?" selected":"")+'>'+v+'</option>').join("")+'</select>':
 '<input name="'+k+'" type="text" value="'+esc(x[k]??"")+'">')+'</label>').join("")+'</div>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar conferência</button><button id="mi-cancel-edit" type="button" class="btn">Cancelar</button></div></form>';
 $("mi-cancel-edit").onclick=()=>{target.hidden=true;state.activeEdit=null;};
 $("mi-edit-form").onsubmit=async e=>{e.preventDefault();const form=new FormData(e.currentTarget),v={...state.activeEdit};
  for(const [k,value] of form.entries())v[k]=String(value).trim();
  const locationGiven=String(v.lat||"").trim()||String(v.lng||"").trim();
  const xy=state.C.normalizeCoordinates(v.lat,v.lng);
  if(locationGiven&&!xy){notify("Coordenadas inválidas ou fora do território configurado.");return;}
  if(xy){v.lat=xy.lat;v.lng=xy.lng;}
  if(!v.nome){notify("Informe o nome.");return;}
  const keys=stage.grupos[state.tab]||[],key=state.C.uniqueKey(state.activeEdit),idx=keys.findIndex(r=>state.C.uniqueKey(r)===key);
  if(idx>=0){keys[idx]=v;stage.grupos[state.tab]=keys;}
  else{
   try{
    const module=state.tab,old=state.ctx.db.registro(module,state.activeEdit.id);
    if(old){const schema=D.ESQUEMAS[module];const fields={};for(const f of schema.fields)fields[f.key]=v[f.key]??old[f.key]??"";
     await state.ctx.db.gravar(module,fields,old.id);}
    else addStage(state.tab,[v]);
   }catch(err){notify(err.message);return;}
  }
  target.hidden=true;state.activeEdit=null;notify("Conferência registrada.");renderTerritory();
 };
 target.scrollIntoView({behavior:"smooth",block:"nearest"});
}
return {openEditor};
}
root.AlertaImplantacaoEditor={criar};
})(globalThis);
