import { createHash } from "node:crypto";

export const APPLICATION_AUTH_UI_STYLES = `
:root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#172033;background:#f4f7fb}
body.theme-background-slate{background:#e8edf4}
.auth-shell{width:100%;max-width:440px;background:#fff;border:1px solid #dce3ec;border-radius:18px;box-shadow:0 18px 45px rgba(30,41,59,.12);padding:32px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.brand img{width:42px;height:42px;object-fit:contain;border-radius:10px}.brand-name{font-size:1.05rem;font-weight:700}
h1{font-size:1.6rem;line-height:1.25;margin:0 0 8px}p{line-height:1.55;margin:0 0 18px}.muted{color:#5f6b7a}.error{padding:12px;border-radius:10px;background:#fff1f2;color:#9f1239;margin-bottom:18px}.success{padding:12px;border-radius:10px;background:#ecfdf5;color:#065f46;margin-bottom:18px}
form{display:grid;gap:16px}.field{display:grid;gap:7px}label{font-size:.92rem;font-weight:650}input{width:100%;border:1px solid #b8c3d1;border-radius:10px;padding:12px 13px;font:inherit;color:inherit;background:#fff}input:focus-visible,a:focus-visible,button:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}
button,.button{display:inline-flex;justify-content:center;align-items:center;border:0;border-radius:10px;padding:12px 16px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;background:#2563eb;color:#fff}.theme-primary-indigo button,.theme-primary-indigo .button{background:#4f46e5}.theme-primary-violet button,.theme-primary-violet .button{background:#7c3aed}.theme-primary-emerald button,.theme-primary-emerald .button{background:#047857}.button-secondary{background:#e8edf4!important;color:#172033}.actions{display:flex;gap:10px;flex-wrap:wrap}.links{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px}a{color:#1d4ed8}.scope-list{margin:0 0 20px;padding-left:22px}.scope-list li{margin:7px 0}.divider{height:1px;background:#e5eaf0;margin:22px 0}.footer{font-size:.8rem;color:#697586;margin-top:24px}
@media(max-width:480px){body{padding:0;background:#fff!important}.auth-shell{min-height:100vh;border:0;border-radius:0;box-shadow:none;padding:28px 22px}}
@media(prefers-reduced-motion:no-preference){button,.button{transition:filter .15s ease}button:hover,.button:hover{filter:brightness(.94)}}
`;

const styleHash = createHash("sha256")
  .update(APPLICATION_AUTH_UI_STYLES, "utf8")
  .digest("hex")
  .slice(0, 16);

export const APPLICATION_AUTH_UI_STYLE_PATH =
  `/ui/assets/application-auth.${styleHash}.css` as const;

