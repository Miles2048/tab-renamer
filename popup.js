document.addEventListener('DOMContentLoaded', async () => {
    const titleInput = document.getElementById('titleInput');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const tabUrl = new URL(tab.url).hostname;

    // Load existing name if any
    chrome.storage.local.get([tab.url], (result) => {
        if (result[tab.url]) {
            titleInput.value = result[tab.url];
            status.textContent = 'Current: Custom';
        }
    });

    const updateStatus = (msg, color = '#38bdf8') => {
        status.textContent = msg;
        status.style.color = color;
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '#38bdf8';
        }, 2000);
    };

    applyBtn.addEventListener('click', () => {
        const newTitle = titleInput.value.trim();
        if (!newTitle) return;

        // Save to storage
        chrome.storage.local.set({ [tab.url]: newTitle }, () => {
            // Send message to background to re-apply
            chrome.runtime.sendMessage({
                action: 'rename',
                tabId: tab.id,
                newTitle: newTitle,
                url: tab.url
            });
            updateStatus('Renamed!');
        });
    });

    resetBtn.addEventListener('click', () => {
        chrome.storage.local.remove([tab.url], () => {
            chrome.runtime.sendMessage({
                action: 'reset',
                tabId: tab.id,
                url: tab.url
            });
            titleInput.value = '';
            updateStatus('Reset!');
        });
    });

    // Enter key support
    titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyBtn.click();
    });
});
