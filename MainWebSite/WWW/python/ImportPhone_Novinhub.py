import os
import re
import base64
import time
import asyncio
import random
from io import BytesIO
from itertools import cycle
import pandas as pd
import logging
from logging.handlers import RotatingFileHandler

import requests
import mysql.connector
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Google / Gmail
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Selenium (skeleton)
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium_stealth import stealth



# ========== Load environment ==========
load_dotenv()

GOFTINO_API_KEY = os.getenv("GOFTINO_API_KEY")

NOVINHUB_EMAIL = os.getenv("NOVINHUB_EMAIL")
NOVINHUB_PASS = os.getenv("NOVINHUB_PASS")
TARGET_EMAIL = os.getenv("TARGET_EMAIL")
START_URL = os.getenv("START_URL", "https://app.novinhub.com/login?redirect=%2Fdashboard")

DB_HOST = os.getenv("DB_HOST")
DB_DATABASE = os.getenv("DB_DATABASE")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
SP_NAME = os.getenv("SP_NAME")

CREDENTIALS_FILE = os.getenv("CREDENTIALS_FILE", "credentials.json")
TOKEN_FILE = os.getenv("TOKEN_FILE", "token.json")
OAUTH_PORT = int(os.getenv("OAUTH_PORT", "8085"))

# Gmail scope (FIXED)
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

# Logging env
LOG_FILE = os.getenv("LOG_FILE", "novinhub_processor.log")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", 10 * 1024 * 1024))  # 10 MB
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", 5))


# ========== Logger setup ==========
def setup_logger():
    logger = logging.getLogger("novinhub")
    logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

    fmt = "%(asctime)s [%(levelname)s] %(name)s - %(message)s"
    formatter = logging.Formatter(fmt)

    # Console handler
    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    # Rotating file handler
    fh = RotatingFileHandler(LOG_FILE, maxBytes=LOG_MAX_BYTES, backupCount=LOG_BACKUP_COUNT, encoding="utf-8")
    fh.setFormatter(formatter)
    logger.addHandler(fh)

    # Avoid duplicate handlers if this module imported multiple times
    logger.propagate = False
    return logger


logger = setup_logger()

app = FastAPI(title="Novinhub Automated Processor API")


# ========== Gmail functions ==========
def get_gmail_service():
    """
    Authenticate and return Gmail API service object.
    """
    logger.info("Authenticating Gmail API...")
    creds = None
    try:
        if os.path.exists(TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                try:
                    creds.refresh(Request())
                except Exception:
                    logger.exception("Failed to refresh credentials.")
            else:
                flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
                creds = flow.run_local_server(port=OAUTH_PORT)
            # save token
            with open(TOKEN_FILE, "w", encoding="utf-8") as tokenf:
                tokenf.write(creds.to_json())
        service = build("gmail", "v1", credentials=creds)
        logger.info("Gmail service ready.")
        return service
    except Exception as e:
        logger.exception("Error while creating Gmail service: %s", e)
        raise

def find_recent_email(service, query=None, max_results=1):
    """
    Find recent email messages based on query and return the full message object (if any).
    """
    q = query or 'from:noreply@mailer.novinhub.com subject:"فایل خروجی شماره‌ها" newer_than:1h'
    try:
        logger.debug("Searching emails with query: %s", q)
        resp = service.users().messages().list(userId='me', q=q, maxResults=max_results).execute()
        messages = resp.get('messages', [])
        if not messages:
            logger.info("No matching messages found for query.")
            return None
        msg_id = messages[0]['id']
        msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        logger.info("Found message id=%s", msg_id)
        return msg
    except HttpError as e:
        logger.exception("Gmail API error while searching for messages: %s", e)
        raise
    except Exception:
        logger.exception("Unexpected error while finding recent email.")
        raise

def get_excel_attachment(service, message):
    """
    Search recursively for an .xlsx or .xls attachment and return bytes (or None).
    """
    logger.info("Looking for Excel attachment in message id=%s", message.get('id'))
    payload = message.get('payload', {})

    def _search_parts(parts):
        for part in parts or []:
            filename = part.get('filename', '') or ''
            body = part.get('body', {}) or {}

            # If part itself is an attachment with filename
            if filename.lower().endswith(('.xlsx', '.xls')):
                logger.debug("Attachment candidate found: %s", filename)
                data = body.get('data')
                if data:
                    return data, filename
                attachment_id = body.get('attachmentId')
                if attachment_id:
                    try:
                        att = service.users().messages().attachments().get(
                            userId='me', messageId=message['id'], id=attachment_id
                        ).execute()
                        return att.get('data'), filename
                    except HttpError:
                        logger.exception("Failed to download attachment by id.")
                        raise

            # Some parts are nested
            if part.get('parts'):
                found = _search_parts(part.get('parts'))
                if found:
                    return found
        return None

    # Direct payload filename?
    filename0 = payload.get('filename', '')
    if filename0 and filename0.lower().endswith(('.xlsx', '.xls')):
        data0 = payload.get('body', {}).get('data')
        if data0:
            logger.info("Attachment found in payload root: %s", filename0)
            return base64.urlsafe_b64decode(data0.encode('utf-8'))

    found = _search_parts(payload.get('parts', []))
    if not found:
        logger.info("No excel attachment found in message.")
        return None

    data_b64, filename = found
    try:
        file_bytes = base64.urlsafe_b64decode(data_b64.encode('utf-8'))
    except Exception:
        # fallback: add padding if necessary
        try:
            padded = data_b64 + '=' * (-len(data_b64) % 4)
            file_bytes = base64.urlsafe_b64decode(padded.encode('utf-8'))
        except Exception:
            logger.exception("Failed to decode attachment base64.")
            raise
    logger.info("Attachment '%s' downloaded (%d bytes).", filename, len(file_bytes))
    return file_bytes

# ========== Excel -> DB processing ==========
def normalize_mobile(value: str) -> str:
    if value is None:
        return ''
    s = str(value)
    # remove any non-digit characters
    s = re.sub(r'\D+', '', s)
    # optional: trim leading 0s (depends on your rules). Here keep as-is but remove leading zeros:
    s = s.lstrip('0')
    return s

def process_excel_and_save_to_db(excel_data: bytes):
    """
    Read columns Mobile, Username from excel bytes and insert into customer_assignment.
    Returns a dict with success/message.
    """
    conn = None
    cursor = None
    try:
        df = pd.read_excel(BytesIO(excel_data))
        logger.debug("Excel columns: %s", df.columns.tolist())

        if 'Mobile' not in df.columns or 'Username' not in df.columns:
            msg = "ستون‌های 'Mobile' یا 'Username' در فایل اکسل یافت نشد."
            logger.error(msg)
            return {"success": False, "message": msg}

        df = df.dropna(subset=['Mobile']).copy()
        # Normalize mobiles
        df['Mobile'] = df['Mobile'].apply(normalize_mobile)

        # Connect to DB
        logger.info("Connecting to MySQL at %s database=%s", DB_HOST, DB_DATABASE)
        conn = mysql.connector.connect(
            host=DB_HOST,
            database=DB_DATABASE,
            user=DB_USER,
            password=DB_PASS,
            autocommit=False
        )
        cursor = conn.cursor()

        cursor.execute("SELECT BranchID FROM branch_branch")
        branch_ids = [r[0] for r in cursor.fetchall()]
        if not branch_ids:
            logger.warning("No BranchID found in branch_branch table.")
            return {"success": False, "message": "No BranchIDs found in the database."}

        cursor.execute("SELECT Phone FROM customer_assignment")
        existing_phones = {normalize_mobile(r[0]) for r in cursor.fetchall() if r[0] is not None}

        new_records = []
        branch_cycler = cycle(branch_ids)
        for _, row in df.iterrows():
            mobile = normalize_mobile(row['Mobile'])
            if not mobile:
                continue
            username = row['Username'] if pd.notna(row['Username']) else None
            if mobile in existing_phones:
                logger.debug("Skipping existing phone: %s", mobile)
                continue
            assigned_branch = next(branch_cycler)
            new_records.append((mobile, assigned_branch, 1, username))
            existing_phones.add(mobile)

        if not new_records:
            logger.info("No new records to add.")
            return {"success": True, "message": "No new records to add."}

        sql_insert = "INSERT INTO customer_assignment (Phone, BranchID, SourceCollectingDataID, Username) VALUES (%s, %s, %s, %s)"
        cursor.executemany(sql_insert, new_records)
        conn.commit()
        logger.info("%d new records inserted.", cursor.rowcount)

        if SP_NAME:
            logger.info("Executing stored procedure: %s", SP_NAME)
            cursor.callproc(SP_NAME)
            conn.commit()
            logger.info("Stored procedure executed successfully.")

        return {"success": True, "message": f"{len(new_records)} new records were saved."}
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error during processing excel and saving to DB: %s", e)
        return {"success": False, "message": f"An error occurred: {e}"}
    finally:
        try:
            if cursor:
                cursor.close()
            if conn and conn.is_connected():
                conn.close()
            logger.debug("Database connection closed.")
        except Exception:
            logger.exception("Error while closing DB connection.")

def human_like_click(driver, element):
    """
    Moves the mouse to an element in a human-like way and then clicks it.
    """
    try:
        # Create an ActionChains object
        actions = ActionChains(driver)
        
        # Move the mouse to the element
        actions.move_to_element(element)
        
        # Add a small, random delay to simulate human hesitation
        actions.pause(random.uniform(0.1, 0.4))
        
        # Perform the click
        actions.click()
        
        # Execute the chain of actions
        actions.perform()
        
        logger.debug(f"Performed a human-like click on element: {element.tag_name}")

    except Exception as e:
        logger.error(f"Could not perform human-like click: {e}")
        # Fallback to a simple click if ActionChains fails
        element.click()

# ========== Selenium robot (skeleton) ==========
# --- تابع کامل شده ربات Selenium ---
def prepare_chrome_driver(url: str, profile_path: str, showBrowser: bool = False) -> tuple[webdriver.Chrome, WebDriverWait]:
    if not os.path.exists(profile_path):
        os.makedirs(profile_path)

    options = webdriver.ChromeOptions()
    options.add_argument(f"--user-data-dir={os.path.abspath(profile_path)}")
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--allow-running-insecure-content')
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    
    if not showBrowser:
       options.add_argument("--headless=new")

    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    # استفاده از Selenium Stealth برای کاهش احتمال شناسایی شدن
    stealth(driver,
            vendor="Google Inc.",
            platform="Win32",
            webgl_vendor="Intel Inc.",
            renderer="Intel Iris OpenGL Engine",
            fix_hairline=True,
            )

    wait = WebDriverWait(driver, 40) # افزایش زمان انتظار
    driver.get(url)
    return driver, wait

# ========== تابع اصلی ربات (اصلاح شده) ==========
def run_robot():
    """
    ربات Selenium را برای لاگین به نوین‌هاب و درخواست فایل اکسل اجرا می‌کند.
    ابتدا بررسی می‌کند که آیا کاربر از قبل لاگین کرده است یا خیر.
    """
    logger.info("Starting Selenium robot...")
    driver = None
    try:
        profile_path = os.path.join(os.getcwd(), "chrome_profile")
        driver, wait = prepare_chrome_driver(START_URL, profile_path, showBrowser=True)

        logger.info("Opened start URL: %s", START_URL)
        
        # --- مرحله ۱: بررسی وضعیت لاگین و اجرای لاگین در صورت نیاز ---
        if not is_logged_in(driver, wait):
            logger.info("Attempting to log in...")
            email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']")))
            email_input.send_keys(NOVINHUB_EMAIL)
            time.sleep(random.uniform(0.5, 1.5))
            
            password_input = driver.find_element(By.CSS_SELECTOR, "input[name='password']")
            password_input.send_keys(NOVINHUB_PASS)
            time.sleep(random.uniform(0.5, 1.5))

            login_button = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[type='submit']")))
            human_like_click(driver, login_button)
            logger.info("Login form submitted. Waiting for dashboard or CAPTCHA...")

            # --- مدیریت هوشمند کپچا بعد از کلیک ---
            try:
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href='/automation']")))
                logger.info("Login successful, dashboard loaded.")
            except TimeoutError:
                logger.warning("Dashboard not loaded. Checking for reCAPTCHA...")
                try:
                    short_wait = WebDriverWait(driver, 5)
                    iframe = short_wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "iframe[title='reCAPTCHA']")))
                    driver.switch_to.frame(iframe)
                    recaptcha_checkbox = short_wait.until(EC.element_to_be_clickable((By.ID, "recaptcha-anchor")))
                    human_like_click(driver, recaptcha_checkbox)
                    driver.switch_to.default_content()
                    logger.info("Clicked reCAPTCHA checkbox. Waiting for resolution...")
                    time.sleep(5)
                    
                    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "a[href='/automation']")))
                    logger.info("Login successful after handling CAPTCHA.")
                except TimeoutError:
                    logger.error("Login failed. Neither dashboard nor CAPTCHA found.")
                    raise Exception("Login failed. Check credentials or website status.")

        # --- مراحل بعدی (رفتن به صفحه خروجی و ...) ---
        logger.info("Navigating to automation page...")
        automation_link = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href='/automation']")))
        human_like_click(driver, automation_link)
        time.sleep(random.uniform(0.5, 1.5))

        logger.info("Navigating to export numbers tab...")
        export_tab_selector = "div > a[href='/automation/166262/leed']"
        export_tab = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, export_tab_selector)))
        human_like_click(driver, export_tab)
        time.sleep(random.uniform(0.5, 1.5))

        # --- مرحله ۳: درخواست خروجی اکسل ---
        time.sleep(2)
        logger.info("Clicking 'Export' button...")
        export_button_selector = "#main-content > div > ul > li:nth-child(4) > button"
        wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, export_button_selector))).click()
        time.sleep(random.uniform(0.5, 1.5))
        
        # --- مرحله ۴: پر کردن فرم در پاپ‌آپ (Modal) ---
        logger.info("Filling out the export modal form...")
        email_field_selector = "div[id*='dialog-panel'] input[name='email']"
        email_field = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, email_field_selector)))
        email_field.clear()
        email_field.send_keys(TARGET_EMAIL)
        time.sleep(random.uniform(0.5, 1.5))

        # در اینجا می‌توانید تعداد را نیز مشخص کنید، اگر نیاز بود
        limit_field = driver.find_element(By.CSS_SELECTOR, "div[id*='dialog-panel'] input[name='export_limit']")
        limit_field.clear()
        limit_field.send_keys("3000")

        logger.info("Submitting the export request...")
        confirm_button_xpath = "//div[contains(@id, 'dialog-panel')]//button[.//div[contains(text(),'خروجی گرفتن')]]"
        wait.until(EC.element_to_be_clickable((By.XPATH, confirm_button_xpath))).click()
        time.sleep(5)
        
        logger.info("Selenium robot has successfully requested the Excel file.")

    except Exception as e:
        logger.exception("An error occurred during Selenium robot execution: %s", e)
        time.sleep(30)
        # می‌توانید اینجا اسکرین‌شات بگیرید تا دلیل خطا را بهتر بفهمید
        # driver.save_screenshot("error_screenshot.png")
    finally:
        if driver:
            driver.quit()
        logger.info("Selenium robot finished.")

def is_logged_in(driver, wait):
    """
    بررسی می‌کند که آیا کاربر از قبل لاگین کرده است یا خیر.
    این تابع با یک زمان انتظار کوتاه به دنبال المانی می‌گردد که نشان‌دهنده ورود موفق است.
    """
    try:
        # از یک زمان انتظار کوتاه استفاده می‌کنیم تا فرآیند سریع باشد
        short_wait = WebDriverWait(driver, 5)
        
        # این XPath به دنبال دکمه‌ای می‌گردد که داخل آن یک div با متن "پیشخوان" وجود دارد.
        # این روش از ID های داینامیک یا نام کامل کاربر قوی‌تر است.
        profile_button_selector = "//button[div[contains(text(), 'پیشخوان')]]"
        short_wait.until(EC.presence_of_element_located((By.XPATH, profile_button_selector)))
        
        logger.info("User is already logged in.")
        return True
    except:
        logger.info("User is not logged in. Proceeding with login steps.")
        return False
    

# ========== Full workflow orchestration ==========
async def run_full_workflow(wait_for_email_seconds: int = 180, poll_interval: int = 10, run_robot_first: bool = True):
    """
    1) Optionally run the robot (blocking) in a thread,
    2) Poll Gmail for the report email,
    3) Download attachment and process into DB.
    Returns a dict with success/message.
    """
    try:
        if run_robot_first:
            logger.info("Running robot before checking email...")
            # run_blocking IO in thread so as not to block event loop
            await asyncio.to_thread(run_robot)

        service = await asyncio.to_thread(get_gmail_service)

        logger.info("Polling for report email for up to %s seconds...", wait_for_email_seconds)
        start_ts = time.time()
        while True:
            msg = await asyncio.to_thread(find_recent_email, service)
            if msg:
                attachment = await asyncio.to_thread(get_excel_attachment, service, msg)
                if attachment:
                    logger.info("Processing downloaded Excel...")
                    result = await asyncio.to_thread(process_excel_and_save_to_db, attachment)
                    logger.info("Processing result: %s", result)
                    return result
                else:
                    logger.info("Email found but no excel attachment. Will continue polling until timeout.")
            if (time.time() - start_ts) > wait_for_email_seconds:
                logger.warning("Timeout while waiting for report email.")
                return {"success": False, "message": "Timeout while waiting for report email."}
            await asyncio.sleep(poll_interval)
    except Exception:
        logger.exception("Error in full workflow.")
        return {"success": False, "message": "An unexpected error occurred in the full workflow."}


# ========== تابع پوششی جدید برای Background Task ==========
def run_workflow_in_background():
    """
    This is a synchronous wrapper that runs the async workflow.
    This is the function that should be passed to BackgroundTasks.
    """
    logger.info("Background task started. Running the async workflow.")
    try:
        # asyncio.run() creates a new event loop in this thread and runs the task.
        asyncio.run(run_full_workflow())
        logger.info("Async workflow finished successfully in background.")
    except Exception:
        logger.exception("The background workflow task failed.")

# ========== توابع جدید برای همگام‌سازی با گفتینو ==========

def get_goftino_chats(page=1, limit=50):
    url = f"https://api.goftino.com/v1/chats?page={page}&limit={limit}"
    headers = {
        "Content-Type": "application/json",
        "goftino-key": GOFTINO_API_KEY
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # اگر خطای HTTP رخ داد، Exception ایجاد می‌کند
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching Goftino conversations: {e}")
        return None

def get_goftino_messages(chat_id, from_date=None, to_date=None):
    params = {"chat_id": chat_id}
    if from_date: params["from_date"] = from_date
    if to_date: params["to_date"] = to_date

    url = "https://api.goftino.com/v1/chat_data"
    headers = {
        "Content-Type": "application/json",
        "goftino-key": GOFTINO_API_KEY
    }
    response = requests.get(url, headers=headers, params=params)
    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching messages for chat {chat_id}: {e}")
        return None

def extract_and_assign_phone_number(text, username, cursor, branch_cycler, existing_phones):
    """یک شماره موبایل معتبر از متن استخراج کرده و در صورت جدید بودن، آن را برای درج آماده می‌کند."""
    # یک الگوی ساده برای پیدا کردن شماره‌های ایرانی
    match = re.search(r'(09|989|\+989)\d{9}', text)
    if match:
        phone_number = match.group(0)
        # نرمال‌سازی شماره (مثلاً حذف +98 و جایگزینی با 0)
        if phone_number.startswith('+98'):
            phone_number = '0' + phone_number[3:]
        elif phone_number.startswith('98'):
            phone_number = '0' + phone_number[2:]

        if phone_number not in existing_phones:
            logger.info(f"New phone number found: {phone_number} for user: {username}")
            assigned_branch_id = next(branch_cycler)
            # (Phone, BranchID, SourceCollectingDataID, UserName)
            new_assignment = (phone_number, assigned_branch_id, 2, username) # SourceID = 2
            
            # درج مستقیم در دیتابیس
            insert_query = "INSERT INTO customer_assignment (Phone, BranchID, SourceCollectingDataID, Username) VALUES (%s, %s, %s, %s)"
            cursor.execute(insert_query, new_assignment)
            existing_phones.add(phone_number) # به لیست شماره‌های موجود اضافه می‌کنیم تا دوباره ثبت نشود
            return 1
    return 0

def sync_goftino_chats():
    """
    گفتگوهای جدید را از گفتینو دریافت، در دیتابیس ذخیره و شماره‌های موبایل را استخراج می‌کند.
    """
    db_connection = None
    new_conversations_count = 0
    new_messages_count = 0
    new_phones_count = 0
    
    try:
        # اتصال به دیتابیس
        db_connection = mysql.connector.connect(host=DB_HOST, database=DB_DATABASE, user=DB_USER, password=DB_PASS)
        cursor = db_connection.cursor()
        logger.info("Successfully connected to the MySQL database for Goftino sync.")

        # دریافت BranchID ها و شماره‌های موجود
        cursor.execute("SELECT BranchID FROM branch_branch")
        branch_ids = [item[0] for item in cursor.fetchall()]
        if not branch_ids:
            return {"success": False, "message": "No BranchIDs found in the database."}
        
        cursor.execute("SELECT Phone FROM customer_assignment")
        existing_phones = {item[0] for item in cursor.fetchall()}
        
        branch_id_cycler = cycle(branch_ids)

        # دریافت ID گفتگوهای از قبل ذخیره شده
        cursor.execute("SELECT ConversationId FROM goftino_conversations_header")
        existing_conv_ids = {item[0] for item in cursor.fetchall()}

        # شروع فرآیند دریافت گفتگوها از گفتینو
        page = 1
        while True:
            conversations_data = get_goftino_chats(page=page)
            if not conversations_data or not conversations_data.get('data') or not conversations_data['data'].get('chats'):
                logger.info("No more conversations to fetch from Goftino.")
                break

            for conv in conversations_data['data']['chats']:
                conv_id = conv['chat_id']
                if conv_id in existing_conv_ids:
                    continue

                # درج هدر گفتگوی جدید
                header_data = (
                    conv_id,
                    conv.get('user_id'),
                    conv.get('user_name'),
                    conv['last_message'].get('content') if conv.get('last_message') else None,
                    conv['last_message'].get('date') if conv.get('last_message') else None
                )
                cursor.execute(
                    "INSERT INTO goftino_conversations_header (ConversationId, UserId, Username, LastMessage, LastMessageTimestamp) VALUES (%s, %s, %s, %s, %s)",
                    header_data
                )
                new_conversations_count += 1
                logger.info(f"New conversation header saved: {conv_id}")


        summary = f"Sync complete. New Conversations: {new_conversations_count}, New Messages: {new_messages_count}, New Phones Assigned: {new_phones_count}."
        logger.info(summary)
        return {"success": True, "message": summary}

    except Exception as e:
        if db_connection:
            db_connection.rollback()
        logger.exception(f"An error occurred during Goftino sync: {e}")
        return {"success": False, "message": f"An error occurred: {e}"}
    finally:
        if db_connection and db_connection.is_connected():
            cursor.close()
            db_connection.close()
            logger.info("Database connection for Goftino sync closed.")


# ========== Endpoints ==========

@app.post("/sync-goftino")
async def sync_goftino_endpoint(background_tasks: BackgroundTasks):
    """
    شروع فرآیند همگام‌سازی گفتگوهای گفتینو در پس‌زمینه.
    """
    background_tasks.add_task(sync_goftino_chats)
    logger.info("Goftino sync process has been scheduled in the background.")
    return JSONResponse(status_code=202, content={"message": "Goftino sync process started in the background."})

@app.get("/")
async def root():
    return {"message": "API is ready."}

@app.post("/start-process")
async def start_process(background_tasks: BackgroundTasks):
    """
    Start the whole process in the background and return immediately (202).
    """
    # We add the SYNCHRONOUS wrapper function to the background tasks.
    background_tasks.add_task(run_workflow_in_background)
    logger.info("Background workflow task scheduled successfully.")
    return JSONResponse(status_code=202, content={"message": "Process started in background."})

@app.post("/run-now")
async def run_now():
    """
    Run the entire flow synchronously (the request will wait until completion or timeout).
    """
    logger.info("Running workflow synchronously via /run-now")
    result = await run_full_workflow()
    if result.get("success"):
        return JSONResponse(status_code=200, content=result)
    else:
        raise HTTPException(status_code=500, detail=result.get("message", "Failure"))

# ========== CLI run ==========
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8586)), reload=True)
