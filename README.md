# 🚀 LolzCrash — Educational Crash Betting Game

> **⚠️ Disclaimer:** This project is built purely for **educational purposes** to demonstrate full-stack web development concepts including user auth, real-time game logic, admin panels, and payment workflows. No real money is involved by default.

---

## 📁 Project Structure

```
lolzcrash/
├── server.js               # Main Express backend
├── package.json            # Node dependencies
├── .env.example            # Environment variable template
├── .gitignore
├── Procfile                # For Heroku/Railway deployment
├── data/                   # Auto-created JSON database files
│   ├── users.json
│   ├── deposits.json
│   ├── withdrawals.json
│   ├── support.json
│   └── gameHistory.json
└── public/                 # All frontend files (served statically)
    ├── index.html          # Home + Crash Game
    ├── login.html
    ├── signup.html
    ├── dashboard.html
    ├── deposit.html
    ├── withdraw.html
    ├── support.html
    ├── faq.html
    ├── admin-login.html
    ├── admin.html
    ├── css/
    │   └── style.css       # Full dark theme stylesheet
    └── js/
        ├── utils.js        # Shared API/Toast/Auth helpers
        └── crash.js        # Crash game engine (canvas)
```

---

## ⚙️ Local Setup

### Prerequisites
- **Node.js** v16 or higher — [Download](https://nodejs.org)
- **npm** (comes with Node.js)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/lolzcrash.git
cd lolzcrash

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — change SESSION_SECRET and ADMIN_CODE

# 4. Start the server
npm start

# For development with auto-restart:
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## 🔑 Default Credentials

| Role  | Access |
|-------|--------|
| Admin | Go to `/admin/login` → Enter code: `Pakistan786` |
| User  | Register at `/signup` (gets 10–20 PKR welcome bonus) |

> **Change the admin code** in `.env` → `ADMIN_CODE=YourSecretCode`

---

## 🌐 Deployment Guide

---

### Option 1: Railway (Easiest — Free Tier Available)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your `lolzcrash` repo
4. Add environment variables in Railway dashboard:
   - `SESSION_SECRET` = any long random string
   - `ADMIN_CODE` = your secret code
   - `PORT` = 3000
5. Railway auto-deploys on every push ✅

---

### Option 2: Render (Free Tier)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** Node
5. Add environment variables under **Environment** tab
6. Click **Deploy** ✅

---

### Option 3: DigitalOcean Droplet (VPS — Full Control)

```bash
# On your local machine — SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repo
git clone https://github.com/YOUR_USERNAME/lolzcrash.git
cd lolzcrash
npm install

# Create .env
nano .env
# Paste your environment variables, save with Ctrl+X

# Start with PM2 (keeps running after logout)
pm2 start server.js --name lolzcrash
pm2 save
pm2 startup

# Optional: Set up Nginx reverse proxy on port 80
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/lolzcrash
```

Nginx config:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/lolzcrash /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Add SSL with Certbot (HTTPS):
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

---

### Option 4: AWS EC2

1. Launch an **EC2 t2.micro** instance (free tier) with Ubuntu 22.04
2. Open port **3000** (or 80/443) in Security Group inbound rules
3. SSH into instance:

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install PM2
sudo npm install -g pm2

# Clone and run
git clone https://github.com/YOUR_USERNAME/lolzcrash.git
cd lolzcrash
npm install
cp .env.example .env
nano .env   # Set your values

pm2 start server.js --name lolzcrash
pm2 save && pm2 startup
```

---

### Option 5: Heroku

```bash
# Install Heroku CLI, then:
heroku login
heroku create lolzcrash-app

heroku config:set SESSION_SECRET=your_secret_here
heroku config:set ADMIN_CODE=Pakistan786

git push heroku main
heroku open
```

> **Note:** Heroku's free tier was discontinued. Use Railway or Render for free hosting.

---

## 🔧 Environment Variables

| Variable         | Default         | Description                        |
|------------------|-----------------|------------------------------------|
| `PORT`           | `3000`          | Server port                        |
| `SESSION_SECRET` | `lolzcrash_secret_key_2024` | Express session secret (change this!) |
| `ADMIN_CODE`     | `Pakistan786`   | Admin panel access code            |

---

## 💳 Payment Configuration

All deposits/withdrawals are manual. Payment details are hardcoded in `deposit.html`:

| Field          | Value         |
|----------------|---------------|
| Account Number | `03247720266` |
| Name           | Abdullah      |
| Methods        | JazzCash, EasyPaisa |

To change these, edit:
- `public/deposit.html` — the payment details section
- `server.js` — no changes needed (TX ID is just stored)

---

## 🛡️ Admin Panel

Access at: `/admin/login`

**Features:**
- 📊 Overview stats (users, balances, pending requests)
- 👥 User management (view, ban/unban, edit balance)
- 💳 Deposit approval/rejection (auto-credits user on approval)
- 💸 Withdrawal approval/rejection (auto-refunds on rejection)
- 💬 Support ticket management with reply functionality

---

## 🎮 Game Logic

The crash game uses an exponential growth function:

```
multiplier = e^(0.1 * elapsed_seconds)
```

Crash point is generated with house edge (~3%):
```javascript
if (Math.random() < 0.03) return 1.0;  // instant crash
const result = 0.97 / (1 - Math.random());
return Math.min(result, 200);
```

---

## 🔒 Security Notes

- Passwords are hashed with **bcrypt** (10 rounds)
- Sessions expire after 24 hours
- Input validation on all API routes
- Admin routes protected by session middleware
- Duplicate transaction IDs are rejected

---

## 🚀 GitHub Setup

```bash
# Initialize and push to GitHub
git init
git add .
git commit -m "Initial commit - LolzCrash v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lolzcrash.git
git push -u origin main
```

---

## 📞 Contact / Telegram

Telegram: [@lolzcrash](https://t.me/lolzcrash)

---

## 📜 License

MIT — Educational use only. Do not use for real-money gambling without proper licensing.
