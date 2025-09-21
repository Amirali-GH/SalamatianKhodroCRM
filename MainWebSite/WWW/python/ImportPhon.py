#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import time
import base64
import argparse
from io import BytesIO
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import logging

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ---------- Config ----------
load_dotenv()

CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE = os.getenv("TOKEN_FILE", "token.json")
# Query for searching emails (default looks for recent emails with xlsx/xls attachments)
GMAIL_QUERY = os.getenv("GMAIL_QUERY", 'has:attachment filename:(xlsx OR xls) newer_than:1d')
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "60"))
LOG_FILE = os.getenv("LOG_FILE", "save_excel.log")

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# ---------- Logger ----------
logger = logging.getLogger("save_excel")
logger.setLevel(logging.INFO)
fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

ch = logging.StreamHandler()
ch.setFormatter(fmt)
logger.addHandler(ch)

fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
fh.setFormatter(fmt)
logger.addHandler(fh)


# ---------- Gmail helpers ----------
def get_gmail_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        except Exception:
            logger.warning("Token file exists but could not be read. Will re-authenticate.")
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Refreshing Gmail credentials...")
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                raise FileNotFoundError(f"Credentials file not found: {CREDENTIALS_FILE}")
            logger.info("Running local server OAuth flow (a browser window will open)...")
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        # save the credentials for next runs
        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(creds.to_json())

    service = build("gmail", "v1", credentials=creds)
    return service


def list_messages_with_query(service, user_id='me', q=None, max_results=20):
    try:
        resp = service.users().messages().list(userId=user_id, q=q, maxResults=max_results).execute()
        return resp.get('messages', [])
    except HttpError as e:
        logger.exception("Gmail list error: %s", e)
        return []


def get_message(service, msg_id, user_id='me'):
    try:
        return service.users().messages().get(userId=user_id, id=msg_id, format='full').execute()
    except HttpError as e:
        logger.exception("Gmail get message error: %s", e)
        return None


def sanitize_filename(name: str) -> str:
    # remove path chars and control chars
    keep = "-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return "".join(c if c in keep else "_" for c in name).strip() or "attachment"


def save_attachment_bytes(base_dir: Path, filename: str, content_bytes: bytes) -> Path:
    safe_name = sanitize_filename(filename)
    target = base_dir / safe_name
    if target.exists():
        # append timestamp
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        stem = target.stem
        suffix = target.suffix
        target = base_dir / f"{stem}_{ts}{suffix}"
    with open(target, "wb") as f:
        f.write(content_bytes)
    return target


def find_excel_attachments_in_message(service, message):
    """
    Return list of tuples (filename, bytes)
    """
    parts = []
    payload = message.get('payload', {})
    def _walk(parts_list):
        for p in parts_list or []:
            filename = p.get('filename')
            body = p.get('body', {}) or {}
            mime = p.get('mimeType', '')
            if filename and filename.lower().endswith(('.xlsx', '.xls')):
                data = body.get('data')
                if data:
                    try:
                        b = base64.urlsafe_b64decode(data.encode('utf-8'))
                        parts.append((filename, b))
                    except Exception:
                        # fallback: fetch by attachmentId
                        att_id = body.get('attachmentId')
                        if att_id:
                            att = service.users().messages().attachments().get(userId='me', messageId=message['id'], id=att_id).execute()
                            data2 = att.get('data')
                            b = base64.urlsafe_b64decode(data2.encode('utf-8'))
                            parts.append((filename, b))
                else:
                    att_id = body.get('attachmentId')
                    if att_id:
                        att = service.users().messages().attachments().get(userId='me', messageId=message['id'], id=att_id).execute()
                        data2 = att.get('data')
                        b = base64.urlsafe_b64decode(data2.encode('utf-8'))
                        parts.append((filename, b))
            # nested
            if p.get('parts'):
                _walk(p.get('parts'))
    # check top-level payload filename
    root_filename = payload.get('filename')
    if root_filename and root_filename.lower().endswith(('.xlsx', '.xls')):
        data0 = payload.get('body', {}).get('data')
        if data0:
            try:
                b0 = base64.urlsafe_b64decode(data0.encode('utf-8'))
                parts.append((root_filename, b0))
            except Exception:
                pass
    _walk(payload.get('parts', []))
    return parts


# ---------- Main workflow ----------
def fetch_and_save_once(service, save_dir: Path, query: str):
    messages = list_messages_with_query(service, q=query, max_results=10)
    if not messages:
        logger.info("No messages found for query.")
        return {"found": 0, "saved": 0}

    total_found = 0
    total_saved = 0
    for m in messages:
        msg = get_message(service, m['id'])
        if not msg:
            continue
        attachments = find_excel_attachments_in_message(service, msg)
        if attachments:
            total_found += len(attachments)
            for filename, bcontent in attachments:
                saved_path = save_attachment_bytes(save_dir, filename, bcontent)
                logger.info("Saved attachment: %s", saved_path)
                total_saved += 1
    return {"found": total_found, "saved": total_saved}


def run_loop(save_dir: Path, query: str, poll_seconds: int):
    service = get_gmail_service()
    logger.info("Started polling Gmail. Query=%s, poll_seconds=%s", query, poll_seconds)
    try:
        while True:
            res = fetch_and_save_once(service, save_dir, query)
            if res["saved"] > 0:
                logger.info("Attachments saved this cycle: %d", res["saved"])
            else:
                logger.info("No new attachments this cycle.")
            time.sleep(poll_seconds)
    except KeyboardInterrupt:
        logger.info("Interrupted by user. Exiting.")


# ---------- CLI ----------
def main():
    parser = argparse.ArgumentParser(description="Download Excel attachments from Gmail and save next to exe.")
    parser.add_argument("--once", action="store_true", help="Run once and exit (do not loop).")
    parser.add_argument("--query", type=str, help="Gmail search query to use (overrides env GMAIL_QUERY).")
    parser.add_argument("--poll", type=int, help="Poll interval in seconds (overrides POLL_SECONDS env).")
    parser.add_argument("--dir", type=str, help="Directory to save files (defaults to exe folder).")
    args = parser.parse_args()

    query = args.query or GMAIL_QUERY
    poll = args.poll or POLL_SECONDS
    if args.dir:
        save_dir = Path(args.dir).expanduser().resolve()
    else:
        # folder next to this script / exe
        exe_path = Path(sys_executable_location())
        save_dir = exe_path.parent

    save_dir.mkdir(parents=True, exist_ok=True)
    logger.info("Save directory: %s", save_dir)

    if args.once:
        service = get_gmail_service()
        res = fetch_and_save_once(service, save_dir, query)
        logger.info("Done. Found=%s Saved=%s", res["found"], res["saved"])
    else:
        run_loop(save_dir, query, poll)


def sys_executable_location():
    """
    Return Path to this script/executable location (works for exe built by PyInstaller).
    """
    try:
        # if frozen by PyInstaller
        if getattr(__import__("sys"), "frozen", False):
            return __import__("sys").executable
    except Exception:
        pass
    # fallback to this file location
    return __file__


if __name__ == "__main__":
    import sys
    main()
