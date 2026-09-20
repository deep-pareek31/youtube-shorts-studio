# YouTube Automation & Shorts Studio 🚀

An end-to-end YouTube growth and automated production studio engineered to scale YouTube Shorts channels rapidly, detect viral outlier videos, slice high-retention clips, generate similar AI video concepts with matched lighting and voiceovers, and schedule automated multi-channel publishing.

Configured specifically for:
- **The Daily Shorts dot com** (`@thedailyE-shorts`) &mdash; Comedy, relatable daily life, street skits, and viral reaction Shorts.
- **TinyWonderTales** (`@tiinywondertales`) &mdash; AI animated bedtime stories, nursery rhymes, animal adventures, and calming moral tales for kids.

---

## 🌟 Core Features

- **Breakout Outlier Scanner (`/trending`)**: Automatically monitors competitor and inspiration channels (e.g. `@mrbeastshorts`, `@cocomelon`, `@supersimple`, `@dailycomedy`), calculates real-time **Outlier Multipliers** (e.g. 5.4x channel baseline), and identifies the psychological retention triggers behind breakout videos.
- **Dual Content Production Modes**:
  1. **Short Clips Mode (Extract 3–4 Shorts)**: Extracts 20–45s viral snippets with timestamps, viral scores, and hook justifications.
  2. **Similar AI Video Mode**: Generates brand-new visual concepts with matched cinematic lighting, voiceover script pacing (words-per-minute), and Midjourney/Runway prompt profiles.
- **YouTube Algorithm Description Engine**: Automatically formats descriptions with:
  - High curiosity hook above the 100-character mobile fold.
  - Semantic keyword synopsis for YouTube search & recommendation indexing.
  - Retention chapter timestamps (`00:00 - Hook`, `00:15 - Peak`, `00:30 - Moral/Punchline`).
  - Pinned comment engagement prompts to ignite comment velocity.
  - Optimal 3–5 hyper-targeted hashtags (`#shorts #thedailyEshorts ...`, `#shorts #tiinywondertales ...`).
- **Automated Scheduling Queue**: Daily post quotas, scheduled publishing times (e.g. 11:30 AM, 4:30 PM, 8:30 PM), manual approval workflows, and status tracking.
- **100% Free Always-On Cloud Deployment**: Pre-configured for Google Cloud Run, Vercel, and Render.

---

## 🚀 How to Export to GitHub

### Option A: 1-Click Export in AI Studio (Easiest)
1. In the **top-right navigation of Google AI Studio**, click the menu next to Share.
2. Select **Export to GitHub** (or **Download ZIP**).
3. Connect your GitHub account and choose a name (e.g., `youtube-shorts-automation-studio`).
4. Click **Export** &mdash; AI Studio pushes all files, schemas, and assets cleanly to your repository!

### Option B: Terminal Git Push
If you downloaded the code or cloned locally:
```bash
git init
git add .
git commit -m "feat: initial YouTube automation studio release"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/youtube-shorts-automation-studio.git
git push -u origin main
```

---

## 🌐 How to Deploy Live in the Real World

### 1. Google Cloud Run (Recommended &bull; 100% Free 24/7)
Google Cloud Run runs Docker containers with a permanent free tier of **2 million requests/month**:
1. Click the **Deploy** button directly in Google AI Studio.
2. Set Environment Variables:
   - `SESSION_SECRET` = `random_secure_string_here`
   - `YOUTUBE_API_KEY` = `your_google_cloud_youtube_data_api_v3_key` (Optional, studio has built-in offline caching)
3. Receive your permanent, live HTTPS URL: `https://your-studio.run.app`.

### 2. Vercel Deployment (Serverless)
This repository includes pre-configured `vercel.json` and `api/index.js` files for zero-configuration Vercel deployment:
1. Go to [vercel.com/new](https://vercel.com/new) and click **Import** next to your GitHub repository.
2. Under **Environment Variables**, add:
   - `SESSION_SECRET` = `any_secure_secret_key`
   - `YOUTUBE_API_KEY` = `your_youtube_api_key`
3. Click **Deploy**. Your app will be live at `https://your-repo.vercel.app` in under 60 seconds!
> *Note for 24/7 Automation on Vercel:* Because Vercel functions sleep when idle, create a free ping on [cron-job.org](https://cron-job.org) to hit `https://your-app.vercel.app/schedule` every 10 minutes to keep scheduled posts publishing 24/7.

### 3. Render or Railway (Always-On Background Worker)
1. Go to [render.com](https://render.com) and click **New &rarr; Web Service**.
2. Connect your GitHub repo.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Render runs your server 24/7 with active background cron jobs.

---

## 📈 The 30-Day Real-World YouTube Shorts Growth Roadmap (100K Subs)

### YouTube Partner Program (YPP) Shorts Monetization Criteria:
- **1,000 Subscribers**
- **10 Million valid public Shorts views within 90 days**

### Daily Publishing Formula:
- **@thedailyE-shorts**: 3 Shorts/day at **11:30 AM**, **04:30 PM**, and **08:30 PM**.
- **@tiinywondertales**: 3 Shorts/day at **08:00 AM**, **01:30 PM**, and **07:00 PM**.

### The 3 Critical Viral Metrics:
1. **Viewed vs. Swiped Away (VVSA) > 75%**:
   - The first 2 seconds determine 90% of your reach.
   - Use dynamic on-screen motion, bold high-contrast subtitles, and an immediate visual question.
2. **Average Percentage Viewed (APV) > 110%**:
   - Create seamless loops where the last second transitions directly into the opening sentence. Viewers will watch 1.3–1.6 times before swiping away, supercharging algorithmic distribution.
3. **Comment Velocity**:
   - Always pin a polarizing or engaging question in the comments (auto-generated in this studio) to spark debate and reply chains.

---

## 🛠️ Local Development Setup

1. **Clone repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/youtube-shorts-automation-studio.git
   cd youtube-shorts-automation-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env and set your SESSION_SECRET and YOUTUBE_API_KEY
   ```

4. **Start the local server:**
   ```bash
   npm run dev
   # Studio is running on http://localhost:3000
   ```

---

## 📄 License
MIT License &mdash; built for creators to scale high-velocity YouTube channels.
