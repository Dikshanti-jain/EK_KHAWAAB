# EK KHAWAAB — KNOWN ISSUES & RESIDUAL RISK REGISTER

**Last Updated**: 2026-10-25

---

## 1. Residual Risks & External Dependencies

| Issue ID | Subsystem | Description | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RISK-01** | External AI Provider | High traffic or rate limiting on Groq/OpenAI during live poetry generation. | Users could see timeout or error during AI generation. | Built-in offline poetic fallback engine `composeFallbackPoem()` and dual-model redundancy (`openai/gpt-oss-120b` with `openai/gpt-oss-20b` fallback) ensure original shayari is generated even when external AI API keys are unavailable or throttled. |
| **RISK-02** | Canvas Mobile Font Rendering | Very low-end mobile devices on 2G connections may delay font loading before canvas render. | Card text might render with fallback serif before custom font loads. | `Studio.tsx` uses `Promise.all([document.fonts.load(...)]).then(() => document.fonts.ready)` to ensure fonts are fully rasterized before export. |
| **RISK-03** | Web Audio Autoplay Policy | Modern mobile browsers (iOS Safari, Android Chrome) block background audio playback until the user initiates an explicit touch gesture. | Ambient rain audio will not start automatically without user interaction. | `AmbientAudio.tsx` requires explicit user toggle click and tracks audio context state seamlessly. |
