---
name: analisar_processos_gemini
description: Instruções e scripts para analisar processos de ITSM e métricas DORA do Antigravity usando a API do Gemini com chave personalizada e seleção de modelo.
---

# Análise de Processos com Gemini

Esta skill fornece orientações e ferramentas para analisar gargalos de processos de engenharia, filas de suporte ITSM e métricas DORA usando modelos da família Gemini por meio de chamadas diretas de API.

## Funcionalidades de Análise

O ecossistema Antigravity integra um chat de análise que se comunica diretamente com a API do Gemini (ex: `gemini-2.5-flash` ou `gemini-2.5-pro`) utilizando a chave de API fornecida pelo usuário (`api_key`).

### Variáveis Contextuais Disponíveis para Análise:
1. **Quadro Kanban**: Estado das colunas, contagem de chamados, limites de WIP excedidos.
2. **Histórico de Chamados**: Detalhes técnicos, tipos de chamados, classes de serviço (prioridades).
3. **Métricas DORA**: Deployment Frequency (DF), Lead Time for Changes (LTFC), Change Failure Rate (CFR), Mean Time to Restore (MTTR).
4. **Acordos de Nível de Serviço (SLAs)**: First Response Time (FRT), First Call Resolution (FCR), Satisfação do Cliente (CSAT).

---

## Como Usar o Chat de Análise

1. No painel lateral da aplicação (aba "Ops Center" ou "Estratégia Stone"), localize a seção **"Análise de Processos via Chat Gemini"**.
2. Cole sua `API Key` do Gemini no campo correspondente (sua chave é mantida localmente em memória).
3. Escolha o modelo desejado no dropdown:
   - `gemini-2.5-flash` (Rápido e eficiente para triagem de rotina).
   - `gemini-2.5-pro` (Mais inteligente, ideal para correlações DORA complexas e plano de ação).
4. Digite sua pergunta sobre o estado atual da operação, por exemplo:
   - *"Quais são os principais gargalos no fluxo do Kanban hoje?"*
   - *"Sugira um plano para reduzir a Taxa de Falha de Mudanças com base nos chamados concluídos."*
   - *"Analise o impacto do chamado expedido P1 nas outras tarefas."*

---

## Integração Técnica (Backend)

O endpoint de backend correspondente está mapeado em `/api/ai/gemini-chat`. Ele recebe:
- A pergunta do usuário (`message`).
- A chave de API do Gemini (`api_key`).
- O modelo selecionado (`model`).

Ele injeta as métricas atuais e a lista de chamados como contexto de sistema (system prompt) e retorna a resposta por streaming ou em bloco JSON.
