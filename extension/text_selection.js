// text_selection.js - Runs on all pages

let debounceTimer = null;
let currentBubble = null;

document.addEventListener('mouseup', (e) => {
  // Clear existing bubble if clicking outside
  if (currentBubble && !currentBubble.contains(e.target)) {
    removeBubble();
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const text = getSelectedText();

    if (text && text.length > 0) {
      // Check if extension is active
      try {
        const state = await chrome.storage.local.get(['isActive']);
        if (state.isActive) {
           const selection = window.getSelection();
           
           // If selection object is valid (standard text), use it for rect
           // If it's an input selection, we fallback to approximate position or active element
           if (selection.rangeCount > 0 && !selection.isCollapsed) {
               handleSelection(selection.getRangeAt(0).getBoundingClientRect(), text);
           } else if (document.activeElement) {
               // Fallback for inputs where window.getSelection is empty
               handleSelection(document.activeElement.getBoundingClientRect(), text);
           }
        }
      } catch (err) {
        console.warn("LinguaGemini: Context invalidated or error reading storage.", err);
      }
    }
  }, 500); // 500ms delay to ensure selection is intentional
});

function getSelectedText() {
    const activeEl = document.activeElement;
    const activeTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    
    // Check for inputs/textareas
    if (
      (activeTagName === "textarea" || activeTagName === "input") &&
      /^(textarea|text|search|password|tel|url)$/i.test(activeEl.type) &&
      typeof activeEl.selectionStart === "number"
    ) {
        return activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd).trim();
    }
    
    // Standard text selection
    return window.getSelection().toString().trim();
}

async function handleSelection(rect, text) {
  // Get Target Lang
  const conf = await chrome.storage.sync.get(['targetLang']);
  const targetLang = conf.targetLang || 'English';

  // Show Loading Bubble
  showBubble(rect, "Translating...", true);

  // Request Translation
  chrome.runtime.sendMessage({ 
    action: 'TRANSLATE', 
    text: text, 
    targetLang: targetLang 
  }, (response) => {
    // Check for runtime errors (like disconnected extension)
    if (chrome.runtime.lastError) {
        updateBubble("Error: Extension disconnected. Please reload page.", null, null, true);
        return;
    }

    if (response && response.success) {
      updateBubble(response.result, text, targetLang);
    } else {
      updateBubble(response?.error || "Unknown Error", null, null, true);
    }
  });
}

function showBubble(rect, content, isLoading = false) {
  removeBubble();

  const bubble = document.createElement('div');
  bubble.id = 'lingua-gemini-bubble';
  bubble.className = 'lg-bubble-container';
  
  // Position it below the selection
  // Ensure it doesn't go off-screen
  const top = rect.bottom + window.scrollY + 10;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 320); // Prevent right overflow
  
  bubble.style.top = `${Math.max(10, top)}px`;
  bubble.style.left = `${Math.max(10, left)}px`;

  if (isLoading) {
    bubble.innerHTML = `<div class="lg-spinner"></div>`;
  } else {
    bubble.textContent = content;
  }

  document.body.appendChild(bubble);
  currentBubble = bubble;
}

function updateBubble(translatedText, originalText, targetLang, isError = false) {
  if (!currentBubble) return;

  currentBubble.innerHTML = '';
  
  const textEl = document.createElement('div');
  textEl.className = isError ? 'lg-text-error' : 'lg-text-result';
  textEl.textContent = translatedText;
  currentBubble.appendChild(textEl);

  if (!isError && originalText) {
    const btn = document.createElement('button');
    btn.className = 'lg-save-btn';
    btn.innerHTML = `<span>Save to Deck</span>`;
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent bubbling causing immediate close
        btn.textContent = "Saved!";
        btn.classList.add('saved');
        
        chrome.runtime.sendMessage({
            action: 'QUEUE_SAVE',
            data: {
                original: originalText,
                translated: translatedText,
                targetLang: targetLang
            }
        });
        
        setTimeout(() => removeBubble(), 1500);
    });
    
    currentBubble.appendChild(btn);
  } else if (isError && translatedText.includes("API Key")) {
      const hint = document.createElement('div');
      hint.style.fontSize = "11px";
      hint.style.color = "#94a3b8";
      hint.style.marginTop = "8px";
      hint.innerHTML = "Open <a href='https://translate-safe.vercel.app/' target='_blank' style='color:#818cf8'>LinguaGemini App</a> to sync key.";
      currentBubble.appendChild(hint);
  }
}

function removeBubble() {
  if (currentBubble) {
    currentBubble.remove();
    currentBubble = null;
  }
}