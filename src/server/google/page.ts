// Small standalone pages for team members opening a connect link (they have no admin login).

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function messagePage(title: string, body: string, status = 200) {
  const html = `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} – Fix It Now</title>
<style>
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f4f5f7; color: #1f2533; }
  main { max-width: 480px; margin: 48px auto; padding: 32px 24px; background: #fff; border-radius: 16px; }
  .brand { color: #c2410c; font-weight: 700; margin: 0 0 16px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { line-height: 1.5; margin: 0; }
  @media (prefers-color-scheme: dark) {
    body { background: #111318; color: #e8eaf0; }
    main { background: #1b1e25; }
    .brand { color: #fb923c; }
  }
</style>
</head>
<body><main><p class="brand">Fix It Now</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></main></body>
</html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}
