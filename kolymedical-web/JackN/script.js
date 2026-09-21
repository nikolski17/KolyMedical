const bloomButton = document.querySelector('#bloomButton');
const flowerStage = document.querySelector('#flower');
const flower = document.querySelector('.flower');
const flowerMessage = document.querySelector('#flowerMessage');

function bloomFlower() {
  const isBlooming = flower.classList.toggle('is-blooming');
  flowerStage.classList.toggle('is-blooming', isBlooming);
  bloomButton.setAttribute('aria-expanded', String(isBlooming));
  bloomButton.innerHTML = isBlooming
    ? '<span class="button-spark">✦</span> Guardar el deseo <span aria-hidden="true">♡</span>'
    : '<span class="button-spark">✦</span> Hacer florecer <span aria-hidden="true">→</span>';
  flowerMessage.textContent = isBlooming
    ? 'Que todos tus sueños encuentren su momento.'
    : 'La flor guarda un deseo para tus sueños.';
}

bloomButton.addEventListener('click', bloomFlower);
flowerStage.addEventListener('click', (event) => {
  if (event.target !== bloomButton) bloomFlower();
});
flowerStage.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    bloomFlower();
  }
});
