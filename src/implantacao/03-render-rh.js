function renderRH(){
 if(!ctx)return;const people=ctx.db.lista("pessoas"),q=rhSearch.toLowerCase();
 const rows=people.filter(x=>(!rhRole||x.funcao===rhRole||(Array.isArray(x.papeis)&&x.papeis.includes(rhRole)))&&
  (!rhZone||x.zona===rhZone)&&(!q||[x.nome,x.orgao,x.cargo,x.zona,x.funcao].some(k=>normal(k).includes(q))));
 const zones=ctx.db.lista("zonas").map(z=>z.nome).filter(Boolean);
 ctx.page.innerHTML='<div class="mi-head"><div><div class="eyebrow">GABINETE DE CRISE · RH</div><h1 class="page-title">Pessoas e Hierarquia</h1><p class="page-subtitle">Um único cadastro de pessoas com papéis, órgãos, zonas e substituições. Os dados públicos não concedem acesso ao sistema.</p></div><button class="btn btn-primary" id="rh-new">+ Adicionar pessoa</button></div>'+
 locState()+
 '<div class="mi-workflow"><strong>Estrutura de comando</strong><p>Gabinete de Gestão Integrada, órgãos municipais/estaduais, responsáveis por zona, substitutos e operadores. Uma pessoa pode ter vários papéis vinculados, sem cadastros duplicados.</p><p class="mi-note">Admin País e Admin Estado: níveis previstos no modelo multi-tenant futuro; o protótipo local não concede essas permissões.</p></div>'+
 '<div class="mi-filterbar mi-rh-filters"><label>Função<select id="rh-role"><option value="">Todas as funções</option>'+ROLE_OPTIONS.map(([v,t])=>'<option value="'+v+'"'+(rhRole===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
 '<label>Zona<select id="rh-zone"><option value="">Todas</option>'+zones.map(z=>'<option'+(rhZone===z?' selected':'')+'>'+esc(z)+'</option>').join("")+'</select></label>'+
 '<label>Buscar<input id="rh-search" type="search" value="'+esc(rhSearch)+'" placeholder="Nome, órgão ou função"></label></div>'+
 '<section class="mi-table-wrap mi-rh-list"><table class="mi-table"><thead><tr><th>Pessoa</th><th>Função e papéis</th><th>Órgão</th><th>Zona</th><th>Verificação</th><th>Editar</th></tr></thead><tbody>'+
 (rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.nome)+'</strong><small>'+esc(x.cargo||"")+'</small></td><td>'+esc([x.funcao,...(x.papeis||[])].filter(Boolean).join(", "))+'</td><td>'+esc(x.orgao||"—")+'</td><td>'+esc(x.zona||"Todas/sem zona")+'</td><td>'+esc(x.verificacao||"Pendente")+'</td><td><button type="button" data-rh-edit="'+esc(x.id)+'">Editar</button></td></tr>').join(""):'<tr><td class="mi-empty" colspan="6">Nenhuma pessoa cadastrada com os filtros atuais.</td></tr>')+
 '</tbody></table></section>'+
 '<section id="rh-editor" class="mi-review" hidden></section>'+
 '<section class="mi-sources"><strong>Gabinete de crise: vinculação institucional</strong><p>Cadastre as pessoas responsáveis e confirme suas atribuições com o órgão público. Nomes encontrados em notícias não são adicionados automaticamente e não concedem autorização operacional.</p></section>';
 $("rh-new").onclick=()=>openRH(null);
 $("rh-role").onchange=e=>{rhRole=e.target.value;renderRH();};
 $("rh-zone").onchange=e=>{rhZone=e.target.value;renderRH();};
 $("rh-search").oninput=e=>{rhSearch=e.target.value;renderRH();$("rh-search")?.focus();};
 ctx.page.querySelectorAll("[data-rh-edit]").forEach(b=>b.onclick=()=>openRH(people.find(x=>x.id===b.dataset.rhEdit)));

}
function openRH(person=null,reference=null){
 const parent=$("rh-editor");if(!parent)return;rhEdit=person?.id||null;parent.hidden=false;
 const data=person||reference||{};
 const opts=ROLE_OPTIONS.map(([value,label])=>'<option value="'+value+'"'+(data.funcao===value?" selected":"")+'>'+esc(label)+'</option>').join("");
 const zones=ctx.db.lista("zonas").map(x=>x.nome).filter(Boolean);
 const orgs=[...ctx.db.lista("saude"),...ctx.db.lista("emergencias"),...ctx.db.lista("parceiros")].map(x=>x.nome).filter(Boolean);
 const substitutes=ctx.db.lista("pessoas").filter(x=>x.id!==person?.id);
 parent.innerHTML='<h2>'+(person?"Editar pessoa":"Cadastrar pessoa")+'</h2><p class="mi-note">Cadastro local para gestão. Somente uma autenticação institucional futura poderá conceder acesso operacional.</p>'+
 '<form id="rh-form"><div class="mi-fields">'+
 [['nome','Nome completo','text'],['cargo','Cargo institucional','text'],['orgao','Órgão / unidade','text'],['zona','Zona operacional','text'],['telefone','Contato institucional','tel'],['email','E-mail','email']].map(([k,label,type])=>'<label>'+label+'<input name="'+k+'" type="'+type+'" value="'+esc(data[k]||"")+'"'+(k==="nome"?" required":"")+'></label>').join("")+
 '<label>Estrutura representada no Gabinete<select name="estrutura_id"><option value="">Não vinculada</option>'+[...ctx.db.lista("saude"),...ctx.db.lista("emergencias"),...ctx.db.lista("parceiros")].map(x=>'<option value="'+esc(x.id)+'"'+(data.estrutura_id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+ 
 '<label>Função principal<select name="funcao" required><option value="">Selecionar</option>'+opts+'</select></label>'+
 '<label>Substituto responsável<select name="substituto_id"><option value="">Nenhum</option>'+substitutes.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===data.substituto_id?" selected":"")+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+
 '<label>Situação<select name="status">'+["Pendente de validação","Ativo","Inativo"].map(x=>'<option'+(data.status===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label>'+
 '<label>Verificação<select name="verificacao">'+["Pendente","Validado","Rejeitado"].map(x=>'<option'+(data.verificacao===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label></div>'+
 '<fieldset class="mi-roles"><legend>Outros papéis autorizados</legend>'+ROLE_OPTIONS.map(([id,label])=>'<label><input type="checkbox" name="papeis" value="'+id+'"'+(Array.isArray(data.papeis)&&data.papeis.includes(id)?' checked':'')+'> '+esc(label)+'</label>').join("")+'</fieldset>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar pessoa</button><button type="button" class="btn" id="rh-cancel">Cancelar</button></div><datalist id="rh-orgs">'+orgs.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist><datalist id="rh-zones">'+zones.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist></form>';
 parent.querySelector('[name="orgao"]').setAttribute("list","rh-orgs");
 parent.querySelector('[name="zona"]').setAttribute("list","rh-zones");
 $("rh-cancel").onclick=()=>{parent.hidden=true;rhEdit=null;};
 $("rh-form").onsubmit=e=>{
  e.preventDefault();const form=e.currentTarget,data=new FormData(form),obj={};
  for(const [k,v] of data.entries()){
   if(k==="papeis"){obj.papeis??=[];obj.papeis.push(v);}
   else obj[k]=String(v).trim();
  }
  if(!obj.papeis)obj.papeis=[];
  if(!obj.nome||!obj.funcao){notify("Nome e função são obrigatórios.");return;}
  obj.papeis=obj.papeis.filter(k=>k!==obj.funcao);
  try{
   ctx.db.gravar("pessoas",obj,rhEdit);
   rhEdit=null;notify("Pessoa cadastrada na hierarquia local.");renderRH();
  }catch(err){notify(err.message);}
 };
 parent.scrollIntoView({behavior:"smooth",block:"nearest"});
 parent.querySelector("input")?.focus();
}
