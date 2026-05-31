# 🎓 EduMarket

![Vibe Coding](https://img.shields.io/badge/Vibe%20Coding-AI%20Assisted-blueviolet?style=for-the-badge&logo=openai&logoColor=white)

EduMarket, üniversite öğrencilerinin kendi aralarında güvenli, hızlı ve kampüs odaklı bir şekilde ürün/ilan alışverişi yapabilmelerini, canlı olarak mesajlaşabilmelerini sağlayan **Full-Stack ve Production-Ready (Canlı Ortama Hazır)** bir web platformudur.

Proje, kurumsal standartlarda mikroservis mimarisine, konteynerizasyon altyapısına ve yüksek performanslı sunucu optimizasyonlarına sahiptir.

---

## 🚀 Teknolojik Altyapı (Tech Stack)

### 💻 Frontend
* **Framework:** Next.js (App Router, Production Build & Static Page Optimization)
* **Styling:** Tailwind CSS (Responsive Tasarım)
* **Dil:** TypeScript

### ⚙️ Backend & API
* **Framework:** FastAPI (Python) - Yüksek performanslı, asenkron ve hızlı API mimarisi
* **Veritabanı ORM:** SQLAlchemy & Alembic (Veri göçü yönetimi)
* **Doğrulama Sistemi:** JWT (JSON Web Tokens) ile güvenli session yönetimi
* **İletişim:** Canlı sohbet ve anlık bildirimler için **WebSockets**

### 🛠️ DevOps & Altyapı (Production Mimari)
* **Konteynerizasyon:** Docker & Docker Compose (İzole ortam yönetimi)
* **Reverse Proxy & Web Sunucu:** Nginx (Trafik yönlendirme, Güvenlik duvarı ve Port gizleme)
* **Veritabanı:** PostgreSQL 15 (İlişkisel veritabanı yönetimi)
* **E-Posta Servisi:** Gmail SMTP (Gerçek zamanlı aktivasyon ve doğrulama mailleri)

---

## 🛡️ Canlı Ortam (Production) ve Güvenlik Mimarisi

Proje yerel bilgisayardan (localhost) çıkarılıp canlı bulut sunucusuna (VPS) taşınırken şu profesyonel mühendislik adımları uygulanmıştır:

1. **Nginx Reverse Proxy:** Dış dünyaya açılan `:3000` ve `:8000` gibi tüm hassas portlar kapatılmıştır. Sunucuya gelen tüm istekler standart `80` portundan Nginx tarafından karşılanır ve Docker konteynerlarına güvenli bir şekilde dağıtılır.
2. **Çevre Değişkenleri (.env):** Veritabanı şifreleri, kullanıcı adları, SMTP anahtarları ve JWT gizli kodları kesinlikle kaynak kodların (`docker-compose.yml` vb.) içine sabit yazılmamış; tamamen `.env` değişkenlerine bağlanarak GitHub ortamından gizlenmiştir.
3. **Next.js Optimize Build:** Geliştirici (Dev) modunun sunucuda yarattığı hantallık ve %100 CPU kilitlenmeleri, `npm run build` ile optimize edilerek aşılmış ve sunucu rölanti performansına çekilmiştir.
4. **Hata Toleransı (Resend Token):** Doğrulama e-postalarının süresi bittiğinde veya mükerrer isteklerde sistemin kilitlenmesini önleyen akıllı e-posta yenileme (`resend-verification`) mekanizması kurulmuştur.

---

## 📦 Kurulum ve Canlıya Alma (Deployment)

Projenin canlı sunucuda veya yerel ortamda ayağa kaldırılması tek bir komutla Docker Compose üzerinden yürütülmektedir.

### 1. Çevre Değişkenlerinin Hazırlanması

Ana dizinde bir `.env` dosyası oluşturun ve şu bilgileri tanımlayın:

```env
DB_USER=senin_db_kullanicin
DB_PASSWORD=senin_guclu_db_sifren
DB_NAME=senin_db_ismin
```
Backend klasörünün içindeki .env dosyasında ise SMTP ve JWT ayarlarını yapılandırın:

```
MAIL_USERNAME=senin_gmail_adresin@gmail.com
MAIL_PASSWORD=google_uygulama_sifren
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com
FRONTEND_URL=http://sunucu_ip_adresiniz
```
2. Sistemin Ateşlenmesi
Tüm sistemi izole konteynerlar halinde ayağa kaldırmak ve build etmek için ana dizinde şu komutu çalıştırın:
```
docker compose up -d --build
```
📊 Veritabanı İzleme (Database Management)
Canlı PostgreSQL veritabanı, sunucu dışından doğrudan erişime kapatılmış olup, güvenli port yönlendirmeleri ile DBeaver veya pgAdmin gibi profesyonel araçlarla anlık olarak izlenebilmekte ve yönetilebilmektedir.

