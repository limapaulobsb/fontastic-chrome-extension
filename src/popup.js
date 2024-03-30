import api from './api.js';
import { executeLoad, insertCSS } from './chrome.js';
import { localFavorites } from './localStorage.js';
import createObserver, { buildThresholdList } from './observer.js';

let currentSortingMethod = '';
let data = [];
let filteredFonts = [];
let loadedFonts = [];
let selectedFont = null;
const categories = ['display', 'handwriting', 'monospace', 'sans-serif', 'serif'];
const ignoredFonts = ['emoji', 'khitan', 'material'];

const scrollableList = document.getElementById('scrollable-list');

async function getData(selectedMethod) {
  // Create loading element
  const loadingElement = document.createElement('div');
  loadingElement.className = 'loading';
  scrollableList.appendChild(loadingElement);

  // Make the request
  currentSortingMethod = selectedMethod;
  data = (await api.fetchFontsBy(selectedMethod)).items;

  // Remove loading
  loadingElement.remove();
}

function filterData(formData) {
  filteredFonts = data.filter((e) => {
    let criteria = false;

    //
    categories.forEach((category) => {
      if (formData.get(category) === 'on') {
        criteria ||= e.category === category;
      }
    });

    //
    const queryValue = formData.get('query');
    const favoritesValue = formData.get('favorites');
    const languageValue = formData.get('language');

    if (queryValue) {
      const re = new RegExp(queryValue, 'i');
      criteria &&= re.test(e.family);
    }

    if (favoritesValue === 'on') {
      criteria &&= localFavorites.have(e.family);
    }

    if (languageValue !== 'all') {
      criteria &&= e.subsets.includes(languageValue);
    }

    ignoredFonts.forEach((s) => {
      const re = new RegExp(s, 'i');
      criteria &&= !re.test(e.family);
    });

    return criteria;
  });
}

function createIconButton(fontFamily) {
  // Create icon
  const newIcon = document.createElement('span');
  newIcon.className = localFavorites.have(fontFamily)
    ? 'material-symbols-outlined filled'
    : 'material-symbols-outlined';
  newIcon.innerText = 'favorite';

  // Create button
  const newIconButton = document.createElement('button');
  newIconButton.className = 'icon-button';
  newIconButton.appendChild(newIcon);

  newIconButton.addEventListener('click', () => {
    const icon = newIconButton.querySelector('span');

    if (!icon.classList.contains('filled')) {
      icon.classList.add('filled');
      localFavorites.add(fontFamily);
    } else {
      icon.classList.remove('filled');
      localFavorites.remove(fontFamily);
    }
  });

  return newIconButton;
}

function createFontButton(font) {
  const newFontButton = document.createElement('button');
  newFontButton.className = 'font-button';
  newFontButton.innerText = font.family;
  newFontButton.style.fontFamily = `${font.family}, ${font.category}`;

  newFontButton.addEventListener('click', () => {
    if (!newFontButton.classList.contains('selected')) {
      const selectedButton = scrollableList.querySelector('.selected');
      selectedButton.classList.remove('selected');
      newFontButton.classList.add('selected');
      selectedFont = { ...font };
    }
  });

  return newFontButton;
}

function createListItem(font) {
  const newListItem = document.createElement('li');
  newListItem.append(createIconButton(font.family), createFontButton(font));
  scrollableList.appendChild(newListItem);

  // Apply a new observer to change element opacity
  createObserver(
    newListItem,
    (entries) => {
      entries[0].target.style.opacity = entries[0].intersectionRatio;
    },
    buildThresholdList(2)
  );
}

function loadFonts(fontFamilies) {
  const baseUrl = 'https://fonts.googleapis.com/css?family=';
  const url = `${baseUrl}${fontFamilies.join('|')}&display=swap`;
  const newLink = document.createElement('link');
  newLink.setAttribute('rel', 'stylesheet');
  newLink.setAttribute('href', url);
  document.querySelector('head').appendChild(newLink);
}

function createListItems(n) {
  // Remove the control element, if it exists
  let controlElement = document.getElementById('control');
  controlElement?.remove();

  // Create items
  const filteredCount = filteredFonts.length;
  const itemCount = () => scrollableList.childElementCount;
  const remainingCount = filteredCount - itemCount();
  const toBeCreated = Math.min(n, remainingCount);
  const familiesToLoad = [];

  for (let i = 0; i < toBeCreated; i++) {
    const font = filteredFonts[itemCount()];
    createListItem(font);

    if (!loadedFonts.includes(font.family)) {
      familiesToLoad.push(font.family);
    }
  }

  // Create control element if list is not fully loaded
  if (itemCount() < filteredCount) {
    controlElement = document.createElement('div');
    controlElement.id = 'control';
    const referenceElement = scrollableList.querySelector('li:nth-last-child(2)');
    scrollableList.insertBefore(controlElement, referenceElement);

    // Apply a new observer to create the next elements in the list
    createObserver(controlElement, (entries) => {
      // If the intersection ratio is 0 or less, the control element is out of
      // view and we don't need to do anything.
      if (entries[0].intersectionRatio <= 0) return;
      createListItems(10);
    });
  }

  // Load fonts if they are not already loaded
  if (familiesToLoad.length > 0) {
    loadFonts(familiesToLoad);
    loadedFonts.push(familiesToLoad);
  }
}

async function createNewList(formData) {
  // Remove all elements from the list
  while (scrollableList.hasChildNodes()) {
    scrollableList.removeChild(scrollableList.firstElementChild);
  }

  // If necessary, make a request to get the fonts in a specific order
  const selectedMethod = formData.get('sorting-method');

  if (selectedMethod !== currentSortingMethod) {
    await getData(selectedMethod);
  }

  // Filter data and insert list elements
  filterData(formData);

  if (filteredFonts.length > 0) {
    createListItems(20);
    const firstFontButton = scrollableList.querySelector('.font-button');
    firstFontButton.classList.add('selected');
    selectedFont = { ...filteredFonts[0] };
  } else {
    const noResultsElement = document.createElement('div');
    noResultsElement.className = 'no-results-container';
    noResultsElement.innerText = 'No results';
    scrollableList.appendChild(noResultsElement);
  }

  // Scroll to the top
  scrollableList.scrollTo(0, 0);
}

function generateCSS(formData, complete = false) {
  const selectorValue = formData.get('selector') || '*';
  const sizeValue = formData.get('size');
  const italicValue = formData.get('italic');
  const boldValue = formData.get('bold');

  let css = `${selectorValue} {\n  font-family: '${selectedFont.family}';`;

  if (sizeValue !== '') {
    css += `\n  font-size: ${sizeValue};`;
  } else if (complete) {
    css += '\n  font-size: unset;';
  }

  if (italicValue === 'on') {
    css += '\n  font-style: italic;';
  } else if (complete) {
    css += '\n  font-style: unset;';
  }

  if (boldValue === 'on') {
    css += '\n  font-weight: bold;';
  } else if (complete) {
    css += '\n  font-weight: unset;';
  }

  css += '\n}';

  return css;
}

function showCode(css) {
  const importsElement = document.getElementById('imports-code');
  const rulesElement = document.getElementById('rules-code');
  const baseUrl = 'https://fonts.googleapis.com/css2?family=';
  const fontFamily = selectedFont.family.replaceAll(' ', '+');
  const importsText = `@import url('${baseUrl}${fontFamily}&display=swap');`;
  const rulesText = `${css}\n\n`;
  importsElement.innerText = importsText;
  rulesElement.innerText = rulesText;
}

window.addEventListener('load', async () => {
  const mainElement = document.querySelector('main');
  const viewButton = document.getElementById('view-button');
  const codeButton = document.getElementById('code-button');
  const filterForm = document.getElementById('filter-form');
  const settingsForm = document.getElementById('settings-form');

  viewButton.addEventListener('click', () => {
    mainElement.scrollTo(0, 0);
    codeButton.classList.remove('selected');
    viewButton.classList.add('selected');
  });

  codeButton.addEventListener('click', () => {
    mainElement.scrollTo(480, 0);
    viewButton.classList.remove('selected');
    codeButton.classList.add('selected');
  });

  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    createNewList(new FormData(filterForm));
  });

  settingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(settingsForm);
    executeLoad(loadFonts, selectedFont.family);
    insertCSS(generateCSS(formData, true));
    showCode(generateCSS(formData).replaceAll(' ', '\u00A0'));
  });

  createNewList(new FormData(filterForm));
});
