const mainContainer = document.querySelector('main');
const viewButton = document.getElementById('view-button');
const codeButton = document.getElementById('code-button');

viewButton.addEventListener('click', () => {
  mainContainer.scrollTo(0, 0);
  codeButton.classList.remove('selected');
  viewButton.classList.add('selected');
});

codeButton.addEventListener('click', () => {
  mainContainer.scrollTo(400, 0);
  viewButton.classList.remove('selected');
  codeButton.classList.add('selected');
});
