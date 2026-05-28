import os

base_dir = "."

# Ensure dirs exist
dirs = ["gateway", "auth-service", "product-service"]
for d in dirs:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

# docker-compose.yml
docker_compose = """version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: edumarket_user
      POSTGRES_PASSWORD: edumarket_password
      POSTGRES_DB: edumarket_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  gateway:
    build: ./gateway
    ports:
      - "8000:8000"
    depends_on:
      - product-service
      - auth-service

  auth-service:
    build: ./auth-service
    environment:
      - DATABASE_URL=postgresql://edumarket_user:edumarket_password@postgres:5432/edumarket_db
    depends_on:
      - postgres

  product-service:
    build: ./product-service
    environment:
      - DATABASE_URL=postgresql://edumarket_user:edumarket_password@postgres:5432/edumarket_db
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - gateway

volumes:
  pgdata:
"""

with open(os.path.join(base_dir, "docker-compose.yml"), "w") as f:
    f.write(docker_compose)

# Gateway
with open(os.path.join(base_dir, "gateway", "Dockerfile"), "w") as f:
    f.write("FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\", \"--reload\"]\n")

with open(os.path.join(base_dir, "gateway", "requirements.txt"), "w") as f:
    f.write("fastapi\nuvicorn\nhttpx\n")

gateway_main = """from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI(title="API Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.api_route("/api/products/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_product(request: Request, path: str):
    async with httpx.AsyncClient() as client:
        url = f"http://product-service:8000/{path}"
        req = client.build_request(request.method, url, headers=request.headers.raw, content=await request.body())
        res = await client.send(req)
        return Response(content=res.content, status_code=res.status_code, headers=dict(res.headers))

@app.get("/")
def health_check():
    return {"status": "Gateway is running"}
"""
with open(os.path.join(base_dir, "gateway", "main.py"), "w") as f:
    f.write(gateway_main)

# Auth-Service
with open(os.path.join(base_dir, "auth-service", "Dockerfile"), "w") as f:
    f.write("FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\", \"--reload\"]\n")

with open(os.path.join(base_dir, "auth-service", "requirements.txt"), "w") as f:
    f.write("fastapi\nuvicorn\n")

with open(os.path.join(base_dir, "auth-service", "main.py"), "w") as f:
    f.write("from fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get('/')\ndef auth_root():\n    return {'message': 'Auth service placeholder'}\n")

# Product-Service
with open(os.path.join(base_dir, "product-service", "Dockerfile"), "w") as f:
    f.write("FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\", \"--reload\"]\n")

with open(os.path.join(base_dir, "product-service", "requirements.txt"), "w") as f:
    f.write("fastapi\nuvicorn\nsqlalchemy\npsycopg2-binary\npydantic\n")

product_main = """from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://edumarket_user:edumarket_password@postgres:5432/edumarket_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProductModel(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String, index=True, nullable=False)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Product Service")

# Pydantic Schemas
class ProductCreate(BaseModel):
    title: str
    description: str | None = None
    price: float
    category: str

class ProductOut(ProductCreate):
    id: int
    class Config:
        from_attributes = True

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/products", response_model=ProductOut)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    db_product = ProductModel(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products", response_model=list[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(ProductModel).all()

@app.get("/")
def health_check():
    return {"status": "Product Service is up"}
"""
with open(os.path.join(base_dir, "product-service", "main.py"), "w") as f:
    f.write(product_main)

print("Setup completed.")
