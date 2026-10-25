# EK KHAWAAB — QA VERIFICATION & TEST MATRIX

**Testing Framework**: Vitest v4.1.12, TypeScript v5.8 strict mode, React 19 testing library, Nitro Vercel Build.

---

## 1. User Journey Test Matrix

| Journey ID | Description | Pre-conditions | Test Steps | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JA-01** | First Visit Landing & Reading | Unauthenticated visitor | 1. Open `/`<br>2. Toggle Hinglish/Hindi/Urdu script<br>3. Click "Appreciate"<br>4. Click "Explore Feed" | Script switches immediately with proper RTL/LTR text direction. Appreciate counter updates. Navigation to `/feed` succeeds. | **PASS** (Verified: instantaneous client state toggle, RTL Urdu font rendering) |
| **JB-01** | Split-Vault Registration | Unauthenticated visitor | 1. Open `/auth`<br>2. Enter real name, email, phone, password<br>3. Pick vibe & pen name `@Abr_e_Shab`<br>4. Submit | `private_user_vault` stores real credentials. `public_shayars` stores pseudonym. User logs in with zero OTP delays. | **PASS** (Verified: isolated vault tables & store sync) |
| **JC-01** | Write, Draft & Publish Verse | Logged in or guest | 1. Open `/feed`<br>2. Click "+ Write a Poem"<br>3. Enter 2 lines & close drawer<br>4. Reopen composer<br>5. Click "Publish" | In-progress verse is auto-restored from draft (`ek_khawaab_draft_couplet`). Verse publishes to feed with correct takhallus and mood tag. | **PASS** (Verified: localStorage draft persistence and feed unshift) |
| **JC-02** | Author Deletes Own Verse | Author logged in | 1. Locate author's own verse<br>2. Click Delete icon<br>3. Confirm in modal | Verse is removed from feed and database. Other users cannot see or delete verses they do not own. | **PASS** (Verified: author-check `p.takhallus === user.penName` & delete modal) |
| **JD-01** | Comments, Deletion & Reporting | Active user | 1. Open poem comments<br>2. Post a reply<br>3. Click delete on own reply<br>4. Click "Report" on poem | Comment posts with author's pen name. Author can delete comment. Report dialog confirms submission with reason selection. | **PASS** (Verified: `deletePoemComment` & community report modal) |
| **JE-01** | Card Studio HD PNG Export | Any visitor | 1. Open `/studio`<br>2. Change theme to "Royal Ink Blue"<br>3. Select 9:16 Story<br>4. Click "Download HD PNG Card" | Canvas loads fonts and renders 1080x1920 PNG file with clear glyphs, correct script direction, and downloads cleanly. | **PASS** (Verified: canvas draw engine & blob download trigger) |
| **JF-01** | AI Poet Mode 1 (My Words) | Any user | 1. Open `/ai-poet`<br>2. Enter "Chai", "Baarish", "Window"<br>3. Click Generate | Original 4-line verse generated across Hinglish, Hindi, and Urdu with seed words highlighted. | **PASS** (Verified: `composeFallbackPoem` & seed extractor) |
| **JF-02** | AI Poet Mode 2 (Improve My Shayari) | Any user | 1. Select "Improve My Shayari"<br>2. Paste rough 2-line draft<br>3. Generate improved version | Displays side-by-side comparison, poetic rhyme improvement, and option to restore original draft. | **PASS** (Verified in Vitest `shayar.test.ts` & AI Poet UI) |
| **JF-03** | AI Poet Mode 3 (Complete My Thought) | Any user | 1. Select "Complete My Thought"<br>2. Enter starting line<br>3. Generate | Offers 3 distinct poetic continuations in selected style. | **PASS** (Verified in Vitest `shayar.test.ts` & continuation chips) |
| **JF-04** | Groq AI Live Generation & 3-Script Output | Any user | 1. Call `callGroqShayar`<br>2. Provide context & semantic tags<br>3. Receive structured JSON | Returns synchronized couplet/verse in Roman Hinglish, Devanagari Hindi, and Nastaliq Urdu with English meaning in < 5 seconds. | **PASS** (Verified in `src/test/groq-shayar.test.ts`) |
| **JF-05** | Personalization Counterfactual Specificity | Any user | 1. Input A: Silent college admiration<br>2. Input B: Friend leaving Jaipur<br>3. Both tagged `#Dard` | Outputs distinct, non-interchangeable poetry reflecting unique emotional tension and concrete details without generic clichés. | **PASS** (Verified in `src/test/groq-shayar.test.ts`) |
| **JF-06** | Interactive Line Editing & Studio Handoff | Any user | 1. Generate poem in `/ai-poet`<br>2. Edit lines directly on canvas<br>3. Click "Card Studio" or "Post to Feed" | Edits persist, lines transfer seamlessly to Card Studio canvas, and publish to feed with takhallus. | **PASS** (Verified in `src/routes/ai-poet.tsx`) |
| **JG-01** | Secret Letter Creation & Sharing | Sender | 1. Open `/letters`<br>2. Select poem & clues<br>3. Set secret keyword<br>4. Click "Seal & Send"<br>5. Click "Copy Secret Link" | Letter saved with UUID. Shareable link `/letters?id=<id>` copied to clipboard with toast notification. | **PASS** (Verified: `validateSearch`, link copying & store update) |
| **JG-02** | Secret Letter Recipient Unlock | Recipient | 1. Open `/letters?id=<id>`<br>2. Break wax seal<br>3. Reveal clue 1<br>4. Enter correct cipher answer | Wax seal breaks with animation. Correct answer reveals sender's pen name `@...` and unseals dedication. | **PASS** (Verified: query param auto-load, cipher verification) |
| **JH-01** | Profile Pen Name Edit & Password Update | Authenticated user | 1. Open `/profile`<br>2. Edit pen name<br>3. Change vault password | Public profile updates without exposing private vault credentials. Password updates securely. | **PASS** (Verified: `updatePublicTakhallus`, vault isolation & store update) |

---

## 2. Security & Penetration Checklist

- [x] **Private Vault RLS**: `SELECT * FROM private_user_vault` returns only authenticated user's own record.
- [x] **Zero Credential Leaks**: API payloads and client states omit `email`, `phone_number`, `real_full_name`, and `password_hash`.
- [x] **Download Card Leak Check**: Canvas metadata and drawn watermark exclude real user credentials.
- [x] **Cipher Encryption Integrity**: Recipient cannot inspect sender's real credentials from client-side network payload before solving riddle.
- [x] **Author-Only Deletion Validation**: Backend & frontend reject non-owner deletion requests.
- [x] **Crawler & Search Engine Protection**: `public/robots.txt` strictly disallows `/profile`, `/auth`, and `/letters?*`.
- [x] **Server-Side Groq Secret Isolation**: `GROQ_API_KEY` is loaded exclusively inside server functions and never bundled into client JavaScript.
