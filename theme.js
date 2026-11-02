// The popup's look: "light dark" (the default, follows the browser), dark or light.
// Loaded in <head>, so the look is set before anything is drawn and never flashes the other one.
// That's why the choice lives in localStorage: chrome.storage can only be read once the page shows.
const applyScheme = () => {
  document.querySelector('meta[name="color-scheme"]').content = localStorage.getItem('colorScheme') || 'light dark';
};
applyScheme();
// Changed in the popup while the same page is open in a tab.
addEventListener('storage', (e) => { if (e.key === 'colorScheme') applyScheme(); });
