// script.js
/* ARH ROBO — Combined: original AI block preserved + added sensor/emergency/GPS/WebSocket/robust fixes */

// ========================================================================
// 🔑 GURUTTOPURNO: AI feature chalu korar jonyo apnar shothik GEMINI API KEY ekhane define kora holo.
// Nicher jaigay apnar shothik Gemini API Key ti double quotation er moddhe boshiye dewa holo.
const GEMINI_API_KEY = "AIzaSyDOtS5plQaCHzxoWnWujHunYf8Exs6irmA";
// ========================================================================

// ===== Initialization & Selectors =====
const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".app-section");
const aiInput = document.getElementById("ai-input");
const aiOutput = document.getElementById("ai-output");
const sendAI = document.getElementById("send-ai");
const voiceBtn = document.getElementById("start-voice");
const voiceOutput = document.getElementById("voice-output");
const camFeed = document.getElementById("camera-feed");
const ctrlButtons = document.querySelectorAll(".ctrl-btn");
const bleConnectBtn = document.getElementById("ble-connect");
const bleStatusEl = document.getElementById("ble-status");
const robotIpInput = document.getElementById("robot-ip");
const sensorList = document.getElementById("sensor-list");
const connectCamBtn = document.getElementById("connect-cam");
const camUrlInput = document.getElementById("cam-url");

// ===== 1. Navigation Switch (CSS class control) =====
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-target");

    // Shob button theke 'active' remove koro, tarpor click kora button-e add koro
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Section active koro (CSS transition-er jonyo setTimeout dorkar nei jodi shudhu class toggling hoy)
    sections.forEach((sec) => {
      // Jekhane active class add kora chilo, shekhane ekhon display:block ebong opacity:1 hobe (CSS-er sahajye)
      if (sec.id === target) sec.classList.add("active");
      else sec.classList.remove("active");
    });
  });
});

// ===== 2. ARH ROBO AI (Gemini API with Exponential Backoff and Grounding) =====
sendAI.addEventListener("click", async () => {
  const userQuestion = aiInput.value.trim();
  aiInput.value = "";
    
  if (!userQuestion) return;

  // API key check: Shothik key na thakle error dekhabe
  if (GEMINI_API_KEY === "" || GEMINI_API_KEY.includes("INSERT_YOUR_ACTUAL_GEMINI_API_KEY")) {
        aiOutput.textContent = "❌ ERROR: Gemini API Key shothikbhabe set kora nei!";
        return;
    }

  aiOutput.textContent = "⏳ ARH ROBO AI bhabche... (Maximum 3 bar cheshta kora hobe)";

  const MAX_RETRIES = 3;
  // Factual proshner jonyo ei model-ti (gemini-2.5-flash-preview-09-2025) beshi shoktom
  const modelName = "gemini-2.5-flash-preview-09-2025"; 
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
  // ✅ Purboborti instruction prompt theke shoriye shudhu userQuestion pathano holo
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
          const response = await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  contents: [{ 
                      role: "user",
                      // Shudhu user-er mukhho proshno pathano holo
                      parts: [{ text: userQuestion }]
                  }],
                  // ✅ System Instruction aro shokto kora holo jeno oboshshoi Google Search byabahar kore.
                  // 'MUST perform a Google Search FIRST' - ei nirdesh guruttopurno.
                  systemInstruction: {
                      parts: [{ 
                          text: "You are ARH ROBO AI (Alherian Rover and Helping Robo). You are a helpful technical assistant. For ALL factual and current knowledge questions, you MUST perform a Google Search FIRST to retrieve real-time data, and then provide an accurate, up-to-date response. Respond entirely in Bangla (Latin) script."
                      }]
                  },
                  generationConfig: { 
                      temperature: 0.7,
                      maxOutputTokens: 500 // Boro uttorer jonyo token limit barano holo
                  },
                  // ✅ Google Search Tool add kora holo jeno AI latest information dite pare (Grounding)
                  tools: [{ "google_search": {} }] 
              })
          });

          const data = await response.json();

          if (response.ok) {
              const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, ARH ROBO AI bujhte parlo na. Abar cheshta koro.";
              aiOutput.textContent = answer;
              return; // Success, exit function
          } else {
              const errorMsg = data.error?.message || response.statusText || "API call failed.";
              if (response.status === 429 && attempt < MAX_RETRIES - 1) {
                  // Rate Limiting (429): Wait and retry
                  const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s delay
                  await new Promise(resolve => setTimeout(resolve, delay));
                  console.warn(`[API] Rate limit hit. Retrying in ${delay}ms...`);
                  continue; // Retry loop
              } else {
                  // Non-retryable error or max retries reached
                  aiOutput.textContent = `⚠️ Gemini API Error (Status: ${response.status}): ${errorMsg}`;
                  return; 
              }
          }
      } catch (error) {
          console.error("Network/Fetch Error:", error);
          if (attempt < MAX_RETRIES - 1) {
              const delay = Math.pow(2, attempt) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              console.warn(`[Network] Error. Retrying in ${delay}ms...`);
              continue; 
          }
          aiOutput.textContent = "⚠️ Network ba Server-er sathe shongjog byartho.";
          return;
      }
  }
  
  aiOutput.textContent = "❌ Bishleshon kora shombhob holo na. Beshi shomoy lagche.";
});

// ===== 3. Voice Control (alert() fix kora holo) =====
voiceBtn.addEventListener("click", () => {
  if (!("webkitSpeechRecognition" in window)) {
    // ❌ alert() remove kora holo; tar bodole console use kora holo
    console.error("Voice recognition not supported!");
    voiceOutput.textContent = "ভয়েস রিকগনিশন এই ব্রাউজারে সাপোর্টেড না!";
    return;
  }
    
  const rec = new webkitSpeechRecognition();
  rec.lang = "bn-BD"; // Bangla language
  rec.start();
  voiceOutput.textContent = "স্ট্যাটাস: শুনছি...";
    
  // Recognition Result
  rec.onresult = (e) => {
    const v = e.results[0][0].transcript.toLowerCase();
    voiceOutput.textContent = "আপনি বলেছেন: " + v;
    // Bangla & English commands check
    if (v.includes("সামনে") || v.includes("forward")) sendCommand("forward");
    else if (v.includes("পিছনে") || v.includes("back")) sendCommand("back");
    else if (v.includes("বামে") || v.includes("left")) sendCommand("left");
    else if (v.includes("ডানে") || v.includes("right")) sendCommand("right");
    else if (v.includes("থাম") || v.includes("stop") || v.includes("দাঁড়াও")) sendCommand("stop");
    else voiceOutput.textContent += " (অজানা কমান্ড)";
  };
    
  // Recognition End
  rec.onend = () => {
      // Shuniye na thakle status update koro
      if (voiceOutput.textContent.includes("শুনছি...")) {
          voiceOutput.textContent = "স্ট্যাটাস: মাইক্রোফোন অফ";
      }
  };
    
  // Recognition Error
  rec.onerror = (event) => {
    voiceOutput.textContent = `ভয়েস ত্রুটি: ${event.error}`;
  };
});

// ===== 4. Wi-Fi Control =====
// WiFi Command → http://IP/cmd?move=forward
function sendWiFi(cmd) {
  const ip = document.getElementById("robot-ip")?.value.trim();
  if (!ip) {
        console.warn("Robot IP missing. Cannot send WiFi command.");
        return;
    }
    // Cross-Origin error ignore kora holo
  fetch(`http://${ip}/cmd?move=${cmd}`).catch(e => console.error("WiFi Command Failed (CORS/Network):", e));
}

// ===== 5. Bluetooth Control =====
const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";
let writeChar = null;

document.getElementById("ble-connect").addEventListener("click", async () => {
  try {
    // Device Selection Prompt
    const dev = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    // GATT Server Connect
    const server = await dev.gatt.connect();
    // Service Fetch
    const s = await server.getPrimaryService(SERVICE_UUID);
    // Characteristic Fetch
    writeChar = await s.getCharacteristic(CHAR_UUID);
    setBLE("✅ Connected", "#00ff88");
    console.log("Bluetooth Connected:", dev.name);
  } catch (error) {
    setBLE("❌ Failed", "red");
    console.error("Bluetooth Connection Failed:", error);
  }
});

const setBLE = (t, c) => {
  const e = document.getElementById("ble-status");
  e.textContent = t; 
  e.style.color = c;
};

// ✅ Central Sender (Voice + Manual + Camera all use this)
async function sendCommand(cmd) {
  console.log("SEND:", cmd);
  // 1. WiFi command pathao
  sendWiFi(cmd);
    
  // 2. Bluetooth command pathao
  if (!writeChar) return; // Bluetooth connect na thakle ar agabe na
  try {
    await writeChar.writeValue(new TextEncoder().encode(cmd));
  } catch (error) {
      console.error("Bluetooth write error:", error);
      // setBLE("⚠️ BLE Write Error", "yellow"); // Optional status update
  }
}

// ===== Manual Buttons =====
document.querySelectorAll(".ctrl-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    sendCommand(btn.dataset.cmd);
  });
});

// ===== Camera =====
document.getElementById("connect-cam").addEventListener("click", () => {
  const ip = document.getElementById("cam-url")?.value.trim();
  if (!ip) {
        camFeed.innerHTML = "<div class='text-center text-red-400'>⚠️ অনুগ্রহ করে ESP32-CAM IP দিন!</div>";
        return;
    }

    
    // ESP32-CAM stream URL-er sange port 81 byabahar kora holo (standard)
  camFeed.innerHTML =
    `<img src="http://${ip}:81/stream" class="w-full h-52 object-cover rounded-lg" onerror="this.onerror=null; this.src='https://placehold.co/400x208/161b22/c9d1d9?text=Stream%20Failed';">`;
});

// ===== NEW: Sensor, WebSocket, Auto/Emergency, GPS & utility code =====

// Configuration for added features (safe to change)
const SENSOR_POLL_MS = 1000;
const DISTANCE_THRESHOLD_CM = 20;
const SENSOR_ENDPOINT = "/sensors";
const EMERGENCY_ENDPOINT = "/emergency";
const WEBSOCKET_PATHS = ["/ws", "/socket", ":81/ws", ":81/socket"];
let sensorPollTimer = null;
let ws = null;
let wsRetryTimer = null;
let autoMode = false;
let lastSensorData = null;
let gpsWatchId = null;
let isCalling = false;

// Toast helper
function showToast(text, ms = 3000) {
  const id = "arh-toast";
  let t = document.getElementById(id);
  if (t) t.remove();
  t = document.createElement("div");
  t.id = id;
  t.style = "position:fixed;left:50%;transform:translateX(-50%);bottom:90px;background:rgba(0,0,0,0.75);color:white;padding:8px 12px;border-radius:8px;z-index:9999;";
  t.innerText = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// Update sensor UI
function updateSensorUI(data) {
  lastSensorData = data;
  try {
    const items = sensorList.querySelectorAll("li");
    if (items.length >= 6) {
      items[0].innerHTML = `<i class="fas fa-thermometer-half mr-2 text-yellow-500"></i>🌡 Temperature: ${data.temp ?? "--"} °C`;
      items[1].innerHTML = `<i class="fas fa-tint mr-2 text-blue-500"></i>💧 Humidity: ${data.hum ?? "--"} %`;
      items[2].innerHTML = `<i class="fas fa-fire-extinguisher mr-2 text-red-500"></i>🔥 Flame: ${data.flame ? "<span class='text-red-300 font-bold'>DETECTED</span>" : "Safe"}`;
      items[3].innerHTML = `<i class="fas fa-ruler-vertical mr-2 text-indigo-500"></i>📏 Distance: ${data.distance ?? "--"} cm`;
      items[4].innerHTML = `<i class="fas fa-magnet mr-2 text-green-500"></i>🧲 Metal: ${data.metal ? "Yes" : "No"}`;
      items[5].innerHTML = `<i class="fas fa-map-marker-alt mr-2 text-cyan-500"></i>📍 GPS: ${data.gps ?? "--"}`;
    }
  } catch (e) {
    console.warn("UI update failed:", e);
  }
}

// Emergency overlay + handler
function showEmergencyOverlay(reason) {
  if (document.getElementById("arh-em-overlay")) return;
  const div = document.createElement("div");
  div.id = "arh-em-overlay";
  div.style = `
    position:fixed;left:10px;right:10px;top:10px;z-index:9999;
    background:linear-gradient(90deg,#b91c1c,#fb7185);color:white;padding:12px;border-radius:10px;
    box-shadow:0 8px 40px rgba(0,0,0,0.6);font-weight:700;text-align:center;
  `;
  div.innerHTML = `⚠️ EMERGENCY: ${reason}. Robot stopped and dialing ${EMERGENCY_PHONE}`;
  document.body.appendChild(div);
  setTimeout(() => { div.remove(); }, 20000);
}

async function handleEmergency(reason = "sensor") {
  console.log("Emergency triggered:", reason);
  try { await sendCommand("stop"); } catch (e) { console.warn(e); }
  // Inform robot optionally
  const ip = document.getElementById("robot-ip")?.value.trim();
  if (ip) {
    try {
      await fetch(`http://${ip}${EMERGENCY_ENDPOINT}`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ emergency: 1 }) }).catch(()=>{});
    } catch(e){}
  }
  showEmergencyOverlay(reason);
  if (!isCalling) {
    isCalling = true;
    window.location.href = `tel:${EMERGENCY_PHONE}`;
    setTimeout(() => { isCalling = false; }, 30000);
  }
}

// Sensor HTTP polling
async function fetchSensorDataHTTP() {
  const ip = document.getElementById("robot-ip")?.value.trim();
  if (!ip) return;
  const url = `http://${ip}${SENSOR_ENDPOINT}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch (e) { console.warn("Invalid sensor JSON"); return; }
    updateSensorUI(data);
    if (autoMode) {
      if ((typeof data.distance === "number" && data.distance < DISTANCE_THRESHOLD_CM) || (data.flame && Number(data.flame) === 1) || (data.emergency && Number(data.emergency) === 1)) {
        handleEmergency("sensor-trigger");
      }
    }
  } catch (e) {
    // ignore network/CORS errors silently
  }
}

// WebSocket attempt
function tryOpenWebSocket() {
  const ip = document.getElementById("robot-ip")?.value.trim();
  if (!ip) return;
  if (ws && ws.readyState === WebSocket.OPEN) return;
  // Close old
  if (ws) { try { ws.close(); } catch(e){} ws = null; }
  for (const path of WEBSOCKET_PATHS) {
    try {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = (path.startsWith(":")) ? `${proto}//${ip}${path}` : `${proto}//${ip}${path}`;
      ws = new WebSocket(wsUrl);
      ws.onopen = () => { console.log("WebSocket open:", wsUrl); };
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          updateSensorUI(data);
          if (autoMode) {
            if ((typeof data.distance === "number" && data.distance < DISTANCE_THRESHOLD_CM) || (data.flame && Number(data.flame) === 1) || (data.emergency && Number(data.emergency) === 1)) {
              handleEmergency("ws-sensor");
            }
          }
        } catch (e) { /* ignore */ }
      };
      ws.onerror = (e) => { console.warn("WebSocket error", e); };
      ws.onclose = () => { console.log("WebSocket closed"); ws = null; };
      return; // we started one
    } catch (e) {
      // try next
    }
  }
}

// Auto toggle UI injection
function injectAutoModeToggle() {
  if (document.getElementById("arh-auto-toggle")) return;
  const el = document.createElement("div");
  el.id = "arh-auto-toggle";
  el.style = `position: fixed; right: 12px; bottom: 18px; z-index: 9998; display:flex;gap:8px;flex-direction:column;align-items:center;`;
  const btn = document.createElement("button");
  btn.textContent = "AUTO: OFF";
  btn.style = "background:#111827;color:#fff;padding:10px;border-radius:14px;border:1px solid #374151;font-weight:700";
  btn.onclick = () => {
    autoMode = !autoMode;
    btn.textContent = autoMode ? "AUTO: ON" : "AUTO: OFF";
    btn.style.background = autoMode ? "#064e3b" : "#111827";
    showToast("Auto Mode " + (autoMode ? "Enabled" : "Disabled"));
  };
  const emBtn = document.createElement("button");
  emBtn.textContent = "Trigger EMERGENCY";
  emBtn.style = "background:#b91c1c;color:#fff;padding:10px;border-radius:14px;border:1px solid #7f1d1d;font-weight:700";
  emBtn.onclick = async () => { await handleEmergency("manual-trigger"); };
  el.appendChild(btn); el.appendChild(emBtn);
  document.body.appendChild(el);
}

// GPS: watch phone location and update UI (optional send to robot commented)
function startPhoneGPS() {
  if (!("geolocation" in navigator)) { console.log("No geolocation"); return; }
  if (gpsWatchId !== null) return;
  gpsWatchId = navigator.geolocation.watchPosition((pos) => {
    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    const gpsStr = `${lat},${lon}`;
    const merged = Object.assign({}, lastSensorData || {}, { gps: gpsStr });
    updateSensorUI(merged);
    // Optionally POST to robot:
    // const ip = document.getElementById("robot-ip")?.value.trim(); if (ip) { fetch(`http://${ip}/gps`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({gps:gpsStr})}).catch(()=>{}); }
  }, (err) => { console.warn("GPS error", err); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 });
}

function stopPhoneGPS() {
  if (gpsWatchId !== null) { navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId = null; }
}

// Start / stop loops
function startSensorLoops() {
  if (sensorPollTimer) clearInterval(sensorPollTimer);
  sensorPollTimer = setInterval(fetchSensorDataHTTP, SENSOR_POLL_MS);
  tryOpenWebSocket();
  startPhoneGPS();
  if (wsRetryTimer) clearInterval(wsRetryTimer);
  wsRetryTimer = setInterval(() => { if (!ws) tryOpenWebSocket(); }, 5000);
}

function stopSensorLoops() {
  if (sensorPollTimer) { clearInterval(sensorPollTimer); sensorPollTimer = null; }
  if (ws) { try { ws.close(); } catch (e) {} ws = null; }
  if (wsRetryTimer) { clearInterval(wsRetryTimer); wsRetryTimer = null; }
  stopPhoneGPS();
}

// Initialize
function init() {
  injectAutoModeToggle();
  startSensorLoops();

  robotIpInput?.addEventListener("input", () => {
    stopSensorLoops();
    setTimeout(startSensorLoops, 300);
  });

  // Minimal AI send placeholder already preserved above

  // Cleanup on unload
  window.addEventListener("beforeunload", () => {
    stopSensorLoops();
    if (ws) ws.close();
  });

  showToast("ARH ROBO JS initialized", 2000);
}

// Run init
init();
