/* CrazyAI - Local Browser AI
   No API key / No own backend server
*/
const MAX_CODE=23000,MAX_OUT=20000;
const MODEL="onnx-community/Qwen2.5-0.5B-Instruct-ONNX";

const chatArea=document.getElementById("chatArea"),
input=document.getElementById("messageInput"),
composer=document.getElementById("composer"),
sendBtn=document.getElementById("sendBtn"),
voiceBtn=document.getElementById("voiceBtn"),
clearBtn=document.getElementById("clearBtn"),
typing=document.getElementById("typing"),
statusText=document.getElementById("statusText"),
voiceStatus=document.getElementById("voiceStatus"),
toast=document.getElementById("toast");

const MEMORY_KEY="crazyAI_memory",CHAT_KEY="crazyAI_chat";
let memory={},chatHistory=[],lastAIMessage="",recognition=null,
isListening=false,voiceAvailable=false,ai=null,loadingAI=null;

function read(k,d){
  try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}
}
memory=read(MEMORY_KEY,{});
chatHistory=read(CHAT_KEY,[]);
if(!memory||typeof memory!="object"||Array.isArray(memory))memory={};
if(!Array.isArray(chatHistory))chatHistory=[];

function saveMemory(){try{localStorage.setItem(MEMORY_KEY,JSON.stringify(memory))}catch(e){}}
function saveChat(){try{localStorage.setItem(CHAT_KEY,JSON.stringify(chatHistory))}catch(e){}}
function toastMsg(x){
  if(!toast)return;
  toast.textContent=x;toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2200);
}
function status(x){if(statusText)statusText.textContent=x}
function showTyping(){if(typing)typing.style.display="flex";status("CrazyAI در حال فکر کردن است...")}
function hideTyping(){if(typing)typing.style.display="none";status("آماده")}

function norm(x){
  return String(x).toLowerCase().replace(/ي/g,"ی").replace(/ى/g,"ی").replace(/ك/g,"ک").trim()
}
function clean(x){return norm(x).replace(/[؟?!.,،؛:]/g,"")}
function has(x,a){return a.some(y=>x.includes(y))}

function createMessage(text,sender){
  const e=document.createElement("div");
  e.className=sender==="user"?"message user-message":"message ai-message";
  e.textContent=text;
  return e;
}
function addMessage(text,sender,save=true){
  if(!chatArea)return;
  const w=document.getElementById("welcome");
  if(w)w.remove();
  chatArea.appendChild(createMessage(text,sender));
  chatArea.scrollTop=chatArea.scrollHeight;
  if(save){
    chatHistory.push({sender,text,time:Date.now()});
    saveChat();
  }
}
function loadChat(){
  if(!chatHistory.length)return;
  const w=document.getElementById("welcome");
  if(w)w.remove();
  chatHistory.forEach(x=>{
    if(x&&typeof x.text==="string")
      addMessage(x.text,x.sender==="user"?"user":"ai",false)
  });
  const x=chatHistory[chatHistory.length-1];
  if(x?.sender==="ai")lastAIMessage=x.text;
}

function remember(t){
  const m=t.match(/(?:اسمم|نامم|اسم من)\s+([آ-یA-Za-z0-9_]+)/i);
  if(m){memory.name=m[1].trim();saveMemory()}
  const n=clean(t);
  if(n.includes("دوست دارم")||n.includes("علاقه دارم")){
    memory.lastInterest=t;saveMemory()
  }
}

function buildWelcome(){
  const s=document.createElement("section");
  s.className="welcome";s.id="welcome";
  s.innerHTML=`
  <div class="big-robot">🤖</div>
  <h2>سلام! من CrazyAI هستم 😺</h2>
  <p>هر چیزی خواستی بپرس.</p>
  <div class="suggestions">
  <button class="suggestion">سلام CrazyAI!</button>
  <button class="suggestion">خودت را معرفی کن</button>
  <button class="suggestion">یک جوک بگو 😂</button>
  <button class="suggestion">۲۵ × ۴ چند می‌شود؟</button>
  </div>`;
  return s;
}
function attachSuggestions(){
  document.querySelectorAll(".suggestion").forEach(b=>{
    b.onclick=()=>{
      if(!input)return;
      input.value=b.textContent.trim();
      input.dispatchEvent(new Event("input"));
      sendMessage();
    }
  })
}

function clearChat(){
  chatHistory=[];lastAIMessage="";
  try{localStorage.removeItem(CHAT_KEY)}catch(e){}
  if(chatArea){
    chatArea.innerHTML="";
    chatArea.appendChild(buildWelcome());
    attachSuggestions();
  }
  if(window.speechSynthesis)speechSynthesis.cancel();
  hideTyping();toastMsg("چت پاک شد 🧹🤖");
}
function resetMemory(){
  memory={};
  try{localStorage.removeItem(MEMORY_KEY)}catch(e){}
  toastMsg("حافظه پاک شد 🧠");
}

function wantsCode(t){
  t=clean(t);
  return has(t,[
    "کد بنویس","کدنویسی کن","کد html","کد css","کد js",
    "javascript","python","java","c++","کد نویسی",
    "برنامه بنویس","اسکریپت بنویس","script بنویس","code"
  ])
}
function wantsSearch(t){
  t=clean(t);
  return has(t,["سرچ کن","جستجو کن","در اینترنت","اخبار","لینک بده","سایت پیدا کن","گوگل کن"])
}
function searchFallback(){
  return "متأسفم من سرور بک اند و یا دیتا بیس ندارم میتوانید اسکرین شات و یا توضیح راجب وب سایت بگید"
}

/* Local model */
async function loadAI(){
  if(ai)return ai;
  if(loadingAI)return loadingAI;

  loadingAI=(async()=>{
    status("در حال آماده‌سازی AI محلی...");
    try{
      const {pipeline}=await import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2"
      );

      ai=await pipeline("text-generation",MODEL,{
        dtype:"q4",
        device:"webgpu"
      }).catch(async()=>{
        return await pipeline("text-generation",MODEL,{
          dtype:"q4"
        })
      });

      status("AI محلی آماده است");
      return ai;
    }catch(e){
      console.error(e);
      throw Error("مدل AI محلی در این مرورگر قابل اجرا نیست.");
    }
  })();

  try{return await loadingAI}
  finally{loadingAI=null}
}

function historyText(){
  return chatHistory.slice(-10)
    .filter(x=>x&&typeof x.text==="string")
    .map(x=>(x.sender==="user"?"User: ":"CrazyAI: ")+x.text)
    .join("\n");
}

async function askAI(text){
  text=String(text||"").trim();
  if(!text)return"یه چیزی بنویس 😺";

  remember(text);

  if(wantsSearch(text))return searchFallback();

  if(wantsCode(text)&&text.length>MAX_CODE)
    return"درخواست کد بیشتر از 23K character است و نمی‌توانم آن را پردازش کنم.";

  const model=await loadAI();

  const prompt=
`You are CrazyAI, a helpful general-purpose AI assistant.
Answer directly and naturally.
Support normal questions, explanations, math, translation,
programming and coding in normal programming languages.
Do not claim to browse the internet.
Previous conversation:
${historyText()}
User: ${text}
CrazyAI:`;

  const result=await model(prompt,{
    max_new_tokens:2048,
    temperature:.7,
    do_sample:true,
    return_full_text:false
  });

  let answer="";
  if(Array.isArray(result)&&result[0])
    answer=result[0].generated_text||result[0].text||"";
  else if(result?.generated_text)
    answer=result.generated_text;

  answer=String(answer).trim();
  if(!answer)answer="پاسخی تولید نشد 😕";

  if(answer.length>MAX_OUT)
    answer=answer.slice(0,MAX_OUT)+
      "\n\n[پاسخ به محدودیت 20K character رسید.]";

  return answer;
}

async function sendMessage(){
  if(!input)return;
  const text=input.value.trim();
  if(!text)return;

  addMessage(text,"user",true);
  input.value="";input.style.height="auto";
  if(sendBtn)sendBtn.disabled=true;
  showTyping();

  try{
    const answer=await askAI(text);
    lastAIMessage=answer;
    addMessage(answer,"ai",true);
    speak(answer);
  }catch(e){
    console.error("CrazyAI:",e);
    addMessage(
      "ارتباط با AI محلی برقرار نشد. 🤖\n\nجزئیات: "+
      (e?.message||"خطای ناشناخته"),
      "ai",true
    );
  }

  hideTyping();
  if(sendBtn)sendBtn.disabled=false;
}

function speak(text){
  if(!window.speechSynthesis||!text)return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="fa-IR";u.rate=.95;u.pitch=.9;
    speechSynthesis.speak(u);
  }catch(e){}
}

function setupVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return;

  try{
    recognition=new SR();
    recognition.lang="fa-IR";
    recognition.continuous=false;
    recognition.interimResults=false;
    voiceAvailable=true;

    recognition.onstart=()=>{
      isListening=true;
      if(voiceStatus)voiceStatus.textContent="🎤 گوش می‌دم...";
      if(voiceBtn)voiceBtn.classList.add("listening");
    };

    recognition.onresult=e=>{
      const t=e.results?.[0]?.[0]?.transcript?.trim();
      if(t&&input){
        input.value=t;
        input.dispatchEvent(new Event("input"));
        sendMessage();
      }
    };

    recognition.onerror=e=>console.error("Voice:",e.error);

    recognition.onend=()=>{
      isListening=false;
      if(voiceBtn)voiceBtn.classList.remove("listening");
      if(voiceStatus)voiceStatus.textContent="برای صحبت کردن روی 🎤 بزن";
    };
  }catch(e){voiceAvailable=false}
}

if(composer)composer.addEventListener("submit",e=>{
  e.preventDefault();sendMessage();
});

if(input){
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey){
      e.preventDefault();sendMessage();
    }
  });

  input.addEventListener("input",()=>{
    input.style.height="auto";
    input.style.height=Math.min(input.scrollHeight,160)+"px";
  });
}

if(clearBtn)clearBtn.addEventListener("click",clearChat);

if(voiceBtn)voiceBtn.addEventListener("click",()=>{
  if(voiceAvailable&&!isListening&&recognition){
    try{recognition.start()}catch(e){}
  }
});

window.clearCrazyAIChat=clearChat;
window.resetCrazyAIMemory=resetMemory;

window.CrazyAI={
  version:"5.0-local",
  ask:q=>askAI(String(q)),
  getMemory:()=>memory,
  getChat:()=>chatHistory,
  clearChat,
  resetMemory
};

setupVoice();
loadChat();
attachSuggestions();
hideTyping();
status("آماده");

if(voiceStatus)
  voiceStatus.textContent=voiceAvailable
    ?"برای صحبت کردن روی 🎤 بزن"
    :"🎤 تشخیص صدا در این مرورگر در دسترس نیست.";
