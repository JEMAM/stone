# 🚀 Guia Didático: Entendendo a Plataforma Stone (FinOps & ITSM)

Este guia foi desenhado para explicar o funcionamento da plataforma de duas formas:
1. **Para Leigos:** Usando analogias simples do dia a dia.
2. **Para Técnicos:** Explicando exatamente a arquitetura e os fluxos de dados "por trás dos bastidores".

---

## 🏗️ 1. Arquitetura Geral: Como as peças se encaixam?

### 💡 Analogia Simples (O Restaurante)
Pense na plataforma como um restaurante moderno:
*   **O Salão (Next.js - Frontend):** É onde o cliente senta, vê o cardápio bonito, as decorações e faz os pedidos. Ele roda na **porta 3000**.
*   **A Cozinha (FastAPI - Backend):** É onde a comida é preparada, onde os ingredientes são guardados e onde a mágica acontece. Roda na **porta 8000**.
*   **O Garçom (Proxy/Rewrites):** Leva os pedidos do salão para a cozinha de forma invisível. O cliente acha que a comida surge no salão por mágica.

### ⚙️ Por Trás dos Bastidores (Fluxo Técnico)
```
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│     FRONTEND (Next.js :3000)    │               │     BACKEND (FastAPI :8000)     │
│  Interface do Usuário (React)   │               │   Servidor de Dados e Lógica    │
├─────────────────────────────────┤               ├─────────────────────────────────┤
│  • Renderiza o visual           │               │  • Armazena chamados em memória │
│  • Gerencia temas (Dark/Light)  │  ───Proxy───► │  • Calcula métricas em tempo real│
│  • Dispara chamadas de API      │               │  • Integra com a API do Gemini  │
└─────────────────────────────────┘               └─────────────────────────────────┘
```
*   **Proxy Reverso (`next.config.ts`):** O Next.js é configurado para redirecionar qualquer chamada que comece com `/api/*` diretamente para o servidor FastAPI (`http://127.0.0.1:8000/api/*`). Isso evita erros de CORS (compartilhamento de recursos entre portas diferentes) e centraliza as chamadas.
*   **Banco de Dados em Memória (`TICKETS_DB`):** Para manter o sistema rápido e fácil de rodar, o backend usa dicionários Python em memória para salvar os chamados técnicos, reiniciando o estado padrão toda vez que o servidor FastAPI é reiniciado.

---

## 📊 2. Painel Principal: Detalhando as Métricas DORA & ITSM

O painel de controle exibe 8 métricas divididas em duas grandes categorias que ditam a saúde técnica e operacional da Stone. A seguir, detalhamos cada uma delas de forma extremamente didática:

---

### 🚀 Categoria A: Métricas DORA (Eficiência de Engenharia)
*Criadas pelo DevOps Research and Assessment (Google), estas métricas avaliam o desempenho da equipe de tecnologia na entrega e estabilidade do software.*

#### 1. Frequência de Deploy (Deployment Frequency)
*   **O que é:** Mede a constância com que novas modificações e melhorias no sistema são disponibilizadas com segurança para os clientes da Stone.
*   **Como é calculado:** 
    $$\text{Frequência de Deploy} = \frac{\text{Total de deploys bem-sucedidos em Produção}}{\text{Período (semana/mês)}}$$
*   **Classificações do Mercado:**
    *   *Elite (Meta Stone):* Múltiplas vezes por dia (ou > 7 deploys por semana).
    *   *Alto:* Uma vez por semana a uma vez por mês.
    *   *Baixo:* Menos de uma vez a cada seis meses.
*   **Como otimizar:** Reduzir o tamanho dos códigos que são enviados de cada vez (criar pequenas atualizações em vez de acumular meses de código antes de lançar).
*   **Exemplo na Stone:** Em vez de a equipe de maquininhas lançar uma única atualização gigante de firmware por ano, ela lança pequenas melhorias invisíveis todas as semanas.

#### 2. Lead Time de Mudanças (Lead Time for Changes)
*   **O que é:** O tempo que decorre entre o momento em que um desenvolvedor escreve uma linha de código até ela estar efetivamente ativa e sendo usada por um cliente.
*   **Como é calculado:** 
    $$\text{Lead Time} = \text{Data/Hora do Deploy em Produção} - \text{Data/Hora do primeiro commit do código}$$
*   **Classificações do Mercado:**
    *   *Elite (Meta Stone):* Menos de 1 hora (nosso painel marca meta de < 60 min).
    *   *Alto:* Entre 1 dia e 1 semana.
    *   *Baixo:* Mais de 6 meses.
*   **Como otimizar:** Automatizar a aprovação de código e os testes de segurança em uma esteira contínua (CI/CD), evitando que o código dependa de aprovações burocráticas manuais demoradas.
*   **Exemplo na Stone:** Um programador cria um novo botão para a tela do lojista; esse código é testado por robôs e entra no ar em 40 minutos.

#### 3. Taxa de Falha de Mudanças (Change Failure Rate)
*   **O que é:** A porcentagem de deploys em produção que resultam em falhas de sistema, bugs visíveis, lentidão severa ou que precisam de um retorno imediato ao estado anterior (rollback).
*   **Como é calculado:** 
    $$\text{Taxa de Falha} = \left( \frac{\text{Número de deploys que causaram incidentes}}{\text{Total de deploys realizados}} \right) \times 100$$
*   **Classificações do Mercado:**
    *   *Elite (Meta Stone):* Abaixo de 5%.
    *   *Baixo:* Acima de 45%.
*   **Como otimizar:** Fortalecer os testes automáticos (QA) antes de autorizar o deploy. É o que as políticas de saída do Kanban garantem.
*   **Exemplo na Stone:** De 100 atualizações que enviamos para o portal do lojista, no máximo 4 podem apresentar instabilidades que exijam correção.

#### 4. Tempo Médio de Restauração (MTTR - Mean Time to Restore)
*   **O que é:** Quanto tempo, em média, a equipe de tecnologia leva para recuperar e normalizar um serviço após uma falha ou queda total em produção.
*   **Como é calculado:** 
    $$\text{MTTR} = \frac{\text{Tempo total de inatividade acumulado}}{\text{Número de incidentes ocorridos}}$$
*   **Classificações do Mercado:**
    *   *Elite (Meta Stone):* Menos de 30 minutos.
    *   *Baixo:* Mais de 1 semana.
*   **Como otimizar:** Utilizar monitoramento inteligente de servidores e ferramentas de Rollback Automático (desfazer a última ação imediatamente se o sistema detectar uma anomalia).
*   **Exemplo na Stone:** O sistema de consultas de vendas fica lento; o robô de IA detecta o gargalo e reinicia o servidor em menos de 10 minutos.

---

### 💬 Categoria B: Métricas ITSM (Qualidade do Atendimento ao Cliente)
*Focadas em monitorar a rapidez, eficácia e nível de contentamento dos clientes com o suporte operacional da Stone.*

#### 5. Tempo de Primeira Resposta (FRT - First Response Time)
*   **O que é:** O intervalo de tempo medido desde o instante em que o cliente abre um chamado até o momento em que recebe a primeira mensagem de retorno do time de suporte.
*   **Como é calculado:** 
    $$\text{FRT} = \text{Hora do primeiro contato técnico} - \text{Hora de criação do chamado}$$
*   **Meta da Indústria:** **Abaixo de 20 segundos** (para chats ao vivo/atendimento preditivo).
*   **Como otimizar:** Integrar sistemas de triagem automatizada por IA (como as Operações de IA do painel) para responder instantaneamente e encaminhar o chamado para a pessoa certa.
*   **Exemplo na Stone:** O lojista manda mensagem no chat dizendo que a máquina está bloqueada; em 15 segundos ele recebe uma resposta com os primeiros passos.

#### 6. Resolução no Primeiro Contato (FCR - First Call Resolution)
*   **O que é:** A porcentagem de problemas que são completamente solucionados no primeiro contato do cliente, sem necessidade de reaberturas ou encaminhamentos para outras áreas.
*   **Como é calculado:** 
    $$\text{FCR} = \left( \frac{\text{Chamados resolvidos na primeira interação}}{\text{Total de chamados encerrados}} \right) \times 100$$
*   **Meta da Indústria:** **Acima de 75%** (referência de satisfação operacional elevada).
*   **Como otimizar:** Dar autonomia e bases de conhecimento ricas para os atendentes da linha de frente resolverem a maioria das dúvidas de imediato.
*   **Exemplo na Stone:** O lojista entra em contato com dúvida sobre taxas; o atendente consulta a base e resolve a dúvida na hora, sem precisar transferir a ligação.

#### 7. Adoção de Autoatendimento (Self-Service Adoption)
*   **O que é:** Mede a porcentagem de chamados resolvidos sem nenhuma interação humana direta (utilizando robôs, tutoriais ou chatbots).
*   **Como é calculado:** 
    $$\text{Autoatendimento} = \left( \frac{\text{Resoluções autônomas / FAQs consultados com sucesso}}{\text{Total geral de solicitações recebidas}} \right) \times 100$$
*   **Meta da Indústria:** **Acima de 50%**.
*   **Como otimizar:** Manter a base de conhecimento inteligente e atualizada (através do Gap Analysis que cria artigos automáticos quando uma nova dúvida é detectada).
*   **Exemplo na Stone:** O cliente acessa o painel de ajuda e clica em "Trocar senha do app". O próprio sistema guia o lojista e resolve o problema sozinho.

#### 8. Satisfação do Cliente (CSAT - Customer Satisfaction)
*   **O que é:** A avaliação quantitativa dada pelo usuário ao final do atendimento, respondendo à pergunta padrão: *"Como você avalia o atendimento recebido hoje?"*.
*   **Como é calculado:** 
    $$\text{CSAT} = \left( \frac{\text{Número de avaliações Positivas (Ótimo/Bom)}}{\text{Total de avaliações recebidas}} \right) \times 100$$
*   **Meta da Indústria:** **Acima de 95%** para serviços premium.
*   **Como otimizar:** Reduzir o tempo de fila, garantir respostas corretas e manter uma linguagem clara e acolhedora.
*   **Exemplo na Stone:** O lojista avalia com 5 estrelas o atendimento rápido que liberou a maquininha de cartão dele antes do horário comercial.

---

### ⚙️ Funcionamento por Trás do Painel
1.  **Polling em Tempo Real:** O frontend do Next.js executa um loop de atualização via `setInterval` a cada **5 segundos**, disparando requisições assíncronas `fetch('/api/metrics')`.
2.  **Agregação de Dados:** O backend FastAPI processa os valores simulados mantidos em memória no objeto global `METRICS` e monta a resposta em formato JSON.
3.  **Desenho Gráfico:** A biblioteca **Chart.js** (utilizando componentes de radar e barras empilhadas) lê esses valores numéricos e atualiza a área interna das telas usando aceleração gráfica do navegador, permitindo ver os gráficos flutuarem à medida que as métricas melhoram ou pioram.

---

## 📋 3. Quadro Kanban & Fluxos de Trabalho

### 💡 Para Leigos
O Kanban é um **mural de tarefas com regras estritas**.
*   Imagine uma fábrica de montagem de carros. Você não pode ter 20 carros na fase de pintura se só tem 2 pintores. O Kanban impõe limites para que o trabalho flua sem entupir nenhuma etapa.

### ⚙️ Por Trás dos Bastidores
*   **Como o Drag & Drop funciona:** Usamos eventos nativos de arrastar do HTML5. Ao soltar um cartão em outra coluna:
    1.  O navegador captura o ID do chamado e a coluna de destino.
    2.  Dispara uma chamada `PUT /api/tickets/{ticket_id}/move?target_lane={coluna}`.
    3.  O backend valida o movimento:
        *   **Validação de Limites WIP:** Se a coluna de destino (ex: *Desenvolvimento*) já atingiu o limite máximo de cartões permitidos (ex: 3), o backend registra o estouro e marca o ticket com `wip_limit_exceeded = True`.
        *   **Validação de Políticas de Saída:** Verifica se o chamado cumpre os requisitos mínimos cadastrados (como testes rodando) antes de permitir o avanço.
    4.  Se validado, altera a propriedade `lane` do objeto na memória do Python e responde com sucesso. O frontend então recarrega os dados para renderizar a alteração.

---

## 🤖 4. Operações de IA & Agentes Autônomos

Aqui está a inteligência integrada que automatiza o trabalho repetitivo:

### A. Triagem Inteligente
*   **Didático:** É o triador do pronto-socorro. Lê a reclamação e diz: *"Isso é crítico, mande para a Squad de Infraestrutura"*.
*   **Por Trás:** O frontend envia o texto do chamado para `POST /api/ai/triage`. O backend envia um prompt estruturado para o modelo Gemini descrevendo as regras de classificação da Stone. O Gemini retorna um JSON contendo o tipo, squad, impacto e a justificativa técnica.

### B. Base de Conhecimento Semântica & Análise de Lacunas (Gap Analysis)
*   **Didático:** Você pesquisa na biblioteca. Se o livro não existe, o bibliotecário senta e escreve o livro na hora para a próxima pessoa poder ler.
*   **Por Trás:**
    1.  O usuário digita uma busca. O sistema compara os termos contra os artigos existentes usando cálculo de score de relevância.
    2.  **Detecção de Lacuna (Gap):** Se todos os artigos encontrados tiverem score de compatibilidade muito baixo, o sistema assume que aquela informação está faltando na empresa.
    3.  A IA é acionada para **gerar um rascunho de artigo completo** baseado na pergunta feita, salvando-o em uma lista especial de rascunhos pendentes.
    4.  Um administrador técnico pode clicar em `Aprovar` no painel, o que dispara `POST /api/ai/kb/drafts/{id}/approve`, inserindo o artigo permanentemente na base oficial.

### C. Execução do Agente Autônomo (Zero-Touch)
*   **Didático:** É um robô de manutenção. Você clica em "Iniciar" e assiste ele trabalhar passo a passo na máquina quebrada.
*   **Por Trás (SSE - Server-Sent Events):**
    1.  Ao clicar em `▶ Executar Agente`, o frontend abre uma conexão de fluxo contínuo usando `EventSource` apontando para `/api/tickets/{id}/agent/stream`.
    2.  O backend FastAPI inicia um loop assíncrono. Em vez de responder de uma vez só, ele envia "mensagens de progresso" pedaço por pedaço (ex: *"Analisando logs..."*, *"Executando builds..."*, *"Verificando segurança..."*).
    3.  O frontend escuta essas mensagens em tempo real e atualiza a barra de progresso e a caixa de logs sem travar a tela.
    4.  Ao final, o backend executa uma chamada de resumo de IA (`POST /api/ai/summarize/{id}`), grava o relatório no chamado e fecha a conexão.

---

## 💬 5. Chat Gemini com Análise de Processos

### 💡 Para Leigos
É um assistente pessoal que, além de ser muito inteligente, tem acesso a uma **cópia em tempo real de toda a sua empresa** (todas as métricas e todos os problemas do Kanban). Você pode pedir conselhos de gestão para ele.

### ⚙️ Por Trás dos Bastidores (O Prompt Dinâmico)
Quando você digita uma mensagem no chat, o fluxo é o seguinte:

```
1. Usuário envia pergunta
   └─► 2. Backend FastAPI intercepta a requisição
          ├─► Lê o estado atual das Métricas (DORA e ITSM)
          ├─► Lê a lista completa de Chamados do Kanban
          ├─► Junta tudo num "Super-Prompt" de Contexto
          └─► 3. Envia para a API Oficial do Gemini (Google)
                 └─► 4. Retorna a resposta contextualizada ao usuário
```

1.  O frontend dispara `POST /api/ai/gemini-chat` enviando a mensagem, o modelo selecionado e a chave de API fornecida.
2.  **Construção de Contexto:** O backend coleta todos os dados do banco de dados em memória e monta uma instrução contendo a tabela de métricas operacionais e a lista detalhada de chamados.
3.  **Chamada Assíncrona via Urllib:** O backend faz uma requisição HTTP para a API de desenvolvimento do Google Gemini usando `urllib.request`. Como esta chamada é síncrona e pode demorar alguns segundos, o FastAPI a executa dentro de um executor de thread assíncrono (`asyncio.to_thread` / `loop.run_in_executor`) para que outros usuários possam continuar usando o aplicativo sem lentidão.
4.  A resposta gerada pelo Gemini é filtrada, higienizada e exibida na janela de chat com formatação markdown.

---

## ☀️ 6. O Sistema de Temas (Dark/Light)

### 💡 Para Leigos
É como trocar a lente dos óculos. A armação (a estrutura do site) continua igual, mas o filtro de cores muda para se adequar à iluminação do quarto.

### ⚙️ Por Trás dos Bastidores
*   **Tailwind CSS v4 & Variáveis CSS:** No arquivo [globals.css](file:///c:/Users/edumo/stone_project/frontend/src/app/globals.css), definimos tokens semânticos baseados em variáveis nativas do navegador.
*   **O Alternador:** O botão de tema adiciona ou remove a classe `.light` da tag raiz `<html>` do documento.
*   Como todas as cores dos componentes usam as variáveis correspondentes (como `bg-surface-dark` apontando para `var(--bg-primary)`), o navegador redesenha toda a paleta de cores instantaneamente com transições suaves de hardware, sem precisar recarregar o Next.js.
