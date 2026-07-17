import asyncio
import json
import random
import time
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel, Field

import database as db

app = FastAPI(
    title="MVP ITSM & Agentic AI Platform",
    description="Backend service for tracking Kanban flows, DORA metrics, and Agentic AI operations.",
    version="1.0.0"
)

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Data Models
class TicketPolicy(BaseModel):
    code_coverage: Optional[int] = None
    doc_link: Optional[str] = None
    qa_approved: Optional[bool] = None
    docker_build_test: Optional[bool] = None

class Ticket(BaseModel):
    id: str
    title: str
    description: str
    type: str  # "Incident", "Bug", "Feature", "Patch", "Update"
    class_of_service: str  # "Expedite", "Fixed Date", "Standard", "Intangible"
    lane: str  # "to_do", "refinement", "development", "qa_testing", "ready_for_deploy"
    assignee: str
    created_at: float
    updated_at: float
    lead_time: Optional[float] = None
    wip_limit_exceeded: bool = False
    policies: TicketPolicy = Field(default_factory=TicketPolicy)
    ai_summary: Optional[str] = None
    chat_logs: Optional[List[str]] = None
    error_logs: Optional[str] = None

class TicketCreate(BaseModel):
    title: str
    description: str
    type: str
    class_of_service: str
    assignee: str
    lane: Optional[str] = "to_do"

class SearchQuery(BaseModel):
    query: str

class TriageRequest(BaseModel):
    text: str

class PolicyUpdateRequest(BaseModel):
    code_coverage: Optional[int] = None
    doc_link: Optional[str] = None
    qa_approved: Optional[bool] = None
    docker_build_test: Optional[bool] = None


# NOTE: TICKETS_DB e DRAFT_KB_DB foram removidos — dados agora persistem no SQLite via database.py


KNOWLEDGE_BASE = [
    {
        "id": "kb_1",
        "title": "Mapeamento de Rede de Containers Locais PostgreSQL",
        "sections": [
            {
                "subtitle": "Configuração de Mapeamento de Portas (5432:5432)",
                "content": "Certifique-se de que seu arquivo docker-compose.yml ou comando docker run mapeia explicitamente a porta do host 5432 para a porta do container 5432: `-p 5432:5432`. Se a porta não estiver exposta na interface do host, aplicações locais externas ao Docker não conseguirão se comunicar com o PostgreSQL."
            },
            {
                "subtitle": "Strings de conexão do host para rede local do Docker",
                "content": "Ao conectar-se ao PostgreSQL de dentro de outro container no mesmo host, evite usar 'localhost' ou '127.0.0.1'. Em vez disso, use o hostname especial `host.docker.internal`, que resolve para a interface de rede da máquina host, ou conecte-se através de uma rede de ponte Docker compartilhada."
            }
        ]
    },
    {
        "id": "kb_2",
        "title": "Provisionamento de Bucket de Staging AWS S3 e Políticas IAM",
        "sections": [
            {
                "subtitle": "Curingas de Sufixo de Política de Acesso (/*)",
                "content": "Uma causa comum de falhas de acesso ao S3 é omitir o sufixo curinga nos recursos da política IAM. Para operações PutObject e GetObject, especifique o recurso como `arn:aws:s3:::my-bucket/*` em vez de apenas o ARN básico do bucket `arn:aws:s3:::my-bucket`."
            },
            {
                "subtitle": "Sobrescritas de Endpoint S3 do LocalStack para Testes Locais",
                "content": "Para testar operações do S3 localmente usando o LocalStack, configure o endpoint do cliente AWS SDK para apontar para `http://localhost:4566`. No Node.js, defina `endpoint: 'http://localhost:4566'` e `s3ForcePathStyle: true` durante a inicialização do cliente."
            }
        ]
    },
    {
        "id": "kb_3",
        "title": "Timeout e Protocolos de Conexão do Cache Redis",
        "sections": [
            {
                "subtitle": "Tratamento de timeouts de autenticação ao conectar",
                "content": "Se a conexão com o Redis cair com timeout de autenticação, verifique se a variável `REDIS_PASSWORD` no seu arquivo .env corresponde exatamente à diretiva `requirepass` no arquivo redis.conf. Se nenhuma senha estiver configurada, remova o parâmetro de senha do cliente para evitar incompatibilidade."
            }
        ]
    }
]

# Baseline metrics that fluctuate
METRICS = {
    # DORA
    "deployment_frequency": 8.4,  # deploys/week
    "lead_time_for_changes": 42.0,  # minutes
    "change_failure_rate": 4.2,  # %
    "mean_time_to_restore": 24.5,  # minutes
    # Service Desk
    "first_response_time": 18.0,  # seconds (AI target <20s)
    "first_call_resolution": 78.5,  # % (target >75%)
    "self_service_adoption": 52.1,  # % (target >50%)
    "customer_satisfaction": 96.2,  # % (target >95%)
}

# Kanban WIP Limits Configuration
WIP_LIMITS = {
    "to_do": None,
    "refinement": 4,
    "development": 3,
    "qa_testing": 2,
    "ready_for_deploy": None
}

# Insert Seed Data (apenas se o banco estiver vazio)
def init_seed_data():
    if db.ticket_count() > 0:
        return  # Banco já possui dados, não sobrescrever

    seed_tickets = [
        Ticket(
            id="104",
            title="Redefinir container e esquemas do banco de dados de dev",
            description="O container do banco de dados PostgreSQL de desenvolvimento local está corrompido após a execução de um script de migração de esquema problemático. É necessário redefinir o banco, aplicar as migrações corretas e semear os dados de teste padrão.",
            type="Patch",
            class_of_service="Standard",
            lane="to_do",
            assignee="AI Agent",
            created_at=time.time() - 3600 * 2,
            updated_at=time.time() - 3600 * 2,
            policies=TicketPolicy(code_coverage=100, doc_link="http://kb/local-db", qa_approved=True, docker_build_test=True),
            ai_summary="O container de DB local corrompido requer redefinição de esquema, aplicação correta de migrações e semeadura de dados de teste.",
            chat_logs=[
                "Dev: 'Ei, executei a migração 043 mas ela falhou pela metade, agora o banco está travado.'",
                "Ops: 'O container está rodando?'",
                "Dev: 'Sim, mas precisamos redefinir os esquemas. Não tenho acesso direto de root no Docker deste servidor.'",
                "AI Agent: 'Posso disparar o agente db_reset_agent para executar esta tarefa com segurança em um sandbox.'"
            ],
            error_logs="FATAL: banco de dados 'dev_db' bloqueado por transação ativa. Lock adquirido em 2026-07-15 19:40:12 UTC."
        ),
        Ticket(
            id="102",
            title="Provisionar bucket de staging AWS S3 para assets de mídia",
            description="Criar um novo bucket de staging AWS S3 seguro para hospedar imagens estáticas de campanha. Habilitar leitura pública para pastas específicas e garantir bloqueio estrito de escrita via IAM.",
            type="Feature",
            class_of_service="Fixed Date",
            lane="refinement",
            assignee="AI Agent",
            created_at=time.time() - 3600 * 5,
            updated_at=time.time() - 3600 * 5,
            policies=TicketPolicy(code_coverage=None, doc_link=None, qa_approved=False, docker_build_test=False),
            ai_summary="Provisionar bucket AWS S3 de staging seguro para assets da campanha, contendo diretórios públicos e permissões restritas de escrita via IAM."
        ),
        Ticket(
            id="101",
            title="Timeout de conexão do PostgreSQL local na suíte de testes de integração",
            description="O executor de testes de integração falha de forma intermitente com timeout ao tentar se comunicar com o container PostgreSQL. Logs indicam timeout de conexão de socket na porta do host 5432.",
            type="Bug",
            class_of_service="Standard",
            lane="development",
            assignee="Sarah Lin",
            created_at=time.time() - 3600 * 12,
            updated_at=time.time() - 3600 * 10,
            policies=TicketPolicy(code_coverage=65, doc_link="", qa_approved=False, docker_build_test=False),
            ai_summary="Timeouts de conexão de socket na porta 5432 durante o link dos testes de integração com o container local do PostgreSQL."
        ),
        Ticket(
            id="110",
            title="Incidente P1: Portal Web de Produção retornando 502 Bad Gateway",
            description="Incidente Crítico: O portal principal de produção está retornando erros 502 Bad Gateway. Forte impacto nos clientes. Gargalo identificado no controlador de ingress nginx. Failover ou rollback imediato.",
            type="Incident",
            class_of_service="Expedite",
            lane="development",
            assignee="David K.",
            created_at=time.time() - 600,
            updated_at=time.time() - 300,
            policies=TicketPolicy(code_coverage=95, doc_link="http://kb/prod-failover", qa_approved=True, docker_build_test=True),
            ai_summary="Portal web de produção inoperante com 502 Bad Gateway. Controlador Ingress mostra timeout de socket. Requer failover imediato."
        ),
        Ticket(
            id="90",
            title="Refatorar middleware de autenticação para suportar tokens OAuth2",
            description="Limpar a lógica obsoleta de validação de tokens JWT no arquivo auth.py e integrar os novos endpoints de introspecção OAuth2.",
            type="Bug",
            class_of_service="Intangible",
            lane="development",
            assignee="Lucas M.",
            created_at=time.time() - 3600 * 48,
            updated_at=time.time() - 3600 * 24,
            policies=TicketPolicy(code_coverage=85, doc_link="http://kb/auth", qa_approved=True, docker_build_test=False),
            ai_summary="Limpeza de código legado JWT; implementação de fluxo padrão de introspecção do protocolo OAuth2."
        )
    ]
    for t in seed_tickets:
        ticket_dict = t.model_dump()
        # Converter policies de objeto para dict
        if hasattr(ticket_dict.get("policies", None), "__dict__"):
            ticket_dict["policies"] = ticket_dict["policies"].__dict__
        db.insert_ticket(ticket_dict)

# Inicializar banco de dados e seed
db.init_db()
init_seed_data()


# Helper function to recalculate metrics with noise & events
def get_current_metrics():
    # Add a slight random noise to simulate live metrics
    noise_df = random.uniform(-0.1, 0.1)
    noise_ltfc = random.uniform(-0.5, 0.5)
    noise_cfr = random.uniform(-0.05, 0.05)
    noise_mttr = random.uniform(-0.2, 0.2)
    noise_frt = random.uniform(-0.3, 0.3)
    noise_csat = random.uniform(-0.1, 0.1)

    # Check if there is an active Expedite ticket in To Do, Refinement, Development, or QA
    active_expedites = db.count_expedite_active()
    
    adjusted_metrics = METRICS.copy()
    if active_expedites > 0:
        # P1 Incident actively running damages KPIs
        adjusted_metrics["mean_time_to_restore"] += 5.0 * active_expedites
        adjusted_metrics["change_failure_rate"] += 1.5 * active_expedites
        adjusted_metrics["customer_satisfaction"] -= 2.0 * active_expedites
        adjusted_metrics["first_response_time"] += 4.0 * active_expedites

    return {
        "deployment_frequency": round(max(1.0, adjusted_metrics["deployment_frequency"] + noise_df), 1),
        "lead_time_for_changes": round(max(5.0, adjusted_metrics["lead_time_for_changes"] + noise_ltfc), 1),
        "change_failure_rate": round(max(0.1, min(100.0, adjusted_metrics["change_failure_rate"] + noise_cfr)), 2),
        "mean_time_to_restore": round(max(2.0, adjusted_metrics["mean_time_to_restore"] + noise_mttr), 1),
        "first_response_time": round(max(1.0, adjusted_metrics["first_response_time"] + noise_frt), 1),
        "first_call_resolution": round(max(50.0, min(100.0, adjusted_metrics["first_call_resolution"])), 1),
        "self_service_adoption": round(max(10.0, min(100.0, adjusted_metrics["self_service_adoption"])), 1),
        "customer_satisfaction": round(max(80.0, min(100.0, adjusted_metrics["customer_satisfaction"] + noise_csat)), 2),
    }

# API REST Endpoints

@app.get("/api/tickets")
def get_tickets():
    return db.get_all_tickets()

@app.post("/api/tickets")
def create_ticket(ticket_in: TicketCreate):
    t_id = str(random.randint(111, 999))
    while db.get_ticket(t_id) is not None:
        t_id = str(random.randint(111, 999))
    
    # Simple Triage & Auto-Categorization when creating a ticket
    ai_summary = f"Auto-triaged: {ticket_in.title}. Primary category assigned based on context."
    
    # Initialize policies based on type
    policies = {
        "code_coverage": 0 if ticket_in.type in ["Bug", "Feature"] else None,
        "doc_link": "" if ticket_in.type in ["Bug", "Feature"] else None,
        "qa_approved": False,
        "docker_build_test": False
    }

    ticket_dict = {
        "id": t_id,
        "title": ticket_in.title,
        "description": ticket_in.description,
        "type": ticket_in.type,
        "class_of_service": ticket_in.class_of_service,
        "lane": ticket_in.lane or "to_do",
        "assignee": ticket_in.assignee,
        "created_at": time.time(),
        "updated_at": time.time(),
        "lead_time": None,
        "wip_limit_exceeded": False,
        "policies": policies,
        "ai_summary": ai_summary,
        "chat_logs": [f"System: 'Ticket opened by user. Assigned to {ticket_in.assignee}.'"],
        "error_logs": ""
    }
    
    # Adjust baseline metrics based on COS
    if ticket_in.class_of_service == "Expedite":
        METRICS["change_failure_rate"] += 0.5
    
    db.insert_ticket(ticket_dict)
    return ticket_dict

@app.put("/api/tickets/{ticket_id}/policies")
def update_ticket_policies(ticket_id: str, pol: PolicyUpdateRequest):
    ticket = db.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    policies = ticket.get("policies", {})
    if pol.code_coverage is not None:
        policies["code_coverage"] = pol.code_coverage
    if pol.doc_link is not None:
        policies["doc_link"] = pol.doc_link
    if pol.qa_approved is not None:
        policies["qa_approved"] = pol.qa_approved
    if pol.docker_build_test is not None:
        policies["docker_build_test"] = pol.docker_build_test
        
    db.update_ticket(ticket_id, {"policies": policies, "updated_at": time.time()})
    return db.get_ticket(ticket_id)

@app.put("/api/tickets/{ticket_id}/move")
def move_ticket(ticket_id: str, target_lane: str):
    ticket = db.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if target_lane not in WIP_LIMITS:
        raise HTTPException(status_code=400, detail="Invalid target lane")
    
    source_lane = ticket["lane"]
    
    if source_lane == target_lane:
        return ticket

    # 1. Check WIP Limit (Expedite bypasses WIP limits entirely!)
    limit = WIP_LIMITS[target_lane]
    if limit is not None and ticket["class_of_service"] != "Expedite":
        # Calculate current count in target lane
        current_count = db.count_tickets_in_lane(target_lane)
        if current_count >= limit:
            raise HTTPException(
                status_code=400,
                detail=f"WIP Limit Met in lane '{target_lane}'. Hard limit of {limit} cards. Resolve existing bottlenecks first!"
            )

    # 2. Check Explicit Exit Criteria / Process Policies
    policies = ticket.get("policies", {})
    # Moving from Development to QA/Testing
    if source_lane == "development" and target_lane == "qa_testing":
        # Bug or Feature requires documentation link and code coverage >= 80%
        if ticket["type"] in ["Bug", "Feature"] and ticket["class_of_service"] != "Expedite":
            coverage = policies.get("code_coverage") or 0
            doc = policies.get("doc_link") or ""
            if coverage < 80:
                raise HTTPException(
                    status_code=400,
                    detail=f"Critério de Saída Violado: Mover de Desenvolvimento para QA exige cobertura de código >= 80% (Atual: {coverage}%)."
                )
            if not doc.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Critério de Saída Violado: Mover de Desenvolvimento para QA exige um link de documentação válido."
                )

    # Moving to Ready for Deploy (from QA/Testing)
    if source_lane == "qa_testing" and target_lane == "ready_for_deploy":
        if ticket["class_of_service"] != "Expedite":
            if not policies.get("qa_approved"):
                raise HTTPException(
                    status_code=400,
                    detail="Critério de Saída Violado: Aprovação de QA é obrigatória antes de implantar."
                )
            if not policies.get("docker_build_test"):
                raise HTTPException(
                    status_code=400,
                    detail="Critério de Saída Violado: O teste de verificação e build do Docker deve passar antes de implantar."
                )

    # If we made it here, apply the move
    updated_at = time.time()
    update_fields = {"lane": target_lane, "updated_at": updated_at}
    
    # If ticket was moved to Ready for Deploy, calculate lead time and adjust metrics
    if target_lane == "ready_for_deploy":
        lead_time = (updated_at - ticket["created_at"]) / 60.0  # in minutes
        update_fields["lead_time"] = lead_time
        
        # Adjust DORA metrics positively
        METRICS["deployment_frequency"] += 0.2
        # Average the lead time into LTFC
        METRICS["lead_time_for_changes"] = (METRICS["lead_time_for_changes"] * 9 + lead_time) / 10
        if ticket["class_of_service"] == "Expedite":
            # Resolving P1 restores service
            METRICS["mean_time_to_restore"] = (METRICS["mean_time_to_restore"] * 4 + 10.0) / 5
            METRICS["customer_satisfaction"] = min(100.0, METRICS["customer_satisfaction"] + 1.2)
            
    db.update_ticket(ticket_id, update_fields)
    return db.get_ticket(ticket_id)

@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: str):
    ticket = db.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete_ticket(ticket_id)
    return {"status": "success", "message": f"Ticket {ticket_id} deleted."}

# DORA and KPI Metrics
@app.get("/api/metrics")
def get_metrics_api():
    return get_current_metrics()

@app.post("/api/metrics/reset")
def reset_metrics():
    global METRICS
    METRICS = {
        "deployment_frequency": 8.4,
        "lead_time_for_changes": 42.0,
        "change_failure_rate": 4.2,
        "mean_time_to_restore": 24.5,
        "first_response_time": 18.0,
        "first_call_resolution": 78.5,
        "self_service_adoption": 52.1,
        "customer_satisfaction": 96.2,
    }
    return {"status": "success", "metrics": METRICS}

# Agentic AI Engine Endpoints

@app.post("/api/ai/triage")
def ai_triage(req: TriageRequest):
    text = req.text.lower()
    
    # Run simple rule-based text classification LLM simulation
    if "outage" in text or "down" in text or "502" in text or "critical" in text or "fatal error" in text or "fora do ar" in text or "queda" in text or "crítico" in text:
        ticket_type = "Incident"
        class_of_service = "Expedite"
        squad = "Squad de SRE e Infraestrutura Core"
        impact = "Alta"
    elif "bug" in text or "error" in text or "fails" in text or "broken" in text or "erro" in text or "falha" in text or "quebrado" in text:
        ticket_type = "Bug"
        class_of_service = "Standard"
        squad = "Squad de Desenvolvimento de Aplicação"
        impact = "Média"
    elif "provision" in text or "s3" in text or "database" in text or "setup" in text or "criar" in text or "banco" in text:
        ticket_type = "Feature"
        class_of_service = "Fixed Date"
        squad = "Squad de Engenharia de Plataforma (DevOps)"
        impact = "Média"
    else:
        ticket_type = "Feature"
        class_of_service = "Standard"
        squad = "Squad de Backlog do Produto"
        impact = "Baixa"

    return {
        "type": ticket_type,
        "class_of_service": class_of_service,
        "squad": squad,
        "impact": impact,
        "confidence": 0.94,
        "reasoning": f"Gatilhos identificados ('{', '.join([w for w in ['outage', 'down', '502', 'bug', 'error', 'provision', 's3', 'fora do ar', 'queda', 'erro', 'falha'] if w in text]) or 'palavras-chave padrão'}) mapeando o contexto da mensagem diretamente para {ticket_type} na equipe {squad}."
    }

@app.post("/api/ai/summarize/{ticket_id}")
def ai_summarize(ticket_id: str):
    t = db.get_ticket(ticket_id)
    if t is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # 3-bullet summary based on ticket content
    bullets = [
        f"**Ação Primária Necessária**: {t['title']}.",
        f"**Contexto Atual**: Chamado atribuído a {t['assignee']} na coluna '{t['lane'].replace('_', ' ').title()}'.",
        f"**Logs / Causa Raiz**: {t['description'][:80]}..."
    ]
    
    if t.get("error_logs"):
        bullets[2] = f"**Detalhes de Falha do Sistema**: Erro crítico detectado: `{t['error_logs']}`"
    
    ai_summary = "\n".join(bullets)
    db.update_ticket(ticket_id, {"ai_summary": ai_summary})
    return {"summary": ai_summary}

class GeminiChatRequest(BaseModel):
    message: str
    api_key: str
    model: str

@app.post("/api/ai/gemini-chat")
async def gemini_chat(req: GeminiChatRequest):
    if not req.api_key.strip():
        raise HTTPException(status_code=400, detail="Gemini API Key não fornecida.")
        
    # Build context from current operational status
    system_context = f"""Você é o Engenheiro Especialista em Processos do MVP, analisando o ecossistema ITSM e DevOps da Stone.

MÉTRICAS ATUAIS:
- Frequência de Deploy: {METRICS['deployment_frequency']}/semana
- Lead Time para Mudanças: {METRICS['lead_time_for_changes']} minutos
- Taxa de Falha de Mudanças: {METRICS['change_failure_rate']}%
- MTTR (Tempo Médio de Recuperação): {METRICS['mean_time_to_restore']} minutos
- Primeiro Tempo de Resposta: {METRICS['first_response_time']} segundos
- Resolução no Primeiro Contato (FCR): {METRICS['first_call_resolution']}%
- Adoção de Autoatendimento: {METRICS['self_service_adoption']}%
- Satisfação do Cliente (CSAT): {METRICS['customer_satisfaction']}%

CHAMADOS NO QUADRO KANBAN:
"""
    all_tickets = db.get_all_tickets()
    for t in all_tickets:
        system_context += f"- [#{t['id']}] {t['title']} (Coluna: {t['lane']}, Tipo: {t['type']}, Classe de Serviço: {t['class_of_service']}, Atribuído a: {t['assignee']})\n  Descrição: {t['description']}\n"
        
    # Parse model identifier into base model name + thinking budget
    # Format: "gemini-{version}-{variant}-{thinking_level}" or "gemini-{version}-{variant}"
    thinking_budgets = {
        "high": 24576,
        "medium": 8192,
        "low": 2048,
        "none": 0,
    }
    
    parts = req.model.rsplit("-", 1)
    thinking_level = parts[-1] if parts[-1] in thinking_budgets else None
    base_model_key = parts[0] if thinking_level else req.model
    
    model_map = {
        "gemini-3.5-pro": "gemini-3.5-pro",
        "gemini-3.5-flash": "gemini-3.5-flash",
        "gemini-3.1-pro": "gemini-3.1-pro",
        "gemini-3.1-flash-lite": "gemini-3.1-flash-lite",
    }
    actual_model = model_map.get(base_model_key, base_model_key)
    
    # Call Gemini API
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{actual_model}:generateContent?key={req.api_key}"
    
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_context}]
        },
        "contents": [
            {
                "parts": [
                    {"text": f"{req.message}\nResponda em português de forma concisa e profissional, propondo soluções pragmáticas para os problemas de fluxo e SLA apresentados."}
                ]
            }
        ],
        "generationConfig": {}
    }
    
    # Add thinking config if applicable
    if thinking_level and thinking_level in thinking_budgets:
        budget = thinking_budgets[thinking_level]
        if budget > 0:
            payload["generationConfig"]["thinkingConfig"] = {
                "thinkingBudget": budget
            }
        else:
            payload["generationConfig"]["thinkingConfig"] = {
                "thinkingBudget": 0
            }
    
    # Clean up empty generationConfig
    if not payload["generationConfig"]:
        del payload["generationConfig"]
    
    try:
        req_data = json.dumps(payload).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        url_req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        
        # Executa requisição síncrona em threadpool do asyncio para não travar a aplicação
        def run_request():
            with urllib.request.urlopen(url_req, timeout=20) as response:
                return response.read().decode("utf-8")
                
        loop = asyncio.get_event_loop()
        res_body = await loop.run_in_executor(None, run_request)
        
        res_json = json.loads(res_body)
        candidates = res_json.get("candidates", [])
        if candidates:
            text = candidates[0]["content"]["parts"][0]["text"]
            # Salvar conversa no histórico SQLite
            db.insert_chat(req.message, text, req.model)
            return {"reply": text}
        else:
            reply = "Nenhum conteúdo retornado pelo modelo Gemini."
            db.insert_chat(req.message, reply, req.model)
            return {"reply": reply}
            
    except urllib.error.HTTPError as e:
        error_detail = e.read().decode("utf-8")
        try:
            err_json = json.loads(error_detail)
            msg = err_json.get("error", {}).get("message", error_detail)
        except Exception:
            msg = error_detail
        return {"reply": f"Erro da API do Gemini (HTTP {e.code}): {msg}"}
    except Exception as e:
        return {"reply": f"Erro de comunicação com a API: {str(e)}"}

# Chat History Endpoints
@app.get("/api/ai/chat-history")
def get_chat_history():
    return db.get_all_chats()

@app.delete("/api/ai/chat-history")
def clear_chat_history():
    db.clear_chats()
    return {"status": "success", "message": "Histórico de conversas limpo."}

# Knowledge Base Semantic Vector Search & Gap Analysis
@app.post("/api/ai/kb/search")
def kb_search(query_in: SearchQuery):
    query = query_in.query.lower().strip()
    
    results = []
    
    # Perform mock semantic searches using keyword matches
    for article in KNOWLEDGE_BASE:
        matched_sections = []
        for sect in article["sections"]:
            # check if query words intersect with content
            words = query.replace("?", "").replace(",", "").split()
            match_score = 0
            for w in words:
                if len(w) > 3 and (w in sect["content"].lower() or w in sect["subtitle"].lower() or w in article["title"].lower()):
                    match_score += 1
            
            if match_score > 0:
                # Highlight query words in the snippet
                snippet = sect["content"]
                for w in words:
                    if len(w) > 3:
                        # Case insensitive highlight
                        idx = snippet.lower().find(w)
                        if idx != -1:
                            # Simple replacement (first occurrence)
                            original_term = snippet[idx:idx+len(w)]
                            snippet = snippet.replace(original_term, f"<mark>{original_term}</mark>")
                
                matched_sections.append({
                    "subtitle": sect["subtitle"],
                    "content": snippet,
                    "score": round(0.5 + (match_score / (len(words) + 1)), 2)
                })
        
        if matched_sections:
            results.append({
                "id": article["id"],
                "title": article["title"],
                "sections": matched_sections
            })
            
    # Sort by score descending
    for r in results:
        r["sections"] = sorted(r["sections"], key=lambda x: x["score"], reverse=True)
        
    # Gap Analysis: If 0 results, generate a draft KB article automatically!
    if not results:
        draft_id = f"draft_{random.randint(100, 999)}"
        title_words = [w.capitalize() for w in query.split()[:5]]
        title = f"Guia de Solução de Problemas: {' '.join(title_words)}"
        if not title:
            title = "Como Resolver Problemas de Ingress e Associações de Rede"
            
        content = f"""# {title}

## Visão Geral do Problema
Uma busca por `{query}` retornou zero resultados na Base de Conhecimento do MVP. Uma auditoria assistida por IA sinalizou essa lacuna de documentação e rascunhou este guia de resolução.

## Possíveis Causas Raiz
1. **Incompatibilidade de Rede**: Os serviços estão executando em redes virtuais diferentes no ambiente de container Docker.
2. **Configuração de Ingress Inexistente**: Regras de roteamento de segurança ou anotações Ingress estão limitando a conectividade de rede.
3. **Resolução de Host Inválida**: Loops de desenvolvimento locais estão roteando requisições externamente em vez de mantê-las internas ao container.

## Passos Recomendados para Resolução
1. Verifique a conectividade de rede entre o host e o container executando scripts de teste de ping.
2. Valide os mapeamentos de portas e certifique-se de que políticas de firewall não bloqueiam os canais.
3. Associe drivers de ponte de rede Docker explicitamente.
"""
        # Save to draft DB
        draft_article = {
            "id": draft_id,
            "title": title,
            "query": query,
            "content": content,
            "created_at": time.time()
        }
        db.insert_draft(draft_article)
        
        # Slightly reduce self service metrics temporarily because user had a miss
        METRICS["self_service_adoption"] = max(10.0, METRICS["self_service_adoption"] - 0.5)

    return {
        "results": results,
        "gap_detected": len(results) == 0,
        "draft_created": len(results) == 0
    }

@app.get("/api/ai/kb/drafts")
def get_kb_drafts():
    return db.get_all_drafts()

@app.post("/api/ai/kb/drafts/{draft_id}/approve")
def approve_kb_draft(draft_id: str):
    draft = db.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
        
    # Add to main Knowledge Base
    KNOWLEDGE_BASE.append({
        "id": f"kb_{random.randint(4, 999)}",
        "title": draft["title"],
        "sections": [
            {
                "subtitle": "Visão Geral e Causas",
                "content": f"Resolvendo problemas relacionados a: {draft['query']}. Causas comuns incluem roteamento de container e conflitos em políticas de firewall."
            },
            {
                "subtitle": "Sequência de Ação Recomendada",
                "content": "Realize testes de pacotes de rede e associe configurações do host a pontes de conexão local."
            }
        ]
    })
    
    # Remove from draft
    db.delete_draft(draft_id)
    
    # Bump metrics
    METRICS["self_service_adoption"] = min(100.0, METRICS["self_service_adoption"] + 2.5)
    METRICS["customer_satisfaction"] = min(100.0, METRICS["customer_satisfaction"] + 0.3)
    
    return {"status": "success", "message": "Draft article successfully published to Knowledge Base."}

# Real-time Autonomous Agent SSE Stream Simulator
@app.get("/api/tickets/{ticket_id}/agent/stream")
def stream_agent_run(ticket_id: str):
    ticket = db.get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_title = ticket["title"]
    ticket_created_at = ticket["created_at"]
    
    async def log_generator():
        # Setup specific tool scripts depending on ticket type
        is_db_reset = "db" in ticket_title.lower() or "database" in ticket_title.lower()
        is_s3 = "s3" in ticket_title.lower() or "bucket" in ticket_title.lower()
        
        steps = []
        if is_db_reset:
            steps = [
                ("Validando credenciais do usuário e do workspace do banco de dados...", 10),
                ("Verificando status do container Docker PostgreSQL 'dev_db_postgres'...", 25),
                ("Ação: call_mcp_tool -> docker_mcp_server/restart_container (args: {'container_name': 'dev_db_postgres'})", 40),
                ("Container reiniciado com sucesso. Executando scripts SQL de inicialização...", 55),
                ("Ação: call_mcp_tool -> postgresql_mcp_server/run_query (args: {'query': 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'})", 70),
                ("Esquema do banco de dados recriado. Semeando dados padrão...", 85),
                ("Conectividade do banco validada com sucesso (ping: 8ms). Fechando chamado...", 95),
                ("Sucesso! Banco redefinido. Chamado #104 atualizado para status 'PRONTO'.", 100)
            ]
        elif is_s3:
            steps = [
                ("Validando credenciais IAM e limites de políticas AWS do workspace...", 15),
                ("Verificando se já existe bucket conflitante no namespace 'mvp-dev-assets'...", 30),
                ("Ação: call_mcp_tool -> aws_mcp_server/create_bucket (args: {'bucket_name': 'mvp-dev-assets', 'region': 'us-east-1'})", 50),
                ("Bucket provisionado. Aplicando políticas IAM de segurança de leitura/escrita...", 70),
                ("Ação: call_mcp_tool -> aws_mcp_server/put_bucket_policy (args: {'bucket_name': 'mvp-dev-assets'})", 85),
                ("Resposta do comando de verificação do bucket: HTTP 200 OK.", 95),
                ("Sucesso! Bucket S3 provisionado. Chamado #102 atualizado para status 'PRONTO'.", 100)
            ]
        else:
            steps = [
                ("Lendo contexto do chamado e mapeando arquivos de código relacionados...", 20),
                ("Verificando configurações do workspace e dependências do ambiente...", 40),
                ("Rodando testes automatizados e verificações de diagnósticos de sintaxe...", 60),
                ("Gravando correções de patch na estrutura de arquivos do projeto...", 80),
                ("Verificando se o build passa e critérios de cobertura são atendidos...", 95),
                ("Sucesso! Chamado resolvido pelo agente. Status atualizado para 'PRONTO'.", 100)
            ]
            
        yield f"data: {json.dumps({'message': '🤖 Iniciando Agente Autônomo MVP (MCP Habilitado)...', 'progress': 0})}\n\n"
        await asyncio.sleep(0.8)
        
        for msg, progress in steps:
            yield f"data: {json.dumps({'message': f'⚙️ {msg}', 'progress': progress})}\n\n"
            await asyncio.sleep(1.0)
            
        # At the end of the stream, automatically update ticket status to ready_for_deploy and adjust metrics
        updated_at = time.time()
        lead_time = (updated_at - ticket_created_at) / 60.0
        db.update_ticket(ticket_id, {
            "lane": "ready_for_deploy",
            "updated_at": updated_at,
            "lead_time": lead_time,
            "policies": {"qa_approved": True, "docker_build_test": True, "code_coverage": 100, "doc_link": "http://kb/auto-agent"}
        })
        
        # Positively affect KPIs
        METRICS["self_service_adoption"] = min(100.0, METRICS["self_service_adoption"] + 1.5)
        METRICS["first_response_time"] = max(1.0, (METRICS["first_response_time"] * 6 + 1.2) / 7)
        METRICS["mean_time_to_restore"] = max(2.0, (METRICS["mean_time_to_restore"] * 8 + 2.0) / 9)
        METRICS["deployment_frequency"] += 0.1
        
        yield f"data: {json.dumps({'message': '✅ Execução do Agente concluída. Chamado encerrado.', 'progress': 100, 'done': True})}\n\n"
        
    return StreamingResponse(log_generator(), media_type="text/event-stream")

# Root Redirect to static files
@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")

# Mount Static Files Folder
# Create the static dir if it doesn't exist
import os
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
