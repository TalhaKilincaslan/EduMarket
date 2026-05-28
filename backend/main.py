from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, status, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean, UniqueConstraint, DateTime, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import OperationalError
from pydantic import BaseModel
from typing import List, Dict, Optional, Tuple
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
load_dotenv()

import uuid
import shutil
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# 1. Klasör ve Yol Ayarları (Docker Volume ile uyumlu)
STATIC_DIR = "/app/static"
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
PROFILE_PICS_DIR = os.path.join(UPLOAD_DIR, "profile_pics")
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)

# 2. Veritabanı Ayarları
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://edumarket_user:edumarket_password@db:5432/edumarket_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()

# 3. Veritabanı Modeli
class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    bio = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Moderation & Localization Columns
    is_active = Column(Boolean, default=True)
    is_chat_banned = Column(Boolean, default=False)
    ban_reason = Column(String, nullable=True)
    ban_until = Column(Float, nullable=True)
    university = Column(String, nullable=True)
    campus = Column(String, nullable=True)
    
    # Verification Columns
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String, nullable=True)

    products = relationship("ProductModel", foreign_keys="[ProductModel.owner_id]", back_populates="owner", cascade="all, delete-orphan")
    reviews_received = relationship("ReviewModel", foreign_keys="[ReviewModel.target_user_id]", back_populates="target_user", cascade="all, delete-orphan")
    reviews_given = relationship("ReviewModel", foreign_keys="[ReviewModel.reviewer_id]", back_populates="reviewer", cascade="all, delete-orphan")
    favorites = relationship("FavoriteModel", back_populates="user", cascade="all, delete-orphan")

class ProductModel(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, index=True, nullable=False)
    image_url = Column(String, nullable=True)
    is_featured = Column(Boolean, default=False)
    status = Column(String, default="active")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Services, Swaps, and Bundles Columns
    listing_type = Column(String, default="product")
    item_condition = Column(String, nullable=True)
    is_swappable = Column(Boolean, default=False)
    swap_description = Column(String, nullable=True)
    is_bundle = Column(Boolean, default=False)

    owner = relationship("UserModel", foreign_keys=[owner_id], back_populates="products")
    buyer = relationship("UserModel", foreign_keys=[buyer_id])

class MessageModel(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(Float, nullable=False)

    sender = relationship("UserModel", foreign_keys=[sender_id])
    receiver = relationship("UserModel", foreign_keys=[receiver_id])
    product = relationship("ProductModel")

class ReviewModel(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Float, nullable=False)
    comment = Column(String, nullable=True)
    timestamp = Column(Float, nullable=False)

    reviewer = relationship("UserModel", foreign_keys=[reviewer_id], back_populates="reviews_given")
    target_user = relationship("UserModel", foreign_keys=[target_user_id], back_populates="reviews_received")
    
    __table_args__ = (UniqueConstraint('reviewer_id', 'target_user_id', name='_reviewer_target_uc'),)

class FavoriteModel(Base):
    __tablename__ = "favorites"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    user = relationship("UserModel", back_populates="favorites")
    product = relationship("ProductModel")

    __table_args__ = (UniqueConstraint('user_id', 'product_id', name='_user_product_uc'),)

class OfferModel(Base):
    __tablename__ = "offers"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    offer_price = Column(Float, nullable=False)
    status = Column(String, default="pending") # pending, accepted, rejected
    timestamp = Column(Float, nullable=False)

    product = relationship("ProductModel")
    buyer = relationship("UserModel", foreign_keys=[buyer_id])

class ReportModel(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String, nullable=False) # 'product' or 'user'
    target_id = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, resolved
    timestamp = Column(Float, nullable=False)
    
    reporter = relationship("UserModel", foreign_keys=[reporter_id])

class NotificationModel(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    type = Column(String, nullable=False) # NEW_OFFER, OFFER_ACCEPTED, OFFER_REJECTED, PRODUCT_SOLD, SYSTEM_BAN, NEW_MESSAGE
    is_read = Column(Boolean, default=False)
    timestamp = Column(Float, nullable=False)

    user = relationship("UserModel")

def check_and_add_columns():
    try:
        print("Veritabanı kolon migrasyonu kontrol ediliyor...")
        with engine.begin() as conn:
            # Check users table columns
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users'"))
            columns = [row[0] for row in res.fetchall()]
            
            if 'is_active' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                print("Eklendi: users.is_active")
            if 'is_chat_banned' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_chat_banned BOOLEAN DEFAULT FALSE"))
                print("Eklendi: users.is_chat_banned")
            if 'ban_reason' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN ban_reason VARCHAR"))
                print("Eklendi: users.ban_reason")
            if 'ban_until' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN ban_until DOUBLE PRECISION"))
                print("Eklendi: users.ban_until")
            if 'university' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN university VARCHAR"))
                print("Eklendi: users.university")
            if 'campus' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN campus VARCHAR"))
                print("Eklendi: users.campus")
            if 'is_verified' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE"))
                print("Eklendi: users.is_verified")
            if 'verification_token' not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN verification_token VARCHAR"))
                print("Eklendi: users.verification_token")
                
            # Check products table columns
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='products'"))
            columns = [row[0] for row in res.fetchall()]
            
            if 'listing_type' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN listing_type VARCHAR DEFAULT 'product'"))
                print("Eklendi: products.listing_type")
            if 'item_condition' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN item_condition VARCHAR"))
                print("Eklendi: products.item_condition")
            if 'is_swappable' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN is_swappable BOOLEAN DEFAULT FALSE"))
                print("Eklendi: products.is_swappable")
            if 'swap_description' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN swap_description VARCHAR"))
                print("Eklendi: products.swap_description")
            if 'is_bundle' not in columns:
                conn.execute(text("ALTER TABLE products ADD COLUMN is_bundle BOOLEAN DEFAULT FALSE"))
                print("Eklendi: products.is_bundle")
            print("--- BAŞARILI: Veritabanı kolon migrasyonu tamamlandı! ---")
    except Exception as e:
        print(f"HATA: Kolon kontrolü/migrasyonu sırasında bir sorun oluştu: {e}")

# 4. DB Bağlantı ve Tablo Yaratımı (Race Condition Önleyici)
def init_db():
    retries = 10
    while retries > 0:
        try:
            print(f"Veritabanına bağlanılıyor... (Kalan deneme: {retries})")
            Base.metadata.create_all(bind=engine)
            print("--- BAŞARILI: Tablolar oluşturuldu! ---")
            check_and_add_columns()
            return
        except OperationalError:
            retries -= 1
            print("Veritabanı henüz uykuda, 3 saniye içinde tekrar denenecek...")
            time.sleep(3)
    print("KRİTİK HATA: Veritabanına ulaşılamadı!")
    exit(1)

# Backend başlamadan önce DB'yi hazırla
init_db()

# 5. FastAPI Başlatma
app = FastAPI(title="EduMarket API")

# Statik dosyaları dışarı aç (Resimlerin görünmesi için EN kritik satır)
app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

cors_origins_str = os.getenv("CORS_ORIGINS", "*")
allow_origins = ["*"] if cors_origins_str == "*" else [o.strip() for o in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 6. Auth Ayarları
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_edumarket_key")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 7. Pydantic Şemaları
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    university: str
    campus: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_admin: bool = False
    bio: str | None = None
    profile_image_url: str | None = None
    created_at: datetime
    is_active: bool = True
    is_chat_banned: bool = False
    ban_reason: str | None = None
    ban_until: float | None = None
    university: str | None = None
    campus: str | None = None
    is_verified: bool = False
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    profile_image_url: str | None = None
    university: str | None = None
    campus: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

class ProductCreate(BaseModel):
    title: str
    description: str | None = None
    price: float
    category: str
    image_url: str | None = None
    listing_type: str = "product"
    item_condition: str | None = None
    is_swappable: bool = False
    swap_description: str | None = None
    is_bundle: bool = False

class ProductOut(ProductCreate):
    id: int
    owner_id: int
    is_featured: bool = False
    status: str = "active"
    buyer_id: int | None = None
    owner_name: str | None = None
    owner_image: str | None = None
    owner_created_at: datetime | None = None
    can_review: bool = False
    owner_sales_count: int = 0
    class Config:
        from_attributes = True

class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    product_id: int
    content: str
    timestamp: float
    sender_name: str | None = None
    sender_image: str | None = None
    class Config:
        from_attributes = True

class ProductUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    price: float | None = None
    category: str | None = None
    image_url: str | None = None
    status: str | None = None
    buyer_id: int | None = None
    listing_type: str | None = None
    item_condition: str | None = None
    is_swappable: bool | None = None
    swap_description: str | None = None
    is_bundle: bool | None = None

class ReviewCreate(BaseModel):
    rating: float
    comment: str | None = None

class ReviewBase(BaseModel):
    reviewer_id: int
    target_user_id: int
    rating: float
    comment: str | None
    timestamp: float

class ReviewOut(ReviewBase):
    id: int
    reviewer_name: str | None = None
    reviewer_image: str | None = None
    class Config:
        from_attributes = True

class PotentialBuyer(BaseModel):
    id: int
    full_name: str
    profile_image_url: str | None = None

class SellProductRequest(BaseModel):
    buyer_id: int

class FavoriteOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    product: ProductOut | None = None
    class Config:
        from_attributes = True

class OfferCreate(BaseModel):
    offer_price: float

class OfferOut(BaseModel):
    id: int
    product_id: int
    buyer_id: int
    offer_price: float
    status: str
    timestamp: float
    buyer_name: str | None = None
    buyer_image: str | None = None
    class Config:
        from_attributes = True

class ReportCreate(BaseModel):
    target_type: str
    target_id: int
    reason: str
    description: str | None = None

class ReportOut(BaseModel):
    id: int
    reporter_id: int
    target_type: str
    target_id: int
    reason: str
    description: str | None = None
    status: str
    timestamp: float
    reporter_name: str | None = None
    target_user_id: int | None = None
    target_user_name: str | None = None
    target_title: str | None = None
    class Config:
        from_attributes = True

class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    type: str
    is_read: bool
    timestamp: float
    class Config:
        from_attributes = True

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AdminUserAction(BaseModel):
    action_type: str # "chat_ban", "global_ban", "warn"
    reason: str | None = None
    duration_hours: int | None = None
    report_id: int | None = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.active_chats: Dict[int, Tuple[int, int]] = {} # user_id -> (product_id, other_user_id)

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        if user_id in self.active_chats:
            del self.active_chats[user_id]

    def set_active_chat(self, user_id: int, product_id: int, other_user_id: int):
        self.active_chats[user_id] = (product_id, other_user_id)

    def clear_active_chat(self, user_id: int):
        if user_id in self.active_chats:
            del self.active_chats[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)

manager = ConnectionManager()

# Veritabanı Session Bağlantısı
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Oturum açmanız gerekiyor",
            headers={"WWW-Authenticate": "Bearer"},
        )
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz token veya oturum",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        raise credentials_exception
    return user
    
def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[UserModel]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return db.query(UserModel).filter(UserModel.email == email).first()
    except:
        return None

def get_current_admin_user(current_user: UserModel = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin yetkisi gerekli"
        )
    return current_user

def send_email_task(subject: str, recipient: str, html_content: str):
    mail_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    mail_port = int(os.getenv("MAIL_PORT", "587"))
    mail_username = os.getenv("MAIL_USERNAME", "")
    mail_password = os.getenv("MAIL_PASSWORD", "")
    mail_from = os.getenv("MAIL_FROM", mail_username)
    mail_starttls = os.getenv("MAIL_STARTTLS", "True").lower() in ("true", "1", "yes")
    mail_ssl_tls = os.getenv("MAIL_SSL_TLS", "False").lower() in ("true", "1", "yes")

    if not mail_username or not mail_password:
        print(f"UYARI: SMTP kimlik bilgileri girilmemiş. E-posta gönderilemedi. (Kime: {recipient})")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = mail_from
        msg['To'] = recipient
        msg['Subject'] = subject

        msg.attach(MIMEText(html_content, 'html', 'utf-8'))

        if mail_ssl_tls:
            server = smtplib.SMTP_SSL(mail_server, mail_port)
        else:
            server = smtplib.SMTP(mail_server, mail_port)
            
        if mail_starttls:
            server.starttls()
            
        server.login(mail_username, mail_password)
        server.sendmail(mail_from, recipient, msg.as_string())
        server.quit()
        print(f"E-posta başarıyla gönderildi: {recipient}")
    except Exception as e:
        print(f"HATA: E-posta gönderilemedi ({recipient}): {e}")

# 8. Endpointler (API Rotaları)
@app.get("/")
def health_check():
    return {"status": "EduMarket Backend Live", "storage": "persistent"}

@app.post("/auth/register", response_model=UserOut)
def register(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_lower = user.email.lower().strip()
    if not (email_lower.endswith('.edu') or email_lower.endswith('.edu.tr')):
        raise HTTPException(
            status_code=400, 
            detail="Yalnızca geçerli bir üniversite (.edu / .edu.tr) e-posta adresi ile kayıt olunabilir."
        )
        
    db_user = db.query(UserModel).filter(UserModel.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Bu e-posta adresi zaten kayıtlı")
    
    hashed_password = get_password_hash(user.password)
    token = str(uuid.uuid4())
    
    new_user = UserModel(
        email=user.email, 
        hashed_password=hashed_password, 
        full_name=user.full_name,
        university=user.university,
        campus=user.campus,
        is_verified=False,
        verification_token=token
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # E-posta gönderme işlemi
    subject = "EduMarket - E-posta Adresi Doğrulama"
    verification_link = f"{FRONTEND_URL}/eposta-dogrula?token={token}"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #3b82f6;">EduMarket'e Hoş Geldiniz!</h2>
            <p>Merhaba {new_user.full_name},</p>
            <p>EduMarket topluluğuna katıldığınız için teşekkür ederiz. Hesabınızı aktifleştirmek ve kampüs içi ticarete başlamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
            <p style="margin: 30px 0;">
                <a href="{verification_link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">E-postamı Doğrula</a>
            </p>
            <p>Bağlantı çalışmıyorsa, bu adresi tarayıcınıza kopyalayabilirsiniz:</p>
            <p><a href="{verification_link}">{verification_link}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #777;">Bu e-posta EduMarket hesabı oluşturulduğu için otomatik olarak gönderilmiştir. Eğer kayıt işlemini siz yapmadıysanız bu mesajı güvenle görmezden gelebilirsiniz.</p>
        </body>
    </html>
    """
    
    background_tasks.add_task(send_email_task, subject, new_user.email, html_content)
    
    return new_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Hatalı e-posta veya şifre")
    
    if not user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Lütfen e-posta adresinize gönderilen onay bağlantısına tıklayarak hesabınızı doğrulayın."
        )
    
    # Check if user is banned/inactive
    if not user.is_active:
        now = datetime.utcnow().timestamp()
        if user.ban_until and now > user.ban_until:
            # Ban has expired, reactivate user automatically!
            user.is_active = True
            user.ban_reason = None
            user.ban_until = None
            db.commit()
            db.refresh(user)
        else:
            reason = user.ban_reason or "Belirtilmedi"
            if user.ban_until:
                ban_end = datetime.fromtimestamp(user.ban_until).strftime('%d.%m.%Y %H:%M')
                detail_msg = f"Hesabınız geçici olarak dondurulmuştur. Sebep: {reason}. Ban bitiş tarihi: {ban_end}"
            else:
                detail_msg = f"Hesabınız kalıcı olarak dondurulmuştur. Sebep: {reason}"
            raise HTTPException(status_code=403, detail=detail_msg)
            
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email, 
            "id": user.id, 
            "full_name": user.full_name, 
            "is_admin": user.is_admin, 
            "profile_image_url": user.profile_image_url, 
            "bio": user.bio,
            "university": user.university,
            "campus": user.campus,
            "is_chat_banned": user.is_chat_banned
        }, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/verify-email")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.verification_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş doğrulama token'ı")
    user.is_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "E-posta başarıyla doğrulandı!"}

async def create_notification(db: Session, user_id: int, title: str, content: str, type: str):
    new_notif = NotificationModel(
        user_id=user_id,
        title=title,
        content=content,
        type=type,
        is_read=False,
        timestamp=datetime.utcnow().timestamp()
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)
    
    notif_data = {
        "id": new_notif.id,
        "user_id": new_notif.user_id,
        "title": new_notif.title,
        "content": new_notif.content,
        "type": new_notif.type,
        "is_read": new_notif.is_read,
        "timestamp": new_notif.timestamp
    }
    
    # Broadcast in real-time over WebSocket if user is online
    await manager.send_personal_message({
        "type": "NEW_NOTIFICATION",
        "notification": notif_data
    }, user_id)
    
    return new_notif

@app.get("/notifications", response_model=list[NotificationOut])
def get_notifications(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    return db.query(NotificationModel).filter(NotificationModel.user_id == current_user.id).order_by(NotificationModel.id.desc()).all()

@app.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def read_notification(notification_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    notif = db.query(NotificationModel).filter(NotificationModel.id == notification_id, NotificationModel.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@app.post("/notifications/read-all")
def read_all_notifications(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    db.query(NotificationModel).filter(NotificationModel.user_id == current_user.id, NotificationModel.is_read == False).update({NotificationModel.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "Tüm bildirimler okundu olarak işaretlendi."}

@app.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    print(f"E-posta sıfırlama isteği alındı: {req.email}")
    user = db.query(UserModel).filter(UserModel.email == req.email).first()
    if not user:
        return {"message": "Eğer e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi."}
    
    token = str(uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow().timestamp() + 3600 # 1 hour
    db.commit()
    
    # E-posta gönderme işlemi
    subject = "EduMarket - Şifre Sıfırlama Talebi"
    reset_link = f"{FRONTEND_URL}/sifre-sifirla?token={token}"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #3b82f6;">Şifre Sıfırlama Talebi</h2>
            <p>Merhaba {user.full_name},</p>
            <p>EduMarket hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için lütfen aşağıdaki bağlantıya tıklayın:</p>
            <p style="margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Şifremi Sıfırla</a>
            </p>
            <p>Bu bağlantı 1 saat boyunca geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız bu e-postayı dikkate almayabilirsiniz. Hesabınız güvendedir.</p>
            <p>Bağlantı çalışmıyorsa, bu adresi tarayıcınıza kopyalayabilirsiniz:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #777;">Bu e-posta EduMarket şifre sıfırlama talebiniz üzerine gönderilmiştir.</p>
        </body>
    </html>
    """
    
    background_tasks.add_task(send_email_task, subject, user.email, html_content)
    
    return {"message": "Eğer e-posta adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi."}

@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.reset_token == req.token).first()
    if not user or not user.reset_token_expires or datetime.utcnow().timestamp() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş token")
        
    user.hashed_password = get_password_hash(req.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"message": "Şifreniz başarıyla güncellendi. Artık giriş yapabilirsiniz."}

# Profile Endpoints
@app.get("/users/me")
def get_my_profile(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    products = db.query(ProductModel).filter(ProductModel.owner_id == current_user.id).all()
    reviews = db.query(ReviewModel).filter(ReviewModel.target_user_id == current_user.id).all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0
    return {
        "user": UserOut.model_validate(current_user),
        "products": products,
        "reviews": reviews,
        "average_rating": avg_rating,
        "review_count": len(reviews)
    }

@app.put("/users/me", response_model=UserOut)
def update_my_profile(update_data: UserProfileUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.bio is not None:
        current_user.bio = update_data.bio
    if update_data.profile_image_url is not None:
        current_user.profile_image_url = update_data.profile_image_url
    if update_data.university is not None:
        current_user.university = update_data.university
    if update_data.campus is not None:
        current_user.campus = update_data.campus
    db.commit()
    db.refresh(current_user)
    return current_user

@app.get("/users/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    if user_id == 0:
        raise HTTPException(status_code=400, detail="Geçersiz kullanıcı id")
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    products = db.query(ProductModel).filter(ProductModel.owner_id == user.id).all()
    reviews = db.query(ReviewModel).filter(ReviewModel.target_user_id == user.id).order_by(ReviewModel.timestamp.desc()).all()
    avg_rating = sum(r.rating for r in reviews) / len(reviews) if reviews else 0.0
    
    review_list = []
    for r in reviews:
        reviewer = db.query(UserModel).filter(UserModel.id == r.reviewer_id).first()
        r_dict = {
            "id": r.id,
            "reviewer_id": r.reviewer_id,
            "target_user_id": r.target_user_id,
            "rating": r.rating,
            "comment": r.comment,
            "timestamp": r.timestamp,
            "reviewer_name": reviewer.full_name if reviewer else "Bilinmeyen Kullanıcı",
            "reviewer_image": reviewer.profile_image_url if reviewer else None
        }
        review_list.append(r_dict)

    return {
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "bio": user.bio,
            "profile_image_url": user.profile_image_url,
            "is_admin": user.is_admin
        },
        "products": products,
        "reviews": review_list,
        "average_rating": avg_rating,
        "review_count": len(reviews)
    }

@app.post("/users/upload-profile-picture")
async def upload_profile_picture(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    MAX_SIZE = 5 * 1024 * 1024
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5MB'den büyük olamaz.")
    
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Sadece JPEG, PNG ve WEBP formatları desteklenir.")
    
    file_ext = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(PROFILE_PICS_DIR, file_name)
    
    with open(file_path, "wb") as f:
        f.write(content)
        
    relative_path = f"/static/uploads/profile_pics/{file_name}"
    current_user.profile_image_url = relative_path
    db.commit()
    return {"profile_image_url": relative_path}

# Review Endpoints
@app.post("/users/{user_id}/reviews")
def create_review(user_id: int, review: ReviewCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinize yorum yapamazsınız")
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    existing = db.query(ReviewModel).filter(ReviewModel.reviewer_id == current_user.id, ReviewModel.target_user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcıya daha önce yorum yaptınız")
        
    # Check if current_user has bought any product from user_id
    bought_something = db.query(ProductModel).filter(
        ProductModel.owner_id == user_id, 
        ProductModel.buyer_id == current_user.id, 
        ProductModel.status == "sold"
    ).first()
    
    if not bought_something:
        raise HTTPException(status_code=403, detail="Sadece bu satıcıdan ürün satın alan kişiler değerlendirme yapabilir.")
        
    new_review = ReviewModel(
        reviewer_id=current_user.id,
        target_user_id=user_id,
        rating=review.rating,
        comment=review.comment,
        timestamp=datetime.utcnow().timestamp()
    )
    db.add(new_review)
    db.commit()
    return {"message": "Yorum başarıyla eklendi"}

@app.get("/users/{user_id}/reviews")
def get_user_reviews(user_id: int, db: Session = Depends(get_db)):
    reviews = db.query(ReviewModel).filter(ReviewModel.target_user_id == user_id).order_by(ReviewModel.timestamp.desc()).all()
    return reviews

# Favorite Endpoints
@app.post("/products/{product_id}/favorite")
def add_favorite(product_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="İlan bulunamadı")
        
    existing = db.query(FavoriteModel).filter(FavoriteModel.user_id == current_user.id, FavoriteModel.product_id == product_id).first()
    if existing:
        return {"message": "Zaten favorilerinizde"}
        
    new_fav = FavoriteModel(user_id=current_user.id, product_id=product_id)
    db.add(new_fav)
    db.commit()
    return {"message": "Favorilere eklendi"}

@app.delete("/products/{product_id}/favorite")
def remove_favorite(product_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    fav = db.query(FavoriteModel).filter(FavoriteModel.user_id == current_user.id, FavoriteModel.product_id == product_id).first()
    if fav:
        db.delete(fav)
        db.commit()
    return {"message": "Favorilerden çıkarıldı"}

@app.get("/me/favorites/ids")
def get_my_favorite_ids(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    favs = db.query(FavoriteModel.product_id).filter(FavoriteModel.user_id == current_user.id).all()
    return [f[0] for f in favs]

@app.get("/me/favorites")
def get_my_favorites(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    favs = db.query(FavoriteModel).filter(FavoriteModel.user_id == current_user.id).all()
    products = [fav.product for fav in favs if fav.product]
    return products

@app.post("/upload")
def upload_image(file: UploadFile = File(...)):
    # Dosya ismini benzersiz yap (uuid)
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Frontend'in kullanacağı URL yolunu dön
    return {"image_url": f"/static/uploads/{unique_filename}"}

@app.post("/products", response_model=ProductOut)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    db_product = ProductModel(**product.model_dump(), owner_id=current_user.id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products", response_model=list[ProductOut])
def get_products(
    search: str | None = None,
    category: str | None = None,
    is_featured: bool | None = None,
    is_bundle: bool | None = None,
    campus: str | None = None,
    sort_by: str | None = None,
    limit: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProductModel)
    
    if search:
        query = query.filter(ProductModel.title.ilike(f"%{search}%"))
    if category:
        query = query.filter(ProductModel.category.ilike(category))
    if is_featured is not None:
        query = query.filter(ProductModel.is_featured == is_featured)
    if is_bundle is not None:
        query = query.filter(ProductModel.is_bundle == is_bundle)
    if campus:
        query = query.join(UserModel, ProductModel.owner_id == UserModel.id).filter(UserModel.campus.ilike(f"%{campus}%"))
        
    if sort_by == "fiyat_artan":
        query = query.order_by(ProductModel.price.asc())
    elif sort_by == "fiyat_azalan":
        query = query.order_by(ProductModel.price.desc())
    else:
        query = query.order_by(ProductModel.id.desc())
        
    if limit:
        query = query.limit(limit)
        
    return query.all()

@app.get("/products/recent", response_model=list[ProductOut])
def get_recent_products(db: Session = Depends(get_db)):
    return db.query(ProductModel).order_by(ProductModel.id.desc()).limit(8).all()

@app.get("/products/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: Optional[UserModel] = Depends(get_current_user_optional)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    owner = db.query(UserModel).filter(UserModel.id == product.owner_id).first()
    owner_sales_count = db.query(ProductModel).filter(ProductModel.owner_id == product.owner_id, ProductModel.status == "sold").count()
    
    can_review = False
    if current_user and product.status == "sold" and product.buyer_id == current_user.id:
        # Check if already reviewed
        existing_review = db.query(ReviewModel).filter(ReviewModel.reviewer_id == current_user.id, ReviewModel.target_user_id == product.owner_id).first()
        if not existing_review:
            can_review = True
            
    return {
        **product.__dict__,
        "owner_name": owner.full_name if owner else "Bilinmeyen Satıcı",
        "owner_image": owner.profile_image_url if owner else None,
        "owner_created_at": owner.created_at if owner else None,
        "can_review": can_review,
        "owner_sales_count": owner_sales_count
    }

@app.get("/products/{product_id}/potential-buyers", response_model=List[PotentialBuyer])
def get_potential_buyers(product_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece ilan sahibi bu listeyi görebilir")
    
    messages = db.query(MessageModel).filter(MessageModel.product_id == product_id).all()
    user_ids = set()
    for msg in messages:
        if msg.sender_id != current_user.id:
            user_ids.add(msg.sender_id)
        if msg.receiver_id != current_user.id:
            user_ids.add(msg.receiver_id)
            
    if not user_ids:
        return []
        
    users = db.query(UserModel).filter(UserModel.id.in_(list(user_ids))).all()
    return [PotentialBuyer(id=u.id, full_name=u.full_name, profile_image_url=u.profile_image_url) for u in users]

@app.patch("/products/{product_id}/sell", response_model=ProductOut)
async def sell_product(product_id: int, sell_req: SellProductRequest, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece ilan sahibi bu işlemi yapabilir")
    
    product.status = "sold"
    product.buyer_id = sell_req.buyer_id
    db.commit()
    db.refresh(product)
    
    owner = db.query(UserModel).filter(UserModel.id == product.owner_id).first()
    owner_sales_count = db.query(ProductModel).filter(ProductModel.owner_id == product.owner_id, ProductModel.status == "sold").count()
    
    await create_notification(
        db,
        user_id=sell_req.buyer_id,
        title="Tebrikler, ürünü satın aldınız!",
        content=f"Tebrikler, '{product.title}' ürününü satın aldınız! Satıcı {current_user.full_name} ile iletişime geçebilirsiniz.",
        type="PRODUCT_SOLD"
    )

    return {
        **product.__dict__,
        "owner_name": owner.full_name if owner else "Bilinmeyen Satıcı",
        "owner_image": owner.profile_image_url if owner else None,
        "owner_created_at": owner.created_at if owner else None,
        "can_review": False,
        "owner_sales_count": owner_sales_count
    }

@app.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, product_update: ProductUpdate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Bu ürünü güncellemeye yetkiniz yok")
        
    if product_update.title is not None:
        product.title = product_update.title
    if product_update.description is not None:
        product.description = product_update.description
    if product_update.price is not None:
        product.price = product_update.price
    if product_update.category is not None:
        product.category = product_update.category
    if product_update.image_url is not None:
        product.image_url = product_update.image_url
    if product_update.status is not None:
        product.status = product_update.status
    if product_update.buyer_id is not None:
        product.buyer_id = product_update.buyer_id
    if product_update.listing_type is not None:
        product.listing_type = product_update.listing_type
    if product_update.item_condition is not None:
        product.item_condition = product_update.item_condition
    if product_update.is_swappable is not None:
        product.is_swappable = product_update.is_swappable
    if product_update.swap_description is not None:
        product.swap_description = product_update.swap_description
    if product_update.is_bundle is not None:
        product.is_bundle = product_update.is_bundle
        
    db.commit()
    db.refresh(product)
    
    owner = db.query(UserModel).filter(UserModel.id == product.owner_id).first()
    return {
        **product.__dict__,
        "owner_name": owner.full_name if owner else "Bilinmeyen Satıcı",
        "owner_image": owner.profile_image_url if owner else None,
        "owner_created_at": owner.created_at if owner else None
    }

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bu ürünü silmeye yetkiniz yok")
    
    db.delete(product)
    db.commit()
    return {"message": "Ürün başarıyla silindi"}

# 9. Admin Endpointleri
@app.get("/admin/users", response_model=list[UserOut])
def get_all_users(db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    return db.query(UserModel).all()

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    db.delete(user)
    db.commit()
    return {"message": "Kullanıcı ve ilanları başarıyla silindi"}

@app.delete("/admin/products/{product_id}")
def admin_delete_product(product_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    db.delete(product)
    db.commit()
    return {"message": "İlan başarıyla silindi (Admin yetkisi)"}

@app.patch("/admin/products/{product_id}/feature")
def toggle_feature_product(product_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    product.is_featured = not product.is_featured
    db.commit()
    db.refresh(product)
    return {"message": "İlan durumu güncellendi", "is_featured": product.is_featured}

# 10. WebSockets & Chat Endpointleri
@app.websocket("/ws/chat/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = user.id
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "SET_ACTIVE_CHAT":
                manager.set_active_chat(user_id, data["product_id"], data["other_user_id"])
                continue
            elif data.get("type") == "CLEAR_ACTIVE_CHAT":
                manager.clear_active_chat(user_id)
                continue

            # Re-fetch user from DB to get the latest ban state
            db.refresh(user)
            if user.is_chat_banned:
                now = datetime.utcnow().timestamp()
                if user.ban_until and now > user.ban_until:
                    # Chat ban expired, lift it
                    user.is_chat_banned = False
                    user.ban_reason = None
                    user.ban_until = None
                    db.commit()
                    db.refresh(user)
                else:
                    reason = user.ban_reason or "Kural ihlali"
                    if user.ban_until:
                        ban_end = datetime.fromtimestamp(user.ban_until).strftime('%d.%m.%Y %H:%M')
                        err_msg = f"Sohbet engeliniz bulunuyor. Sebep: {reason}. Engel bitiş: {ban_end}"
                    else:
                        err_msg = f"Sohbet engeliniz bulunuyor. Sebep: {reason} (Kalıcı)"
                    
                    await websocket.send_json({
                        "type": "ERROR",
                        "content": err_msg  # send message content
                    })
                    continue
            
            new_message = MessageModel(
                sender_id=user_id,
                receiver_id=data["receiver_id"],
                product_id=data["product_id"],
                content=data["content"],
                timestamp=datetime.utcnow().timestamp()
            )
            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            message_dict = {
                "type": "NEW_MESSAGE",
                "id": new_message.id,
                "sender_id": new_message.sender_id,
                "receiver_id": new_message.receiver_id,
                "product_id": new_message.product_id,
                "content": new_message.content,
                "timestamp": new_message.timestamp,
                "sender_name": user.full_name,
                "sender_image": user.profile_image_url
            }

            print("Bildirim sinyali gönderildi")
            await manager.send_personal_message(message_dict, user_id)
            if data["receiver_id"] != user_id:
                await manager.send_personal_message(message_dict, data["receiver_id"])
                
                # Check if receiver is in this exact chat
                receiver_chat = manager.active_chats.get(data["receiver_id"])
                is_in_chat = False
                if receiver_chat and receiver_chat[0] == data["product_id"] and receiver_chat[1] == user_id:
                    is_in_chat = True
                    
                if not is_in_chat:
                    await create_notification(
                        db,
                        user_id=data["receiver_id"],
                        title=f"{user.full_name} kullanıcısından yeni bir mesajınız var.",
                        content=data["content"][:60] + "..." if len(data["content"]) > 60 else data["content"],
                        type="NEW_MESSAGE"
                    )
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        manager.disconnect(websocket, user_id)

@app.get("/chat/history/{product_id}/{other_user_id}", response_model=list[MessageOut])
def get_chat_history(product_id: int, other_user_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    messages = db.query(MessageModel).filter(
        MessageModel.product_id == product_id,
        ((MessageModel.sender_id == current_user.id) & (MessageModel.receiver_id == other_user_id)) |
        ((MessageModel.sender_id == other_user_id) & (MessageModel.receiver_id == current_user.id))
    ).order_by(MessageModel.timestamp.asc()).all()
    
    result = []
    for m in messages:
        m_dict = {
            **m.__dict__,
            "sender_name": m.sender.full_name if m.sender else "Bilinmeyen",
            "sender_image": m.sender.profile_image_url if m.sender else None
        }
        result.append(m_dict)
    return result

@app.get("/admin/chats")
def get_admin_chats(db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    messages = db.query(MessageModel).order_by(MessageModel.timestamp.desc()).all()
    chats = {}
    for msg in messages:
        users = tuple(sorted([msg.sender_id, msg.receiver_id]))
        key = f"{msg.product_id}_{users[0]}_{users[1]}"
        if key not in chats:
            chats[key] = {
                "product_id": msg.product_id,
                "product_title": msg.product.title if msg.product else "Bilinmeyen Ürün",
                "user1_id": users[0],
                "user1_name": msg.sender.full_name if users[0] == msg.sender_id else msg.receiver.full_name,
                "user2_id": users[1],
                "user2_name": msg.receiver.full_name if users[1] == msg.receiver_id else msg.sender.full_name,
                "last_message": msg.content,
                "last_timestamp": msg.timestamp
            }
    return list(chats.values())

@app.get("/admin/chats/{product_id}/{user1_id}/{user2_id}", response_model=list[MessageOut])
def get_admin_chat_history(product_id: int, user1_id: int, user2_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    messages = db.query(MessageModel).filter(
        MessageModel.product_id == product_id,
        ((MessageModel.sender_id == user1_id) & (MessageModel.receiver_id == user2_id)) |
        ((MessageModel.sender_id == user2_id) & (MessageModel.receiver_id == user1_id))
    ).order_by(MessageModel.timestamp.asc()).all()
    return messages

@app.get("/chats")
def get_user_chats(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    messages = db.query(MessageModel).filter(
        (MessageModel.sender_id == current_user.id) | (MessageModel.receiver_id == current_user.id)
    ).order_by(MessageModel.timestamp.desc()).all()
    
    chats = {}
    for msg in messages:
        other_user_id = msg.receiver_id if msg.sender_id == current_user.id else msg.sender_id
        key = f"{msg.product_id}_{other_user_id}"
        if key not in chats:
            chats[key] = {
                "product_id": msg.product_id,
                "product_title": msg.product.title if msg.product else "Bilinmeyen Ürün",
                "other_user_id": other_user_id,
                "other_user_name": msg.receiver.full_name if msg.sender_id == current_user.id else msg.sender.full_name,
                "other_user_image": msg.receiver.profile_image_url if msg.sender_id == current_user.id else msg.sender.profile_image_url,
                "last_message": msg.content,
                "last_timestamp": msg.timestamp
            }
    return list(chats.values())

@app.delete("/admin/messages/{message_id}")
def admin_delete_message(message_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    msg = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı")
    db.delete(msg)
    db.commit()
    return {"message": "Mesaj başarıyla silindi"}

# 11. Offer Endpoints
@app.post("/products/{product_id}/offers", response_model=OfferOut)
async def create_offer(product_id: int, offer: OfferCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi ürününüze teklif veremezsiniz")
    if product.status == "sold":
        raise HTTPException(status_code=400, detail="Bu ürün zaten satılmış")

    # Check if existing pending offer exists
    existing_offer = db.query(OfferModel).filter(OfferModel.product_id == product_id, OfferModel.buyer_id == current_user.id, OfferModel.status == "pending").first()
    if existing_offer:
        raise HTTPException(status_code=400, detail="Bu ürüne zaten açık bir teklifiniz var")

    new_offer = OfferModel(
        product_id=product_id,
        buyer_id=current_user.id,
        offer_price=offer.offer_price,
        timestamp=datetime.utcnow().timestamp()
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    # Notify product owner via WebSocket
    message_dict = {
        "type": "NEW_OFFER",
        "offer_id": new_offer.id,
        "product_id": product_id,
        "product_title": product.title,
        "buyer_id": current_user.id,
        "buyer_name": current_user.full_name,
        "offer_price": new_offer.offer_price,
        "timestamp": new_offer.timestamp
    }
    await manager.send_personal_message(message_dict, product.owner_id)

    await create_notification(
        db,
        user_id=product.owner_id,
        title="Ürününüz için yeni bir teklif var!",
        content=f"{current_user.full_name}, '{product.title}' ilanınız için {new_offer.offer_price} ₺ teklif verdi.",
        type="NEW_OFFER"
    )

    return {**new_offer.__dict__, "buyer_name": current_user.full_name, "buyer_image": current_user.profile_image_url}

@app.get("/products/{product_id}/offers", response_model=list[OfferOut])
def get_product_offers(product_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    if product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece ilan sahibi teklifleri görebilir")

    offers = db.query(OfferModel).filter(OfferModel.product_id == product_id).order_by(OfferModel.timestamp.desc()).all()
    result = []
    for o in offers:
        buyer = db.query(UserModel).filter(UserModel.id == o.buyer_id).first()
        result.append({
            **o.__dict__,
            "buyer_name": buyer.full_name if buyer else "Bilinmeyen",
            "buyer_image": buyer.profile_image_url if buyer else None
        })
    return result

@app.get("/me/offers", response_model=list[OfferOut])
def get_my_offers(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    offers = db.query(OfferModel).filter(OfferModel.buyer_id == current_user.id).order_by(OfferModel.timestamp.desc()).all()
    result = []
    for o in offers:
        result.append({
            **o.__dict__,
            "buyer_name": current_user.full_name,
            "buyer_image": current_user.profile_image_url
        })
    return result

@app.patch("/offers/{offer_id}/accept")
async def accept_offer(offer_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        
    product = db.query(ProductModel).filter(ProductModel.id == offer.product_id).first()
    if not product or product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece ilan sahibi teklifi kabul edebilir")
        
    if product.status == "sold":
         raise HTTPException(status_code=400, detail="Bu ürün zaten satılmış")

    # Accept this offer
    offer.status = "accepted"
    
    # Reject all other pending offers for this product
    other_offers = db.query(OfferModel).filter(OfferModel.product_id == product.id, OfferModel.id != offer_id, OfferModel.status == "pending").all()
    for o in other_offers:
        o.status = "rejected"
        # Optional: notify rejected buyers here

    # Update product
    product.status = "sold"
    product.buyer_id = offer.buyer_id
    product.price = offer.offer_price # Update the product price to the agreed offer price
    
    db.commit()

    # Notify buyer via WebSocket
    message_dict = {
        "type": "OFFER_ACCEPTED",
        "offer_id": offer.id,
        "product_id": product.id,
        "product_title": product.title
    }
    await manager.send_personal_message(message_dict, offer.buyer_id)

    await create_notification(
        db,
        user_id=offer.buyer_id,
        title="Teklifiniz kabul edildi!",
        content=f"'{product.title}' ilanı için verdiğiniz {offer.offer_price} ₺ değerindeki teklif satıcı tarafından kabul edildi.",
        type="OFFER_ACCEPTED"
    )

    await create_notification(
        db,
        user_id=offer.buyer_id,
        title="Tebrikler, ürünü satın aldınız!",
        content=f"Tebrikler, '{product.title}' ürününü satın aldınız! Satıcı {current_user.full_name} ile iletişime geçebilirsiniz.",
        type="PRODUCT_SOLD"
    )

    return {"message": "Teklif kabul edildi ve ürün satıldı olarak işaretlendi."}

@app.patch("/offers/{offer_id}/reject")
async def reject_offer(offer_id: int, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    offer = db.query(OfferModel).filter(OfferModel.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Teklif bulunamadı")
        
    product = db.query(ProductModel).filter(ProductModel.id == offer.product_id).first()
    if not product or product.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sadece ilan sahibi teklifi reddedebilir")

    offer.status = "rejected"
    db.commit()

    # Notify buyer via WebSocket
    message_dict = {
        "type": "OFFER_REJECTED",
        "offer_id": offer.id,
        "product_id": product.id,
        "product_title": product.title
    }
    await manager.send_personal_message(message_dict, offer.buyer_id)

    await create_notification(
        db,
        user_id=offer.buyer_id,
        title="Teklifiniz reddedildi.",
        content=f"'{product.title}' ilanı için verdiğiniz {offer.offer_price} ₺ değerindeki teklif satıcı tarafından reddedildi.",
        type="OFFER_REJECTED"
    )

    return {"message": "Teklif reddedildi."}


# 12. Report Endpoints
@app.post("/reports", response_model=ReportOut)
def create_report(report: ReportCreate, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    if report.target_type not in ["product", "user"]:
        raise HTTPException(status_code=400, detail="Geçersiz hedef tipi (product veya user olmalı)")
        
    new_report = ReportModel(
        reporter_id=current_user.id,
        target_type=report.target_type,
        target_id=report.target_id,
        reason=report.reason,
        description=report.description,
        timestamp=datetime.utcnow().timestamp()
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    return {**new_report.__dict__, "reporter_name": current_user.full_name}

@app.get("/admin/reports", response_model=list[ReportOut])
def get_admin_reports(db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    reports = db.query(ReportModel).order_by(ReportModel.timestamp.desc()).all()
    result = []
    for r in reports:
        reporter = db.query(UserModel).filter(UserModel.id == r.reporter_id).first()
        reporter_name = reporter.full_name if reporter else "Bilinmeyen"
        
        target_user_id = None
        target_user_name = None
        target_title = None
        
        if r.target_type == "user":
            target_user = db.query(UserModel).filter(UserModel.id == r.target_id).first()
            if target_user:
                target_user_id = target_user.id
                target_user_name = target_user.full_name
                target_title = f"Kullanıcı: {target_user.full_name}"
        elif r.target_type == "product":
            product = db.query(ProductModel).filter(ProductModel.id == r.target_id).first()
            if product:
                target_title = f"İlan: {product.title}"
                owner = db.query(UserModel).filter(UserModel.id == product.owner_id).first()
                if owner:
                    target_user_id = owner.id
                    target_user_name = owner.full_name
                    
        result.append({
            **r.__dict__,
            "reporter_name": reporter_name,
            "target_user_id": target_user_id,
            "target_user_name": target_user_name,
            "target_title": target_title
        })
    return result

@app.patch("/admin/reports/{report_id}/resolve")
def resolve_report(report_id: int, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapor bulunamadı")
        
    report.status = "resolved"
    db.commit()
    return {"message": "Rapor çözüldü olarak işaretlendi."}

@app.post("/admin/users/{user_id}/action")
async def admin_user_action(user_id: int, action: AdminUserAction, db: Session = Depends(get_db), admin_user: UserModel = Depends(get_current_admin_user)):
    target_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
        
    now = datetime.utcnow().timestamp()
    duration_str = ""
    
    if action.action_type == "chat_ban":
        target_user.is_chat_banned = True
        target_user.ban_reason = action.reason
        if action.duration_hours:
            target_user.ban_until = now + (action.duration_hours * 3600)
            duration_str = f" ({action.duration_hours} saatliğine)"
        else:
            target_user.ban_until = None
            duration_str = " (Kalıcı olarak)"
            
    elif action.action_type == "global_ban":
        target_user.is_active = False
        target_user.ban_reason = action.reason
        if action.duration_hours:
            target_user.ban_until = now + (action.duration_hours * 3600)
            duration_str = f" ({action.duration_hours} saatliğine)"
        else:
            target_user.ban_until = None
            duration_str = " (Kalıcı olarak)"
            
    elif action.action_type == "warn":
        target_user.ban_reason = f"UYARI: {action.reason}"
        target_user.ban_until = None
        duration_str = " (Uyarı gönderildi)"
        
    else:
        raise HTTPException(status_code=400, detail="Geçersiz aksiyon tipi")
        
    if action.report_id:
        report = db.query(ReportModel).filter(ReportModel.id == action.report_id).first()
        if report:
            report.status = "resolved"
            
    db.commit()
    db.refresh(target_user)
    
    action_labels = {
        "chat_ban": "Sohbet Engeli",
        "global_ban": "Hesap Dondurma",
        "warn": "Uyarı"
    }
    action_label = action_labels.get(action.action_type, "Moderasyon Aksiyonu")
    
    await create_notification(
        db,
        user_id=target_user.id,
        title="Hesabınız hakkında moderasyon işlemi uygulandı.",
        content=f"Moderasyon Tipi: {action_label}{duration_str}. Gerekçe: {action.reason or 'Belirtilmedi'}.",
        type="SYSTEM_BAN"
    )

    return {
        "message": f"Kullanıcıya başarıyla aksiyon uygulandı: {action.action_type}{duration_str}",
        "user": UserOut.model_validate(target_user)
    }