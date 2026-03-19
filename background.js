chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'rename' || request.action === 'reset') {
        const message = request.action === 'rename' 
            ? { action: 'applyRename', title: request.newTitle }
            : { action: 'reset' };
            
        chrome.tabs.sendMessage(request.tabId, message).catch(err => {
            console.log('Content script not yet ready, it will apply on load.', err);
        });
    } else if (request.action === 'resetAll') {
        // Query ALL tabs and tell them to reset
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'reset' }).catch(e => {}); 
            });
        });
    }
});

// Re-apply on tab update (e.g., refresh)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.storage.local.get([tab.url], (result) => {
            if (result[tab.url]) {
                chrome.tabs.sendMessage(tabId, { 
                    action: 'applyRename', 
                    title: result[tab.url] 
                }).catch(() => {
                    // Script might not be injected yet
                });
            }
        });
    }
});
