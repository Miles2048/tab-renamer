(() => {
    let customTitle = null;
    let originalTitle = document.title;
    let observer = null;

    const applyTitle = (title) => {
        customTitle = title;
        if (customTitle !== null) {
            document.title = customTitle;
        }
    };

    const resetTitle = () => {
        customTitle = null;
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        // Try to restore original if we know it, otherwise just let the page handle it
        document.title = originalTitle;
    };

    const setupObserver = () => {
        if (observer) return;
        
        observer = new MutationObserver((mutations) => {
            if (customTitle !== null && document.title !== customTitle) {
                // If something else changed the title, change it back!
                document.title = customTitle;
            }
        });

        observer.observe(document.querySelector('title') || document.documentElement, {
            subtree: true,
            childList: true,
            characterData: true
        });
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'applyRename') {
            applyTitle(request.title);
            setupObserver();
        } else if (request.action === 'reset') {
            resetTitle();
        }
    });

    // Check storage on load (for persistence)
    chrome.storage.local.get([window.location.href], (result) => {
        if (result[window.location.href]) {
            applyTitle(result[window.location.href]);
            setupObserver();
        }
    });
})();
