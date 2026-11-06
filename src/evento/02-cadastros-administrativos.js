/* ---------- persistencia local das edicoes da administracao ---------- */
const ADMIN_KEY = storageKey("admin");
function loadAdminState(){
  if(conectado)return null;
  try{ return JSON.parse(localStorage.getItem(ADMIN_KEY) || (tenantId==='maringa'?localStorage.getItem("maringa_admin_v1"):null) || "null"); }catch(e){ return null; }
}
function saveAdminState(){
  if(conectado)return;
  try{
    localStorage.setItem(ADMIN_KEY, JSON.stringify({
      funcionarios: todosFuncionarios().map(p=>({id:p.id, nome:p.nome, cargo:p.cargo, tel:p.tel})),
      equipes: equipesPrefeitura.map(e=>({id:e.id, nome:e.nome, zona:e.zona, recursos:e.recursos, membros:e.membros, status:e.status})),
    }));
  }catch(e){ /* storage pode estar bloqueado; prototipo continua funcionando sem persistir */ }
}
const adminSaved = loadAdminState();
if(adminSaved && adminSaved.funcionarios){
  adminSaved.funcionarios.forEach(saved=>{
    const p = todosFuncionarios().find(x=>x.id===saved.id);
    if(p){ p.nome=saved.nome; p.cargo=saved.cargo; p.tel=saved.tel; }
  });
}

