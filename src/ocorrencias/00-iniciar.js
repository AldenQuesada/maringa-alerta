/* Formulário de registro de ocorrência. As operações e o armazenamento vêm do mapa. */
(function(global){
"use strict";
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function iniciar(api){
 const overlay=document.createElement('div');
 overlay.className='modal-overlay cadastro-ocorrencia';
 overlay.hidden=true;
 overlay.innerHTML=`<section class="cadastro-ocorrencia-modal" role="dialog" aria-modal="true" aria-labelledby="cad-oc-title">
 <header class="modal-head"><h2 id="cad-oc-title">Registrar ocorrência</h2><button type="button" id="cad-oc-close" class="close-btn" aria-label="Fechar">✕</button></header>
 <form id="cad-oc-form" novalidate>
 <nav class="cad-steps" aria-label="Etapas do cadastro"><span data-step-label="0">1. Ocorrência</span><span data-step-label="1">2. Local</span><span data-step-label="2">3. Equipes</span><span data-step-label="3">4. Relato e revisão</span></nav>
 <div class="cad-step-content"><section class="cad-step" data-step="0">
 <p class="demo-caption">Registro e acionamento de demonstração neste navegador.</p>
 <div class="cad-grid">
 <label>Tipo de ocorrência <span class="cad-select-add"><select name="tipo" required></select><button type="button" class="cad-add" data-add="tipo" aria-label="Adicionar tipo de ocorrência" title="Adicionar tipo de ocorrência">+</button></span></label>
 <label>Gravidade <select name="gravidade" required><option value="">Selecione a gravidade</option><option value="1">Baixa</option><option value="2">Média</option><option value="3">Alta</option></select></label>
 <label>Responsabilidade <select name="responsabilidade" required><option value="">Selecione a responsabilidade</option><option value="publica">Pública</option><option value="privada">Privada</option><option value="mista">Mista</option></select></label>
 <label>Evento relacionado <select name="evento" required><option value="">Selecione o evento cadastrado no Dashboard</option></select></label>
 </div>
 <div class="cad-add-panel" id="cad-add-tipo" hidden><div class="cad-grid"><label>Nome do tipo <input id="cad-tipo-nome" maxlength="160"></label><label>Prioridade padrão <select id="cad-tipo-prioridade"><option value="">Selecione</option><option>Baixa</option><option>Média</option><option>Alta</option></select></label></div><button type="button" id="cad-tipo-criar" class="admin-btn">Salvar tipo</button><p id="cad-tipo-status" role="status"></p></div>
 <label>Descrição <textarea name="descricao" rows="2" maxlength="2000"></textarea></label>
 <div class="cad-grid"><label>Pessoas afetadas <input name="afetados" type="number" min="0" max="100000"></label><label>Riscos observados <input name="riscos" maxlength="500"></label></div>
 </section>
 <section class="cad-step" data-step="1" hidden>
 <label>Endereço ou ponto de referência <input name="endereco" required maxlength="300"></label>
 <button type="button" id="cad-oc-search" class="admin-btn">Buscar endereço no mapa</button><p class="demo-caption">Clique no mapa para confirmar o local. Arraste o marcador para corrigir.</p>
 <div id="cad-oc-map" aria-label="Mapa para selecionar o local"></div>
 <p id="cad-oc-pos" role="status">Nenhum ponto selecionado.</p>
 <label>Bairro ou zona <select name="bairro" required><option value="">Selecione o bairro ou zona</option></select></label>
 <label>Complemento e acesso <input name="acesso" maxlength="300"></label>
 </section>
 <section class="cad-step" data-step="2" hidden>
 <div class="cad-heading"><h3>Organizações e equipes</h3><button type="button" class="cad-add" data-add="org" aria-label="Adicionar organização ou equipe" title="Adicionar organização ou equipe">+</button></div>
 <div class="cad-add-panel" id="cad-add-org" hidden><div class="cad-grid"><label>Nome <input id="cad-org-nome" maxlength="160"></label><label>Categoria <select id="cad-org-categoria"><option value="equipes">Equipe municipal</option><option value="emergencias">Emergência e segurança</option><option value="saude">Saúde</option><option value="parceiros">Órgãos e entidades</option></select></label></div><button type="button" id="cad-org-criar" class="admin-btn">Salvar no cadastro</button><p id="cad-org-status" role="status"></p></div>
 <fieldset><legend>Participantes</legend><p class="demo-caption">Selecione entre os cadastros disponíveis. As sugestões usam as regras cadastradas.</p><div id="cad-oc-orgs"></div></fieldset>
 </section>
 <section class="cad-step" data-step="3" hidden>
 <div class="cad-grid"><label>Origem <select name="origem"><option>Operador</option><option>WhatsApp</option><option>Telefone</option><option>Cidadão</option><option>Equipe em campo</option><option>Outro</option></select></label>
 <label>Data e hora do relato <input type="datetime-local" name="quando" required></label></div>
 <div class="cad-grid"><label>Nome do comunicante <input name="comunicante" maxlength="160"></label><label>Contato <input name="contato" maxlength="100"></label></div>
 <label>Fotos <input name="fotos" type="file" accept="image/*" multiple></label><div id="cad-oc-previews" class="attachment-previews"></div>
 <label class="cad-choice"><input type="checkbox" name="fotosPublicas"> Autorizar exibição das fotos no status público</label>
 <button type="button" id="cad-criterios-toggle" class="cad-text-toggle" aria-expanded="false">Critérios para localizar relatos semelhantes</button><div id="cad-criterios" hidden>
 <div class="cad-grid"><label>Distância em metros <input name="raio" type="number" min="1" max="5000" value="150"></label><label>Intervalo em horas <input name="janela" type="number" min="1" max="720" value="24"></label></div>
 </div>
 <div id="cad-oc-duplicates" role="status"></div>
 </section></div><p id="cad-oc-error" role="alert"></p>
 <div class="cad-footer"><button type="button" id="cad-oc-back" class="admin-btn" hidden>Voltar</button><button type="button" id="cad-oc-next" class="admin-btn primary">Continuar</button><button type="button" id="cad-oc-cancel" class="admin-btn">Cancelar</button><button type="submit" name="acao" value="triagem" class="admin-btn" hidden>Salvar para triagem</button><button type="submit" name="acao" value="confirmar" class="admin-btn primary" hidden>Confirmar e acionar</button></div>
 </form></section>`;
 document.body.appendChild(overlay);
 const form=overlay.querySelector('form'), error=overlay.querySelector('#cad-oc-error'), tipo=form.elements.tipo, bairro=form.elements.bairro;
 let map,marker,pos=null,files=[],matches=[],busy=false,duplicateAcknowledged=false,duplicateSignature="",etapa=0;
