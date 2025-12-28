# Renal (Resume + Analyzer)

Renal is a resume-review web app that uploads your resume (PDF), converts the first page to an image, and uses Puter’s AI to generate ATS feedback and improvement suggestions. [page:30][page:28]

## Features
- Upload a resume PDF and generate a preview image from page 1 (PDF → PNG using `pdfjs-dist`). [page:30][page:28]
- Store resume + preview image in Puter File System (FS) and metadata/feedback in Puter KV. [page:29][page:30]
- Generate AI feedback using Puter AI chat (default model configured as `anthropic/claude-sonnet-4`). [page:29]

## Tech stack
- React Router v7 (SSR enabled) + Vite. [page:28]
- React + TypeScript + Zustand. [page:29]
- Tailwind CSS. [page:28]
- `pdfjs-dist` for PDF rendering/conversion in the browser. [page:30][page:28]

## Prerequisites
- Node.js (recommended: latest LTS).
- Puter available in the browser (Renal relies on the global `window.puter` SDK). [page:29]

## Installation
- git clone https://github.com/JaiChaprana/Renal.git
- cd Renal
- npm install

## Development
 - npm run dev


## How it works
1. Upload route: user selects a PDF and submits job details. [page:30]
2. Renal uploads the PDF to Puter FS and converts the first page into a PNG preview, then uploads that too. [page:30]
3. Renal stores an entry in Puter KV under `resume:<uuid>` containing paths + job info + feedback. [page:30]
4. Renal calls Puter AI with the uploaded resume file plus instructions and saves the model response back into KV. [page:29][page:30]

## Scripts
- `npm run dev` – start dev server. [page:28]
- `npm run build` – create production build. [page:28]
- `npm run start` – serve production build. [page:28]
- `npm run typecheck` – generate route types + run TypeScript checks. [page:28]

## Notes / common issues
- If Puter isn’t loaded or the user isn’t signed in, file upload + AI calls won’t work (Renal depends on `window.puter` + Puter auth). [page:29][page:30]
- If AI returns non-JSON or a schema your UI doesn’t expect, normalize/validate before rendering scores. [page:30]

## API stability note
Renal relies on Puter’s client SDK (`window.puter`) and on the structure of the AI response returned from `puter.ai.chat()`. If Puter changes the SDK surface (methods/return types) or the AI response schema (e.g., different `message.content` shape or different feedback keys), parts of Renal may stop working until the parsing/normalization code is updated. [page:34]

## License
No license file is included yet. Add one (MIT/Apache-2.0/GPL/etc.) if you want public reuse and contributions under clear terms. [page:28]

