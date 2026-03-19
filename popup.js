document.addEventListener('DOMContentLoaded', async () => {
    const titleInput = document.getElementById('titleInput');
    const emojiBtn = document.getElementById('emojiBtn');
    const applyBtn = document.getElementById('applyBtn');
    const resetBtn = document.getElementById('resetBtn');
    const status = document.getElementById('status');
    const aiBtn = document.getElementById('aiBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const themeSwitch = document.getElementById('themeSwitch');
    const settingsSlider = document.getElementById('settingsSlider');
    const settingsAI = document.getElementById('settingsAI');
    const aiConfigBtn = document.getElementById('aiConfigBtn');
    const aiBackBtn = document.getElementById('aiBackBtn');
    const apiKeyInput = document.getElementById('apiKey');
    const providerSelect = document.getElementById('providerSelect');
    const apiHelpText = document.getElementById('apiHelpText');
    const aiSuggestions = document.getElementById('aiSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');
    const emojiPicker = document.getElementById('emojiPicker');
    const resetAllBtn = document.getElementById('resetAllBtn');

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Load existing name
    chrome.storage.local.get([tab.url], (result) => {
        if (result[tab.url]) {
            const saved = result[tab.url];
            const emojiMatch = saved.match(/^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])\s*/);
            if (emojiMatch) {
                emojiBtn.textContent = emojiMatch[1];
                titleInput.value = saved.replace(emojiMatch[0], '');
            } else {
                titleInput.value = saved;
            }
            status.textContent = 'Current: Custom';
        }
    });

    // Load Theme
    chrome.storage.sync.get(['theme'], (result) => {
        if (result.theme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    });

    const updateStatus = (msg, color = 'var(--accent)') => {
        status.textContent = msg;
        status.style.color = color;
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = 'var(--accent)';
        }, 2000);
    };

    const EMOJI_LIST = ['📁', '💻', '🚀', '💡', '📅', '📝', '📓', '📊', '🔗', '⚙️', '🛡️', '📦', '🔍', '🎬', '🎮', '🎧', '🎨', '🧪', '🧬', '🌿', '☕', '🍎', '💰', '🔑', '📍', '📌', '✉️', '📥', '📣', '💬'];

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

    // Load Provider Settings
    chrome.storage.sync.get(['selectedProvider', 'apiKeys'], (result) => {
        const provider = result.selectedProvider || 'gemini';
        providerSelect.value = provider;
        updateProviderUI(provider);
        const keys = result.apiKeys || {};
        if (keys[provider]) apiKeyInput.value = keys[provider];
    });

    // Emoji Picker
    EMOJI_LIST.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.onclick = () => {
            emojiBtn.textContent = emoji;
            emojiPicker.classList.add('hidden');
        };
        emojiPicker.appendChild(span);
    });

    emojiBtn.onclick = () => emojiPicker.classList.toggle('hidden');
    document.addEventListener('click', (e) => {
        if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
            emojiPicker.classList.add('hidden');
        }
    });

    // Theme Toggle
    themeSwitch.onclick = () => {
        const isDark = document.body.classList.toggle('dark-mode');
        chrome.storage.sync.set({ theme: isDark ? 'dark' : 'light' });
    };

    // Settings Navigation
    settingsBtn.onclick = () => settingsPanel.classList.toggle('hidden');
    aiConfigBtn.onclick = () => settingsSlider.style.transform = 'translateX(-50%)';
    aiBackBtn.onclick = () => settingsSlider.style.transform = 'translateX(0)';

    function updateProviderUI(provider) {
        const info = PROVIDERS[provider];
        apiHelpText.innerHTML = `Get one from <a href="${info.url}" target="_blank">${provider.toUpperCase()}</a>`;
    }

    providerSelect.onchange = () => {
        const provider = providerSelect.value;
        updateProviderUI(provider);
        chrome.storage.sync.get(['apiKeys'], (result) => {
            const keys = result.apiKeys || {};
            apiKeyInput.value = keys[provider] || '';
            chrome.storage.sync.set({ selectedProvider: provider });
        });
    };

    apiKeyInput.onchange = () => {
        const provider = providerSelect.value;
        chrome.storage.sync.get(['apiKeys'], (result) => {
            const keys = result.apiKeys || {};
            keys[provider] = apiKeyInput.value.trim();
            chrome.storage.sync.set({ apiKeys: keys }, () => updateStatus('Key Saved!'));
        });
    };

    const performRename = (shouldClose = false) => {
        const title = titleInput.value.trim();
        const emoji = emojiBtn.textContent.trim();
        if (!title && !emoji) return;
        const fullTitle = emoji ? `${emoji} ${title}`.trim() : title;

        chrome.storage.local.set({ [tab.url]: fullTitle }, () => {
            chrome.runtime.sendMessage({
                action: 'rename',
                tabId: tab.id,
                newTitle: fullTitle,
                url: tab.url
            });
            updateStatus('Renamed!');
            if (shouldClose) setTimeout(() => window.close(), 400);
        });
    };

    aiBtn.onclick = async () => {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            settingsPanel.classList.remove('hidden');
            settingsSlider.style.transform = 'translateX(-50%)';
            updateStatus('Need API Key', 'var(--danger)');
            return;
        }

        aiBtn.disabled = true;
        updateStatus('AI Thinking...');

        try {
            const [response] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => ({
                    title: document.title,
                    h1: document.querySelector('h1')?.innerText || '',
                    description: document.querySelector('meta[name="description"]')?.content || ''
                })
            });

            const providerId = providerSelect.value;
            const info = PROVIDERS[providerId];
            const prompt = `Suggest 3 concise tab titles (max 20 chars) for this page. 
            No numbering, no symbols, return ONLY 3 suggestions separated by commas.
            Context: ${JSON.stringify(response.result)} URL: ${tab.url}`;

            const headers = { 'Content-Type': 'application/json' };
            if (info.headers) Object.assign(headers, info.headers(apiKey));

            const res = await fetch(info.endpoint(apiKey), {
                method: info.method,
                headers: headers,
                body: JSON.stringify(info.body(prompt))
            });

            if (!res.ok) throw new Error('API Error');
            
            const data = await res.json();
            const text = info.parse(data);
            const suggestions = text.split(',').map(s => s.trim().replace(/^[\d\.\-\)\s]+/, '').replace(/^"|"$/g, ''));

            if (suggestions.length > 0) {
                titleInput.value = suggestions[0];
                suggestionsList.innerHTML = '';
                suggestions.forEach(s => {
                    const chip = document.createElement('div');
                    chip.className = 'suggestion-chip';
                    chip.textContent = s;
                    chip.onclick = () => {
                        titleInput.value = s;
                        performRename(false);
                    };
                    suggestionsList.appendChild(chip);
                });
                aiSuggestions.classList.remove('hidden');
                performRename(false);
                updateStatus('AI Suggested!');
            }
        } catch (err) {
            updateStatus('AI failed', 'var(--danger)');
        } finally {
            aiBtn.disabled = false;
        }
    };

    applyBtn.onclick = () => performRename(true);
    resetBtn.onclick = () => {
        chrome.storage.local.remove([tab.url], () => {
            chrome.runtime.sendMessage({ action: 'reset', tabId: tab.id });
            titleInput.value = '';
            emojiBtn.textContent = '📁';
            updateStatus('Reset!');
        });
    };

    resetAllBtn.onclick = () => {
        if (confirm('Clear ALL custom titles?')) {
            chrome.storage.local.clear(() => {
                chrome.runtime.sendMessage({ action: 'resetAll' });
                titleInput.value = '';
                updateStatus('All Reset!', 'var(--danger)');
                setTimeout(() => window.close(), 1000);
            });
        }
    };

    titleInput.onkeypress = (e) => {
        if (e.key === 'Enter') performRename(true);
    };
});
