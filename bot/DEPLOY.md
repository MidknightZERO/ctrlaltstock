# CtrlAltStock Blog Bot — Deployment Guide

This guide walks you through setting up the automated blog pipeline on either your **NAS** or a **VPS**, with Netlify/Cloudflare Pages auto-deploying on every article push.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- Git with SSH key access to your GitHub repo
- Your `.env` file filled out (copy `bot/.env.example` to `bot/.env`)

---

> ### 🚀 Zero-Setup "Keyless Mode"
> The bot now supports **Keyless Mode**. If you don't provide Reddit or Unsplash keys:
> - **Reddit**: Falls back to public `.json` scraping (works immediately).
> - **Unsplash**: Falls back to high-quality rotating tech images.
> - **Amazon**: Falls back to search-based affiliate URLs using your partner tag.
> You can start generating articles right now without registering for any accounts!

---

## Option A: NAS Deployment (Free AI via Ollama)

### 1. Install Python Dependencies
```bash
cd /path/to/ctrlaltstock-frontend
pip3 install -r bot/requirements.txt
```

### 2. Set Up Environment
```bash
cp bot/.env.example bot/.env
nano bot/.env
# Fill in: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET,
#          OLLAMA_BASE_URL (e.g. http://localhost:11434),
#          AMAZON_PARTNER_TAG, UNSPLASH_ACCESS_KEY,
#          REPO_PATH, DISCORD_WEBHOOK_URL
# Set AI_PROVIDER=ollama
```

### 3. Configure Git SSH
```bash
# Generate an SSH key for the bot
ssh-keygen -t ed25519 -C "ctrlaltstock-bot" -f ~/.ssh/ctrlaltstock_bot

# Add the public key to GitHub:
# Settings → Deploy Keys → Add key (with write access)
cat ~/.ssh/ctrlaltstock_bot.pub

# Configure git to use this key
git config --global core.sshCommand "ssh -i ~/.ssh/ctrlaltstock_bot"
```

### 4. Set Up Cron Job (Runs Every 30 Minutes)
```bash
crontab -e
# Add this line:
*/30 * * * * cd /path/to/ctrlaltstock-frontend && /usr/bin/python3 bot/scheduler.py --once >> bot/logs/cron.log 2>&1
```

### 5. Test a Single Run
```bash
cd /path/to/ctrlaltstock-frontend
python3 bot/scheduler.py --once --dry-run
# Check bot/logs/scheduler.log for output
```

---

## Option B: VPS Deployment (OpenAI API)

### 1. SSH into VPS and Clone Repo
```bash
ssh user@your-vps-ip
git clone git@github.com:SaaSquatch-Ltd/ctrlaltstock-frontend.git
cd ctrlaltstock-frontend
```

### 2. Install Dependencies
```bash
# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install Python deps
pip3 install -r bot/requirements.txt

# Install Node deps (for npm run build:blog)
npm install
```

### 3. Set Up Environment
```bash
cp bot/.env.example bot/.env
nano bot/.env
# Fill in all API keys
# Set AI_PROVIDER=openai
# Set REPO_PATH=/path/to/ctrlaltstock-frontend
```

### 4. Configure Git SSH (same as Option A, step 3)

### 5. Set Up Systemd Timer or Cron
```bash
# Cron approach (simplest): run pipeline every 30 minutes
crontab -e
*/30 * * * * cd /path/to/ctrlaltstock-frontend && python3 bot/scheduler.py --once >> bot/logs/cron.log 2>&1
```

---

## Netlify / Cloudflare Pages Build Hook

This causes your site to rebuild automatically when the bot pushes a new article.

### Netlify
1. Go to **Site Settings → Build & deploy → Build hooks**
2. Click **Add build hook** → Name it `blog-bot` → Copy the URL
3. Add to `bot/.env`: `BUILD_HOOK_URL=https://api.netlify.com/build_hooks/YOUR_HOOK_ID`

### Cloudflare Pages
1. Go to your Pages project → **Settings → Build hooks**
2. Create a hook → Copy the URL
3. Add to `bot/.env`: `BUILD_HOOK_URL=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/YOUR_ID`

> The bot pings this URL after every successful git push, triggering a fresh site build.

---

## Reddit App Setup (Required)

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Click **Create another app**
3. Choose **script**
4. Name: `CtrlAltStock Blog Bot`
5. Redirect URI: `http://localhost:8080` (unused but required)
6. Copy the **client ID** (under the app name) and **secret**
7. Add to `bot/.env`:
   ```
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_secret
   REDDIT_USER_AGENT=CtrlAltStock/1.0 by u/YOUR_USERNAME
   ```

---

## Amazon PA-API Setup (Optional, Recommended)

1. Log in to [affiliate-program.amazon.co.uk](https://affiliate-program.amazon.co.uk)
2. Go to **Tools → Product Advertising API**
3. Follow the setup steps to get your **Access Key** and **Secret Key**
4. Add to `bot/.env`:
   ```
   AMAZON_ACCESS_KEY=your_access_key
   AMAZON_SECRET_KEY=your_secret_key
   AMAZON_PARTNER_TAG=ctrlaltstock-21
   ```

> **Note:** If you don't have PA-API access, the bot still works! It generates Amazon search URLs with your affiliate tag — users who click and buy anything within 24 hours still earn you commission.

---

## Unsplash API Setup

1. Register at [unsplash.com/developers](https://unsplash.com/developers)
2. Create a new application
3. Copy your **Access Key**
4. Add to `bot/.env`: `UNSPLASH_ACCESS_KEY=your_key`

---

## Discord Webhook for Notifications

1. In your Discord server, right-click on your admin/bot-channel → **Edit Channel**
2. **Integrations → Webhooks → New Webhook**
3. Copy the webhook URL
4. Add to `bot/.env`: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`

The bot will notify you on every successful publish and on any failures.

---

## Monitoring

```bash
# View recent publishes
tail -f bot/logs/publish.log

# View scheduler output
tail -f bot/logs/scheduler.log

# View scraper output
tail -f bot/logs/scraper.log

# View cron output (if using cron)
tail -f bot/logs/cron.log
```

---

## Testing

```bash
# 1. Test scraper (no writes to DB)
python3 bot/scraper.py --dry-run

# 2. Test AI writer
python3 bot/ai_writer.py --test

# 3. Test Amazon linker
python3 bot/amazon_linker.py --test

# 4. Full pipeline, dry run (no git push, no file writes)
python3 bot/scheduler.py --once --dry-run
```

---

## Pipeline health check

Use this to confirm the scraper and OpenRouter are working and that articles are generated from live sources.

1. **Scraper:** From the repo root, run:
   ```bash
   python3 bot/scraper.py --dry-run
   ```
   You should see one story printed as JSON to stdout. Logs go to `bot/logs/scraper.log`. If you see "No story found", either no items passed relevance/recency or they were already in `seen_posts.db`; you can remove or rename `bot/seen_posts.db` to force new stories.

2. **Full pipeline (dry run):** Set in `bot/.env`: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (default is a free model; see `bot/.env.example`), `AI_PROVIDER=openrouter`, `REPO_PATH=<path to repo root>`. Then run:
   ```bash
   python3 bot/scheduler.py --once --dry-run
   ```
   Check `bot/logs/scheduler.log`: you should see "Story selected", "Calling OpenRouter", "Article drafted", "Running editorial pass", and a second OpenRouter call, with no publish failure. A **429** from OpenRouter means rate limiting (free-tier limits apply, e.g. 20 req/min, 200/day). The pipeline uses two calls per article (writer + editor); running one article every 30 minutes via cron is recommended.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `git push` fails | Check your SSH key is added to GitHub deploy keys with write access |
| `npm run build:blog` fails | Run `npm install` in the repo root first |
| No stories found | Check Reddit credentials & RSS feeds are returning data (run scraper with `--dry-run`) |
| Ollama timeout | Increase `timeout=120` in `ai_writer.py` or ensure Ollama has enough RAM |
| PA-API access denied | You need 3 qualifying sales in 180 days; use the search URL fallback in the meantime |
| Cron not running | Check `crontab -l` to verify the job; check `/var/log/syslog` for cron errors |
