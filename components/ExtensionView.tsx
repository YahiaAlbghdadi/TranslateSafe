import React, { useState, useRef, useEffect } from 'react';
import { Puzzle, Flame, Bookmark, Copy, Check, CheckCircle2, Download, AlertTriangle } from 'lucide-react';

// Pre-minified bookmarklet IIFE.
// Placeholders: __KEY__ __LANG__ __SUPA_URL__ __SUPA_KEY__ __TOKEN__ __USER_ID__
const BM_TEMPLATE =
  `(function(){` +
  `var e=document.getElementById('ts-bm');if(e){e.remove();return;}` +
  `var sel='';` +
  `var ae=document.activeElement;` +
  `if(ae&&(ae.tagName==='TEXTAREA'||ae.tagName==='INPUT')&&typeof ae.selectionStart==='number'){` +
    `sel=ae.value.slice(ae.selectionStart,ae.selectionEnd).trim();}` +
  `if(!sel){sel=window.getSelection?window.getSelection().toString().trim():'';}` +
  `if(!sel){alert('TranslateSafe: Please select text first.');return;}` +
  `var rect={bottom:100,left:20};` +
  `var s=window.getSelection();` +
  `if(s&&s.rangeCount>0){rect=s.getRangeAt(0).getBoundingClientRect();}` +
  `var b=document.createElement('div');b.id='ts-bm';` +
  `Object.assign(b.style,{position:'fixed',zIndex:'2147483647',` +
    `top:Math.min(rect.bottom+10,window.innerHeight-120)+'px',` +
    `left:Math.max(10,Math.min(rect.left,window.innerWidth-320))+'px',` +
    `background:'#1e293b',color:'#f1f5f9',padding:'12px',borderRadius:'12px',` +
    `boxShadow:'0 10px 25px rgba(0,0,0,.5),0 0 0 1px #334155',` +
    `fontFamily:'system-ui,-apple-system,sans-serif',fontSize:'14px',` +
    `maxWidth:'300px',lineHeight:'1.5',fontWeight:'500'});` +
  `b.innerHTML='<span style="display:inline-block;width:18px;height:18px;border:2px solid #334155;border-top-color:#6366f1;border-radius:50%;animation:ts-spin .8s linear infinite"></span>` +
    `<style>@keyframes ts-spin{to{transform:rotate(360deg)}}</style>';` +
  `document.body.appendChild(b);` +
  `function rm(ev){if(!b.contains(ev.target)){b.remove();document.removeEventListener('click',rm,true);}}` +
  `setTimeout(function(){document.addEventListener('click',rm,true);},100);` +
  `fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=__KEY__',` +
    `{method:'POST',headers:{'Content-Type':'application/json'},` +
    `body:JSON.stringify({contents:[{parts:[{text:'Translate to __LANG__. Reply only with the translation, no explanation. Text: '+sel}]}]})})` +
  `.then(function(r){return r.json();})` +
  `.then(function(j){` +
    `var t=j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts[0]&&j.candidates[0].content.parts[0].text;` +
    `if(!t){b.innerHTML='<span style="color:#f87171">Translation failed</span>';return;}` +
    `b.innerHTML='';` +
    `var d=document.createElement('div');d.textContent=t.trim();d.style.marginBottom='8px';b.appendChild(d);` +
    `var sv=document.createElement('button');sv.textContent='Save to Deck';` +
    `sv.style.cssText='background:#4f46e5;color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;width:100%';` +
    `sv.onclick=function(){` +
      `sv.onclick=null;sv.textContent='Saving…';sv.style.opacity='0.7';` +
      `fetch('__SUPA_URL__/rest/v1/flashcards',{` +
        `method:'POST',` +
        `headers:{'Content-Type':'application/json','apikey':'__SUPA_KEY__','Authorization':'Bearer __TOKEN__','Prefer':'return=minimal'},` +
        `body:JSON.stringify({id:crypto.randomUUID(),user_id:'__USER_ID__',original:sel,translated:t.trim(),source_lang:null,target_lang:'__LANG__',timestamp:Date.now(),easiness:2.5,interval:0,repetitions:0,next_review:0})` +
      `})` +
      `.then(function(r){` +
        `sv.style.opacity='1';sv.style.cursor='default';` +
        `if(r.ok||r.status===201){sv.textContent='Saved!';sv.style.background='#10b981';}` +
        `else{sv.textContent='Error '+r.status+' — re-open Browser tab to refresh token';sv.style.background='#ef4444';sv.style.fontSize='10px';}` +
      `})` +
      `.catch(function(){` +
      `var d=encodeURIComponent(JSON.stringify({original:sel,translated:t.trim(),targetLang:'__LANG__'}));` +
      `window.open('__APP_URL__/?ts_save='+d,'ts-save','popup,width=300,height=200,top=100,left=100');` +
      `sv.style.opacity='1';sv.style.cursor='default';sv.textContent='Saving...';sv.style.background='#6366f1';` +
      `setTimeout(function(){sv.textContent='Saved!';sv.style.background='#10b981';},2000);` +
      `});` +
      `};` +
    `b.appendChild(sv);})` +
  `.catch(function(err){b.innerHTML='<span style="color:#f87171">Error: '+err.message+'</span>';});` +
  `})()`;

interface Props {
  apiKey: string;
  targetLang: string;
  accessToken: string;
  userId: string;
}

type Section = 'bookmarklet' | 'chrome' | 'firefox';

const ExtensionView: React.FC<Props> = ({ apiKey, targetLang, accessToken, userId }) => {
  const [activeSection, setActiveSection] = useState<Section>('bookmarklet');
  const [copied, setCopied] = useState(false);
  const bmLinkRef = useRef<HTMLAnchorElement>(null);

  const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL      as string) || '';
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  const appUrl          = window.location.origin;

  const bookmarkletUrl = `javascript:${BM_TEMPLATE
    .replace(/__KEY__/g,      apiKey)
    .replace(/__LANG__/g,     targetLang)
    .replace(/__SUPA_URL__/g, supabaseUrl)
    .replace(/__SUPA_KEY__/g, supabaseAnonKey)
    .replace(/__TOKEN__/g,    accessToken)
    .replace(/__USER_ID__/g,  userId)
    .replace(/__APP_URL__/g,  appUrl)}`;

  // React sanitizes javascript: hrefs, so we set it directly on the DOM node
  useEffect(() => {
    if (bmLinkRef.current) {
      bmLinkRef.current.href = bookmarkletUrl;
    }
  }, [bookmarkletUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
      const ta = document.createElement('textarea');
      ta.value = bookmarkletUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs: { id: Section; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'bookmarklet', label: 'Bookmarklet', icon: <Bookmark className="w-4 h-4" />, badge: 'All browsers' },
    { id: 'chrome',      label: 'Chrome / Edge', icon: <Puzzle className="w-4 h-4" /> },
    { id: 'firefox',     label: 'Firefox',        icon: <Flame  className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 h-full overflow-y-auto">

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/20">
          <Puzzle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Browser Translation Tools</h2>
        <p className="text-slate-400 max-w-md text-sm">
          Select text on <span className="text-slate-200 font-medium">any website</span> and translate it instantly —
          on desktop, Android, or iPhone.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSection(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeSection === t.id
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            {t.icon}
            {t.label}
            {t.badge && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BOOKMARKLET ─────────────────────────────────────────────── */}
      {activeSection === 'bookmarklet' && (
        <div className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-1">What is a bookmarklet?</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              A bookmark that runs JavaScript instead of opening a URL. Select text on any page, click this bookmark,
              and a translation bubble appears — just like the extension, but on <span className="text-slate-200">every browser</span> including
              iPhone Safari and Android Chrome.
            </p>
          </div>

          {/* Drag target */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 rounded-2xl p-6 flex flex-col items-center gap-4">
            <p className="text-slate-300 text-sm font-medium">
              Drag this button to your bookmarks bar:
            </p>
            {/* href is set imperatively in useEffect to bypass React's javascript: sanitization */}
            <a
              ref={bmLinkRef}
              href="#"
              draggable
              onClick={e => e.preventDefault()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-indigo-500/20 cursor-grab active:cursor-grabbing transition-colors select-none"
            >
              <Bookmark className="w-4 h-4" />
              Translate with TranslateSafe
            </a>
            <p className="text-slate-500 text-xs">
              Translates to: <span className="text-slate-300">{targetLang}</span>
              {' · '}
              Re-drag after changing language to update the saved bookmark
            </p>
          </div>

          {/* Copy for iOS */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Copy className="w-4 h-4 text-indigo-400" />
              iPhone / iPad — copy the URL instead
            </h4>
            <ol className="text-slate-400 text-sm space-y-2 mb-4">
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">1.</span> Tap <b className="text-slate-300">Copy Bookmarklet URL</b> below.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">2.</span> In Safari, bookmark any page (Share → Add Bookmark).</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">3.</span> Open Bookmarks, find the new bookmark, tap <b className="text-slate-300">Edit</b>.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">4.</span> Replace the URL field with what you copied. Save.</li>
              <li className="flex gap-2"><span className="text-indigo-400 font-bold">5.</span> On any page: select text → tap the bookmark → translation appears.</li>
            </ol>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                copied
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Bookmarklet URL'}
            </button>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              <span className="font-semibold text-amber-300">Keep this bookmarklet private.</span> It contains your API key.
              Do not share it or paste it in public places.
            </p>
          </div>
        </div>
      )}

      {/* ── CHROME / EDGE ────────────────────────────────────────────── */}
      {activeSection === 'chrome' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-400" />
                Step 1 — Locate files
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                The extension source is included in your project under the
                <code className="bg-slate-900 px-1.5 py-0.5 rounded mx-1 text-indigo-300 font-mono text-xs">/extension</code>
                directory. Use <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">manifest.json</code>.
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-500">
                extension/<br />
                ├── <span className="text-yellow-400">manifest.json</span><br />
                ├── popup.html<br />
                ├── background.js<br />
                └── text_selection.js
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Puzzle className="w-4 h-4 text-indigo-400" />
                Step 2 — Load in Chrome
              </h3>
              <ol className="space-y-3">
                {[
                  <>Navigate to <code className="text-indigo-300">chrome://extensions</code></>,
                  <>Enable <b className="text-white">Developer mode</b> (top right)</>,
                  <>Click <b className="text-white">Load unpacked</b></>,
                  <>Select the <code className="text-indigo-300">extension/</code> folder</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold border border-indigo-500/30">
                      {i + 1}
                    </span>
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 rounded-2xl p-5">
            <h4 className="text-white font-medium mb-2">Tips</h4>
            <ul className="space-y-1.5 text-sm text-slate-400">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Press <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">Alt+S</kbd> to toggle the auto-translate mode on/off.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Select any text on a page while the extension is ON to see the translation bubble.</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />Also works on Microsoft Edge (Chromium) — same steps.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── FIREFOX ─────────────────────────────────────────────────── */}
      {activeSection === 'firefox' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Download className="w-4 h-4 text-orange-400" />
                Step 1 — Locate files
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Use the Firefox-specific manifest included in the project.
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-500">
                extension/<br />
                ├── <span className="text-yellow-400">manifest.firefox.json</span><br />
                ├── <span className="text-emerald-400">browser-polyfill.js</span><br />
                ├── background.js<br />
                └── text_selection.js
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Step 2 — Load in Firefox
              </h3>
              <ol className="space-y-3">
                {[
                  <>Navigate to <code className="text-orange-300">about:debugging#/runtime/this-firefox</code></>,
                  <>Click <b className="text-white">Load Temporary Add-on…</b></>,
                  <>Select <code className="text-orange-300">extension/manifest.firefox.json</code></>,
                  <>The extension icon appears in the toolbar</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold border border-orange-500/30">
                      {i + 1}
                    </span>
                    <span className="text-slate-300 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Firefox for Android
            </h4>
            <p className="text-slate-400 text-sm mb-3">
              Firefox on Android supports extensions — unlike Chrome on Android. Use <b className="text-white">Firefox Nightly</b> to sideload for development:
            </p>
            <ol className="space-y-2 text-sm text-slate-400">
              <li className="flex gap-2"><span className="text-orange-400 font-bold">1.</span>Install Firefox Nightly on your Android device.</li>
              <li className="flex gap-2"><span className="text-orange-400 font-bold">2.</span>In Nightly: open <code className="text-orange-300">about:config</code> → set <code className="text-orange-300">xpinstall.signatures.required</code> to <b className="text-white">false</b>.</li>
              <li className="flex gap-2"><span className="text-orange-400 font-bold">3.</span>Connect via USB and use <code className="text-orange-300">about:debugging</code> on desktop Firefox to push the extension to the device.</li>
            </ol>
            <p className="text-slate-500 text-xs mt-3">For production use: submit the extension to <a href="https://addons.mozilla.org" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">addons.mozilla.org</a> (AMO).</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExtensionView;
