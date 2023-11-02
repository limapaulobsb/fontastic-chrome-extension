const favorites = {
  have(fontFamily) {
    const array = JSON.parse(localStorage.getItem('favorites')) || [];
    return array.includes(fontFamily);
  },

  add(fontFamily) {
    const array = JSON.parse(localStorage.getItem('favorites')) || [];

    if (!array.includes(fontFamily)) {
      const newArray = [...array, fontFamily];
      localStorage.setItem('favorites', JSON.stringify(newArray));
    }
  },

  remove(fontFamily) {
    const array = JSON.parse(localStorage.getItem('favorites')) || [];

    if (array.includes(fontFamily)) {
      const newArray = array.filter((e) => e !== fontFamily);
      localStorage.setItem('favorites', JSON.stringify(newArray));
    }
  },
};

export { favorites };
