export function toast(msg: string) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

export function showModal(content: string) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this) closeModal()">
    <div class="modal">${content}</div>
  </div>`;
}

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

window.closeModal = closeModal;
