import urllib.request
import urllib.error
import json
import sys
import time

BASE_URL = "http://127.0.0.1:8000"

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    if data is not None and isinstance(data, dict):
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            status_code = resp.status
            body = resp.read().decode("utf-8")
            return status_code, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_data = json.loads(body)
        except Exception:
            err_data = body
        return e.code, err_data
    except Exception as e:
        print(f"Erro ao conectar com {url}: {e}")
        sys.exit(1)

def print_result(step_name, success, detail=""):
    status = "✅ PASSOU" if success else "❌ FALHOU"
    print(f"[{status}] {step_name} {f'({detail})' if detail else ''}")
    if not success:
        sys.exit(1)

def main():
    print("🚀 Iniciando Suíte de Testes de Integração Avançados (Stone ITSM SQLite)...")
    print(f"Conectando ao backend em: {BASE_URL}\n")
    
    # ────────────────────────────────────────────────────────
    # 1. SETUP / LIMPEZA
    # ────────────────────────────────────────────────────────
    # Resetar métricas
    status, _ = make_request(f"{BASE_URL}/api/metrics/reset", "POST")
    print_result("Reset de Métricas", status == 200)

    # Deletar todos os tickets existentes para começar com o board limpo
    status, tickets = make_request(f"{BASE_URL}/api/tickets")
    for t in tickets:
        make_request(f"{BASE_URL}/api/tickets/{t['id']}", "DELETE")
    
    status, tickets = make_request(f"{BASE_URL}/api/tickets")
    print_result("Limpeza do Board Kanban", status == 200 and len(tickets) == 0, f"Total tickets restantes: {len(tickets)}")

    # ────────────────────────────────────────────────────────
    # 2. TESTE DE CRIAÇÃO E PERSISTÊNCIA DE TICKETS
    # ────────────────────────────────────────────────────────
    # Criar chamado padrão (Standard) na coluna development
    ticket_dev = {
        "title": "Bug no componente Sidebar",
        "description": "Sidebar está cobrindo elementos principais da tela quando recolhida.",
        "type": "Bug",
        "class_of_service": "Standard",
        "assignee": "Sarah Lin",
        "lane": "development"
    }
    status, created_dev = make_request(f"{BASE_URL}/api/tickets", "POST", ticket_dev)
    print_result("Criar ticket Standard em development", status == 200 and created_dev["lane"] == "development", f"ID: {created_dev['id']}")
    bug_id = created_dev["id"]

    # Criar 2 chamados padrão diretamente em qa_testing para atingir o limite WIP (WIP = 2)
    ticket_qa1 = {
        "title": "Validar endpoints de pagamento",
        "description": "Executar testes de sanidade nas novas rotas de pagamentos do gateway.",
        "type": "Feature",
        "class_of_service": "Standard",
        "assignee": "David K.",
        "lane": "qa_testing"
    }
    status, created_qa1 = make_request(f"{BASE_URL}/api/tickets", "POST", ticket_qa1)
    qa1_id = created_qa1["id"]

    ticket_qa2 = {
        "title": "Teste de regressão no checkout",
        "description": "Validar fluxo completo de checkout com múltiplos cartões.",
        "type": "Feature",
        "class_of_service": "Standard",
        "assignee": "Lucas M.",
        "lane": "qa_testing"
    }
    status, created_qa2 = make_request(f"{BASE_URL}/api/tickets", "POST", ticket_qa2)
    qa2_id = created_qa2["id"]
    
    print_result("Encher coluna qa_testing com 2 tickets (WIP limite)", status == 200)

    # ────────────────────────────────────────────────────────
    # 3. VALIDAÇÃO DE WIP LIMIT (BLOQUEIO E BYPASS)
    # ────────────────────────────────────────────────────────
    # Tentar mover o chamado bug_id para qa_testing (que já tem 2 itens)
    # Primeiro precisamos configurar políticas válidas para passar pelo critério de saída Dev->QA
    policy_update = {"code_coverage": 85, "doc_link": "http://kb/sidebar-fix"}
    make_request(f"{BASE_URL}/api/tickets/{bug_id}/policies", "PUT", policy_update)

    status, err_response = make_request(f"{BASE_URL}/api/tickets/{bug_id}/move?target_lane=qa_testing", "PUT")
    is_blocked = (status == 400) and ("WIP Limit Met" in err_response.get("detail", ""))
    print_result("Bloqueio de movimento por WIP Limit cheio em qa_testing", is_blocked, f"Status: {status}, Msg: {err_response.get('detail', '') if isinstance(err_response, dict) else err_response}")

    # Criar chamado crítico (Expedite) em development
    ticket_expedite = {
        "title": "Queda do Servidor de Autenticação",
        "description": "Erros 500 intermitentes no microsserviço de login. Clientes bloqueados.",
        "type": "Incident",
        "class_of_service": "Expedite",
        "assignee": "David K.",
        "lane": "development"
    }
    status, created_expedite = make_request(f"{BASE_URL}/api/tickets", "POST", ticket_expedite)
    expedite_id = created_expedite["id"]
    print_result("Criar ticket Expedite em development", status == 200, f"ID: {expedite_id}")

    # Mover chamado crítico para qa_testing (deve bypassar o WIP limit)
    status, moved_expedite = make_request(f"{BASE_URL}/api/tickets/{expedite_id}/move?target_lane=qa_testing", "PUT")
    is_bypass_ok = (status == 200) and (moved_expedite["lane"] == "qa_testing")
    print_result("Bypass do WIP Limit por chamado Expedite", is_bypass_ok)

    # ────────────────────────────────────────────────────────
    # 4. VALIDAÇÃO DOS CRITÉRIOS DE SAÍDA (EXIT CRITERIA)
    # ────────────────────────────────────────────────────────
    # Criar Bug sem cobertura e sem doc
    ticket_unsafe = {
        "title": "Bug na API de conciliação",
        "description": "Valores batendo incorretamente nas transações noturnas.",
        "type": "Bug",
        "class_of_service": "Standard",
        "assignee": "Sarah Lin",
        "lane": "development"
    }
    status, created_unsafe = make_request(f"{BASE_URL}/api/tickets", "POST", ticket_unsafe)
    unsafe_id = created_unsafe["id"]

    # Mover para QA sem cumprir critérios de saída (cobertura < 80% e sem doc)
    # Para testar isso, primeiro liberamos espaço em QA deletando os dois tickets standard que encheram a coluna
    make_request(f"{BASE_URL}/api/tickets/{qa1_id}", "DELETE")
    make_request(f"{BASE_URL}/api/tickets/{qa2_id}", "DELETE")
    
    status, err_resp = make_request(f"{BASE_URL}/api/tickets/{unsafe_id}/move?target_lane=qa_testing", "PUT")
    is_exit_crit_blocked = (status == 400) and ("Critério de Saída Violado" in err_resp.get("detail", ""))
    print_result("Bloqueio de transação Dev -> QA por falta de cobertura/documentação", is_exit_crit_blocked, f"Msg: {err_resp.get('detail', '') if isinstance(err_resp, dict) else err_resp}")

    # Atualizar políticas para satisfazer Dev -> QA
    policy_ok = {"code_coverage": 90, "doc_link": "http://kb/conciliacao"}
    make_request(f"{BASE_URL}/api/tickets/{unsafe_id}/policies", "PUT", policy_ok)
    
    status, moved_safe = make_request(f"{BASE_URL}/api/tickets/{unsafe_id}/move?target_lane=qa_testing", "PUT")
    print_result("Sucesso na transação Dev -> QA após satisfazer critérios", status == 200 and moved_safe["lane"] == "qa_testing")

    # Tentar mover para ready_for_deploy sem aprovação de QA/Docker build
    status, err_deploy = make_request(f"{BASE_URL}/api/tickets/{unsafe_id}/move?target_lane=ready_for_deploy", "PUT")
    is_deploy_blocked = (status == 400) and ("Aprovação de QA é obrigatória" in err_deploy.get("detail", ""))
    print_result("Bloqueio de transação QA -> Deploy sem aprovação/build", is_deploy_blocked, f"Msg: {err_deploy.get('detail', '') if isinstance(err_deploy, dict) else err_deploy}")

    # ────────────────────────────────────────────────────────
    # 5. TESTE DE EXECUÇÃO DO AGENTE AUTÔNOMO (SSE)
    # ────────────────────────────────────────────────────────
    print("Iniciando simulação do Agente Autônomo via SSE...")
    url_stream = f"{BASE_URL}/api/tickets/{unsafe_id}/agent/stream"
    req_stream = urllib.request.Request(url_stream, method="GET")
    
    logs_received = []
    try:
        with urllib.request.urlopen(req_stream, timeout=10) as resp:
            for line in resp:
                line_str = line.decode("utf-8").strip()
                if line_str.startswith("data:"):
                    event_data = json.loads(line_str[5:].strip())
                    logs_received.append(event_data)
                    print(f"  [SSE Event] {event_data.get('progress')}% - {event_data.get('message')}")
    except Exception as e:
        print(f"Erro ao ler SSE stream: {e}")
        sys.exit(1)

    print_result("Consumo completo do SSE Stream do Agente", len(logs_received) > 0 and logs_received[-1].get("done", False))

    # Verificar se o agente moveu o ticket para ready_for_deploy e aprovou QA/Docker
    status, tickets = make_request(f"{BASE_URL}/api/tickets")
    ticket_final = next((t for t in tickets if t["id"] == unsafe_id), None)
    is_completed_by_agent = (
        status == 200 and 
        ticket_final is not None and
        ticket_final["lane"] == "ready_for_deploy" and 
        ticket_final["policies"]["qa_approved"] == True and 
        ticket_final["policies"]["docker_build_test"] == True
    )
    print_result("Validação de ações do Agente no ticket e transição automática", is_completed_by_agent)

    # ────────────────────────────────────────────────────────
    # 6. VALIDAÇÃO DE SEGURANÇA DO CHAT GEMINI
    # ────────────────────────────────────────────────────────
    # Chave vazia
    chat_req_empty = {"message": "Olá", "api_key": "   ", "model": "gemini-3.5-flash"}
    status, err_chat = make_request(f"{BASE_URL}/api/ai/gemini-chat", "POST", chat_req_empty)
    is_chat_secured = (status == 400) and ("API Key não fornecida" in err_chat.get("detail", ""))
    print_result("Validação de Segurança do Chat (Chave de API vazia)", is_chat_secured)

    # ────────────────────────────────────────────────────────
    # 7. HISTÓRICO DO CHAT E PERSISTÊNCIA SQLITE
    # ────────────────────────────────────────────────────────
    # Limpar histórico
    status, clean_history = make_request(f"{BASE_URL}/api/ai/chat-history", "DELETE")
    print_result("Limpar histórico do chat no SQLite", status == 200)
    
    # Verificar histórico vazio
    status, history = make_request(f"{BASE_URL}/api/ai/chat-history")
    print_result("Verificar histórico limpo", status == 200 and len(history) == 0)

    print("\n🎉 TODOS OS TESTES DE INTEGRAÇÃO DE BACKEND PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    main()
