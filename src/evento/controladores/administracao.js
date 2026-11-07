/* Controlador administracao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('administracao',{
 dependencias:{
  "escHtml": "contexto",
  "bairros": "regioes",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "saveAdminState": "cadastros",
  "equipePrefIdCursor": "equipes",
  "equipesPrefeitura": "equipes",
  "ocorrencias": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "currentRole": "cadastro-territorial",
  "renderZoneList": "recorte",
  "updateZoneStrip": "recorte",
  "renderOfficialMarkers": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "renderAdminColab": "administracao-colaboradores",
  "renderChatContacts": "mensagens",
  "auditPush": "trilha"
},
 criar(dependencias){
 let adminTab,adminOverlay;
 function renderAdminBody(){
  const body = document.getElementById('admin-body');
  if(adminTab==='func') return renderAdminFunc(body);
  if(adminTab==='equipes') return renderAdminEquipes(body);
  dependencias.renderAdminColab(body);
}
function renderAdminFunc(body){
  const grupos = { responsavel:'Responsáveis', substituto:'Substitutos', coordenador:'Coordenadores' };
  let html = '';
  Object.entries(grupos).forEach(([papel,label])=>{
    let lista = dependencias.todosFuncionarios().filter(p=>p.papel===papel && dependencias.noRecorte(p.zona));
    if(dependencias.currentRole && dependencias.currentRole.tipo==='responsavel') lista = lista.filter(p=>p.zona===dependencias.currentRole.zona);
    if(!lista.length) return;
    html += `<div class="admin-section-title">${label}</div>
      <table class="admin-table"><thead><tr><th>Zona</th><th>Nome</th><th>Cargo</th><th>Telefone</th><th></th></tr></thead><tbody>
      ${lista.map(p=>`
        <tr data-id="${p.id}">
          <td>${dependencias.escHtml(p.zona)}</td>
          <td><input value="${dependencias.escHtml(p.nome)}" data-field="nome"></td>
          <td><input value="${dependencias.escHtml(p.cargo)}" data-field="cargo"></td>
          <td><input value="${dependencias.escHtml(p.tel)}" data-field="tel"></td>
          <td><button class="admin-btn primary" data-action="save-func">Salvar</button></td>
        </tr>
      `).join('')}
      </tbody></table>`;
  });
  body.innerHTML = html;
  body.querySelectorAll('[data-action="save-func"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const p = dependencias.todosFuncionarios().find(x=>x.id===tr.dataset.id);
      if(!p) return;
      p.nome = tr.querySelector('[data-field="nome"]').value.trim() || p.nome;
      p.cargo = tr.querySelector('[data-field="cargo"]').value.trim() || p.cargo;
      p.tel = tr.querySelector('[data-field="tel"]').value.trim() || p.tel;
      dependencias.saveAdminState();
      dependencias.auditPush('Administração', 'Editou funcionário', `${p.nome} (${dependencias.PAPEL_LABEL[p.papel]}, ${p.zona})`,[p.zona]);
      dependencias.updateZoneStrip(); dependencias.renderZoneList(); dependencias.renderOfficialMarkers(); dependencias.renderCollaborators(); dependencias.renderChatContacts();
      btn.textContent = 'Salvo ✓'; setTimeout(()=>btn.textContent='Salvar', 1400);
    };
  });
}
function recursosResumo(e){
  const disp = e.recursos.reduce((s,r)=>s+(r.qtd-r.emUso),0);
  const uso = e.recursos.reduce((s,r)=>s+r.emUso,0);
  return {disp, uso, texto: e.recursos.map(r=>`${r.tipo} ${r.qtd-r.emUso}/${r.qtd} livre`).join(', ')};
}
function renderAdminEquipes(body){
  const zonasAtivas = {};
  dependencias.ocorrencias.filter(o=>o.status==='ativa'||o.status==='em_atendimento').forEach(o=>{ zonasAtivas[o.bairro]=(zonasAtivas[o.bairro]||0)+1; });
  const souResponsavel = dependencias.currentRole && dependencias.currentRole.tipo==='responsavel';
  const equipesVisiveis=dependencias.equipesPrefeitura.filter(e=>dependencias.noRecorte(e.zona) && (!souResponsavel || e.zona===dependencias.currentRole.zona));
  body.innerHTML = `
    <div class="admin-section-title">Equipes e equipamentos cadastrados</div>
    <table class="admin-table"><thead><tr><th>Equipe</th><th>Zona</th><th>Recursos</th><th>Membros</th><th>Status</th><th>Ocorrências na zona</th><th></th></tr></thead><tbody>
      ${equipesVisiveis.map(e=>{
        const r = recursosResumo(e);
        const falta = zonasAtivas[e.zona] > 0 && r.disp===0;
        return `<tr data-id="${e.id}">
          <td><input value="${dependencias.escHtml(e.nome)}" data-field="nome"></td>
          <td>
            <select data-field="zona">${dependencias.bairros.map(b=>`<option value="${dependencias.escHtml(b.nome)}" ${b.nome===e.zona?'selected':''}>${dependencias.escHtml(b.nome)}</option>`).join('')}</select>
          </td>
          <td style="font-size:10.5px;color:var(--muted)">${dependencias.escHtml(r.texto)}</td>
          <td><input value="${dependencias.escHtml(e.membros.join(', '))}" data-field="membros"></td>
          <td>
            <select data-field="status">
              <option ${e.status==='disponível'?'selected':''}>disponível</option>
              <option ${e.status==='em campo'?'selected':''}>em campo</option>
            </select>
          </td>
          <td style="text-align:center">${zonasAtivas[e.zona]||0} ${falta?`<div style="color:var(--red);font-size:9.5px">sem equip. livre</div>`:''}</td>
          <td style="display:flex;gap:4px">
            <button class="admin-btn primary" data-action="save-eq">Salvar</button>
            ${souResponsavel ? '' : '<button class="admin-btn danger" data-action="del-eq">Remover</button>'}
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>
    ${souResponsavel ? '' : `
    <div class="admin-section-title">Nova equipe</div>
    <div class="admin-new-form" id="new-eq-form">
      <input placeholder="Nome da equipe" id="neq-nome">
      <select id="neq-zona">${dependencias.bairros.map(b=>`<option value="${dependencias.escHtml(b.nome)}">${dependencias.escHtml(b.nome)}</option>`).join('')}</select>
      <input placeholder="Recursos: ex. Motosserra x2, Caminhão x1" id="neq-recursos">
      <input placeholder="Membros, separados por vírgula" id="neq-membros">
      <button class="admin-btn primary" id="neq-add">+ Adicionar equipe</button>
    </div>`}
  `;
  body.querySelectorAll('[data-action="save-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const e = dependencias.equipesPrefeitura.find(x=>x.id===tr.dataset.id);
      if(!e) return;
      e.nome = tr.querySelector('[data-field="nome"]').value.trim() || e.nome;
      e.zona = tr.querySelector('[data-field="zona"]').value;
      e.membros = tr.querySelector('[data-field="membros"]').value.split(',').map(s=>s.trim()).filter(Boolean);
      e.status = tr.querySelector('[data-field="status"]').value;
      dependencias.saveAdminState();
      dependencias.auditPush('Administração', 'Editou equipe', `${e.nome} (${e.zona})`,[e.zona]);
      btn.textContent = 'Salvo ✓'; setTimeout(()=>renderAdminEquipes(body), 900);
    };
  });
  body.querySelectorAll('[data-action="del-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const idx = dependencias.equipesPrefeitura.findIndex(x=>x.id===tr.dataset.id);
      if(idx>-1){ dependencias.auditPush('Administração', 'Removeu equipe', dependencias.equipesPrefeitura[idx].nome,[dependencias.equipesPrefeitura[idx].zona]); dependencias.equipesPrefeitura.splice(idx,1); }
      dependencias.saveAdminState();
      renderAdminEquipes(body);
    };
  });
  const addBtn = document.getElementById('neq-add');
  if(addBtn) addBtn.onclick = ()=>{
    const nome = document.getElementById('neq-nome').value.trim();
    const zona = document.getElementById('neq-zona').value;
    const recTxt = document.getElementById('neq-recursos').value.trim();
    const membros = document.getElementById('neq-membros').value.split(',').map(s=>s.trim()).filter(Boolean);
    if(!nome){ return; }
    const recursos = recTxt.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
      const m = s.match(/^(.*?)\s*x\s*(\d+)$/i);
      return m ? {tipo:m[1].trim(), qtd:parseInt(m[2]), emUso:0} : {tipo:s, qtd:1, emUso:0};
    });
    dependencias.equipesPrefeitura.push({ id:"eq"+(dependencias.equipePrefIdCursor++), nome, zona, recursos: recursos.length?recursos:[{tipo:'Mão de obra',qtd:1,emUso:0}], membros: membros.length?membros:['A definir'], status:'disponível' });
    dependencias.saveAdminState();
    dependencias.auditPush('Administração', 'Criou equipe', `${nome} (${zona})`,[zona]);
    renderAdminEquipes(body);
  };
}
 async function iniciar(){
 (adminTab='func');
(adminOverlay=document.getElementById('admin-overlay'));
document.getElementById('open-admin').onclick = ()=>{ adminOverlay.hidden=false; renderAdminBody(); };
document.getElementById('admin-close').onclick = ()=>{ adminOverlay.hidden=true; };
adminOverlay.addEventListener('click', e=>{ if(e.target===adminOverlay) adminOverlay.hidden=true; });
document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    adminTab = btn.dataset.tab;
    document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAdminBody();
  };
});
 return true;
 }
 return {iniciar,get adminTab(){return adminTab;},set adminTab(valor){adminTab=valor;},get adminOverlay(){return adminOverlay;},renderAdminBody,renderAdminFunc,recursosResumo,renderAdminEquipes};
 }
});
})(globalThis);
