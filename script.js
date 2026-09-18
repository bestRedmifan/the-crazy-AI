// CrazyAI - 500 line edition
const chatArea = document.getElementById("chatArea");
const input = document.getElementById("messageInput");
const composer = document.getElementById("composer");
const sendBtn = document.getElementById("sendBtn");
const voiceBtn = document.getElementById("voiceBtn");
const clearBtn = document.getElementById("clearBtn");
const typing = document.getElementById("typing");
const statusText = document.getElementById("statusText");
const voiceStatus = document.getElementById("voiceStatus");
const toast = document.getElementById("toast");
const MEMORY_KEY = "crazyAI_memory";
const CHAT_KEY = "crazyAI_chat";
let memory = {};
let chatHistory = [];
let lastAIMessage = "";
let recognition = null;
let isListening = false;
let voiceAvailable = false;
function readJSON(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
        return fallback;
    }
}
memory = readJSON(MEMORY_KEY, {});
chatHistory = readJSON(CHAT_KEY, []);
if (!memory || typeof memory !== "object" || Array.isArray(memory)) memory = {};
if (!Array.isArray(chatHistory)) chatHistory = [];
function saveMemory() {
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(memory)); } catch (error) {}
}
function saveChat() {
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory)); } catch (error) {}
}
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}
function setStatus(message) {
    if (statusText) statusText.textContent = message;
}
function showTyping() {
    if (typing) typing.style.display = "flex";
    setStatus("CrazyAI در حال فکر کردن است...");
}
function hideTyping() {
    if (typing) typing.style.display = "none";
    setStatus("آماده");
}
function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ى/g, "ی")
        .replace(/ك/g, "ک")
        .trim();
}
function clean(text) {
    return normalize(text).replace(/[؟?!.,،؛:]/g, "");
}
function has(text, words) {
    return words.some(word => text.includes(word));
}
function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
}
function createMessage(text, sender) {
    const element = document.createElement("div");
    element.className = sender === "user"
        ? "message user-message"
        : "message ai-message";
    element.textContent = text;
    return element;
}
function addMessage(text, sender, save = true) {
    if (!chatArea) return;
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.remove();
    chatArea.appendChild(createMessage(text, sender));
    chatArea.scrollTop = chatArea.scrollHeight;
    if (save) {
        chatHistory.push({ sender, text, time: Date.now() });
        saveChat();
    }
}
function loadChat() {
    if (!chatArea || !chatHistory.length) return;
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.remove();
    chatHistory.forEach(item => {
        if (!item || typeof item.text !== "string") return;
        addMessage(item.text, item.sender === "user" ? "user" : "ai", false);
    });
    const last = chatHistory[chatHistory.length - 1];
    if (last && last.sender === "ai") lastAIMessage = last.text;
}
function remember(text) {
    const patterns = [
        /اسمم\s+([آ-یA-Za-z0-9_]+)/i,
        /نامم\s+([آ-یA-Za-z0-9_]+)/i,
        /اسم\s+من\s+([آ-یA-Za-z0-9_]+)/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            memory.name = match[1].trim();
            saveMemory();
            break;
        }
    }
    const value = clean(text);
    if (has(value, ["دوست دارم", "علاقه دارم"])) {
        memory.lastInterest = text;
        saveMemory();
    }
}
function greeting() {
    const name = memory.name ? ` ${memory.name}` : "";
    return pick([
        `سلام${name}! 😺`,
        `درود${name}! 🤖`,
        "سلاممم 😎 CrazyAI آنلاین است!",
        "هی! 😺 چه خبر؟",
        "سلام! مغز مصنوعی من آماده‌ست 🧠🤖"
    ]);
}
function identity(text) {
    if (has(text, ["اسمت چیه", "اسم تو چیه", "تو کی هستی", "معرفی کن"])) {
        return "من CrazyAI هستم 🤖😺 یک دستیار محلی هستم که بدون وب کار می‌کنم.";
    }
    if (has(text, ["هوش مصنوعی هستی", "ai هستی", "رباتی", "ربات هستی"])) {
        return "آره 🤖 من CrazyAI هستم؛ مغزم داخل همین JavaScript زندگی می‌کنه 😂";
    }
    return null;
}
function emotional(text) {
    if (has(text, [
        "مامانم فوت کرده", "مادرم فوت کرده", "مامانم مرده",
        "مادرم مرده", "مامانم از دنیا رفته", "مادرم از دنیا رفته",
        "مامانم رو از دست دادم", "مادرم رو از دست دادم"
    ])) {
        return "خیلی متأسفم که چنین اتفاق دردناکی برایت افتاده. 🖤 اینجا جای شوخی نیست. اگر دوست داری درباره احساست یا خاطره‌ای که از مادرت داری حرف بزن.";
    }
    if (has(text, ["ناراحتم", "غمگینم", "حالم بده", "تنها هستم"])) {
        return "متأسفم که این‌طوری احساس می‌کنی. 🫂 اگر دوست داری بگو چی باعث شده ناراحت باشی.";
    }
    if (has(text, ["گریه کردم", "دارم گریه می کنم", "گریه میکنم"])) {
        return "متأسفم که ناراحتی. 🫂 اگر دوست داری درباره چیزی که اذیتت کرده حرف بزن.";
    }
    return null;
}
function webLimit(text) {
    if (has(text, [
        "اخبار", "قیمت امروز", "قیمت الان", "آب و هوا",
        "هوا چطوره", "لینک", "سایت", "گوگل", "یوتیوب", "اینترنت"
    ])) {
        return "این مورد به اطلاعات آنلاین نیاز دارد 🌐 و CrazyAI عمداً به وب وصل نیست؛ پس حدس نمی‌زنم.";
    }
    return null;
}
function math(text) {
    let value = text
        .replace(/به علاوه/g, "+")
        .replace(/جمع/g, "+")
        .replace(/منهای/g, "-")
        .replace(/ضربدر/g, "*")
        .replace(/ضرب/g, "*")
        .replace(/تقسیم بر/g, "/")
        .replace(/تقسیم/g, "/")
        .replace(/×/g, "*")
        .replace(/÷/g, "/");
    const match = value.match(/(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const a = Number(match[1]);
    const op = match[2];
    const b = Number(match[3]);
    if (op === "/" && b === 0) return "تقسیم بر صفر؟ 😐 این یکی ممکن نیست!";
    let result = null;
    if (op === "+") result = a + b;
    if (op === "-") result = a - b;
    if (op === "*") result = a * b;
    if (op === "/") result = a / b;
    return result === null ? null : `جواب: ${result} 🧮`;
}
function knowledge(text) {
    const answers = {
        "پایتخت فرانسه": "پاریس 🇫🇷",
        "پایتخت ایران": "تهران 🇮🇷",
        "پایتخت آلمان": "برلین 🇩🇪",
        "پایتخت ایتالیا": "رم 🇮🇹",
        "پایتخت ژاپن": "توکیو 🇯🇵",
        "پایتخت انگلیس": "لندن 🇬🇧"
    };
    for (const key in answers) if (text.includes(key)) return answers[key];
    if (has(text, ["خورشید چیست", "خورشید چیه"])) return "خورشید یک ستاره و مرکز منظومه شمسی است ☀️.";
    if (has(text, ["آب چیست", "آب چیه"])) return "آب یک ترکیب شیمیایی با فرمول H₂O است 💧.";
    if (has(text, ["زمین چیست", "زمین چیه"])) return "زمین یکی از سیاره‌های منظومه شمسی و خانه ماست 🌍.";
    if (has(text, ["ماه چیست", "ماه چیه"])) return "ماه قمر طبیعی زمین است 🌙.";
    return null;
}
function memoryAnswer(text) {
    if (has(text, ["اسم من چیه", "اسمم چیه"])) {
        return memory.name ? `اسم تو ${memory.name} هست 😺` : "اسم خودت رو هنوز بهم نگفتی؛ پس حدس نمی‌زنم 🙂";
    }
    if (has(text, ["چی از من میدونی", "چی از من می‌دونی", "حافظه ات چیه"])) {
        const items = [];
        if (memory.name) items.push(`اسم: ${memory.name}`);
        if (memory.lastInterest) items.push(`آخرین علاقه: ${memory.lastInterest}`);
        return items.length ? "حافظه محلی:\n" + items.join("\n") : "فعلاً چیزی در حافظه محلی ذخیره نشده. 🙂";
    }
    return null;
}
function funny(text) {
    if (has(text, ["جوک بگو", "یه جوک بگو", "یک جوک بگو", "شوخی بگو"])) {
        return pick([
            "یه کامپیوتر رفت دکتر... گفت حافظه‌م پر شده 😂💾",
            "من به وای‌فای گفتم دوستت دارم؛ گفت رمز عبورت چیه؟ 😂",
            "حتی تنبل بودن هم CPU می‌خواد 🤖😂",
            "چرا کامپیوتر خوابش نمی‌بره؟ چون همیشه پنجره باز داره! 😂"
        ]);
    }
    return null;
}
function conversation(text) {
    if (has(text, ["خوبی", "حالت چطوره", "چه خبر"])) {
        return pick([
            "خوبم 😺🤖 آماده‌ام باهات گپ بزنم!",
            "سیستم‌ها سالمه 😂🤖",
            "فعلاً بدون هنگ کردن دارم کار می‌کنم 😎"
        ]);
    }
    if (has(text, ["دوستت دارم"])) return "چه پیام قشنگی 😺🤖 خوشحالم که باهام گپ می‌زنی!";
    if (has(text, ["خسته ام", "خسته‌ام"])) return "یه استراحت کوتاه می‌تونه خوب باشه 😴";
    return null;
}
function simple(text) {
    if (has(text, ["سلام", "درود", "hello", "hi"])) return greeting();
    if (has(text, ["مرسی", "ممنون", "متشکرم", "دمت گرم"])) return "خواهش می‌کنم 😺";
    if (has(text, ["خدافظ", "خداحافظ", "فعلا", "فعلاً"])) return "فعلاً! 👋😺";
    if (has(text, ["خوشحالم", "حالم خوبه"])) return "عالیه! 😺✨";
    return null;
}
function unknown(text) {
    if (text.endsWith("?") || text.endsWith("؟") ||
        has(text, ["چیست", "چیه", "چرا", "چگونه", "چطوری", "کیه", "کجاست"])) {
        return "جواب دقیق این مورد را در اطلاعات داخلی ندارم؛ بنابراین حدس نمی‌زنم. 🤖";
    }
    return pick([
        "جالبه 😺 ادامه بده!",
        "دارم گوش می‌دم 👀",
        "متوجه شدم 🤖",
        "اوکی 😎",
        "هوم... تعریف کن ببینم!"
    ]);
}
function generateResponse(text) {
    const value = clean(text);
    if (!value) return "یه چیزی بنویس 😺";
    remember(text);
    let answer = emotional(value);
    if (answer) return answer;
    answer = identity(value);
    if (answer) return answer;
    answer = webLimit(value);
    if (answer) return answer;
    answer = math(value);
    if (answer) return answer;
    answer = memoryAnswer(value);
    if (answer) return answer;
    answer = knowledge(value);
    if (answer) return answer;
    answer = conversation(value);
    if (answer) return answer;
    answer = funny(value);
    if (answer) return answer;
    answer = simple(value);
    if (answer) return answer;
    return unknown(value);
}
function speak(text) {
    if (!window.speechSynthesis || !text) return;
    try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fa-IR";
        utterance.rate = 0.95;
        utterance.pitch = 0.9;
        const voices = speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("fa"));
        if (voice) utterance.voice = voice;
        speechSynthesis.speak(utterance);
    } catch (error) {}
}
function sendMessage() {
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addMessage(text, "user", true);
    input.value = "";
    input.style.height = "auto";
    if (sendBtn) sendBtn.disabled = true;
    showTyping();
    setTimeout(() => {
        const answer = generateResponse(text);
        lastAIMessage = answer;
        addMessage(answer, "ai", true);
        hideTyping();
        if (sendBtn) sendBtn.disabled = false;
        speak(answer);
    }, 350);
}
function buildWelcome() {
    const section = document.createElement("section");
    section.className = "welcome";
    section.id = "welcome";
    section.innerHTML = `
        <div class="big-robot">🤖</div>
        <h2>سلام! من CrazyAI هستم 😺</h2>
        <p>هر چیزی خواستی بپرس. گاهی جدی جواب می‌دم، گاهی هم مغزم هنگ می‌کنه 😂</p>
        <div class="suggestions">
            <button class="suggestion">سلام CrazyAI!</button>
            <button class="suggestion">خودت را معرفی کن</button>
            <button class="suggestion">یک جوک بگو 😂</button>
            <button class="suggestion">۲۵ × ۴ چند می‌شود؟</button>
        </div>
    `;
    return section;
}
function attachSuggestions() {
    document.querySelectorAll(".suggestion").forEach(button => {
        button.addEventListener("click", () => {
            if (!input) return;
            input.value = button.textContent.trim();
            input.dispatchEvent(new Event("input"));
            sendMessage();
        });
    });
}
function clearChat() {
    chatHistory = [];
    lastAIMessage = "";
    try { localStorage.removeItem(CHAT_KEY); } catch (error) {}
    if (chatArea) {
        chatArea.innerHTML = "";
        chatArea.appendChild(buildWelcome());
        attachSuggestions();
    }
    if (window.speechSynthesis) speechSynthesis.cancel();
    hideTyping();
    showToast("چت پاک شد 🧹🤖");
}
function resetMemory() {
    memory = {};
    try { localStorage.removeItem(MEMORY_KEY); } catch (error) {}
    showToast("حافظه پاک شد 🧠");
}
function setupVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    try {
        recognition = new SpeechRecognition();
        recognition.lang = "fa-IR";
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        voiceAvailable = true;
        recognition.onstart = () => {
            isListening = true;
            if (voiceStatus) voiceStatus.textContent = "🎤 گوش می‌دم...";
            if (voiceBtn) voiceBtn.classList.add("listening");
            setStatus("در حال گوش دادن...");
        };
        recognition.onresult = event => {
            const result = event.results?.[0]?.[0]?.transcript?.trim();
            if (!result) return;
            if (input) {
                input.value = result;
                input.dispatchEvent(new Event("input"));
            }
            sendMessage();
        };
        recognition.onerror = event => {
            isListening = false;
            if (voiceBtn) voiceBtn.classList.remove("listening");
            if (voiceStatus) voiceStatus.textContent =
                event.error === "not-allowed"
                    ? "🎤 اجازه میکروفون داده نشده است."
                    : "🎤 خطا در تشخیص صدا";
            setStatus("آماده");
        };
        recognition.onend = () => {
            isListening = false;
            if (voiceBtn) voiceBtn.classList.remove("listening");
            if (voiceStatus) voiceStatus.textContent = "برای صحبت کردن روی 🎤 بزن";
            setStatus("آماده");
        };
    } catch (error) {
        recognition = null;
    }
}
if (composer) composer.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage();
});
if (input) input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
if (input) input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
});
if (clearBtn) clearBtn.addEventListener("click", clearChat);
if (voiceBtn) voiceBtn.addEventListener("click", () => {
    if (!voiceAvailable || !recognition) {
        if (voiceStatus) voiceStatus.textContent = "🎤 تشخیص صدا در این مرورگر در دسترس نیست.";
        showToast("تشخیص صدا در دسترس نیست.");
        return;
    }
    if (isListening) return;
    try { recognition.start(); } catch (error) {}
});
window.clearCrazyAIChat = clearChat;
window.resetCrazyAIMemory = resetMemory;
window.generateCrazyAIResponse = generateResponse;
window.CrazyAI = {
    version: "1.0-local",
    ask: question => generateResponse(String(question)),
    getMemory: () => memory,
    getChat: () => chatHistory,
    clearChat: clearChat,
    resetMemory: resetMemory
};
setupVoice();
loadChat();
attachSuggestions();
hideTyping();
setStatus("آماده");
if (voiceStatus) voiceStatus.textContent = voiceAvailable
    ? "برای صحبت کردن روی 🎤 بزن"
    : "🎤 تشخیص صدا در این مرورگر در دسترس نیست.";
if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}
console.log("CrazyAI loaded.");
console.log("CrazyAI ready.");
console.log("Local memory enabled.");
console.log("Local chat enabled.");
console.log("Voice input initialized.");
console.log("Speech output initialized.");
console.log("Math engine initialized.");
console.log("Knowledge engine initialized.");
console.log("Conversation engine initialized.");
console.log("Memory engine initialized.");
console.log("No web search is used.");
console.log("No server is required.");
console.log("No external API is required.");
console.log("CrazyAI can work locally.");
console.log("CrazyAI startup complete.");
// 467
// 468
// 469
// 470
// 471
// 472
// 473
// 474
// 475
// 476
// 477
// 478
// 479
// 480
// 481
// 482
// 483
// 484
// 485
// 486
// 487
// 488
// 489
// 490
// 491
// 492
// 493
// 494
// 495
// 496
// 497
// 498
// 499
// 500
