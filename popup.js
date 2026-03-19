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
    const providerSelect = document.getElementById('providerSelect');
    const apiHelpText = document.getElementById('apiHelpText');
    const aiSuggestions = document.getElementById('aiSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');

    const PROVIDERS = {
        gemini: {
            name: 'Google Gemini',
            url: 'https://aistudio.google.com/app/apikey',
            endpoint: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
            method: 'POST',
            body: (prompt) => ({ contents: [{ parts: [{ text: prompt }] }] }),
            parse: (data) => data.candidates[0].content.parts[0].text
        },
        openai: {
            name: 'OpenAI (ChatGPT)',
            url: 'https://platform.openai.com/api-keys',
            endpoint: () => 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            body: (prompt) => ({
                model: 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7
            }),
            headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
            parse: (data) => data.choices[0].message.content
        },
        claude: {
            name: 'Anthropic Claude',
            url: 'https://console.anthropic.com/settings/keys',
            endpoint: () => 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            body: (prompt) => ({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }]
            }),
            headers: (key) => ({ 
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
                'dangerously-allow-browser': 'true'
            }),
            parse: (data) => data.content[0].text
        },
        openrouter: {
            name: 'OpenRouter',
            url: 'https://openrouter.ai/keys',
            endpoint: () => 'https://openrouter.ai/api/v1/chat/completions',
            method: 'POST',
            body: (prompt) => ({
                model: 'openai/gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }]
            }),
            headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
            parse: (data) => data.choices[0].message.content
        }
    };

    // Load Settings
    chrome.storage.sync.get(['selectedProvider', 'apiKeys'], (result) => {
        const provider = result.selectedProvider || 'gemini';
        providerSelect.value = provider;
        updateProviderUI(provider);
        
        const keys = result.apiKeys || {};
        if (keys[provider]) apiKeyInput.value = keys[provider];
    });

    function updateProviderUI(provider) {
        const info = PROVIDERS[provider];
        apiHelpText.innerHTML = `Get one from <a href="${info.url}" target="_blank">${provider.toUpperCase()}</a>`;
    }

    providerSelect.addEventListener('change', () => {
        const provider = providerSelect.value;
        updateProviderUI(provider);
        chrome.storage.sync.get(['apiKeys'], (result) => {
            const keys = result.apiKeys || {};
            apiKeyInput.value = keys[provider] || '';
            chrome.storage.sync.set({ selectedProvider: provider });
        });
    });

    apiKeyInput.addEventListener('change', () => {
        const provider = providerSelect.value;
        chrome.storage.sync.get(['apiKeys'], (result) => {
            const keys = result.apiKeys || {};
            keys[provider] = apiKeyInput.value.trim();
            chrome.storage.sync.set({ apiKeys: keys }, () => {
                updateStatus('Key Saved!');
            });
        });
    });

    const getAISuggestions = async (context) => {
        const providerId = providerSelect.value;
        const info = PROVIDERS[providerId];
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
            const headers = { 'Content-Type': 'application/json' };
            if (info.headers) Object.assign(headers, info.headers(apiKey));

            const response = await fetch(info.endpoint(apiKey), {
                method: info.method,
                headers: headers,
                body: JSON.stringify(info.body(prompt))
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            const text = info.parse(data);
            return text.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        } catch (err) {
            console.error('AI Error Details:', err);
            updateStatus(err.message.substring(0, 20) + '...', '#f43f5e');
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

    // Toggle Settings
    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    applyBtn.addEventListener('click', () => {
        const newTitle = titleInput.value.trim();
        if (!newTitle) return;

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
