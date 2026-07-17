"""
database.py — Módulo de persistência SQLite para a plataforma Stone ITSM.

Gerencia 3 tabelas:
  - tickets: chamados do quadro Kanban
  - chat_conversations: histórico de conversas com o Gemini
  - kb_drafts: rascunhos da base de conhecimento (gap analysis)

Campos complexos (policies, chat_logs) são serializados como JSON strings.
"""

import sqlite3
import json
import os
import time
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stone.db")


def _get_conn() -> sqlite3.Connection:
    """Cria uma conexão SQLite com row_factory para retornar dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


# ─────────────────────────────────────────────
# Inicialização do banco
# ─────────────────────────────────────────────

def init_db():
    """Cria as tabelas se não existirem."""
    conn = _get_conn()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,
                class_of_service TEXT NOT NULL,
                lane TEXT NOT NULL DEFAULT 'to_do',
                assignee TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                lead_time REAL,
                wip_limit_exceeded INTEGER NOT NULL DEFAULT 0,
                policies_json TEXT NOT NULL DEFAULT '{}',
                ai_summary TEXT,
                chat_logs_json TEXT NOT NULL DEFAULT '[]',
                error_logs TEXT
            );

            CREATE TABLE IF NOT EXISTS chat_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_message TEXT NOT NULL,
                ai_reply TEXT NOT NULL,
                model TEXT NOT NULL,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS kb_drafts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                query TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at REAL NOT NULL
            );
        """)
        conn.commit()
    finally:
        conn.close()


# ─────────────────────────────────────────────
# TICKETS — CRUD
# ─────────────────────────────────────────────

def _row_to_ticket_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Converte uma Row do SQLite para um dict compatível com o modelo Ticket."""
    d = dict(row)
    d["wip_limit_exceeded"] = bool(d["wip_limit_exceeded"])
    d["policies"] = json.loads(d.pop("policies_json"))
    d["chat_logs"] = json.loads(d.pop("chat_logs_json"))
    return d


def get_all_tickets() -> List[Dict[str, Any]]:
    """Retorna todos os tickets."""
    conn = _get_conn()
    try:
        rows = conn.execute("SELECT * FROM tickets").fetchall()
        return [_row_to_ticket_dict(r) for r in rows]
    finally:
        conn.close()


def get_ticket(ticket_id: str) -> Optional[Dict[str, Any]]:
    """Retorna um ticket pelo ID, ou None se não existir."""
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return None
        return _row_to_ticket_dict(row)
    finally:
        conn.close()


def insert_ticket(ticket: Dict[str, Any]):
    """Insere um novo ticket no banco."""
    conn = _get_conn()
    try:
        conn.execute(
            """INSERT INTO tickets
               (id, title, description, type, class_of_service, lane, assignee,
                created_at, updated_at, lead_time, wip_limit_exceeded,
                policies_json, ai_summary, chat_logs_json, error_logs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                ticket["id"],
                ticket["title"],
                ticket["description"],
                ticket["type"],
                ticket["class_of_service"],
                ticket["lane"],
                ticket["assignee"],
                ticket["created_at"],
                ticket["updated_at"],
                ticket.get("lead_time"),
                int(ticket.get("wip_limit_exceeded", False)),
                json.dumps(ticket.get("policies", {})),
                ticket.get("ai_summary"),
                json.dumps(ticket.get("chat_logs", [])),
                ticket.get("error_logs"),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def update_ticket(ticket_id: str, fields: Dict[str, Any]):
    """Atualiza campos específicos de um ticket.
    
    O dict `fields` usa as chaves do modelo Ticket (policies, chat_logs, etc).
    Campos complexos são serializados automaticamente.
    """
    conn = _get_conn()
    try:
        # Mapear campos do modelo para colunas do banco
        col_map = {}
        for key, value in fields.items():
            if key == "policies":
                col_map["policies_json"] = json.dumps(value)
            elif key == "chat_logs":
                col_map["chat_logs_json"] = json.dumps(value)
            elif key == "wip_limit_exceeded":
                col_map["wip_limit_exceeded"] = int(value)
            else:
                col_map[key] = value

        if not col_map:
            return

        set_clause = ", ".join(f"{col} = ?" for col in col_map)
        values = list(col_map.values()) + [ticket_id]
        conn.execute(f"UPDATE tickets SET {set_clause} WHERE id = ?", values)
        conn.commit()
    finally:
        conn.close()


def delete_ticket(ticket_id: str):
    """Remove um ticket pelo ID."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
        conn.commit()
    finally:
        conn.close()


def count_tickets_in_lane(lane: str) -> int:
    """Conta quantos tickets estão em uma determinada lane."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM tickets WHERE lane = ?", (lane,)
        ).fetchone()
        return row["cnt"]
    finally:
        conn.close()


def count_expedite_active() -> int:
    """Conta tickets Expedite que NÃO estão em ready_for_deploy."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM tickets WHERE class_of_service = 'Expedite' AND lane != 'ready_for_deploy'"
        ).fetchone()
        return row["cnt"]
    finally:
        conn.close()


def ticket_count() -> int:
    """Retorna o total de tickets no banco."""
    conn = _get_conn()
    try:
        row = conn.execute("SELECT COUNT(*) as cnt FROM tickets").fetchone()
        return row["cnt"]
    finally:
        conn.close()


# ─────────────────────────────────────────────
# CHAT CONVERSATIONS — CRUD
# ─────────────────────────────────────────────

def insert_chat(user_message: str, ai_reply: str, model: str):
    """Salva uma conversa (pergunta + resposta) no histórico."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO chat_conversations (user_message, ai_reply, model, created_at) VALUES (?, ?, ?, ?)",
            (user_message, ai_reply, model, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def get_all_chats() -> List[Dict[str, Any]]:
    """Retorna todo o histórico de conversas, ordenado do mais recente ao mais antigo."""
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM chat_conversations ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def clear_chats():
    """Remove todo o histórico de conversas."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM chat_conversations")
        conn.commit()
    finally:
        conn.close()


# ─────────────────────────────────────────────
# KB DRAFTS — CRUD
# ─────────────────────────────────────────────

def insert_draft(draft: Dict[str, Any]):
    """Insere um rascunho da KB."""
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO kb_drafts (id, title, query, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (draft["id"], draft["title"], draft["query"], draft["content"], draft["created_at"]),
        )
        conn.commit()
    finally:
        conn.close()


def get_all_drafts() -> List[Dict[str, Any]]:
    """Retorna todos os rascunhos da KB."""
    conn = _get_conn()
    try:
        rows = conn.execute("SELECT * FROM kb_drafts ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_draft(draft_id: str) -> Optional[Dict[str, Any]]:
    """Retorna um rascunho pelo ID."""
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM kb_drafts WHERE id = ?", (draft_id,)).fetchone()
        if row is None:
            return None
        return dict(row)
    finally:
        conn.close()


def delete_draft(draft_id: str):
    """Remove um rascunho da KB."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM kb_drafts WHERE id = ?", (draft_id,))
        conn.commit()
    finally:
        conn.close()
