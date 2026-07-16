// Global State
let tickets = [];
let selectedTicketId = null;
let currentTab = 'analytics';
let doraChartInstance = null;
let slaChartInstance = null;

// HTML5 Drag and Drop handlers
function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev, ticketId) {
    ev.dataTransfer.setData("text/plain", ticketId);
    document.getElementById(`card-${ticketId}`).classList.add('dragging');
}

async function drop(ev, targetLane) {
    ev.preventDefault();
    const ticketId = ev.dataTransfer.getData("text/plain");
    document.getElementById(`card-${ticketId}`).classList.remove('dragging');
    
    await moveTicket(ticketId, targetLane);
}

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
    initCharts();
    fetchTickets();
    fetchMetrics();
    fetchDrafts();
    initGeminiChat();
    
    // Refresh metrics periodically
    setInterval(fetchMetrics, 5000);

    // Event Listeners
    document.getElementById("add-ticket-btn").addEventListener("click", () => showModal(true));
    document.getElementById("close-modal-btn").addEventListener("click", () => showModal(false));
    document.getElementById("create-ticket-form").addEventListener("submit", handleCreateTicket);
    document.getElementById("reset-metrics-btn").addEventListener("click", handleResetMetrics);
    
    // Detail Panel Actions
    document.getElementById("generate-summary-btn").addEventListener("click", regenerateSummary);
    document.getElementById("run-agent-btn").addEventListener("click", handleRunAgent);
    document.getElementById("delete-ticket-btn").addEventListener("click", handleDeleteTicket);
    
    // Triage Analyzer Actions
    document.getElementById("run-triage-btn").addEventListener("click", handleTriage);
    document.getElementById("triage-create-ticket-btn").addEventListener("click", handleCreateTriagedTicket);
    
    // KB Search Actions
    document.getElementById("kb-search-btn").addEventListener("click", handleKBSearch);
    document.getElementById("kb-search-input").addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleKBSearch();
    });
});

// Navigation Tab Switcher
function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    
    // Add active
    let btnIdx = 0;
    if (tabName === 'ai-ops') btnIdx = 1;
    else if (tabName === 'strategy') btnIdx = 2;
    
    document.querySelectorAll(".tab-btn")[btnIdx].classList.add("active");
    document.getElementById(`tab-${tabName}`).classList.add("active");

    // Force chart render refresh when switching back to analytics
    if (tabName === 'analytics') {
        fetchMetrics();
    }
}

// Modal Toggle
function showModal(show) {
    const modal = document.getElementById("create-ticket-modal");
    if (show) {
        modal.classList.remove("hidden");
    } else {
        modal.classList.add("hidden");
        document.getElementById("create-ticket-form").reset();
    }
}

// Fetch Tickets from API
async function fetchTickets() {
    try {
        const response = await fetch("/api/tickets");
        tickets = await response.json();
        renderTickets();
        
        // Refresh selected ticket detail if it exists
        if (selectedTicketId) {
            const stillExists = tickets.find(t => t.id === selectedTicketId);
            if (stillExists) {
                selectTicket(selectedTicketId);
            } else {
                clearTicketDetail();
            }
        }
    } catch (err) {
        showToast("Erro ao recuperar a lista de chamados", "error");
        console.error(err);
    }
}

// Render Kanban board tickets
function renderTickets() {
    const lanes = ["to_do", "refinement", "development", "qa_testing", "ready_for_deploy"];
    
    // Clear all containers
    lanes.forEach(lane => {
        document.getElementById(`container-${lane}`).innerHTML = "";
    });

    // Count tickets per lane for WIP limits
    const laneCounts = {
        to_do: 0,
        refinement: 0,
        development: 0,
        qa_testing: 0,
        ready_for_deploy: 0
    };

    // Sort tickets by class of service (Expedite first) and priority
    tickets.sort((a, b) => {
        const cosOrder = { "Expedite": 0, "Fixed Date": 1, "Standard": 2, "Intangible": 3 };
        return cosOrder[a.class_of_service] - cosOrder[b.class_of_service];
    });

    tickets.forEach(ticket => {
        laneCounts[ticket.lane]++;
        
        const card = document.createElement("div");
        card.id = `card-${ticket.id}`;
        card.className = `ticket-card cos-${ticket.class_of_service.toLowerCase().replace(' ', '-')}`;
        card.draggable = true;
        card.addEventListener("dragstart", (e) => drag(e, ticket.id));
        card.addEventListener("click", () => selectTicket(ticket.id));
        
        if (selectedTicketId === ticket.id) {
            card.classList.add("selected");
        }

        const leadTimeText = ticket.lead_time ? `⏱️ Lead: ${Math.round(ticket.lead_time)}m` : `🗓️ Abr.: ${new Date(ticket.created_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        
        // Translate type labels for visual aesthetics
        const translatedType = ticket.type === "Incident" ? "Incidente" : ticket.type === "Bug" ? "Bug" : ticket.type === "Feature" ? "Melhoria" : ticket.type === "Patch" ? "Ajuste" : "Manutenção";

        card.innerHTML = `
            <div class="card-title">${ticket.title}</div>
            <div class="card-meta">
                <span class="card-badge">${translatedType}</span>
                <span>${leadTimeText}</span>
            </div>
        `;
        
        document.getElementById(`container-${ticket.lane}`).appendChild(card);
    });

    // Update WIP Limits Indicators
    const wipLimits = { refinement: 4, development: 3, qa_testing: 2 };
    Object.keys(wipLimits).forEach(lane => {
        const count = laneCounts[lane];
        const limit = wipLimits[lane];
        const badge = document.getElementById(`wip-${lane}`);
        const fill = document.getElementById(`wip-fill-${lane}`);
        const column = document.getElementById(`col-${lane}`);
        
        badge.innerText = `${count}/${limit}`;
        
        const percentage = Math.min((count / limit) * 100, 100);
        fill.style.width = `${percentage}%`;

        if (count >= limit) {
            badge.className = "wip-badge wip-alert";
            fill.className = "wip-fill wip-alert";
            column.classList.add("wip-full");
        } else {
            badge.className = "wip-badge";
            fill.className = "wip-fill";
            column.classList.remove("wip-full");
        }
    });
}

// Move Ticket to another lane
async function moveTicket(ticketId, targetLane) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}/move?target_lane=${targetLane}`, {
            method: "PUT"
        });
        
        if (!response.ok) {
            const data = await response.json();
            showToast(data.detail || "Verificação de critérios falhou.", "error");
            return;
        }
        
        const updatedTicket = await response.json();
        const readableLaneName = targetLane === "to_do" ? "BACKLOG" : targetLane === "refinement" ? "REFINAMENTO" : targetLane === "development" ? "DESENVOLVIMENTO" : targetLane === "qa_testing" ? "QA & TESTES" : "PRONTO PARA DEPLOY";
        showToast(`Chamado #${ticketId} movido para ${readableLaneName}`, "success");
        
        // Refresh
        fetchTickets();
        fetchMetrics();
    } catch (err) {
        showToast("Erro ao se comunicar com o servidor", "error");
        console.error(err);
    }
}

// Select ticket to display detail
function selectTicket(id) {
    selectedTicketId = id;
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    // Highlight selected card
    document.querySelectorAll(".ticket-card").forEach(c => c.classList.remove("selected"));
    const selectedCard = document.getElementById(`card-${id}`);
    if (selectedCard) selectedCard.classList.add("selected");

    // Populate panel details
    document.getElementById("detail-empty-state").classList.add("hidden");
    const detailContent = document.getElementById("detail-content");
    detailContent.classList.remove("hidden");

    document.getElementById("detail-ticket-title").innerText = `[#${ticket.id}] ${ticket.title}`;
    document.getElementById("detail-ticket-desc").innerText = ticket.description;
    
    const translatedCos = ticket.class_of_service === "Expedite" ? "EXPEDIDO" : ticket.class_of_service === "Fixed Date" ? "DATA DE ENTREGA FIXA" : ticket.class_of_service === "Standard" ? "PADRÃO" : "INTANGÍVEL";
    const cosBadge = document.getElementById("detail-ticket-cos");
    cosBadge.innerText = translatedCos;
    cosBadge.className = `badge cos-${ticket.class_of_service.toLowerCase().replace(' ', '-')}`;

    const typeBadge = document.getElementById("detail-ticket-type");
    typeBadge.innerText = ticket.type === "Incident" ? "Incidente" : ticket.type === "Bug" ? "Bug" : ticket.type === "Feature" ? "Melhoria" : ticket.type === "Patch" ? "Ajuste" : "Manutenção";

    document.getElementById("detail-ticket-assignee").innerText = ticket.assignee === "AI Agent" ? "🤖 Agente de IA" : ticket.assignee;
    
    // AI Summary
    const summaryBody = document.getElementById("detail-ticket-summary");
    if (ticket.ai_summary) {
        summaryBody.innerHTML = ticket.ai_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    } else {
        summaryBody.innerText = "Nenhum resumo contextual gerado. Clique em 'Regerar Resumo' para executar a análise.";
    }

    // Exit Criteria Checklist rendering
    const readableLaneName = ticket.lane === "to_do" ? "BACKLOG" : ticket.lane === "refinement" ? "REFINAMENTO" : ticket.lane === "development" ? "DESENVOLVIMENTO" : ticket.lane === "qa_testing" ? "QA & TESTES" : "PRONTO PARA DEPLOY";
    const colName = document.getElementById("criteria-column-name");
    colName.innerText = readableLaneName;
    
    const checklist = document.getElementById("checklist-container");
    checklist.innerHTML = "";

    // Render checkbox checklists dynamically depending on current lane
    if (ticket.lane === "development") {
        if (ticket.type === "Bug" || ticket.type === "Feature") {
            const coverage = ticket.policies.code_coverage || 0;
            const doc = ticket.policies.doc_link || "";
            
            checklist.appendChild(createChecklistItem("coverage-check", `Cobertura de Código: ${coverage}% (Meta: >=80%)`, coverage >= 80));
            checklist.appendChild(createChecklistItem("doc-check", `Link de Documentação Anexado: ${doc ? `[${doc}]` : 'Nenhum'}`, !!doc));
            
            // Add inputs in-place for simulation edits
            const inputContainer = document.createElement("div");
            inputContainer.className = "policy-inputs-box";
            inputContainer.innerHTML = `
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Definir Cobertura %:</label>
                    <input type="number" id="input-coverage" value="${coverage}" style="width: 60px; padding: 0.2rem; font-size: 0.7rem; background: #000; border: 1px solid var(--border-color); color: #fff; border-radius: 4px;">
                    <label style="font-size: 0.7rem; color: var(--text-muted);">Link Doc:</label>
                    <input type="text" id="input-doc" value="${doc}" placeholder="e.g. http://docs/auth" style="flex-grow: 1; padding: 0.2rem; font-size: 0.7rem; background: #000; border: 1px solid var(--border-color); color: #fff; border-radius: 4px;">
                    <button onclick="saveDevPolicies('${ticket.id}')" class="tiny-btn">Salvar</button>
                </div>
            `;
            checklist.appendChild(inputContainer);
        } else {
            checklist.innerHTML = "<p style='font-size: 0.75rem; color: var(--text-muted);'>Nenhum critério rígido exigido para correções básicas/atualizações de rotina nesta etapa.</p>";
        }
    } else if (ticket.lane === "qa_testing") {
        const approved = ticket.policies.qa_approved || false;
        const dockerTest = ticket.policies.docker_build_test || false;
        
        checklist.appendChild(createChecklistItem("qa-check", "Aprovação de Revisão da Equipe de QA", approved, (e) => {
            updatePolicyState(ticket.id, { qa_approved: e.target.checked });
        }));
        checklist.appendChild(createChecklistItem("docker-check", "Teste de Verificação e Build Docker no Pipeline", dockerTest, (e) => {
            updatePolicyState(ticket.id, { docker_build_test: e.target.checked });
        }));
    } else {
        checklist.innerHTML = "<p style='font-size: 0.75rem; color: var(--text-muted);'>Esta etapa do processo não possui critérios de saída obrigatórios.</p>";
    }

    // Toggle button visibility
    const runBtn = document.getElementById("run-agent-btn");
    // Show AI Run Agent button only if assignee is AI Agent and ticket is not yet in ready_for_deploy
    if (ticket.assignee === "AI Agent" && ticket.lane !== "ready_for_deploy") {
        runBtn.classList.remove("hidden");
    } else {
        runBtn.classList.add("hidden");
    }
}

function clearTicketDetail() {
    selectedTicketId = null;
    document.getElementById("detail-empty-state").classList.remove("hidden");
    document.getElementById("detail-content").classList.add("hidden");
}

function createChecklistItem(id, label, isChecked, onChangeFn = null) {
    const row = document.createElement("div");
    row.className = "criteria-item";
    
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = id;
    cb.checked = isChecked;
    if (onChangeFn) {
        cb.addEventListener("change", onChangeFn);
    } else {
        cb.disabled = true; // disabled if edited via save button
    }
    
    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.innerText = label;
    lbl.style.color = isChecked ? "var(--cos-intangible)" : "var(--text-muted)";
    
    row.appendChild(cb);
    row.appendChild(lbl);
    return row;
}

// Edit and Save Development Column Policies
async function saveDevPolicies(ticketId) {
    const coverage = parseInt(document.getElementById("input-coverage").value) || 0;
    const doc = document.getElementById("input-doc").value;
    
    await updatePolicyState(ticketId, {
        code_coverage: coverage,
        doc_link: doc
    });
}

// Update Policy values in Backend
async function updatePolicyState(ticketId, payload) {
    try {
        const response = await fetch(`/api/tickets/${ticketId}/policies`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Critérios de saída atualizados com sucesso.", "info");
            fetchTickets();
        } else {
            showToast("Falha ao salvar configurações dos critérios.", "error");
        }
    } catch (e) {
        console.error(e);
    }
}

// Regenerate AI Summary
async function regenerateSummary() {
    if (!selectedTicketId) return;
    try {
        const response = await fetch(`/api/ai/summarize/${selectedTicketId}`, {
            method: "POST"
        });
        const data = await response.json();
        
        const summaryBody = document.getElementById("detail-ticket-summary");
        summaryBody.innerHTML = data.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Refresh ticket storage
        fetchTickets();
        showToast("Nó do Resumidor de IA executado com sucesso.", "info");
    } catch (err) {
        showToast("Erro ao executar resumidor do agente", "error");
    }
}

// Trigger AI Agent (SSE logs stream)
function handleRunAgent() {
    if (!selectedTicketId) return;
    
    // Switch to AI Ops tab to see logs
    switchTab('ai-ops');
    
    const runBtn = document.getElementById("run-agent-btn");
    runBtn.disabled = true;
    runBtn.innerText = "⚡ Executando Agente...";

    const consoleLogs = document.getElementById("console-logs");
    consoleLogs.innerHTML = ""; // Clear log
    
    // SSE connection
    const eventSource = new EventSource(`/api/tickets/${selectedTicketId}/agent/stream`);
    
    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        const logLine = document.createElement("div");
        logLine.className = "log-line";
        
        if (data.message.includes("✅")) {
            logLine.className += " success-line";
        } else if (data.message.includes("🤖")) {
            logLine.className += " agent-line";
        } else if (data.message.includes("erro") || data.message.includes("FATAL") || data.message.includes("falha")) {
            logLine.className += " error-line";
        }
        
        logLine.innerText = `${new Date().toLocaleTimeString()} ${data.message}`;
        consoleLogs.appendChild(logLine);
        consoleLogs.scrollTop = consoleLogs.scrollHeight; // Scroll to bottom
        
        if (data.done) {
            eventSource.close();
            runBtn.disabled = false;
            runBtn.innerText = "🤖 Rodar Agente Autônomo de IA (MCP)";
            showToast("O agente resolveu a tarefa e encerrou o chamado", "success");
            fetchTickets();
            fetchMetrics();
        }
    };
    
    eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSource.close();
        runBtn.disabled = false;
        runBtn.innerText = "🤖 Rodar Agente Autônomo de IA (MCP)";
        showToast("Conexão com o fluxo do agente de IA interrompida", "error");
    };
}

// Delete ticket
async function handleDeleteTicket() {
    if (!selectedTicketId || !confirm("Tem certeza que deseja excluir este chamado?")) return;
    
    try {
        const response = await fetch(`/api/tickets/${selectedTicketId}`, {
            method: "DELETE"
        });
        if (response.ok) {
            showToast("Chamado excluído com sucesso", "info");
            clearTicketDetail();
            fetchTickets();
            fetchMetrics();
        }
    } catch (err) {
        showToast("Erro ao tentar excluir chamado", "error");
    }
}

// Handle Form Ticket Creation
async function handleCreateTicket(e) {
    e.preventDefault();
    
    const payload = {
        title: document.getElementById("ticket-title").value,
        description: document.getElementById("ticket-description").value,
        type: document.getElementById("ticket-type").value,
        class_of_service: document.getElementById("ticket-cos").value,
        assignee: document.getElementById("ticket-assignee").value
    };
    
    try {
        const response = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Chamado criado e enfileirado com sucesso", "success");
            showModal(false);
            fetchTickets();
            fetchMetrics();
        } else {
            showToast("Falha ao cadastrar chamado", "error");
        }
    } catch (err) {
        showToast("Erro de comunicação com o servidor", "error");
    }
}

// AI Message Triage
async function handleTriage() {
    const text = document.getElementById("triage-input").value;
    if (!text.trim()) {
        showToast("Por favor, digite ou cole uma mensagem antes de analisar.", "error");
        return;
    }

    try {
        const response = await fetch("/api/ai/triage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        
        // Translate visual badge values for display in results
        const typeTrans = data.type === "Incident" ? "Incidente" : data.type === "Bug" ? "Bug" : "Melhoria";
        const cosTrans = data.class_of_service === "Expedite" ? "Expedido" : data.class_of_service === "Fixed Date" ? "Data de Entrega Fixa" : "Padrão";

        document.getElementById("triage-res-type").innerText = typeTrans;
        document.getElementById("triage-res-cos").innerText = cosTrans;
        document.getElementById("triage-res-squad").innerText = data.squad;
        document.getElementById("triage-res-conf").innerText = `${Math.round(data.confidence * 100)}%`;
        document.getElementById("triage-res-reason").innerText = data.reasoning;
        
        // Show result box
        document.getElementById("triage-result").classList.remove("hidden");
        showToast("Texto interpretado. Fila e squad mapeados.", "info");
    } catch (err) {
        showToast("Erro no processamento da análise de triagem", "error");
    }
}

// Create Ticket using Triaged Data
async function handleCreateTriagedTicket() {
    const titleText = document.getElementById("triage-input").value.split("\n")[0];
    const shortTitle = titleText.length > 50 ? titleText.substring(0, 50) + "..." : titleText;
    
    // Map back display translated values to backend schema
    const displayType = document.getElementById("triage-res-type").innerText;
    const backendType = displayType === "Incidente" ? "Incident" : displayType === "Bug" ? "Bug" : "Feature";
    
    const displayCos = document.getElementById("triage-res-cos").innerText;
    const backendCos = displayCos === "Expedido" ? "Expedite" : displayCos === "Data de Entrega Fixa" ? "Fixed Date" : "Standard";

    const payload = {
        title: `Auto Roteado: ${shortTitle}`,
        description: document.getElementById("triage-input").value,
        type: backendType,
        class_of_service: backendCos,
        assignee: "AI Agent"
    };
    
    try {
        const response = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Chamado criado por triagem e direcionado ao time correto", "success");
            document.getElementById("triage-result").classList.add("hidden");
            document.getElementById("triage-input").value = "";
            fetchTickets();
            fetchMetrics();
        }
    } catch (e) {
        showToast("Erro ao salvar chamado por triagem", "error");
    }
}

// KB Semantic Search
async function handleKBSearch() {
    const query = document.getElementById("kb-search-input").value;
    if (!query.trim()) return;
    
    try {
        const response = await fetch("/api/ai/kb/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });
        const data = await response.json();
        
        const resultsArea = document.getElementById("search-results-container");
        const list = document.getElementById("search-results-list");
        list.innerHTML = "";
        
        if (data.results && data.results.length > 0) {
            resultsArea.classList.remove("hidden");
            data.results.forEach(article => {
                const artDiv = document.createElement("div");
                artDiv.className = "kb-match-item";
                
                let sectionsHtml = "";
                article.sections.forEach(s => {
                    sectionsHtml += `
                        <div class="kb-match-header">
                            <span>↳ ${s.subtitle}</span>
                            <span>Aderência: ${s.score}</span>
                        </div>
                        <p class="kb-match-body">${s.content}</p>
                    `;
                });
                
                artDiv.innerHTML = `
                    <strong>${article.title}</strong>
                    ${sectionsHtml}
                `;
                list.appendChild(artDiv);
            });
            showToast("Consulta semântica realizada com sucesso", "success");
        } else {
            resultsArea.classList.add("hidden");
            showToast("⚠️ 0 correspondências. Lacuna de documentação identificada. Rascunho criado.", "error");
            fetchDrafts();
        }
    } catch (err) {
        showToast("Erro ao pesquisar na base de dados de conhecimento", "error");
    }
}

// Fetch KB Articles Drafts
async function fetchDrafts() {
    try {
        const response = await fetch("/api/ai/kb/drafts");
        const drafts = await response.json();
        
        const list = document.getElementById("draft-queue-list");
        list.innerHTML = "";
        
        if (drafts.length === 0) {
            list.innerHTML = `<p class="empty-text">Nenhuma lacuna de documentação pendente. Todas as pesquisas foram resolvidas com sucesso.</p>`;
            return;
        }
        
        drafts.forEach(d => {
            const draftDiv = document.createElement("div");
            draftDiv.className = "draft-item";
            draftDiv.innerHTML = `
                <div class="draft-header">
                    <span>${d.title}</span>
                    <button onclick="approveDraft('${d.id}')" class="tiny-btn">Aprovar & Publicar</button>
                </div>
                <p class="draft-body">Pesquisa que disparou a ação: <em>"${d.query}"</em>. Soluciona falta de documentação sobre configuração de redes e hosts locais.</p>
            `;
            list.appendChild(draftDiv);
        });
    } catch (err) {
        console.error(err);
    }
}

// Approve Draft Article
async function approveDraft(id) {
    try {
        const response = await fetch(`/api/ai/kb/drafts/${id}/approve`, {
            method: "POST"
        });
        if (response.ok) {
            showToast("Artigo aprovado e integrado ao índice semântico da Base de Conhecimento", "success");
            fetchDrafts();
            fetchMetrics();
        }
    } catch (err) {
        showToast("Erro ao aprovar rascunho de documentação", "error");
    }
}

// Fetch Metrics & Update UI
async function fetchMetrics() {
    try {
        const response = await fetch("/api/metrics");
        const m = await response.json();
        
        // Update DOM elements
        document.getElementById("val-df").innerText = `${m.deployment_frequency}/sem`;
        document.getElementById("val-ltfc").innerText = `${m.lead_time_for_changes}m`;
        document.getElementById("val-cfr").innerText = `${m.change_failure_rate}%`;
        document.getElementById("val-mttr").innerText = `${m.mean_time_to_restore}m`;
        
        document.getElementById("val-frt").innerText = `${m.first_response_time}s`;
        document.getElementById("val-fcr").innerText = `${m.first_call_resolution}%`;
        document.getElementById("val-ssa").innerText = `${m.self_service_adoption}%`;
        document.getElementById("val-csat").innerText = `${m.customer_satisfaction}%`;
        
        // Update Charts
        updateChartsData(m);
    } catch (err) {
        console.error("Failed to fetch metrics updates:", err);
    }
}

// Reset DORA & SLA metrics
async function handleResetMetrics() {
    if (!confirm("Tem certeza que deseja redefinir todas as métricas para os valores simulados iniciais?")) return;
    try {
        const response = await fetch("/api/metrics/reset", {
            method: "POST"
        });
        if (response.ok) {
            showToast("Métricas da simulação redefinidas com sucesso", "info");
            fetchMetrics();
        }
    } catch (err) {
        showToast("Erro ao redefinir métricas", "error");
    }
}

// Render dynamic Toast alerts
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let emoji = "ℹ️";
    if (type === "error") emoji = "⚠️";
    if (type === "success") emoji = "✅";
    
    toast.innerHTML = `<span>${emoji}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = "slide-in 0.3s reverse forwards";
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

// Chart JS Visual Configurations
function initCharts() {
    // DORA Radar Chart Settings
    const ctxDora = document.getElementById('doraChart').getContext('2d');
    doraChartInstance = new Chart(ctxDora, {
        type: 'radar',
        data: {
            labels: [
                'Frequência de Deploy (Pontos)',
                'Lead Time de Mudanças (Pontos)',
                'Taxa de Falha de Mudanças (Pontos)',
                'MTTR / Restauração (Pontos)'
            ],
            datasets: [{
                label: 'Métricas Atuais',
                data: [70, 60, 90, 80],
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
                pointBackgroundColor: '#6366f1',
            }, {
                label: 'Metas Limites do SLA',
                data: [60, 50, 80, 70],
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                borderDash: [5, 5],
                pointBackgroundColor: 'rgba(255, 255, 255, 0.4)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    pointLabels: { color: '#9ca3af', font: { size: 10, family: 'Inter' } },
                    ticks: { display: false },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: { labels: { color: '#f3f4f6', font: { family: 'Inter', size: 11 } } }
            }
        }
    });

    // SLA & Support Experience Indices
    const ctxSla = document.getElementById('slaChart').getContext('2d');
    slaChartInstance = new Chart(ctxSla, {
        type: 'bar',
        data: {
            labels: ['FRT (segundos)', 'FCR (%)', 'Autoatendimento (%)', 'CSAT (%)'],
            datasets: [{
                label: 'Status Atual',
                data: [18.0, 78.5, 52.1, 96.2],
                backgroundColor: ['#3b82f6', '#10b981', '#a855f7', '#6366f1'],
                borderRadius: 6
            }, {
                label: 'Linha Limite do SLA',
                data: [20.0, 75.0, 50.0, 95.0],
                type: 'line',
                borderColor: 'rgba(244, 63, 94, 0.6)',
                borderWidth: 2,
                borderDash: [4, 4],
                fill: false,
                pointStyle: 'circle'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#9ca3af', font: { size: 9 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { labels: { color: '#f3f4f6', font: { family: 'Inter', size: 11 } } }
            }
        }
    });
}

function updateChartsData(metrics) {
    if (!doraChartInstance || !slaChartInstance) return;
    
    // Map actual metrics to chart scoring bounds (0-100)
    // Deploy Frequency: higher is better (e.g. 10/wk -> 100)
    const dfScore = Math.min((metrics.deployment_frequency / 12) * 100, 100);
    // Lead Time: lower is better (e.g. 10m -> 100, 120m -> 10)
    const ltScore = Math.max(10, 100 - (metrics.lead_time_for_changes / 1.5));
    // Change Failure: lower is better (0% -> 100, 10% -> 0)
    const cfrScore = Math.max(0, 100 - (metrics.change_failure_rate * 10));
    // MTTR: lower is better (5m -> 100, 60m -> 0)
    const mttrScore = Math.max(0, 100 - (metrics.mean_time_to_restore * 1.5));

    // Update DORA radar data
    doraChartInstance.data.datasets[0].data = [dfScore, ltScore, cfrScore, mttrScore];
    doraChartInstance.update();

    // Update SLA chart data
    // Scale FRT to fit in bar visual alongside percentages (FRT is target <20s, map to raw value)
    slaChartInstance.data.datasets[0].data = [
        metrics.first_response_time,
        metrics.first_call_resolution,
        metrics.self_service_adoption,
        metrics.customer_satisfaction
    ];
    slaChartInstance.update();
}

// Gemini Chat Implementation
function initGeminiChat() {
    const sendBtn = document.getElementById("gemini-chat-send-btn");
    const chatInput = document.getElementById("gemini-chat-input");
    
    if (sendBtn && chatInput) {
        sendBtn.addEventListener("click", handleGeminiSend);
        chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleGeminiSend();
        });
    }
}

async function handleGeminiSend() {
    const input = document.getElementById("gemini-chat-input");
    const key = document.getElementById("gemini-api-key").value;
    const model = document.getElementById("gemini-model").value;
    
    const text = input.value.trim();
    if (!text) return;
    
    if (!key.trim()) {
        showToast("Por favor, insira sua API Key do Gemini no topo do chat.", "error");
        return;
    }
    
    // Clear input
    input.value = "";
    
    // Append user message to chat UI
    appendChatMessage("👤", text, false);
    
    // Append thinking indicator
    const thinkingId = appendChatMessage("🤖", "Processando análise...", true);
    
    try {
        const response = await fetch("/api/ai/gemini-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                api_key: key,
                model: model
            })
        });
        
        const data = await response.json();
        
        // Remove thinking indicator
        const thinkingElem = document.getElementById(thinkingId);
        if (thinkingElem) thinkingElem.remove();
        
        // Append response
        appendChatMessage("🤖", data.reply);
        
    } catch (err) {
        const thinkingElem = document.getElementById(thinkingId);
        if (thinkingElem) thinkingElem.remove();
        
        appendChatMessage("🤖", "Falha de comunicação ou chave de API inválida.");
        showToast("Erro ao contatar a API do Gemini", "error");
    }
}

function appendChatMessage(sender, text, isThinking = false) {
    const container = document.getElementById("gemini-chat-messages");
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const row = document.createElement("div");
    row.id = msgId;
    row.style.display = "flex";
    row.style.gap = "0.5rem";
    row.style.alignItems = "flex-start";
    row.style.marginBottom = "0.8rem";
    
    // Convert markdown formatting to html tags
    let formattedText = text;
    if (!isThinking) {
        formattedText = text
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/`(.*?)`/g, "<code style='background: rgba(0,0,0,0.4); padding: 0.1rem 0.3rem; border-radius: 4px; font-family: monospace; font-size: 0.72rem;'>$1</code>")
            .replace(/\n/g, "<br>");
    } else {
        formattedText = `<span style="font-style: italic; color: var(--text-muted);">${text}</span>`;
    }
    
    row.innerHTML = `
        <span style="font-size: 1.1rem; flex-shrink: 0;">${sender}</span>
        <div style="background: ${sender === '🤖' ? 'rgba(255,255,255,0.03)' : 'rgba(99, 102, 241, 0.08)'}; border: 1px solid ${sender === '🤖' ? 'var(--border-color)' : 'rgba(99, 102, 241, 0.2)'}; border-radius: 8px; padding: 0.6rem 0.8rem; font-size: 0.78rem; line-height: 1.4; color: var(--text-main); max-width: 85%;">
            ${formattedText}
        </div>
    `;
    
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    
    return msgId;
}

