export function resolveCid(cid: string): string {
  if (cid.startsWith("/ipfs/") || cid.startsWith("/ipns/")) return cid;
  return `/ipfs/${cid}`;
}

export function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function copyTextToClipboard(text: string, triggerButton?: HTMLElement | null): void {
  if (!navigator.clipboard) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      animateCopySuccess(triggerButton);
    } catch (err) {
      console.error("Failed to copy fallback:", err);
    }
    document.body.removeChild(textarea);
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    animateCopySuccess(triggerButton);
  }).catch((err) => {
    console.error("Could not copy text: ", err);
  });
}

export function animateCopySuccess(button?: HTMLElement | null): void {
  if (!button) return;
  const originalHtml = button.innerHTML;

  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  button.style.borderColor = "var(--success-color)";

  setTimeout(() => {
    button.innerHTML = originalHtml;
    button.style.borderColor = "";
  }, 1500);
}

export function flashBtnSuccess(btn: HTMLElement | null, label: string): void {
  if (!btn) return;
  const original = btn.innerHTML;
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> ${label}
  `;
  btn.style.borderColor = "var(--success-color)";
  btn.style.color = "var(--success-color)";
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.borderColor = "";
    btn.style.color = "";
  }, 1800);
}
