---
name: analisar_processos_gemini
description: Instruções e scripts para analisar processos de ITSM e métricas DORA do Antigravity usando a API do Gemini com chave personalizada, seleção de modelo e configuração de thinking budget.
---

# Análise de Processos com Gemini

Esta skill fornece orientações e ferramentas para analisar gargalos de processos de engenharia, filas de suporte ITSM e métricas DORA usando modelos da família Gemini por meio de chamadas diretas de API.

## Modelos Disponíveis (Julho 2026)

| Família | API Model ID | Caso de Uso |
|---------|-------------|-------------|
| **Gemini 3.5 Pro** | `gemini-3.5-pro` | Raciocínio de fronteira, workflows agênticos complexos, correlações DORA avançadas |
| **Gemini 3.5 Flash** | `gemini-3.5-flash` | Rápido e eficiente para triagem de rotina e análise de fluxo |
| **Gemini 3.1 Pro** | `gemini-3.1-pro` | Alta precisão, ideal para planos de ação detalhados e análise profunda |
| **Gemini 3.1 Flash Lite** | `gemini-3.1-flash-lite` | Alto volume, tarefas econômicas e batch processing |

### Configuração de Thinking Budget

Cada modelo (exceto Flash Lite) suporta níveis de pensamento que controlam a profundidade da análise:

- **High** (24.576 tokens): Análise profunda com raciocínio extenso
- **Medium** (8.192 tokens): Equilíbrio entre qualidade e velocidade
- **Low** (2.048 tokens): Respostas rápidas e diretas
- **None** (0 tokens): Sem etapa de pensamento, resposta direta

---

## Funcionalidades de Análise

O ecossistema Antigravity integra um chat de análise que se comunica diretamente com a API do Gemini utilizando a chave de API fornecida pelo usuário (`api_key`).

### Variáveis Contextuais Disponíveis para Análise:
1. **Quadro Kanban**: Estado das colunas, contagem de chamados, limites de WIP excedidos.
2. **Histórico de Chamados**: Detalhes técnicos, tipos de chamados, classes de serviço (prioridades).
3. **Métricas DORA**: Deployment Frequency (DF), Lead Time for Changes (LTFC), Change Failure Rate (CFR), Mean Time to Restore (MTTR).
4. **Acordos de Nível de Serviço (SLAs)**: First Response Time (FRT), First Call Resolution (FCR), Satisfação do Cliente (CSAT).

---

## Como Usar o Chat de Análise

1. No painel lateral da aplicação (aba "Ops Center" ou "Estratégia Stone"), localize a seção **"Análise de Processos via Chat Gemini"**.
2. Cole sua `API Key` do Gemini no campo correspondente (sua chave é mantida localmente em memória).
3. Escolha o modelo desejado no dropdown (organizado por família de modelo):
   - **Gemini 3.5 Pro** — Para análises complexas e correlações DORA avançadas.
   - **Gemini 3.5 Flash** — Para triagem rápida e perguntas operacionais do dia a dia.
   - **Gemini 3.1 Pro** — Para planos de ação detalhados e análise de tendências.
   - **Gemini 3.1 Flash Lite** — Para perguntas simples e alto volume de consultas.
4. Selecione o nível de Thinking Budget adequado (High, Medium, Low, None).
5. Digite sua pergunta sobre o estado atual da operação, por exemplo:
   - *"Quais são os principais gargalos no fluxo do Kanban hoje?"*
   - *"Sugira um plano para reduzir a Taxa de Falha de Mudanças com base nos chamados concluídos."*
   - *"Analise o impacto do chamado expedido P1 nas outras tarefas."*

---

## Integração Técnica (Backend)

O endpoint de backend correspondente está mapeado em `/api/ai/gemini-chat`. Ele recebe:
- A pergunta do usuário (`message`).
- A chave de API do Gemini (`api_key`).
- O modelo selecionado (`model`) — no formato `gemini-{versão}-{variante}-{thinking_level}`.

### Processamento do Backend:
1. **Parsing do Model ID**: O identificador é dividido em modelo base + nível de thinking.
2. **System Instruction**: As métricas atuais e lista de chamados são injetadas como `systemInstruction` (separado do conteúdo do usuário).
3. **Thinking Config**: O `thinkingBudget` é configurado no `generationConfig` da requisição conforme o nível selecionado.
4. **Resposta**: Retornada em bloco JSON via `candidates[0].content.parts[0].text`.
