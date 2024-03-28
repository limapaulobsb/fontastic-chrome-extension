/* eslint-disable no-undef */
async function getCurrentTabId() {
  const queryOptions = { active: true, lastFocusedWindow: true };
  const [tab] = await chrome.tabs.query(queryOptions);

  return tab.id;
}

async function executeScript(loadFn, fontFamily) {
  const tabId = await getCurrentTabId();

  await chrome.scripting.executeScript({
    target: { tabId },
    func: loadFn,
    args: [[fontFamily]],
  });
}

async function insertCSS(css) {
  const tabId = await getCurrentTabId();

  await chrome.scripting.insertCSS({
    target: { tabId },
    css: css,
  });
}

export { executeScript, insertCSS };
/* eslint-enable no-undef */
