let panicInterval: any = null;

export function setupPanicTimer() {
  if (panicInterval) { clearInterval(panicInterval); panicInterval = null; }
  const el = document.getElementById('panic-timer');
  const clock = document.getElementById('panic-clock');
  if (!el || !clock) return;

  const tick = () => {
    const deadlineStr = el.dataset.deadline;
    if (!deadlineStr) return;
    const deadline = new Date(deadlineStr).getTime();
    const diff = deadline - Date.now();
    if (diff <= 0) {
      clock.textContent = "Time's up!";
      el.classList.add('over');
      return;
    }
    el.classList.remove('over');
    const totalSec = Math.floor(diff / 1000);
    const d = Math.floor(totalSec / 86400);
    const hrs = Math.floor((totalSec % 86400) / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const sec = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    clock.textContent = d > 0 ? `${d}d ${pad(hrs)}:${pad(min)}:${pad(sec)}` : `${pad(hrs)}:${pad(min)}:${pad(sec)}`;
  };
  tick();
  panicInterval = setInterval(tick, 1000);
}
