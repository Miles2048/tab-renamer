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

    const aiBtn = document.getElementById('aiBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const apiKeyInput = document.getElementById('apiKey');
    const aiSuggestions = document.getElementById('aiSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');

    // Load API Key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
    });

    // Toggle Settings
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    // Save API Key
    apiKeyInput.addEventListener('change', () => {
        chrome.storage.sync.set({ geminiApiKey: apiKeyInput.value }, () => {
            updateStatus('Key Saved!');
        });
    });

    const getAISuggestions = async (context) => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            settingsPanel.classList.remove('hidden');
            updateStatus('Need API Key', '#f43f5e');
            return null;
        }

        const prompt = `Based on this webpage context, suggest 3 concise and recognizable tab titles (max 20 characters each). 
        Context:
        Title: ${context.title}
        H1: ${context.h1}
        Description: ${context.description}
        URL: ${tab.url}
        
        Return ONLY the 3 suggestions separated by commas, no other text.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return text.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        } catch (err) {
            console.error('AI Error:', err);
            updateStatus('AI Error', '#f43f5e');
            return null;
        }
    };

    aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true;
        updateStatus('AI Thinking...');

        try {
            // Get context from content script
            const [response] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => ({
                    title: document.title,
                    h1: document.querySelector('h1')?.innerText || '',
                    description: document.querySelector('meta[name="description"]')?.content || ''
                })
            });

            const suggestions = await getAISuggestions(response.result);
            if (suggestions) {
                suggestionsList.innerHTML = '';
                suggestions.forEach(s => {
                    const chip = document.createElement('div');
                    chip.className = 'suggestion-chip';
                    chip.textContent = s;
                    chip.onclick = () => {
                        titleInput.value = s;
                        applyBtn.click();
                    };
                    suggestionsList.appendChild(chip);
                });
                aiSuggestions.classList.remove('hidden');
            }
        } finally {
            aiBtn.disabled = false;
        }
    });

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
