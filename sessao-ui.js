/* Componente de conta/entrada. O adaptador de autenticação é injetado. */
(function(global) {
  "use strict";
  function criar({ target, sessao, municipio, zonas, aoMudar }) {
    if (!target || !sessao) throw new Error("Barra de sessão e adaptador são obrigatórios.");
    const doc=target.ownerDocument;
    const labels={admin:"Administrador",responsavel:"Responsável regional",visualizacao:"Visualização"};
    const iniciais=nome=>String(nome||"").trim().split(/\s+/).slice(0,2).map(p=>p[0]||"").join("").toUpperCase();
    const $=id=>doc.getElementById(id);
    let lastFocus=null;
    target.innerHTML=`<button type="button" class="session-trigger" id="session-trigger" aria-expanded="false" aria-haspopup="menu" aria-controls="session-menu"><span id="session-avatar" class="session-avatar" hidden></span><span class="session-trigger-copy"><span class="session-trigger-label" id="session-trigger-label">Entrar</span><span class="session-trigger-role" id="session-trigger-role" hidden></span></span><span aria-hidden="true">⌄</span></button>
      <div class="session-menu" id="session-menu" role="menu" hidden><div class="session-identity"><strong id="session-identity-name"></strong><small id="session-identity-email"></small><small id="session-identity-role"></small></div><button type="button" role="menuitem" data-session-action="details">Minha sessão</button><button type="button" role="menuitem" data-session-action="switch">Mudar de conta</button><button type="button" role="menuitem" class="session-exit" data-session-action="exit">Sair</button></div>`;
    const overlay=doc.createElement("div");
    overlay.className="session-overlay";
    overlay.id="session-overlay";
    overlay.hidden=true;
    overlay.innerHTML=`<section class="session-dialog" role="dialog" aria-modal="true" aria-labelledby="session-dialog-title"><header class="session-dialog-head"><h2 id="session-dialog-title">Entrar</h2><button type="button" class="session-close" id="session-close" aria-label="Fechar">✕</button></header><div class="session-dialog-body">
      <section class="session-screen" id="session-screen-accounts" hidden><p class="session-caption">Escolha uma conta já cadastrada neste navegador.</p><div class="session-accounts" id="session-accounts"></div><button class="session-primary" type="button" id="session-new">Adicionar conta</button></section>
      <section class="session-screen" id="session-screen-form" hidden><form id="session-form" class="session-form"><label>Nome e sobrenome<input id="session-name" type="text" autocomplete="name" maxlength="100" required placeholder="Nome e sobrenome"></label><label>E-mail<input id="session-email" type="email" autocomplete="email" maxlength="180" required placeholder="nome@exemplo.com"></label><label>Perfil de acesso<select id="session-profile"><option value="visualizacao">Visualização</option><option value="responsavel">Responsável regional</option><option value="admin">Administrador</option></select></label><label id="session-zone-wrap" hidden>Região<select id="session-zone"></select></label><p class="session-error" id="session-form-error" role="alert"></p><button type="submit" class="session-primary">Criar conta e entrar</button><button type="button" class="session-secondary" id="session-back-accounts">Escolher outra conta</button></form></section>
      <section class="session-screen" id="session-screen-details" hidden><dl class="session-detail"><div><dt>Nome</dt><dd id="session-detail-name"></dd></div><div><dt>E-mail</dt><dd id="session-detail-email"></dd></div><div><dt>Município</dt><dd id="session-detail-municipio"></dd></div><div><dt>Perfil</dt><dd id="session-detail-profile"></dd></div><div><dt>Início da sessão</dt><dd id="session-detail-when"></dd></div></dl><div class="session-actions"><button type="button" class="session-secondary" id="session-details-switch">Mudar de conta</button><button type="button" class="session-secondary" id="session-details-exit">Sair</button></div></section>
      </div><footer class="session-dialog-footer">Nesta versão, as contas são locais e não verificam identidade. Use dados fictícios. O acesso autenticado será conectado ao servidor posteriormente.</footer></section>`;
    doc.body.appendChild(overlay);
    $("session-zone").replaceChildren(...zonas.map(nome=>{
      const op=doc.createElement("option");op.value=nome;op.textContent=nome;return op;
    }));
    function estado(){ return sessao.obterSessao(); }
    function fecharMenu(){
      $("session-menu").hidden=true;
      $("session-trigger").setAttribute("aria-expanded","false");
    }
    function atualizar(){
      const atual=estado(), conta=atual?.conta;
      $("session-avatar").hidden=!conta;
      $("session-avatar").textContent=conta?iniciais(conta.nome):"";
      $("session-trigger-label").textContent=conta?conta.nome:"Entrar";
      $("session-trigger-role").hidden=!conta;
      $("session-trigger-role").textContent=conta
        ? labels[conta.perfil.tipo]+(conta.perfil.zona?" · "+conta.perfil.zona:"")
        : "";
      $("session-identity-name").textContent=conta?.nome||"";
      $("session-identity-email").textContent=conta?.email||"";
      $("session-identity-role").textContent=conta?labels[conta.perfil.tipo]+(conta.perfil.zona?" · "+conta.perfil.zona:""):"";
      if(!conta) fecharMenu();
    }
    function tela(tipo){
      for(const t of ["accounts","form","details"]) $("session-screen-"+t).hidden=t!==tipo;
      $("session-dialog-title").textContent=tipo==="accounts"?"Mudar de conta":tipo==="details"?"Minha sessão":"Adicionar conta";
      if(tipo==="form") {
        $("session-zone-wrap").hidden=$("session-profile").value!=="responsavel";
        $("session-form-error").textContent="";
        $("session-back-accounts").hidden=sessao.listarContas().length===0;
      }
      if(tipo==="accounts") renderContas();
      if(tipo==="details") renderDetalhes();
    }
    function abrir(tipo){
      fecharMenu();
      lastFocus=$("session-trigger");
      overlay.hidden=false;
      tela(tipo);
      const primeiro=tipo==="form"?$("session-name"):tipo==="accounts"?$("session-accounts").querySelector("button")||$("session-new"): $("session-details-switch");
      (primeiro||$("session-close")).focus();
    }
    function fechar(){
      overlay.hidden=true;
      if(lastFocus&&lastFocus.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus({preventScroll:true});
      lastFocus=null;
    }
    function mudou(){
      atualizar();
      fechar();
      if(typeof aoMudar==="function")aoMudar(estado());
    }
    function sair(){
      sessao.sair();
      fecharMenu();
      mudou();
    }
    function renderContas(){
      const lista=$("session-accounts");lista.replaceChildren();
      const todas=sessao.listarContas();
      if(!todas.length){tela("form");return;}
      for(const conta of todas){
        const btn=doc.createElement("button");btn.type="button";btn.className="session-account";
        const avatar=doc.createElement("span");avatar.className="session-avatar";avatar.textContent=iniciais(conta.nome);
        const copy=doc.createElement("span");
        const nome=doc.createElement("strong");nome.textContent=conta.nome;
        const sub=doc.createElement("small");sub.textContent=conta.email+" · "+labels[conta.perfil.tipo];
        copy.append(nome,sub);btn.append(avatar,copy);
        btn.onclick=()=>{try{sessao.trocar(conta.id);mudou();}catch(e){$("session-dialog-title").textContent=e.message;}};
        lista.appendChild(btn);
      }
    }
    function renderDetalhes(){
      const a=estado();if(!a){tela("accounts");return;}
      $("session-detail-name").textContent=a.conta.nome;
      $("session-detail-email").textContent=a.conta.email;
      $("session-detail-municipio").textContent=municipio;
      $("session-detail-profile").textContent=labels[a.conta.perfil.tipo]+(a.conta.perfil.zona?" · "+a.conta.perfil.zona:"");
      $("session-detail-when").textContent=a.iniciadaEm?new Date(a.iniciadaEm).toLocaleString("pt-BR"):"—";
    }
    $("session-trigger").onclick=()=>{
      const conta=estado()?.conta;
      if(!conta){abrir(sessao.listarContas().length?"accounts":"form");return;}
      const menu=$("session-menu");menu.hidden=!menu.hidden;
      $("session-trigger").setAttribute("aria-expanded",String(!menu.hidden));
    };
    target.querySelectorAll("[data-session-action]").forEach(b=>b.onclick=()=>{
      const cmd=b.dataset.sessionAction;
      if(cmd==="exit"){sair();return;}
      abrir(cmd==="details"?"details":"accounts");
    });
    $("session-new").onclick=()=>tela("form");
    $("session-back-accounts").onclick=()=>tela("accounts");
    $("session-profile").onchange=()=>{$("session-zone-wrap").hidden=$("session-profile").value!=="responsavel";};
    $("session-details-switch").onclick=()=>tela("accounts");
    $("session-details-exit").onclick=sair;
    $("session-close").onclick=fechar;
    $("session-form").onsubmit=e=>{
      e.preventDefault();
      const tipo=$("session-profile").value;
      const perfil=tipo==="responsavel"?{tipo,zona:$("session-zone").value}:{tipo};
      try{
        sessao.cadastrar({nome:$("session-name").value,email:$("session-email").value,perfil});
        $("session-form").reset();
        mudou();
      }catch(err){$("session-form-error").textContent=err.message; }
    };
    overlay.onclick=e=>{if(e.target===overlay)fechar();};
    doc.addEventListener("click",e=>{if(!target.contains(e.target))fecharMenu();});
    doc.addEventListener("keydown",e=>{
      if(e.key==="Escape"){if(!overlay.hidden){e.preventDefault();fechar();}else fecharMenu();}
      if(e.key==="Tab"&&!overlay.hidden){
        const focaveis=[...overlay.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled])")].filter(x=>!x.closest("[hidden]"));
        if(!focaveis.length)return;
        const atual=doc.activeElement,primeiro=focaveis[0],ultimo=focaveis[focaveis.length-1];
        if(e.shiftKey && (atual===primeiro||!focaveis.includes(atual))){e.preventDefault();ultimo.focus();}
        else if(!e.shiftKey && (atual===ultimo||!focaveis.includes(atual))){e.preventDefault();primeiro.focus();}
      }
    });
    atualizar();
    return {atualizar,abrir:()=>abrir("details"),fechar};
  }
  global.AlertaSessaoUI={criar};
})(typeof globalThis!=="undefined"?globalThis:window);
