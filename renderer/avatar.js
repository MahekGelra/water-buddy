const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const msg = document.getElementById('msg');
const buttons = document.querySelectorAll('button');

msg.textContent = params.get('msg') || 'Time for a sip of water!';

let busy = false;
function slideOutThen(action) {
  if (busy) return;
  busy = true;
  buttons.forEach((b) => (b.disabled = true));
  stage.classList.remove('show');
  setTimeout(action, 450);
}

document.getElementById('drank').addEventListener('click', () => {
  if (busy) return;
  busy = true;
  buttons.forEach((b) => (b.disabled = true));
  msg.textContent = params.get('cheer') || 'Nice! Stay hydrated!';
  setTimeout(() => {
    stage.classList.remove('show');
    setTimeout(() => window.water.drank(), 450);
  }, 1400);
});
document.getElementById('snooze').addEventListener('click', () => slideOutThen(() => window.water.snooze()));
document.getElementById('dismiss').addEventListener('click', () => slideOutThen(() => window.water.dismiss()));

window.water.onShow(() => {
  stage.classList.add('show');
  // Auto-dismiss after 30 seconds; dismissing never stops future reminders
  setTimeout(() => slideOutThen(() => window.water.dismiss()), 30000);
});