// CrazyAI - FREE API edition
// Uses OpenRouter Free Models Router
// Cost: $0 on the OpenRouter free model route

const OPENROUTER_API_KEY = "YOUR_OPENROUTER_API_KEY_HERE";
const OPENROUTER_MODEL = "openrouter/free";

const MAX_CODE_REQUEST_CHARS = 23000;
const MAX_RESPONSE_CHARS = 20000;

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


/* =========================
   STORAGE
========================= */

function readJSON(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (e) {
        return fallback;
    }
}

memory = readJSON(MEMORY_KEY, {});
chatHistory = readJSON(CHAT_KEY, []);

if (
    !memory ||
    typeof memory !== "object" ||
    Array.isArray(memory)
) {
    memory = {};
}

if (!Array.isArray(chatHistory)) {
    chatHistory = [];
}

function saveMemory() {
    try {
        localStorage.setItem(
            MEMORY_KEY,
            JSON.stringify(memory)
        );
    } catch (e) {}
}

function saveChat() {
    try {
        localStorage.setItem(
            CHAT_KEY,
            JSON.stringify(chatHistory)
        );
    } catch (e) {}
}


/* =========================
   UI
========================= */

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function setStatus(message) {
    if (statusText) {
        statusText.textContent = message;
    }
}

function showTyping() {
    if (typing) {
        typing.style.display = "flex";
    }

    setStatus("CrazyAI در حال فکر کردن است...");
}

function hideTyping() {
    if (typing) {
        typing.style.display = "none";
    }

    setStatus("آماده");
}


/* =========================
   TEXT HELPERS
========================= */

function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/ي/g, "ی")
        .replace(/ى/g, "ی")
        .replace(/ك/g, "ک")
        .trim();
}

function clean(text) {
    return normalize(text).replace(
        /[؟?!.,،؛:]/g,
        ""
    );
}

function has(text, words) {
    return words.some(word =>
        text.includes(word)
    );
}

function pick(array) {
    return array[
        Math.floor(Math.random() * array.length)
    ];
}


/* =========================
   CHAT MESSAGES
========================= */

function createMessage(text, sender) {
    const element =
        document.createElement("div");

    element.className =
        sender === "user"
            ? "message user-message"
            : "message ai-message";

    element.textContent = text;

    return element;
}

function addMessage(
    text,
    sender,
    save = true
) {
    if (!chatArea) return;

    const welcome =
        document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }

    chatArea.appendChild(
        createMessage(text, sender)
    );

    chatArea.scrollTop =
        chatArea.scrollHeight;

    if (save) {
        chatHistory.push({
            sender: sender,
            text: text,
            time: Date.now()
        });

        saveChat();
    }
}

function loadChat() {
    if (
        !chatArea ||
        !chatHistory.length
    ) {
        return;
    }

    const welcome =
        document.getElementById("welcome");

    if (welcome) {
        welcome.remove();
    }

    chatHistory.forEach(item => {
        if (
            !item ||
            typeof item.text !== "string"
        ) {
            return;
        }

        addMessage(
            item.text,
            item.sender === "user"
                ? "user"
                : "ai",
            false
        );
    });

    const last =
        chatHistory[
            chatHistory.length - 1
        ];

    if (
        last &&
        last.sender === "ai"
    ) {
        lastAIMessage = last.text;
    }
}


/* =========================
   MEMORY
========================= */

function remember(text) {
    const patterns = [
        /اسمم\s+([آ-یA-Za-z0-9_]+)/i,
        /نامم\s+([آ-یA-Za-z0-9_]+)/i,
        /اسم\s+من\s+([آ-یA-Za-z0-9_]+)/i
    ];

    for (const pattern of patterns) {
        const match =
            text.match(pattern);

        if (
            match &&
            match[1]
        ) {
            memory.name =
                match[1].trim();

            saveMemory();
            break;
        }
    }

    const normalized =
        clean(text);

    if (
        normalized.includes(
            "دوست دارم"
        ) ||
        normalized.includes(
            "علاقه دارم"
        )
    ) {
        memory.lastInterest =
            text;

        saveMemory();
    }
}

function greeting() {
    const name =
        memory.name
            ? ` ${memory.name}`
            : "";

    return pick([
        `سلام${name}! 😺`,
        `درود${name}! 🤖`,
        "سلاممم 😎 CrazyAI آنلاین است!",
        "هی! 😺 چه خبر؟",
        "سلام! مغز مصنوعی من آماده‌ست 🧠🤖"
    ]);
}


/* =========================
   WELCOME
========================= */

function buildWelcome() {
    const section =
        document.createElement(
            "section"
        );

    section.className =
        "welcome";

    section.id = "welcome";

    section.innerHTML = `
        <div class="big-robot">🤖</div>

        <h2>
            سلام! من CrazyAI هستم 😺
        </h2>

        <p>
            هر چیزی خواستی بپرس.
        </p>

        <div class="suggestions">
            <button class="suggestion">
                سلام CrazyAI!
            </button>

            <button class="suggestion">
                خودت را معرفی کن
            </button>

            <button class="suggestion">
                یک جوک بگو 😂
            </button>

            <button class="suggestion">
                ۲۵ × ۴ چند می‌شود؟
            </button>
        </div>
    `;

    return section;
}

function attachSuggestions() {
    document
        .querySelectorAll(".suggestion")
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    if (!input) return;

                    input.value =
                        button.textContent
                            .trim();

                    input.dispatchEvent(
                        new Event("input")
                    );

                    sendMessage();
                }
            );
        });
}


/* =========================
   CLEAR / RESET
========================= */

function clearChat() {
    chatHistory = [];
    lastAIMessage = "";

    try {
        localStorage.removeItem(
            CHAT_KEY
        );
    } catch (e) {}

    if (chatArea) {
        chatArea.innerHTML = "";

        chatArea.appendChild(
            buildWelcome()
        );

        attachSuggestions();
    }

    if (
        window.speechSynthesis
    ) {
        speechSynthesis.cancel();
    }

    hideTyping();

    showToast(
        "چت پاک شد 🧹🤖"
    );
}

function resetMemory() {
    memory = {};

    try {
        localStorage.removeItem(
            MEMORY_KEY
        );
    } catch (e) {}

    showToast(
        "حافظه پاک شد 🧠"
    );
}


/* =========================
   REQUEST DETECTION
========================= */

function wantsCode(text) {
    const value =
        clean(text);

    return has(value, [
        "کد بنویس",
        "کدنویسی کن",
        "کد html",
        "کد css",
        "کد js",
        "javascript",
        "python",
        "java",
        "c++",
        "کد نویسی",
        "برنامه بنویس",
        "اسکریپت بنویس",
        "script بنویس",
        "code"
    ]);
}

function wantsSearch(text) {
    const value =
        clean(text);

    return has(value, [
        "سرچ کن",
        "جستجو کن",
        "در اینترنت",
        "اخبار",
        "لینک بده",
        "سایت پیدا کن",
        "گوگل کن"
    ]);
}

function getSearchFallback() {
    return "متأسفم من سرور بک اند و یا دیتا بیس ندارم میتوانید اسکرین شات و یا توضیح راجب وب سایت بگید";
}


/* =========================
   API HISTORY
========================= */

function getConversationForAPI() {
    const messages = [];

    const recent =
        chatHistory.slice(-20);

    for (
        const item of recent
    ) {
        if (
            !item ||
            typeof item.text !== "string"
        ) {
            continue;
        }

        messages.push({
            role:
                item.sender === "user"
                    ? "user"
                    : "assistant",

            content:
                item.text
        });
    }

    return messages;
}


/* =========================
   OPENROUTER RESPONSE
========================= */

function extractResponseText(data) {
    if (!data) {
        return "";
    }

    if (
        data.choices &&
        Array.isArray(
            data.choices
        )
    ) {
        const choice =
            data.choices[0];

        if (
            choice &&
            choice.message
        ) {
            let content =
                choice.message.content;

            if (
                typeof content ===
                "string"
            ) {
                return content.trim();
            }

            if (
                Array.isArray(content)
            ) {
                return content
                    .map(item => {
                        if (
                            item &&
                            typeof item.text ===
                                "string"
                        ) {
                            return item.text;
                        }

                        return "";
                    })
                    .join("")
                    .trim();
            }
        }
    }

    return "";
}


/* =========================
   FREE AI API
========================= */

async function askAPI(
    text,
    files = []
) {
    text =
        String(text || "")
            .trim();

    if (!text) {
        return "یه چیزی بنویس 😺";
    }

    remember(text);

    /*
     * Search/link requests intentionally
     * return the requested fallback.
     */

    if (
        wantsSearch(text)
    ) {
        return getSearchFallback();
    }

    /*
     * Coding requests above 23K
     * are rejected.
     */

    if (
        wantsCode(text) &&
        text.length >
            MAX_CODE_REQUEST_CHARS
    ) {
        return "درخواست کد بیشتر از 23K character است و نمی‌توانم آن را پردازش کنم.";
    }

    /*
     * API key check.
     */

    if (
        !OPENROUTER_API_KEY ||
        OPENROUTER_API_KEY ===
            "YOUR_OPENROUTER_API_KEY_HERE"
    ) {
        throw new Error(
            "OpenRouter API key تنظیم نشده است."
        );
    }

    /*
     * System instruction.
     */

    const messages = [
        {
            role: "system",

            content:
                "You are CrazyAI, a helpful general-purpose AI assistant. " +
                "Answer the user's questions directly and naturally. " +
                "You can explain concepts, solve problems, write code, " +
                "debug code, translate text, summarize text, brainstorm, " +
                "and answer normal everyday questions. " +
                "When the user requests code, provide the requested code " +
                "and support any normal programming language. " +
                "Do not claim that you searched the internet unless a " +
                "search tool was actually used. " +
                "Keep answers useful and reasonably concise."
        }
    ];

    /*
     * Add previous conversation.
     */

    const previous =
        getConversationForAPI();

    for (
        const message of previous
    ) {
        messages.push(message);
    }

    /*
     * The current message was already
     * saved by sendMessage().
     *
     * Remove duplicate current user
     * message from history.
     */

    const last =
        messages[
            messages.length - 1
        ];

    if (
        last &&
        last.role === "user" &&
        last.content === text
    ) {
        messages.pop();
    }

    /*
     * Build current user content.
     */

    let userContent = text;

    /*
     * Optional image support.
     */

    if (
        Array.isArray(files) &&
        files.length > 0
    ) {
        const content = [
            {
                type: "text",
                text: text
            }
        ];

        for (
            const file of files
        ) {
            if (!file) continue;

            const imageURL =
                typeof file === "string"
                    ? file
                    : (
                        file.image_url ||
                        file.url ||
                        ""
                    );

            if (!imageURL) {
                continue;
            }

            content.push({
                type: "image_url",

                image_url: {
                    url: imageURL
                }
            });
        }

        userContent = content;
    }

    /*
     * Add current user message.
     */

    messages.push({
        role: "user",
        content: userContent
    });

    /*
     * Send request directly from browser.
     */

    const response =
        await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        "Bearer " +
                        OPENROUTER_API_KEY,

                    "HTTP-Referer":
                        window.location.origin,

                    "X-Title":
                        "CrazyAI"
                },

                body:
                    JSON.stringify({
                        model:
                            OPENROUTER_MODEL,

                        messages:
                            messages,

                        max_tokens:
                            8192,

                        temperature:
                            0.7
                    })
            }
        );

    let data = {};

    try {
        data =
            await response.json();
    } catch (e) {
        throw new Error(
            "پاسخ API قابل خواندن نیست."
        );
    }

    /*
     * Handle API errors.
     */

    if (!response.ok) {
        const errorMessage =
            data &&
            data.error &&
            (
                data.error.message ||
                data.error.code ||
                data.error.type
            );

        if (
            response.status === 429
        ) {
            throw new Error(
                "سقف درخواست رایگان فعلی تمام شده است."
            );
        }

        if (
            response.status === 401
        ) {
            throw new Error(
                "API Key نامعتبر است."
            );
        }

        if (
            response.status === 403
        ) {
            throw new Error(
                "دسترسی به API رد شد."
            );
        }

        throw new Error(
            errorMessage ||
            "OpenRouter API error"
        );
    }

    /*
     * Extract AI answer.
     */

    let answer =
        extractResponseText(data);

    if (!answer) {
        answer =
            "پاسخی از AI دریافت نشد.";
    }

    /*
     * Maximum response length.
     */

    if (
        answer.length >
        MAX_RESPONSE_CHARS
    ) {
        answer =
            answer.slice(
                0,
                MAX_RESPONSE_CHARS
            ) +
            "\n\n[پاسخ به محدودیت 20K character رسید.]";
    }

    return answer.trim();
}


/* =========================
   SEND MESSAGE
========================= */

async function sendMessage() {
    if (!input) return;

    const text =
        input.value.trim();

    if (!text) return;

    /*
     * Show user message.
     */

    addMessage(
        text,
        "user",
        true
    );

    input.value = "";
    input.style.height =
        "auto";

    if (sendBtn) {
        sendBtn.disabled =
            true;
    }

    showTyping();

    try {
        const answer =
            await askAPI(text);

        lastAIMessage =
            answer;

        addMessage(
            answer,
            "ai",
            true
        );

        speak(answer);

    } catch (error) {
        console.error(
            "CrazyAI API error:",
            error
        );

        let message =
            "ارتباط با API برقرار نشد. لطفاً دوباره تلاش کن. 🤖";

        if (
            error &&
            error.message
        ) {
            message +=
                "\n\nجزئیات: " +
                error.message;
        }

        addMessage(
            message,
            "ai",
            true
        );
    }

    hideTyping();

    if (sendBtn) {
        sendBtn.disabled =
            false;
    }
}


/* =========================
   TEXT TO SPEECH
========================= */

function speak(text) {
    if (
        !window.speechSynthesis ||
        !text
    ) {
        return;
    }

    try {
        speechSynthesis.cancel();

        const utterance =
            new SpeechSynthesisUtterance(
                text
            );

        utterance.lang =
            "fa-IR";

        utterance.rate =
            0.95;

        utterance.pitch =
            0.9;

        speechSynthesis.speak(
            utterance
        );

    } catch (e) {}
}


/* =========================
   VOICE RECOGNITION
========================= */

function setupVoice() {
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        return;
    }

    try {
        recognition =
            new SpeechRecognition();

        recognition.lang =
            "fa-IR";

        recognition.continuous =
            false;

        recognition.interimResults =
            false;

        voiceAvailable =
            true;

        recognition.onstart =
            () => {
                isListening =
                    true;

                if (voiceStatus) {
                    voiceStatus.textContent =
                        "🎤 گوش می‌دم...";
                }

                if (voiceBtn) {
                    voiceBtn.classList.add(
                        "listening"
                    );
                }
            };

        recognition.onresult =
            event => {
                const result =
                    event
                        .results?.[0]?.[0]
                        ?.transcript
                        ?.trim();

                if (
                    result &&
                    input
                ) {
                    input.value =
                        result;

                    input.dispatchEvent(
                        new Event(
                            "input"
                        )
                    );

                    sendMessage();
                }
            };

        recognition.onerror =
            event => {
                console.error(
         "Speech recognition error:",
                    event.error
                );
            };

        recognition.onend =
            () => {
                isListening =
                    false;

                if (voiceBtn) {
                    voiceBtn.classList.remove(
                        "listening"
                    );
                }

                if (voiceStatus) {
                    voiceStatus.textContent =
                        "برای صحبت کردن روی 🎤 بزن";
                }
            };

    } catch (e) {
        voiceAvailable =
            false;
    }
}


/* =========================
   EVENTS
========================= */

if (composer) {
    composer.addEventListener(
        "submit",
        event => {
            event.preventDefault();
            sendMessage();
        }
    );
}

if (input) {
    input.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();
                sendMessage();
            }
        }
    );
}

if (input) {
    input.addEventListener(
        "input",
        () => {
            input.style.height =
                "auto";

            input.style.height =
                Math.min(
                    input.scrollHeight,
                    160
                ) + "px";
        }
    );
}

if (clearBtn) {
    clearBtn.addEventListener(
        "click",
        clearChat
    );
}

if (voiceBtn) {
    voiceBtn.addEventListener(
        "click",
        () => {
            if (
                voiceAvailable &&
                !isListening &&
                recognition
            ) {
                try {
                    recognition.start();
                } catch (e) {}
            }
        }
    );
}


/* =========================
   GLOBAL API
========================= */

window.clearCrazyAIChat =
    clearChat;

window.resetCrazyAIMemory =
    resetMemory;

window.CrazyAI = {
    version:
        "4.0-free-api",

    ask: question =>
        askAPI(
            String(question)
        ),

    askWithImages:
        (question, files) =>
            askAPI(
                String(question),
                files
            ),

    getMemory:
        () => memory,

    getChat:
        () => chatHistory,

    clearChat:
        clearChat,

    resetMemory:
        resetMemory
};


/* =========================
   START
========================= */

setupVoice();

loadChat();

attachSuggestions();

hideTyping();

setStatus("آماده");

if (voiceStatus) {
    voiceStatus.textContent =
        voiceAvailable
            ? "برای صحبت کردن روی 🎤 بزن"
            : "🎤 تشخیص صدا در این مرورگر در دسترس نیست.";
}
