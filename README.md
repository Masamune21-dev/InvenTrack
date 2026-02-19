# 🏭 InvenTrack — Sistem Inventaris Aset

Aplikasi web untuk manajemen inventaris perangkat dengan fitur barcode scanner, check-in/check-out, dashboard interaktif, dan role-based access control.

---

## 📋 Fitur

- **Dashboard** — Statistik stok, grafik pergerakan barang, alert stok menipis
- **Manajemen Aset** — CRUD, search, filter, generate & cetak barcode
- **Scanner Barcode** — Dukungan kamera webcam & scanner USB/Bluetooth
- **Check-in / Check-out** — Catat pengambilan & pengembalian barang
- **Riwayat Transaksi** — Log lengkap semua pergerakan
- **Manajemen User** — Kelola akun pengguna (admin only)
- **RBAC** — Admin (akses penuh) vs Staff (scan & transaksi)
- **Security** — Rate limiting, security headers, JWT authentication

---

## ⚙️ Prasyarat

- **Node.js** versi 18 atau lebih baru
- **Windows 10/11** atau **Ubuntu 20.04+**

---

# 🪟 Instalasi di Windows

### 1. Install Node.js

1. Buka https://nodejs.org → download versi **LTS**
2. Jalankan installer, centang semua opsi default
3. Buka **Command Prompt** baru, verifikasi:
   ```cmd
   node --version
   ```

### 2. Setup Project

```cmd
cd C:\path\ke\inventory-app
copy .env.example .env
```

Generate JWT Secret:
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Buka file `.env`, paste hasilnya ke `JWT_SECRET=`.

### 3. Install & Jalankan

```cmd
npm install
npm start
```

### 4. Buka Browser

```
http://localhost:3000
```

Login: `admin` / `admin123` → segera ubah password di menu **Kelola User**.

---

# � Instalasi di Ubuntu Server (Production + Domain)

Panduan lengkap untuk deploy di VPS/server Ubuntu dengan domain dan HTTPS.

### 1. Update Sistem & Install Node.js

```bash
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi
node --version
npm --version
```

### 2. Install MariaDB (Opsional - untuk skala besar)

> **Catatan:** Aplikasi ini menggunakan SQLite secara default, sudah cukup untuk 1-50 user. MariaDB direkomendasikan jika:
> - Data aset > 10.000 item
> - User aktif > 50 orang bersamaan
> - Butuh backup & replikasi database tingkat enterprise

```bash
# Install MariaDB
sudo apt install -y mariadb-server

# Amankan instalasi
sudo mysql_secure_installation
# Jawab: Set root password? Y → masukkan password
# Remove anonymous users? Y
# Disallow root login remotely? Y
# Remove test database? Y
# Reload privilege tables? Y

# Buat database & user untuk InvenTrack
sudo mysql -u root -p
```

```sql
CREATE DATABASE inventrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'inventrack'@'localhost' IDENTIFIED BY 'password_anda_disini';
GRANT ALL PRIVILEGES ON inventrack.* TO 'inventrack'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Mengaktifkan MariaDB di InvenTrack

Setelah database MariaDB siap, ikuti 3 langkah ini:

**1.** Install dependency MySQL:
```bash
npm install mysql2
```

**2.** Edit `server.js`, ubah 1 baris:
```diff
- const { initDb, saveDb } = require('./backend/db');
+ const { initDb, saveDb } = require('./backend/db-mysql');
```

**3.** Tambahkan config MySQL di `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=inventrack
DB_PASSWORD=password_anda_disini
DB_NAME=inventrack
```

Restart aplikasi — selesai! Tidak perlu ubah file lain.

### 3. Upload & Setup Project

```bash
# Buat direktori aplikasi
sudo mkdir -p /var/www/inventrack
cd /var/www/inventrack

# Upload file project (dari komputer lokal via SCP)
# Jalankan ini di komputer lokal:
# scp -r inventory-app/* user@ip-server:/var/www/inventrack/

# Setup environment
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Edit .env, paste JWT_SECRET
nano .env
```

Isi `.env`:
```env
PORT=3000
JWT_SECRET=paste_hasil_generate_disini
JWT_EXPIRES=24h
```

```bash
# Install dependencies
npm install

# Test jalankan
node server.js
# Kalau muncul banner InvenTrack, tekan Ctrl+C untuk lanjut setup
```

### 4. Setup PM2 (Auto-start & Keep Alive)

```bash
# Install PM2
sudo npm install -g pm2

# Jalankan aplikasi
pm2 start server.js --name inventrack

# Auto-start saat server reboot
pm2 startup
pm2 save
```

Perintah PM2:
```bash
pm2 status              # Cek status
pm2 logs inventrack     # Lihat log
pm2 restart inventrack  # Restart
pm2 stop inventrack     # Stop
```

### 5. Setup Nginx (Reverse Proxy + Domain)

```bash
sudo apt install -y nginx

# Buat konfigurasi
sudo nano /etc/nginx/sites-available/inventrack
```

Paste konfigurasi berikut (ganti `inventaris.domain.com` dengan domain Anda):

```nginx
server {
    listen 80;
    server_name inventaris.domain.com;

    # Redirect ke HTTPS (aktifkan setelah setup SSL)
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Upload limit
        client_max_body_size 10M;
    }
}
```

```bash
# Aktifkan site
sudo ln -s /etc/nginx/sites-available/inventrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL/HTTPS (Gratis via Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Generate sertifikat SSL (pastikan domain sudah pointing ke IP server)
sudo certbot --nginx -d inventaris.domain.com

# Certbot akan otomatis:
# - Generate sertifikat SSL
# - Update konfigurasi Nginx
# - Setup auto-renewal

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Setup Firewall

```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 8. Setup Domain (di Panel DNS)

Di panel domain Anda (Cloudflare / Niagahoster / dll), tambahkan:

| Type | Name | Value |
|------|------|-------|
| A | inventaris | IP address server Anda |

Tunggu 5-30 menit propagasi DNS, lalu akses:
```
https://inventaris.domain.com
```

---

## 🌐 Akses dari Komputer Lain (Jaringan Lokal)

Untuk akses tanpa domain (jaringan lokal):

```cmd
ipconfig                    # Windows - catat IPv4
ip addr show                # Ubuntu - catat inet
```

Dari komputer lain, buka: `http://IP-SERVER:3000`

---

## 💾 Data & Backup

| Item | Lokasi Windows | Lokasi Ubuntu |
|------|--------------|-------------|
| Database | `data\inventrack.db` | `/var/www/inventrack/data/inventrack.db` |
| Config | `.env` | `/var/www/inventrack/.env` |

### Backup Otomatis (Ubuntu)

```bash
# Buat script backup harian
sudo nano /etc/cron.daily/backup-inventrack
```

```bash
#!/bin/bash
BACKUP_DIR="/home/backup/inventrack"
mkdir -p $BACKUP_DIR
cp /var/www/inventrack/data/inventrack.db $BACKUP_DIR/inventrack_$(date +%Y%m%d).db
# Hapus backup lebih dari 30 hari
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
```

```bash
sudo chmod +x /etc/cron.daily/backup-inventrack
```

---

## 🔒 Keamanan

| Fitur | Detail |
|-------|--------|
| Password | Hashed dengan bcrypt |
| Login token | JWT dengan secret dari `.env` |
| Rate limiting login | Maks 10 percobaan / 15 menit per IP |
| Rate limiting API | Maks 120 request / menit per IP |
| Security headers | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection |
| Graceful shutdown | Ctrl+C / SIGTERM otomatis save database |

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `'node' is not recognized` | Restart CMD / terminal setelah install Node.js |
| `EADDRINUSE: port 3000` | Port sudah dipakai. Ganti `PORT=4000` di `.env` |
| `npm install` error | Pastikan internet aktif, jalankan sebagai Administrator / sudo |
| Kamera scanner tidak bisa | Kamera hanya via `localhost` atau `https` |
| Halaman blank | Buka Developer Tools (F12) → Console |
| Terlalu banyak percobaan login | Tunggu 15 menit, atau restart server |
| 502 Bad Gateway (Nginx) | Pastikan PM2 berjalan: `pm2 status` |
| SSL tidak bisa | Pastikan domain sudah pointing ke IP server dan port 80/443 terbuka |

---

## 📁 Struktur Project

```
inventory-app/
├── .env                 # Konfigurasi (PORT, JWT_SECRET)
├── .env.example         # Template konfigurasi
├── .gitignore           # File yang diabaikan Git
├── package.json         # Dependencies
├── server.js            # Entry point server
├── data/
│   └── inventrack.db    # Database SQLite (auto-generated)
├── backend/
│   ├── db.js            # Database SQLite (default)
│   ├── db-mysql.js      # Database MariaDB/MySQL (alternatif)
│   └── routes/
│       ├── auth.js      # Login & JWT middleware
│       ├── assets.js    # CRUD aset
│       ├── transactions.js  # Check-in/out
│       └── users.js     # Manajemen user
└── src/
    ├── index.css        # Stylesheet
    ├── app.js           # Router & layout
    ├── main.js          # Entry point frontend
    ├── modules/
    │   ├── store.js     # API client
    │   ├── auth.js      # Auth helper
    │   └── barcode.js   # Barcode helper
    └── pages/
        ├── login.js
        ├── dashboard.js
        ├── assets.js
        ├── scanner.js
        ├── transactions.js
        ├── history.js
        └── users.js
```

---

## 📁 Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Node.js + Express.js |
| Database | SQLite (default) / MariaDB / MySQL |
| Auth | JWT + bcrypt |
| Frontend | HTML5 + Vanilla JS + CSS |
| Charts | Chart.js |
| Barcode | JsBarcode + html5-qrcode |
| Icons | Font Awesome 6 |
| Font | Inter (Google Fonts) |
| Reverse Proxy | Nginx (production) |
| SSL | Let's Encrypt / Certbot |
| Process Manager | PM2 |
