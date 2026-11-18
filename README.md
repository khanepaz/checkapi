# API LAB – Universal API Testing & Analysis Workbench

A professional, modern, fully client-side API testing and analysis platform.

**Live Demo (after deploy):** `https://khanepaz.github.io/checkapi/`

## Features

- **Universal API Support** – OpenAI, Google Gemini, OpenRouter, Groq, Together AI, DeepSeek, and any custom REST API
- **Request Builder** – Provider mode or full custom URL, GET/POST, query params, headers, JSON body
- **Authentication** – Bearer, API Key (header/query), Basic, Custom Header, Auto-suggest based on provider
- **Response Viewer** – Pretty (syntax-highlighted JSON), Raw, Preview, Headers
- **Intelligent Analyzer** – Rule-based analysis of status codes, JSON structure, common API errors, CORS/network issues
- **Request History** – Stored locally; credentials are **never** saved
- **Import / Export** – Share request configs as JSON (without secrets)
- **Dark / Light theme**
- **English + Persian (RTL)** interface
- **Fully static** – no backend required, works on GitHub Pages

## Tech Stack

- HTML5 + CSS3
- Vanilla JavaScript (ES6+)
- Fetch API
- LocalStorage
- Modular JS architecture

No React, Vue, Node.js, or mandatory backend.

## Project Structure

```
api-lab/
├── index.html
├── css/
│   ├── style.css
│   └── themes.css
├── js/
│   ├── app.js
│   ├── request.js
│   ├── auth.js
│   ├── providers.js
│   ├── response.js
│   ├── analyzer.js
│   ├── history.js
│   ├── settings.js
│   └── utils.js
├── data/
│   └── providers.json
├── assets/
└── README.md
```

## Quick Start (Local)

1. Clone the repository:
   ```bash
   git clone https://github.com/khanepaz/checkapi.git
   cd checkapi
   ```

2. Open `index.html` in a modern browser  
   **or** serve with any static server:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```

3. Open the URL shown (e.g. `http://localhost:8080`).

## Deploy to GitHub Pages

1. Push this repository to GitHub (already done if you are reading this from the repo).
2. Go to **Settings → Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Branch: `main`, Folder: `/ (root)`.
5. Save. After a minute your site will be live at:
   `https://<username>.github.io/checkapi/`

## Security Notes

- API keys and tokens are **never** written to LocalStorage or history.
- Credentials are only held in memory for the duration of a single request.
- The application runs entirely in the browser. Do **not** use shared or organizational secrets in a public environment.
- CORS restrictions are enforced by the browser and the remote API. This tool cannot bypass them.
- Response HTML is never executed (no unsafe `innerHTML` of untrusted content).

## Supported Providers (default)

| Provider       | Base URL                                      | Default Auth   |
|----------------|-----------------------------------------------|----------------|
| OpenAI         | `https://api.openai.com/v1`                   | Bearer         |
| Google Gemini  | `https://generativelanguage.googleapis.com/v1beta` | API Key (Query) |
| OpenRouter     | `https://openrouter.ai/api/v1`                | Bearer         |
| Groq           | `https://api.groq.com/openai/v1`              | Bearer         |
| Together AI    | `https://api.together.xyz/v1`                 | Bearer         |
| DeepSeek       | `https://api.deepseek.com`                    | Bearer         |
| Custom API     | (user defined)                                | None           |

You can add, edit, or remove providers via the Providers panel (custom ones are stored locally).

## Test Checklist

- [ ] GET request to a public endpoint succeeds
- [ ] POST request with JSON body works
- [ ] Bearer token authentication works
- [ ] API Key in query works (e.g. Gemini)
- [ ] Custom headers are sent
- [ ] Query parameters are appended correctly
- [ ] Invalid JSON body shows validation error
- [ ] Response Pretty view highlights JSON
- [ ] Analyzer correctly identifies 401 / 404 / 429 / 500
- [ ] History does not contain any API keys
- [ ] Dark / Light theme toggles
- [ ] Persian language + RTL layout works
- [ ] Mobile layout is usable
- [ ] Export / Import of request config works
- [ ] Cancel / timeout aborts the request

## License

MIT

---

Built as a pure client-side workbench. Feedback and contributions welcome.
