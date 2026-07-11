import { useState, useRef, useEffect } from "react";
import { Copy, Check, ArrowRight, Bookmark, HelpCircle } from "lucide-react";

export default function BookmarkletSection() {
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Raw bookmarklet code template. We'll replace the origin dynamically.
  const getBookmarkletCode = () => {
    const origin = window.location.origin;
    const rawJS = `(function(){
      function extractMessages() {
        var msgs = [];
        var host = window.location.hostname;
        
        if (host.indexOf('claude.ai') !== -1) {
          var turns = document.querySelectorAll('[class*="conversation-turn"], [class*="chat-turn"], [data-testid^="conversation-turn"]');
          if (turns.length > 0) {
            turns.forEach(function(el) {
              var userEl = el.querySelector('[data-testid="user-message"], .font-user-message');
              var assistEl = el.querySelector('[data-testid="assistant-message"], .font-claude-message, .prose');
              if (userEl) msgs.push({ role: 'user', text: userEl.innerText });
              if (assistEl) msgs.push({ role: 'assistant', text: assistEl.innerText });
            });
          } else {
            var allElems = document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"], .font-user-message, .font-claude-message');
            allElems.forEach(function(el) {
              var isUser = el.getAttribute('data-testid') === 'user-message' || el.classList.contains('font-user-message');
              msgs.push({ role: isUser ? 'user' : 'assistant', text: el.innerText });
            });
          }
        } 
        else if (host.indexOf('chatgpt.com') !== -1 || host.indexOf('chat.openai.com') !== -1) {
          var turns = document.querySelectorAll('[data-testid^="conversation-turn"]');
          if (turns.length > 0) {
            turns.forEach(function(turn) {
              var userBlock = turn.querySelector('[data-testid^="user-message"]');
              var assistBlock = turn.querySelector('.prose');
              if (userBlock) {
                msgs.push({ role: 'user', text: userBlock.innerText });
              } else if (assistBlock) {
                msgs.push({ role: 'assistant', text: assistBlock.innerText });
              }
            });
          } else {
            var messages = document.querySelectorAll('.whitespace-pre-wrap, .prose');
            messages.forEach(function(el) {
              var isUser = el.closest('[data-testid^="user-message"]') || !el.classList.contains('prose');
              msgs.push({ role: isUser ? 'user' : 'assistant', text: el.innerText });
            });
          }
        }
        else if (host.indexOf('gemini.google.com') !== -1) {
          var queryElems = document.querySelectorAll('user-query, model-response, .query-content, .message-content, .markdown, .chat-entry');
          queryElems.forEach(function(el) {
            var isUser = el.tagName.toLowerCase() === 'user-query' || el.classList.contains('query-content') || el.closest('user-query');
            var text = (el.innerText || el.textContent || '').trim();
            if (text) {
              var alreadyAdded = msgs.some(function(m) { return m.text === text; });
              if (!alreadyAdded) {
                msgs.push({ role: isUser ? 'user' : 'assistant', text: text });
              }
            }
          });
        }
        else {
          var authorElems = document.querySelectorAll('[data-message-author-role]');
          if (authorElems.length > 0) {
            authorElems.forEach(function(el) {
              var role = el.getAttribute('data-message-author-role');
              var text = (el.innerText || el.textContent || '').trim();
              if (text) {
                msgs.push({ role: role === 'user' ? 'user' : 'assistant', text: text });
              }
            });
          } else {
            var mdBlocks = document.querySelectorAll('.markdown, .prose, pre, code');
            mdBlocks.forEach(function(el) {
              var text = (el.innerText || el.textContent || '').trim();
              if (text) {
                msgs.push({ role: 'assistant', text: text });
              }
            });
          }
        }
        
        return msgs;
      }
      
      var msgs = extractMessages();
      if (msgs.length === 0) {
        var fullText = document.body.innerText;
        msgs = [{ role: 'user', text: fullText }];
      }
      
      var source = 'Unknown';
      var host = window.location.hostname;
      if (host.indexOf('claude.ai') !== -1) source = 'Claude';
      else if (host.indexOf('chatgpt') !== -1) source = 'ChatGPT';
      else if (host.indexOf('gemini') !== -1) source = 'Gemini';
      else if (host.indexOf('deepseek') !== -1) source = 'DeepSeek';
      
      var title = document.title || (source + " Chat Import");
      var totalWords = 0;
      msgs.forEach(function(m) { totalWords += (m.text || '').split(' ').length; });
      
      var payload = {
        source: source,
        url: window.location.href,
        title: title,
        messages: msgs
      };
      
      var payloadStr = JSON.stringify(payload);
      var clipboardSuccess = true;
      try {
        var el = document.createElement('textarea');
        el.value = payloadStr;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch (e) {
        try {
          navigator.clipboard.writeText(payloadStr);
        } catch (e2) {
          clipboardSuccess = false;
        }
      }
      
      var existing = document.getElementById('context-bridge-modal');
      if (existing) existing.remove();
      
      var modal = document.createElement('div');
      modal.id = 'context-bridge-modal';
      modal.style.cssText = 'position:fixed;top:24px;right:24px;z-index:9999999;width:380px;background:#141414;border:1px solid #2b2b2b;border-radius:12px;padding:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;text-align:left;box-sizing:border-box;';
      
      var badgeBg = '#27272a';
      if (source === 'Gemini') badgeBg = '#1e3a8a';
      else if (source === 'Claude') badgeBg = '#7c2d12';
      else if (source === 'ChatGPT') badgeBg = '#064e3b';
      else if (source === 'DeepSeek') badgeBg = '#1e1b4b';

      modal.innerHTML = \'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #27272a;padding-bottom:10px;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;background:\' + badgeBg + \';color:#ffffff;padding:2px 6px;border-radius:4px;">\' + source + \'</span><span style="font-size:12px;font-weight:bold;color:#a1a1aa;font-family:monospace;">Bridge Extract</span></div><button id="cb-close-btn" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:20px;line-height:1;padding:4px;margin-left:auto;">&times;</button></div><h3 style="font-size:14px;font-weight:600;color:#ffffff;margin:0 0 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">\' + title + \'</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#0d0d0d;padding:10px;border-radius:6px;border:1px solid #1f1f1f;margin-bottom:14px;text-align:center;"><div><span style="display:block;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;font-family:monospace;">Turns</span><strong style="font-size:12px;color:#e4e4e7;font-weight:500;">\' + msgs.length + \' msgs</strong></div><div><span style="display:block;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;font-family:monospace;">Words</span><strong style="font-size:12px;color:#e4e4e7;font-weight:500;">\' + totalWords.toLocaleString() + \'</strong></div></div><div style="margin-bottom:14px;">\' + (clipboardSuccess ? \'<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10b981;font-size:11px;padding:8px 10px;border-radius:6px;display:flex;align-items:center;gap:6px;">✓ <strong>Auto-copied to clipboard!</strong></div>\' : \'<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;font-size:11px;padding:8px 10px;border-radius:6px;">Auto-copy blocked. Please copy from text area.</div>\') + \'</div><div style="display:flex;flex-direction:column;gap:8px;"><a href="\' + origin + \'/?import_mode=clipboard&source=\' + source + \'&title=\' + encodeURIComponent(title) + \'" target="_blank" id="cb-launch-btn" style="display:block;text-align:center;background:#ffffff;color:#000000;text-decoration:none;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:10px;border-radius:6px;box-shadow:0 4px 12px rgba(255,255,255,0.1);">🚀 Open Bridge Workspace</a><button id="cb-toggle-json" style="background:none;border:none;color:#a1a1aa;cursor:pointer;font-size:11px;text-decoration:underline;padding:4px 0;align-self:center;">Show Raw JSON Payload</button><textarea id="cb-json-box" readonly style="display:none;width:100%;height:100px;background:#000000;color:#00ff66;font-family:monospace;font-size:10px;border:1px solid #27272a;border-radius:4px;padding:6px;box-sizing:border-box;resize:none;margin-top:6px;">\' + payloadStr.split("\'").join("\\\\\'") + \'</textarea></div>\';
      
      document.body.appendChild(modal);
      
      document.getElementById(\'cb-close-btn\').onclick = function() {
        modal.remove();
      };
      
      var jsonBox = document.getElementById(\'cb-json-box\');
      document.getElementById(\'cb-toggle-json\').onclick = function() {
        if (jsonBox.style.display === \'none\') {
          jsonBox.style.display = \'block\';
          this.innerText = \'Hide Raw JSON Payload\';
        } else {
          jsonBox.style.display = \'none\';
          this.innerText = \'Show Raw JSON Payload\';
        }
      };
    })()`;

    // Minify it to make it a safe single-line bookmarklet
    const minified = rawJS
      .replace(/\s+/g, ' ')
      .replace(/{\s+/g, '{')
      .replace(/;\s+/g, ';')
      .trim();
    return `javascript:${encodeURIComponent(minified)}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getBookmarkletCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (linkRef.current) {
      linkRef.current.href = getBookmarkletCode();
    }
  }, []);

  return (
    <div className="bg-stone-900/50 backdrop-blur-md rounded-xl border border-stone-800 p-6 md:p-8 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-stone-800 text-stone-200 border border-stone-700">
              Extraction Link
            </span>
            <span className="text-xs text-stone-500">• Secure local bridge transfer</span>
          </div>
          <h2 className="text-xl md:text-2xl font-serif italic text-white flex items-center gap-2">
            <Bookmark className="w-5 md:w-6 h-5 md:h-6 text-stone-400" />
            The Magic Bookmarklet
          </h2>
          <p className="text-sm text-stone-400 mt-1">
            Grab conversations directly from your browser DOM in a single click—even private or dynamically loaded ones.
          </p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5 transition-colors self-end md:self-auto bg-stone-900 hover:bg-stone-850 px-3 py-1.5 rounded border border-stone-800"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showHelp ? "Hide Details" : "How does this work?"}
        </button>
      </div>

      {showHelp && (
        <div className="mb-6 p-4 rounded bg-stone-950/80 border border-stone-800 text-xs text-stone-400 leading-relaxed space-y-2 animate-fade-in">
          <p className="font-semibold text-stone-300">💡 Why a bookmarklet is required:</p>
          <p>
            AI chat platforms like Claude.ai, ChatGPT, and Gemini don't load their transcripts in raw HTML on initial load. Instead, they fetch data dynamically using client-side JavaScript APIs and store them securely behind login screens.
          </p>
          <p>
            Standard servers or web scraping crawlers cannot view these pages because they require your active login credentials.
          </p>
          <p>
            Our <strong className="text-stone-200">Magic Bookmarklet</strong> runs locally in your browser. When clicked, it reads the active chat messages directly from your browser DOM (without needing your passwords), securely packages them, and pushes them back to your local Workspace in a new tab. No passwords are ever shared or transmitted.
          </p>
        </div>
      )}

      {/* Interactive Drag Zone */}
      <div className="flex flex-col items-center justify-center py-12 px-4 rounded bg-[#0a0a0a] border border-dashed border-stone-800 text-center mb-8">
        <a
          ref={linkRef}
          onClick={(e) => {
            e.preventDefault();
            alert("To install, drag this button directly into your browser's Bookmarks/Favorites bar! (Ctrl+Shift+B or Cmd+Shift+B to show the bar)");
          }}
          className="group relative inline-flex items-center gap-2.5 px-6 py-4 bg-stone-100 hover:bg-stone-200 text-black font-bold uppercase tracking-widest text-xs rounded shadow-lg transition-all duration-300 cursor-grab active:cursor-grabbing hover:-translate-y-0.5 select-none"
        >
          <Bookmark className="w-4 h-4 fill-black stroke-none" />
          ✨ Drag Me to Bookmarks Bar
          <div className="absolute -top-3 -right-3 px-2 py-0.5 bg-stone-800 text-[10px] text-stone-100 rounded font-semibold tracking-wide border border-stone-700 uppercase shadow-md animate-bounce">
            Grab Me
          </div>
        </a>
        <p className="text-xs text-stone-400 mt-4 max-w-md">
          Don't click it! Grab it and slide it up to your browser bookmarks bar.
          <br />
          <span className="text-stone-500">Shortcut to show bar: <kbd className="bg-stone-900 px-1 py-0.5 rounded text-[10px] text-stone-400 font-mono">Cmd/Ctrl + Shift + B</kbd></span>
        </p>
      </div>

      {/* Instructions */}
      <div>
        <h3 className="text-xs font-bold text-stone-400 mb-4 tracking-widest uppercase">
          Setup Instructions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-stone-800 text-xs font-bold text-stone-300">
              1
            </span>
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Install the tool</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Drag the button above into your bookmarks bar. If you can't drag it, click the copy button below to copy the code and paste it as a bookmark URL.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-stone-800 text-xs font-bold text-stone-300">
              2
            </span>
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Open any AI Chat</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Navigate to Claude.ai, ChatGPT, or Gemini and open any conversation you've had that you want to export.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded bg-stone-800 text-xs font-bold text-stone-300">
              3
            </span>
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Click the Bookmark</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Click "Drag Me to Bookmarks Bar" in your bar. It scrapes the page and securely loads it straight into your Chat Context Bridge workspace in a new tab!
              </p>
            </div>
          </div>
        </div>

        {/* Copy Alternative */}
        <div className="mt-8 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-500">
            Can't drag the button? Copy the raw bookmarklet code directly:
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-2 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded border border-stone-700 transition-all self-stretch sm:self-auto justify-center"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied JavaScript Code
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-400" />
                Copy Bookmarklet Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
