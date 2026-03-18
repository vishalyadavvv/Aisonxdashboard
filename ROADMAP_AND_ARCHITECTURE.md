# AI Brand Visibility Checker - Architecture & Roadmap

## 1. Project Overview
**Goal:** Build a tool that queries major AI engines to check how a brand is perceived, cited, and summarized. This is a **Generative Engine Optimization (GEO)** tool.

## 2. Recommended AI Tools (APIs)
To check brand visibility, we need APIs that can **browse the live web** or access up-to-date knowledge. Most standard LLMs (like base GPT-4) have training cutoffs, so they aren't good for checking *current* visibility without a "search" component.

| AI Engine | API Strategy | Why use it? |
| :--- | :--- | :--- |
| **Perplexity AI** | **Perplexity API** (`sonar-reasoning-pro` or `sonar`) | **#1 Choice.** It is a native "Answer Engine" with live internet access. It cites sources, which is perfect for GEO tracking. |
| **Google Gemini** | **Gemini API** (with Grounding/Search) | Google's answers are increasingly AI-driven. Using Gemini ensures you capture the Google ecosystem. |
| **ChatGPT** | **OpenAI API** (GPT-4o) | The standard for most users. *Note:* To simulate "SearchGPT", we may need to combine this with a search tool (like Tavily) or use specific browsing capabilities if available. |
| **Microsoft Copilot**| **Bing Search API** + **Azure OpenAI** | Copilot relies on Bing. Querying Bing gives you the raw data Copilot uses. |

**MVP Recommendation:** Start with **Perplexity API** and **Gemini API**. They are the easiest to integrate for "live checking".

## 3. System Architecture

### Tech Stack
*   **Frontend:** React (Vite) + Tailwind CSS (Modern, fast UI).
*   **Backend:** Node.js + Express (Handle API rate limits and secrets).
*   **Database:** MongoDB (Store search history, brand reports, and snapshots of AI answers).

### Data Flow
1.  **User Input:** User enters "Brand Name" + "Keywords" (e.g., "Nike running shoes").
2.  **Backend Dispatch:** Express server sends parallel requests to:
    *   Perplexity API (Query: "What are the best Nike running shoes? Give citations.")
    *   Gemini API (Query: "Tell me about Nike's latest running shoes.")
3.  **Processing:**
    *   **Sentiment Analysis:** Use a lightweight local LLM or the same APIs to score the response (Positive/Neutral/Negative).
    *   **Citation Extraction:** Regex/Parsing to find which websites the AI recommended.
4.  **Frontend Display:** Show cards for each AI with:
    *   "The Answer" (What the AI said).
    *   "Sources Cited" (Did it link to your website?).
    *   "Sentiment Score".

## 4. Development Roadmap

### Phase 1: Foundation (Current Status)
*   [x] Initialize Project (Frontend & Backend).
*   [x] Install Dependencies (Express, Mongoose, Tailwind).
*   [ ] Set up MongoDB Connection.
*   [ ] Create Basic UI Layout (Sidebar, Input Field).

### Phase 2: API Integration (The Core)
*   [ ] Get API Keys (Perplexity, Gemini, OpenAI).
*   [ ] Create Backend Route `/api/analyze`.
*   [ ] Implement **Perplexity Service**: Function to send query and get text + citations.
*   [ ] Implement **Gemini Service**: Function to send query.

### Phase 3: The Dashboard
*   [ ] Create `ResultsCard` component to display AI answers nicely.
*   [ ] Add "Loading States" (AI takes 2-5 seconds to reply).
*   [ ] logic to highlight legitimate brand mentions in the text.

### Phase 4: Advanced GEO Metrics
*   [ ] **Share of Voice:** Function to calculate how often the brand is mentioned vs competitors.
*   [ ] **Source Tracking:** List which websites (blogs, news) the AI is reading to form its opinion.
*   [ ] **PDF Export:** "Download GEO Report".

## 5. Directory Structure
```
GEO/
├── backend/
│   ├── config/      # DB connection
│   ├── models/      # MongoDB Schemas (Report.js)
│   ├── routes/      # API routes (analyze.js)
│   ├── services/    # AI Integration (perplexity.js, gemini.js)
│   └── server.js    # Main entry
└── frontend/
    ├── src/
    │   ├── components/  # AnalyverView, ResultsCard
    │   ├── api/         # Axios setup
    │   └── App.jsx
```
