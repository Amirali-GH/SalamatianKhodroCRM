from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
import threading
import time
import os
import sys
import smtplib
from email.message import EmailMessage
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import os.path
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


app = FastAPI(title="Novinhub Robot API", description="API برای اجرای ربات Novinhub")

# بارگذاری متغیرهای محیطی
load_dotenv()

# مقادیر را مستقیماً از متغیرهای محیطی می‌خوانیم
NOVINHUB_EMAIL = os.getenv("NOVINHUB_EMAIL")
NOVINHUB_PASS = os.getenv("NOVINHUB_PASS")
START_URL = os.getenv("START_URL", "https://app.novinhub.com/login?redirect=%2Fdashboard")
TARGET_EMAIL = os.getenv("TARGET_EMAIL")
DOWNLOAD_DIR = os.path.abspath(os.getenv("DOWNLOAD_DIR", "./downloads"))
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SEND_EMAIL_IF_DOWNLOADED = os.getenv("SEND_EMAIL_IF_DOWNLOADED", 'False').lower() in ('true', '1', 't')

# برای مدیریت وضعیت اجرا
execution_status = {"running": False, "last_result": None, "last_run_time": None}

# مدل برای درخواست
class RunRequest(BaseModel):
    email: Optional[str] = None
    limit: Optional[int] = 3000

# محدوده‌های دسترسی (Scopes). برای خواندن ایمیل‌ها همین کافی است.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
CREDENTIALS_FILE = 'credentials.json'
TOKEN_FILE = 'token.json'


def get_gmail_service():
    """
    سرویس Gmail API را با احراز هویت کاربر برمی‌گرداند.
    """
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    
    # اگر اطلاعات اعتبارسنجی معتبر نیست، کاربر را لاگین می‌دهد.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # این بخش برای اولین اجرا، نیاز به تعامل کاربر در مرورگر دارد
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # اطلاعات اعتبارسنجی را برای اجراهای بعدی ذخیره می‌کند
        with open(TOKEN_FILE, 'w') as token:
            token.write(creds.to_json())
            
    return build('gmail', 'v1', credentials=creds)

def find_recent_email(service):
    """
    آخرین ایمیل از فرستنده و با موضوع مشخص در 30 دقیقه گذشته را پیدا می‌کند.
    """
    try:
        # ساخت کوئری جستجو برای جیمیل
        # newer_than:30m یعنی ایمیل‌هایی که در 30 دقیقه اخیر آمده‌اند
        query = 'from:noreply@mailer.novinhub.com subject:"فایل خروجی شماره‌ها" newer_than:30m'
        
        # اجرای جستجو
        result = service.users().messages().list(userId='me', q=query).execute()
        messages = result.get('messages', [])

        if not messages:
            print("ایمیلی با مشخصات مورد نظر در 30 دقیقه گذشته یافت نشد.")
            return None
        
        # اولین پیام پیدا شده را برمی‌گردانیم (معمولاً جدیدترین است)
        message = messages[0]
        msg = service.users().messages().get(userId='me', id=message['id']).execute()
        
        email_data = {
            'id': msg['id'],
            'snippet': msg['snippet'] # خلاصه‌ای از متن ایمیل
        }
        
        print(f"ایمیل مورد نظر با موفقیت یافت شد. ID: {msg['id']}")
        return email_data

    except HttpError as error:
        print(f'یک خطای API رخ داد: {error}')
        return None

# تابع‌های کمکی (همانند قبل)
def prepare_chrome_driver(url: str, profile_chrome: str, showBrowser: bool = True, zoomPercent: int = 100):
    if not os.path.exists(profile_chrome):
        os.makedirs(profile_chrome)

    download_dir = DOWNLOAD_DIR
    os.makedirs(download_dir, exist_ok=True)

    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safeBrowse.enabled": True
    }

    options = webdriver.ChromeOptions()
    options.add_experimental_option("prefs", prefs)
    options.add_argument(f"--user-data-dir={os.path.abspath(profile_chrome)}")
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--allow-running-insecure-content')
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--headless")

    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    driver = webdriver.Chrome(options=options)

    driver.execute_cdp_cmd(
        "Network.setExtraHTTPHeaders",
        {
            "headers": {
                "Referer": "https://www.google.com/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            }
        }
    )

    wait = WebDriverWait(driver, 80)
    driver.get(url)
    print("Browser window opened.")
    driver.execute_script(f"document.body.style.zoom='{zoomPercent}%'")
    return driver, wait

def safe_find_or_logout(driver, by, selector, description="element", timeout=10):
    try:
        el = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((by, selector))
        )
        return el
    except Exception:
        print(f"❌ Couldn't find {description}, logging out...")
        try:
            logout_btn = driver.find_element(
                By.CSS_SELECTOR,
                "#headlessui-popover-panel-\\:r2j\\: > div > div > div.text-xs.space-s-4 > button",
            )
            logout_btn.click()
            print("✅ Logged out successfully.")
        except Exception as e:
            print("⚠️ Couldn't log out properly:", e)
        driver.quit()

def is_logined(wait):
    try:
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, r'div.ms-10.flex.flex-shrink-0.items-center.pe-4.space-s-10 > div.flex.items-center.space-s-8 > div:nth-child(3) > div')))
        return True
    except:
        return False

# تابع اصلی اجرای ربات
def run_robot(email_override=None, limit_override=None):
    global execution_status
    try:
        execution_status["running"] = True
        execution_status["last_run_time"] = time.time()
        
        profile_path = os.path.join(os.getcwd(), "chrome_profile")
        driver, wait = prepare_chrome_driver(START_URL, profile_path)

        if not is_logined(wait):
            print("Step 1: Logging in...")
            email_input = safe_find_or_logout(
                driver, By.CSS_SELECTOR, "input[name='email']", "Email field"
            )
            email_input.send_keys(NOVINHUB_EMAIL)

            passwd_input = safe_find_or_logout(
                driver, By.CSS_SELECTOR, "input[name='password']", "Password field"
            )
            passwd_input.send_keys(NOVINHUB_PASS)

            login_btn = safe_find_or_logout(
                driver, By.CSS_SELECTOR, "button[type='submit']", "Login button"
            )
            login_btn.click()
            time.sleep(3)

        print("Step 2: Navigating to Automation page...")
        automation_link = safe_find_or_logout(
            driver, By.CSS_SELECTOR, "a[href='/automation']", "Automation link"
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", automation_link)
        driver.execute_script("arguments[0].click();", automation_link)
        time.sleep(3)

        print("Step 3: Clicking Export Numbers")
        numbers_tab = safe_find_or_logout(
            driver, By.CSS_SELECTOR, r"div.px-8.md\:p-0 > div > a:nth-child(6)", "خروجی شماره‌ها"
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", numbers_tab)
        driver.execute_script("arguments[0].click();", numbers_tab)
        time.sleep(2)

        print("Step 4: Clicking 'خروجی گرفتن' button...")
        export_btn = safe_find_or_logout(
            driver, By.CSS_SELECTOR, "#main-content > div > ul > li:nth-child(4) > button", "خروجی گرفتن"
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", export_btn)
        driver.execute_script("arguments[0].click();", export_btn)
        time.sleep(2)

        print("Step 5: Filling modal form...")
        target_email = email_override or TARGET_EMAIL
        limit = limit_override or 3000
        
        email_field = safe_find_or_logout(
            driver,
            By.CSS_SELECTOR,
            "div[id*='dialog-panel'] input[name='email']",
            "Modal email field"
        )
        email_field.clear()
        email_field.send_keys(target_email)
        time.sleep(2)

        limit_field = safe_find_or_logout(
            driver,
            By.CSS_SELECTOR,
            "div[id*='dialog-panel'] input[name='export_limit']",
            "Modal limit field"
        )
        limit_field.clear()
        limit_field.send_keys(str(limit))

        confirm_btn = safe_find_or_logout(
            driver,
            By.XPATH,
            "//div[@id[contains(., 'dialog-panel')]]//button[.//div[contains(text(),'خروجی گرفتن')]]",
            "Confirm export button"
        )
        driver.execute_script("arguments[0].scrollIntoView(true);", confirm_btn)
        driver.execute_script("arguments[0].click();", confirm_btn)
        print("Modal form submitted.")

        print("\n✅ Process finished successfully.")
        time.sleep(1)
        driver.quit()
        
        execution_status["last_result"] = {
            "success": True, 
            "message": "Process finished successfully",
            "email": target_email,
            "limit": limit
        }
        
    except Exception as e:
        error_msg = f"Error occurred: {str(e)}"
        print(f"❌ {error_msg}")
        execution_status["last_result"] = {
            "success": False, 
            "message": error_msg
        }
        
    finally:
        execution_status["running"] = False

# endpointها
@app.get("/")
async def root():
    return {"message": "Novinhub Robot API", "status": "active"}

@app.post("/run")
async def run_robot_endpoint(request: RunRequest = None):
    if execution_status["running"]:
        raise HTTPException(status_code=400, detail="Robot is already running")
    
    email = request.email if request else None
    limit = request.limit if request else None
    
    # اجرای مستقیم (بلوکینگ)
    run_robot(email, limit)

    return JSONResponse(
        status_code=200,
        content=execution_status["last_result"]
    )

@app.get("/status")
async def get_status():
    return execution_status
    
# ===== ENDPOINT جدید برای بررسی ایمیل =====
@app.get("/check-email")
async def check_gmail_for_export():
    """
    جیمیل را برای ایمیل حاوی فایل خروجی بررسی می‌کند.
    """
    print("در حال تلاش برای اتصال به سرویس جیمیل...")
    try:
        service = get_gmail_service()
        email_data = find_recent_email(service)
        
        if email_data:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "found",
                    "message": "ایمیل خروجی با موفقیت پیدا شد.",
                    "details": email_data
                }
            )
        else:
            raise HTTPException(
                status_code=404,
                detail="ایمیل مورد نظر هنوز دریافت نشده است. لطفاً چند لحظه دیگر دوباره تلاش کنید."
            )
            
    except HttpError as error:
        raise HTTPException(
            status_code=500,
            detail=f"خطا در ارتباط با Gmail API: {error}"
        )
    except Exception as e:
        # این بخش برای خطاهای مربوط به احراز هویت (مثلاً نبودن credentials.json) است
        raise HTTPException(
            status_code=500,
            detail=f"یک خطای داخلی رخ داد. ممکن است تنظیمات API صحیح نباشد: {e}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
