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
      function isElementInSidebar(el) {
        var current = el;
        while (current && current !== document.body) {
          var tag = current.tagName.toLowerCase();
          var id = (current.id || "").toLowerCase();
          var cls = (current.className || "");
          if (typeof cls === "object") {
            cls = cls.baseVal || "";
          }
          cls = cls.toLowerCase();
          
          if (tag === "main") {
            return false;
          }
          if (tag === "nav" || tag === "aside" || current.getAttribute("role") === "navigation") {
            return true;
          }
          var isSidebarWord = id.indexOf("sidebar") !== -1 || cls.indexOf("sidebar") !== -1;
          var isLayoutOrToggle = cls.indexOf("layout") !== -1 || cls.indexOf("open") !== -1 || cls.indexOf("closed") !== -1 || cls.indexOf("toggle") !== -1 || cls.indexOf("button") !== -1 || cls.indexOf("btn") !== -1 || id.indexOf("toggle") !== -1;
          if (isSidebarWord && !isLayoutOrToggle) {
            return true;
          }
          if (id.indexOf("history-panel") !== -1 || cls.indexOf("history-panel") !== -1 || id.indexOf("left-panel") !== -1) {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      }

      function cleanText(text) {
        if (!text) return "";
        var lines = text.split("\n");
        var filteredLines = lines.filter(function(line) {
          var l = line.trim().toLowerCase();
          if (l.indexOf("use the up and down arrow keys") !== -1) return false;
          if (l.indexOf("load earlier messages") !== -1) return false;
          if (l === "copy code") return false;
          if (l === "copy to clipboard") return false;
          if (l === "copy link") return false;
          if (l === "was this response helpful?") return false;
          if (l === "regenerate") return false;
          if (l === "regenerate response") return false;
          return true;
        });
        
        var cleaned = filteredLines.join("\n").trim();
        cleaned = cleaned.replace(/Use the up and down arrow keys to move between messages\.?/gi, "");
        cleaned = cleaned.replace(/Load earlier messages\.?/gi, "");
        return cleaned.trim();
      }

      function getTextWithoutActions(el) {
        if (!el) return "";
        try {
          var clone = el.cloneNode(true);
          var selectorsToRemove = [
            "button",
            "svg",
            "style",
            "script",
            "model-feedback",
            ".ds-message-actions",
            ".ds-feedback",
            "[class*='message-actions']",
            "[class*='response-actions']",
            "[class*='feedback-actions']"
          ];
          selectorsToRemove.forEach(function(sel) {
            try {
              var items = clone.querySelectorAll(sel);
              items.forEach(function(item) {
                item.remove();
              });
            } catch(e) {}
          });
          return clone.innerText || clone.textContent || "";
        } catch(e) {
          return el.innerText || el.textContent || "";
        }
      }

      function scoreMessageArray(msgs) {
        if (!msgs || msgs.length === 0) return 0;
        var score = msgs.length;
        var hasUser = false;
        var hasAssistant = false;
        var alternations = 0;
        var containsSuggestions = false;
        for (var i = 0; i < msgs.length; i++) {
          var m = msgs[i];
          if (m.role === "user") hasUser = true;
          if (m.role === "assistant") hasAssistant = true;
          if (i > 0 && msgs[i].role !== msgs[i-1].role) {
            alternations++;
          }
          if (
            m.text && (
              m.text.indexOf("short story about a morning commute") !== -1 ||
              m.text.indexOf("sustainable fashion trends") !== -1 ||
              m.text.indexOf("wireless headphones") !== -1 ||
              m.text.indexOf("sky changes color at sunset") !== -1 ||
              m.text.indexOf("wrong item in their order") !== -1 ||
              m.text.indexOf("Write the opening of a short story") !== -1
            )
          ) {
            containsSuggestions = true;
          }
        }
        if (hasUser && hasAssistant) score += 20;
        score += alternations * 5;
        if (!hasUser || !hasAssistant) {
          score -= 50;
        }
        if (containsSuggestions) {
          score -= 1000;
        }
        return score;
      }

      function extractFromReactMemory() {
        var visited = new Set();
        var bestArray = null;
        var bestScore = -9999;

        function parseReactMessage(item) {
          var role = "assistant";
          var text = "";
          if (!item || typeof item !== "object") return { role: role, text: text };

          try {
            if (item.role) {
              var r = item.role.toString().toLowerCase();
              if (r.indexOf("user") !== -1 || r === "human") role = "user";
            } else if (item.sender) {
              var s = item.sender.toString().toLowerCase();
              if (s.indexOf("user") !== -1 || s === "human") role = "user";
            } else if (item.author) {
              var a = "";
              if (typeof item.author === "string") {
                a = item.author;
              } else if (item.author.role) {
                a = item.author.role;
              } else if (item.author.name) {
                a = item.author.name;
              }
              if (a.toLowerCase().indexOf("user") !== -1 || a.toLowerCase().indexOf("human") !== -1) role = "user";
            } else if (item.sender_type) {
              var st = item.sender_type.toString().toLowerCase();
              if (st.indexOf("user") !== -1 || st === "human") role = "user";
            }

            if (typeof item.text === "string") {
              text = item.text;
            } else if (typeof item.content === "string") {
              text = item.content;
            } else if (Array.isArray(item.parts)) {
              text = item.parts.map(function(p) {
                if (typeof p === "string") return p;
                if (p && typeof p === "object" && p.text) return p.text;
                return "";
              }).join("\n");
            } else if (item.content && typeof item.content === "object") {
              if (Array.isArray(item.content)) {
                text = item.content.map(function(c) {
                  if (typeof c === "string") return c;
                  if (c && typeof c === "object") {
                    if (c.text) return c.text;
                    if (c.type === "text" && c.text) return c.text;
                  }
                  return "";
                }).join("\n");
              } else if (Array.isArray(item.content.parts)) {
                text = item.content.parts.filter(function(p) { return typeof p === "string"; }).join("\n");
              } else if (item.content.text) {
                text = item.content.text;
              } else {
                text = JSON.stringify(item.content);
              }
            } else if (item.message) {
              text = typeof item.message === "string" ? item.message : (item.message.text || JSON.stringify(item.message));
            } else if (item.text_content) {
              text = item.text_content;
            } else if (item.message_text) {
              text = item.message_text;
            }
          } catch (e) {}

          return { role: role, text: text };
        }

        function isMessageArray(arr) {
          if (!Array.isArray(arr) || arr.length === 0) return false;
          var matchCount = 0;
          var sampleSize = Math.min(arr.length, 3);
          for (var i = 0; i < sampleSize; i++) {
            var item = arr[i];
            if (item && typeof item === "object") {
              try {
                var parsed = parseReactMessage(item);
                if (parsed.text && parsed.text.length > 0) {
                  matchCount++;
                }
              } catch(e) {}
            }
          }
          return matchCount > 0 && matchCount === sampleSize;
        }

        function walk(obj, depth) {
          if (!obj || depth > 20) return;
          try {
            if (visited.has(obj)) return;
            visited.add(obj);
          } catch(e) { return; }

          try {
            if (Array.isArray(obj)) {
              if (obj.length > 0 && isMessageArray(obj)) {
                var parsedMsgs = [];
                obj.forEach(function(item) {
                  try {
                    var parsed = parseReactMessage(item);
                    var txt = cleanText(parsed.text);
                    if (txt && txt.length > 1) {
                      parsedMsgs.push({ role: parsed.role, text: txt });
                    }
                  } catch(e) {}
                });
                var score = scoreMessageArray(parsedMsgs);
                if (score > bestScore) {
                  bestScore = score;
                  bestArray = obj;
                }
              }
              for (var i = 0; i < Math.min(obj.length, 50); i++) {
                if (obj[i] && typeof obj[i] === "object") {
                  walk(obj[i], depth + 1);
                }
              }
            } else if (typeof obj === "object" && obj !== null) {
              if (obj instanceof Element || (obj.constructor && obj.constructor.name === "FiberNode")) return;
              var keys = Object.keys(obj);
              for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (
                  key === "stateNode" || 
                  key === "child" || 
                  key === "sibling" || 
                  key === "return" || 
                  key === "alternate" ||
                  key === "next" ||
                  key.indexOf("__react") === 0
                ) {
                  continue;
                }
                var val = obj[key];
                if (val && typeof val === "object") {
                  walk(val, depth + 1);
                }
              }
            }
          } catch (e) {}
        }

        function checkFiber(fiber) {
          if (!fiber) return;
          
          if (fiber.memoizedProps) {
            walk(fiber.memoizedProps, 0);
          }
          if (fiber.pendingProps) {
            walk(fiber.pendingProps, 0);
          }
          
          var hook = fiber.memoizedState;
          while (hook && typeof hook === "object") {
            if (hook.memoizedState !== undefined) {
              walk(hook.memoizedState, 0);
            }
            hook = hook.next;
          }
        }

        // 1. Walk UP from message-like DOM elements first
        var msgEls = document.querySelectorAll("[data-testid*='message'], [class*='message'], [class*='Message'], .font-claude-message, .prose, .chat-message");
        for (var i = 0; i < msgEls.length; i++) {
          var el = msgEls[i];
          var keys = Object.keys(el);
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (
              key.indexOf("__reactFiber$") === 0 || 
              key.indexOf("__reactInternalInstance$") === 0 ||
              key.indexOf("__reactProps$") === 0
            ) {
              try {
                var curr = el[key];
                while (curr) {
                  checkFiber(curr);
                  curr = curr.return;
                }
              } catch(e) {}
            }
          }
        }

        // 2. Fallback: Walk DOWN from common roots
        var roots = [
          document.querySelector("#root"),
          document.querySelector("#app"),
          document.querySelector("main"),
          document.body
        ];
        roots.forEach(function(root) {
          if (!root) return;
          try {
            var els = root.querySelectorAll("*");
            checkElement(root);
            for (var i = 0; i < els.length; i++) {
              checkElement(els[i]);
            }
          } catch(e) {}
        });

        function checkElement(el) {
          if (!el) return;
          var keys = Object.keys(el);
          for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (
              key.indexOf("__reactFiber$") === 0 || 
              key.indexOf("__reactProps$") === 0 || 
              key.indexOf("__reactContainer$") === 0 ||
              key.indexOf("__reactInternalInstance$") === 0
            ) {
              try {
                walk(el[key], 0);
              } catch(e) {}
            }
          }
        }

        if (bestArray) {
          var resMsgs = [];
          bestArray.forEach(function(item) {
            try {
              var parsed = parseReactMessage(item);
              var txt = cleanText(parsed.text);
              if (txt && txt.length > 1) {
                resMsgs.push({ role: parsed.role, text: txt });
              }
            } catch(e) {}
          });
          if (resMsgs.length > 0) return resMsgs;
        }
        return null;
      }

      function extractMessages() {
        /* Auto-click "Load earlier messages" or similar buttons to try and load them automatically */
        try {
          var loadButtons = document.querySelectorAll("button, a, [role='button'], .load-more-btn");
          loadButtons.forEach(function(btn) {
            var text = (btn.innerText || btn.textContent || "").toLowerCase();
            if (
              text.indexOf("load earlier") !== -1 ||
              text.indexOf("load more") !== -1 ||
              text.indexOf("show earlier") !== -1 ||
              text.indexOf("show more messages") !== -1 ||
              text.indexOf("earlier messages") !== -1
            ) {
              btn.click();
            }
          });
        } catch(e) {}

        var domMsgs = [];
        var host = window.location.hostname;
        
        if (host.indexOf("claude.ai") !== -1) {
          var elems = document.querySelectorAll("[data-testid*='message'], .font-user-message, .font-claude-message, [class*='font-user'], [class*='font-claude'], .prose");
          if (elems.length === 0) {
            elems = document.querySelectorAll("[class*='user-message'], [class*='assistant-message'], [class*='ChatMessage'], .prose");
          }
          elems.forEach(function(el) {
            if (isElementInSidebar(el)) return;
            var isUser = el.getAttribute("data-testid") === "user-message" || 
                         el.classList.contains("font-user-message") || 
                         (el.className && el.className.indexOf("font-user") !== -1) ||
                         (el.className && el.className.indexOf("user-message") !== -1);
            var txt = getTextWithoutActions(el);
            txt = cleanText(txt);
            if (txt) {
              domMsgs.push({ role: isUser ? "user" : "assistant", text: txt });
            }
          });
        } 
        else if (host.indexOf("chatgpt.com") !== -1 || host.indexOf("chat.openai.com") !== -1) {
          var elems = document.querySelectorAll("[data-message-author-role='user'], [data-message-author-role='assistant']");
          if (elems.length > 0) {
            elems.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var role = el.getAttribute("data-message-author-role");
              var txt = getTextWithoutActions(el);
              txt = cleanText(txt);
              if (txt) {
                domMsgs.push({ role: role === "user" ? "user" : "assistant", text: txt });
              }
            });
          } else {
            var turns = document.querySelectorAll("[data-testid^='conversation-turn']");
            if (turns.length > 0) {
              turns.forEach(function(turn) {
                if (isElementInSidebar(turn)) return;
                var userBlock = turn.querySelector("[data-testid^='user-message']");
                var assistBlock = turn.querySelector(".prose");
                if (userBlock) {
                  var uTxt = getTextWithoutActions(userBlock);
                  uTxt = cleanText(uTxt);
                  if (uTxt) domMsgs.push({ role: "user", text: uTxt });
                }
                if (assistBlock) {
                  var aTxt = getTextWithoutActions(assistBlock);
                  aTxt = cleanText(aTxt);
                  if (aTxt) domMsgs.push({ role: "assistant", text: aTxt });
                }
              });
            } else {
              var messages = document.querySelectorAll(".whitespace-pre-wrap, .prose");
              messages.forEach(function(el) {
                if (isElementInSidebar(el)) return;
                var isUser = el.closest("[data-testid^='user-message']") || !el.classList.contains("prose");
                var txt = getTextWithoutActions(el);
                txt = cleanText(txt);
                if (txt) {
                  domMsgs.push({ role: isUser ? "user" : "assistant", text: txt });
                }
              });
            }
          }
        }
        else if (host.indexOf("gemini.google.com") !== -1) {
          var units = document.querySelectorAll("user-query, model-response, [class*='message-loop-and-turn']");
          if (units.length > 0) {
            units.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var isUser = el.tagName.toLowerCase() === "user-query" || el.classList.contains("query-content");
              var txt = "";
              if (isUser) {
                txt = getTextWithoutActions(el);
              } else {
                var contentEl = el.querySelector(".message-content, .markdown, .model-response-text");
                txt = getTextWithoutActions(contentEl || el);
              }
              txt = cleanText(txt);
              if (txt) {
                domMsgs.push({ role: isUser ? "user" : "assistant", text: txt });
              }
            });
          } else {
            var queryElems = document.querySelectorAll(".query-content, .message-content");
            queryElems.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var isUser = el.classList.contains("query-content") || el.closest("user-query");
              var txt = getTextWithoutActions(el);
              txt = cleanText(txt);
              if (txt) {
                domMsgs.push({ role: isUser ? "user" : "assistant", text: txt });
              }
            });
          }
        }
        else if (host.indexOf("deepseek.com") !== -1) {
          var messages = document.querySelectorAll(".ds-message, [class*='ds-message'], [class*='message-item']");
          if (messages.length > 0) {
            messages.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var markdownEl = el.querySelector(".ds-markdown, [class*='ds-markdown']");
              if (markdownEl) {
                var txt = getTextWithoutActions(markdownEl);
                txt = cleanText(txt);
                if (txt) {
                  domMsgs.push({ role: "assistant", text: txt });
                }
              } else {
                var userTextEl = el.querySelector("[class*='user-message'], [class*='user-text'], [class*='text-content']");
                var txt = getTextWithoutActions(userTextEl || el);
                txt = cleanText(txt);
                if (txt) {
                  domMsgs.push({ role: "user", text: txt });
                }
              }
            });
          } else {
            var mdBlocks = document.querySelectorAll(".ds-markdown, [class*='ds-markdown']");
            mdBlocks.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var txt = getTextWithoutActions(el);
              txt = cleanText(txt);
              if (txt) {
                var prev = el.parentElement;
                while (prev) {
                  var prevSib = prev.previousElementSibling;
                  if (prevSib) {
                    var userTxt = getTextWithoutActions(prevSib);
                    userTxt = cleanText(userTxt);
                    if (userTxt && !prevSib.querySelector(".ds-markdown, [class*='ds-markdown']")) {
                      domMsgs.push({ role: "user", text: userTxt });
                      break;
                    }
                  }
                  prev = prev.parentElement;
                }
                domMsgs.push({ role: "assistant", text: txt });
              }
            });
          }
        }
        else {
          var elems = document.querySelectorAll("[data-message-author-role='user'], [data-message-author-role='assistant']");
          if (elems.length === 0) {
            elems = document.querySelectorAll("[data-testid*='user-message'], [data-testid*='assistant-message'], [class*='UserMessage'], [class*='AssistantMessage'], [class*='chat-message-user'], [class*='chat-message-assistant']");
          }
          if (elems.length > 0) {
            elems.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var role = "assistant";
              var roleAttr = el.getAttribute("data-message-author-role");
              if (roleAttr) {
                role = roleAttr === "user" ? "user" : "assistant";
              } else {
                var testId = el.getAttribute("data-testid") || "";
                var cls = el.className || "";
                if (testId.indexOf("user") !== -1 || cls.indexOf("User") !== -1 || cls.indexOf("user") !== -1) {
                  role = "user";
                }
              }
              var txt = getTextWithoutActions(el);
              txt = cleanText(txt);
              if (txt) {
                domMsgs.push({ role: role, text: txt });
              }
            });
          } else {
            var mdBlocks = document.querySelectorAll(".markdown, .prose, pre, code");
            mdBlocks.forEach(function(el) {
              if (isElementInSidebar(el)) return;
              var txt = getTextWithoutActions(el);
              txt = cleanText(txt);
              if (txt) {
                domMsgs.push({ role: "assistant", text: txt });
              }
            });
          }
        }

        var memMsgs = [];
        try {
          memMsgs = extractFromReactMemory() || [];
        } catch(e) {
          console.error("React extraction failed:", e);
        }

        // Compare and use whichever extracted the higher-scored message list!
        var best = domMsgs;
        if (scoreMessageArray(memMsgs) > scoreMessageArray(domMsgs)) {
          best = memMsgs;
        }

        var finalMsgs = [];
        best.forEach(function(m) {
          if (!m.text || m.text.trim().length < 2) return;
          if (finalMsgs.length > 0) {
            var last = finalMsgs[finalMsgs.length - 1];
            if (last.role === m.role && last.text.trim() === m.text.trim()) {
              return;
            }
            if (last.role === m.role) {
              if (last.text.indexOf(m.text) !== -1) {
                return;
              }
              if (m.text.indexOf(last.text) !== -1) {
                last.text = m.text;
                return;
              }
            }
          }
          finalMsgs.push(m);
        });
        return finalMsgs;
      }
      
      var msgs = extractMessages();
      if (msgs.length === 0) {
        var bodyClone = document.body.cloneNode(true);
        var sidebars = bodyClone.querySelectorAll("nav, aside, [id*='sidebar'], [id*='nav'], [id*='menu'], [class*='sidebar'], [class*='nav'], [class*='menu'], [class*='history'], [class*='left-panel']");
        sidebars.forEach(function(sb) {
          sb.remove();
        });
        var fullText = bodyClone.innerText || bodyClone.textContent || "";
        fullText = fullText.trim();
        msgs = [{ role: "user", text: fullText }];
      }
      
      var source = "Unknown";
      var host = window.location.hostname;
      if (host.indexOf("claude.ai") !== -1) source = "Claude";
      else if (host.indexOf("chatgpt") !== -1) source = "ChatGPT";
      else if (host.indexOf("gemini") !== -1) source = "Gemini";
      else if (host.indexOf("deepseek") !== -1) source = "DeepSeek";
      
      var title = document.title || (source + " Chat Import");
      var totalWords = 0;
      msgs.forEach(function(m) { totalWords += (m.text || "").split(" ").length; });
      
      var payload = {
        source: source,
        url: window.location.href,
        title: title,
        messages: msgs
      };
      
      var payloadStr = JSON.stringify(payload);
      var clipboardSuccess = true;
      try {
        var el = document.createElement("textarea");
        el.value = payloadStr;
        el.setAttribute("readonly", "");
        el.style.position = "absolute";
        el.style.left = "-9999px";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch (e) {
        try {
          navigator.clipboard.writeText(payloadStr);
        } catch (e2) {
          clipboardSuccess = false;
        }
      }
      
      var existing = document.getElementById("context-bridge-modal");
      if (existing) existing.remove();
      
      var modal = document.createElement("div");
      modal.id = "context-bridge-modal";
      modal.style.cssText = "position:fixed;top:24px;right:24px;z-index:9999999;width:380px;background:#141414;border:1px solid #2b2b2b;border-radius:12px;padding:20px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#e4e4e7;font-family:system-ui,-apple-system,sans-serif;text-align:left;box-sizing:border-box;";
      
      var badgeBg = "#27272a";
      if (source === "Gemini") badgeBg = "#1e3a8a";
      else if (source === "Claude") badgeBg = "#7c2d12";
      else if (source === "ChatGPT") badgeBg = "#064e3b";
      else if (source === "DeepSeek") badgeBg = "#1e1b4b";

      var mdTranscript = msgs.map(function(m) {
        var speaker = m.role === "user" ? "### 👤 HUMAN / USER" : "### 🤖 AI ASSISTANT (" + source + ")";
        return speaker + "\\n\\n" + m.text + "\\n\\n---\\n";
      }).join("\\n");

      function copyText(text) {
        var success = true;
        try {
          var el = document.createElement("textarea");
          el.value = text;
          el.setAttribute("readonly", "");
          el.style.position = "absolute";
          el.style.left = "-9999px";
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        } catch (e) {
          try {
            navigator.clipboard.writeText(text);
          } catch (e2) {
            success = false;
          }
        }
        return success;
      }

      function findScrollContainer() {
        var messageEl = document.querySelector("[data-testid*='message'], .font-claude-message, .prose, [class*='message']");
        if (!messageEl) return window;
        var parent = messageEl.parentElement;
        while (parent && parent !== document.body) {
          var style = window.getComputedStyle(parent);
          if ((style.overflowY === "auto" || style.overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return window;
      }

      function mergeBatches(accumulated, newBatch) {
        if (accumulated.length === 0) return newBatch;
        if (newBatch.length === 0) return accumulated;
        
        var overlapIndex = -1;
        for (var i = 0; i < newBatch.length; i++) {
          var match = true;
          var matchLen = Math.min(newBatch.length - i, accumulated.length);
          for (var k = 0; k < matchLen; k++) {
            if (newBatch[i + k].role !== accumulated[k].role || newBatch[i + k].text.trim() !== accumulated[k].text.trim()) {
              match = false;
              break;
            }
          }
          if (match && matchLen > 0) {
            overlapIndex = i;
            break;
          }
        }
        
        if (overlapIndex !== -1) {
          return newBatch.slice(0, overlapIndex).concat(accumulated);
        } else {
          var filteredNew = newBatch.filter(function(n) {
            return !accumulated.some(function(a) {
              return a.role === n.role && a.text.trim() === n.text.trim();
            });
          });
          return filteredNew.concat(accumulated);
        }
      }

      function updateModalData(currentMsgs) {
        var words = 0;
        currentMsgs.forEach(function(m) { words += (m.text || "").split(" ").length; });
        
        var turnsEl = document.getElementById("cb-turns");
        if (turnsEl) turnsEl.innerText = currentMsgs.length + " msgs";
        
        var wordsEl = document.getElementById("cb-words");
        if (wordsEl) wordsEl.innerText = words.toLocaleString();
        
        var jsonEl = document.getElementById("cb-json-box");
        var payloadObj = {
          source: source,
          url: window.location.href,
          title: title,
          messages: currentMsgs
        };
        var pStr = JSON.stringify(payloadObj);
        if (jsonEl) {
          jsonEl.value = pStr;
        }
        
        var launchBtn = document.getElementById("cb-launch-btn");
        if (launchBtn) {
          launchBtn.href = origin + "/?import_mode=clipboard&source=" + source + "&title=" + encodeURIComponent(title);
        }
        
        try {
          var el = document.createElement("textarea");
          el.value = pStr;
          el.setAttribute("readonly", "");
          el.style.position = "absolute";
          el.style.left = "-9999px";
          document.body.appendChild(el);
          el.select();
          document.execCommand("copy");
          document.body.removeChild(el);
        } catch(e) {}
        
        mdTranscript = currentMsgs.map(function(m) {
          var speaker = m.role === "user" ? "### 👤 HUMAN / USER" : "### 🤖 AI ASSISTANT (" + source + ")";
          return speaker + "\\n\\n" + m.text + "\\n\\n---\\n";
        }).join("\\n");
      }

      function startDeepScroll(btn) {
        var container = findScrollContainer();
        var accumulated = msgs;
        var scrollCount = 0;
        var consecutiveNoNew = 0;
        
        btn.disabled = true;
        btn.style.background = "#451a03";
        btn.innerText = "⏳ Deep Scanning Chat...";
        
        var scrollInterval = setInterval(function() {
          var isAtTop = false;
          var beforeScroll = 0;
          var afterScroll = 0;
          
          if (container === window) {
            beforeScroll = window.scrollY || document.documentElement.scrollTop;
            window.scrollBy(0, -600);
            afterScroll = window.scrollY || document.documentElement.scrollTop;
            isAtTop = afterScroll === 0;
          } else {
            beforeScroll = container.scrollTop;
            container.scrollTop = Math.max(0, container.scrollTop - 600);
            afterScroll = container.scrollTop;
            isAtTop = afterScroll === 0;
          }
          
          scrollCount++;
          
          var newBatch = extractMessages();
          var prevLen = accumulated.length;
          accumulated = mergeBatches(accumulated, newBatch);
          
          if (accumulated.length === prevLen) {
            consecutiveNoNew++;
          } else {
            consecutiveNoNew = 0;
          }
          
          btn.innerText = "⏳ Scrolled " + scrollCount + "x (" + accumulated.length + " msgs)";
          updateModalData(accumulated);
          
          if ((isAtTop && beforeScroll === 0) || consecutiveNoNew >= 15 || scrollCount > 150) {
            clearInterval(scrollInterval);
            btn.disabled = false;
            btn.style.background = "#15803d";
            btn.innerText = "✓ Deep Scan Complete (" + accumulated.length + " msgs)";
            setTimeout(function() {
              btn.style.background = "#7c2d12";
              btn.innerText = "🔄 Deep Scan & Auto-Scroll";
            }, 3000);
          }
        }, 120);
      }

      modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid #27272a;padding-bottom:10px;"><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;background:' + badgeBg + ';color:#ffffff;padding:2px 6px;border-radius:4px;">' + source + '</span><span style="font-size:12px;font-weight:bold;color:#a1a1aa;font-family:monospace;">Bridge Extract</span></div><button id="cb-close-btn" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:20px;line-height:1;padding:4px;margin-left:auto;">&times;</button></div><h3 style="font-size:14px;font-weight:600;color:#ffffff;margin:0 0 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#0d0d0d;padding:10px;border-radius:6px;border:1px solid #1f1f1f;margin-bottom:14px;text-align:center;"><div><span style="display:block;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;font-family:monospace;">Turns</span><strong id="cb-turns" style="font-size:12px;color:#e4e4e7;font-weight:500;">' + msgs.length + ' msgs</strong></div><div><span style="display:block;font-size:9px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;font-family:monospace;">Words</span><strong id="cb-words" style="font-size:12px;color:#e4e4e7;font-weight:500;">' + totalWords.toLocaleString() + '</strong></div></div><div style="margin-bottom:14px;">' + (clipboardSuccess ? '<div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);color:#10b981;font-size:11px;padding:8px 10px;border-radius:6px;display:flex;align-items:center;gap:6px;">✓ <strong>Auto-copied JSON to clipboard!</strong></div>' : '<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;font-size:11px;padding:8px 10px;border-radius:6px;">Auto-copy blocked. Please copy from text area.</div>') + '</div><div style="display:flex;flex-direction:column;gap:8px;"><button id="cb-deep-scan-btn" style="display:block;width:100%;text-align:center;background:#7c2d12;color:#ffffff;border:none;cursor:pointer;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:10px;border-radius:6px;box-shadow:0 4px 12px rgba(124,45,18,0.3);margin-bottom:4px;transition:all 0.2s;">🔄 Deep Scan & Auto-Scroll</button><a href="' + origin + '/?import_mode=clipboard&source=' + source + '&title=' + encodeURIComponent(title) + '" target="_blank" id="cb-launch-btn" style="display:block;text-align:center;background:#ffffff;color:#000000;text-decoration:none;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:10px;border-radius:6px;box-shadow:0 4px 12px rgba(255,255,255,0.1);">🚀 Open Bridge Workspace</a><button id="cb-copy-md-btn" style="display:block;width:100%;text-align:center;background:#18181b;color:#ffffff;border:1px solid #27272a;cursor:pointer;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:10px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);transition:all 0.2s;">📋 Copy Clean Transcript</button><button id="cb-toggle-json" style="background:none;border:none;color:#a1a1aa;cursor:pointer;font-size:11px;text-decoration:underline;padding:4px 0;align-self:center;">Show Raw JSON Payload</button><textarea id="cb-json-box" readonly style="display:none;width:100%;height:100px;background:#000000;color:#00ff66;font-family:monospace;font-size:10px;border:1px solid #27272a;border-radius:4px;padding:6px;box-sizing:border-box;resize:none;margin-top:6px;">' + payloadStr.replace(new RegExp("</textarea>", "gi"), "&lt;/textarea&gt;") + '</textarea></div>';
      
      document.body.appendChild(modal);
      
      document.getElementById("cb-close-btn").onclick = function() {
        modal.remove();
      };

      document.getElementById("cb-deep-scan-btn").onclick = function() {
        startDeepScroll(this);
      };

      document.getElementById("cb-copy-md-btn").onclick = function() {
        var copySuccess = copyText(mdTranscript);
        var btn = this;
        if (copySuccess) {
          btn.innerText = "✓ Transcript Copied!";
          btn.style.background = "#064e3b";
          btn.style.color = "#ffffff";
          setTimeout(function() {
            btn.innerText = "📋 Copy Clean Transcript";
            btn.style.background = "#18181b";
          }, 2000);
        } else {
          btn.innerText = "❌ Copy Failed";
          btn.style.background = "#991b1b";
        }
      };
      
      var jsonBox = document.getElementById("cb-json-box");
      document.getElementById("cb-toggle-json").onclick = function() {
        if (jsonBox.style.display === "none") {
          jsonBox.style.display = "block";
          this.innerText = "Hide Raw JSON Payload";
        } else {
          jsonBox.style.display = "none";
          this.innerText = "Show Raw JSON Payload";
        }
      };
    })()`;

    // Minify safely and reliably without breaking strings or statements
    const minified = rawJS
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//'))
      .join(' ');
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
    <div className="bg-stone-900/50 backdrop-blur-md rounded-xl border border-stone-800 p-6 md:p-8 shadow-xl animate-fade-in">
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
              <h4 className="text-sm font-medium text-white mb-1">Open &amp; Scroll Chat</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Open your chat on Claude, ChatGPT, Gemini, or DeepSeek. <strong className="text-stone-300">Tip:</strong> If the chat is very long, scroll to the top once so the browser loads all older messages into memory first!
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
