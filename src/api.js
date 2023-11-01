async function fetchFontsBy(sortingMethod) {
  try {
    const baseURL = 'https://www.googleapis.com/webfonts/v1/webfonts';
    const key = 'AIzaSyB2ImDRIBOZotD8eXtVDh3vr32IejoMvb0';
    const URL = `${baseURL}?key=${key}&sort=${sortingMethod}`;
    const response = await fetch(URL);

    return response.json();
  } catch (error) {
    console.log(error);
  }
}

export default { fetchFontsBy };
