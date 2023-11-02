import api from './api.js';
import { favorites } from './localStorage.js';
import createObserver, { buildThresholdList } from './observer.js';

let currentSortingMethod = '';
let data = [];
let filteredFonts = [];
let loadedFonts = [];
const categories = ['display', 'handwriting', 'monospace', 'sans-serif', 'serif'];
const ignoredFonts = ['emoji', 'khitan', 'material'];

const scrollableList = document.getElementById('scrollable-list');

async function getData(selectedMethod) {
  // Create loading element
  const loadingElement = document.createElement('div');
  loadingElement.setAttribute('class', 'loading');
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
    const query = formData.get('query');
    const language = formData.get('language');

    if (query) {
      const re = new RegExp(query, 'i');
      criteria &&= re.test(e.family);
    }

    if (formData.get('favorites') === 'on') {
      criteria &&= favorites.have(e.family);
    }

    if (language !== 'all') {
      criteria &&= e.subsets.includes(language);
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
  newIcon.className = favorites.have(fontFamily)
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
      favorites.add(fontFamily);
    } else {
      icon.classList.remove('filled');
      favorites.remove(fontFamily);
    }
  });

  return newIconButton;
}

function createFontButton(fontFamily) {
  const newFontButton = document.createElement('button');
  newFontButton.className = 'font-button';
  newFontButton.innerText = fontFamily;

  newFontButton.addEventListener('click', () => {
    if (!newFontButton.classList.contains('selected')) {
      const selectedButton = scrollableList.querySelector('.selected');
      selectedButton?.classList.remove('selected');
      newFontButton.classList.add('selected');
    }
  });

  return newFontButton;
}

function createListItem(fontFamily, fontCategory) {
  const newListItem = document.createElement('li');
  newListItem.style.fontFamily = `${fontFamily}, ${fontCategory}`;
  newListItem.append(createIconButton(fontFamily), createFontButton(fontFamily));
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
  const baseURL = 'https://fonts.googleapis.com/css?family=';
  const URL = `${baseURL}${fontFamilies.join('|')}&display=swap`;
  const newLink = document.createElement('link');
  newLink.setAttribute('rel', 'stylesheet');
  newLink.setAttribute('href', URL);
  document.querySelector('head').appendChild(newLink);
  loadedFonts = [...loadedFonts, ...fontFamilies];
}

function insertItems(n) {
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
    const fontIndex = itemCount();
    const fontFamily = filteredFonts[fontIndex].family;
    const fontCategory = filteredFonts[fontIndex].category;
    createListItem(fontFamily, fontCategory);

    if (!loadedFonts.includes(fontFamily)) {
      familiesToLoad.push(fontFamily);
    }
  }

  // Create control element if list is not fully loaded
  if (itemCount() < filteredCount) {
    controlElement = document.createElement('div');
    controlElement.setAttribute('id', 'control');
    const referenceElement = scrollableList.querySelector('li:nth-last-child(2)');
    scrollableList.insertBefore(controlElement, referenceElement);

    // Apply a new observer to create the next elements in the list
    createObserver(controlElement, (entries) => {
      // If the intersection ratio is 0 or less, the control element is out of
      // view and we don't need to do anything.
      if (entries[0].intersectionRatio <= 0) return;
      insertItems(10);
    });
  }

  // Load fonts if they are not already loaded
  if (familiesToLoad.length) {
    loadFonts(familiesToLoad);
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

  if (filteredFonts.length) {
    insertItems(20);
  }

  // Scroll to the top
  scrollableList.scrollTo(0, 0);

  // const formDataObj = {};
  // formData.forEach((value, key) => (formDataObj[key] = value));
  // console.log(formData);
}

window.addEventListener('load', async () => {
  const mainElement = document.querySelector('main');
  const viewButton = document.getElementById('view-button');
  const codeButton = document.getElementById('code-button');
  const filterForm = document.getElementById('filter-form');

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

  createNewList(new FormData(filterForm));
});
