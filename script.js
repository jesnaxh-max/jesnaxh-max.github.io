document.addEventListener("DOMContentLoaded", () => {

    const HEATING_TIME_PER_DEGREE = 5 * 60 * 1000;
    const OUTSIDE_TEMP = 20;

    const roomType =
        document.body.classList.contains("salon-bg") ? "salon" :
        document.body.classList.contains("garaz-bg") ? "garaz" :
        document.body.classList.contains("sypialnia-bg") ? "sypialnia" :
        document.body.classList.contains("lazienka-bg") ? "lazienka" :
        document.body.classList.contains("kuchnia-bg") ? "kuchnia" :
        document.body.classList.contains("biuro-bg") ? "biuro" :
        document.body.classList.contains("ogrod-bg") ? "ogrod" :
        "salon";

    const temperatureSlider = document.getElementById("temperatureSlider");
    const tempDisplay = document.getElementById("tempDisplay");
    const confirmButton = document.getElementById("confirmButton");
    const estimatedTimeElement = document.getElementById("estimatedTime");

    let savedData = JSON.parse(localStorage.getItem(roomType)) || {
        currentTemp: 22,
        targetTemp: 22,
        startTime: null,
        endTime: null,
        toggles: {}
    };

    if (temperatureSlider) {
        temperatureSlider.value = savedData.targetTemp;
        tempDisplay.textContent = `${savedData.targetTemp}°C`;

        temperatureSlider.addEventListener("input", () => {
            tempDisplay.textContent = `${temperatureSlider.value}°C`;
        });
    }

    function saveData() {
        localStorage.setItem(roomType, JSON.stringify(savedData));
    }

    function updateCountdown() {
        if (!savedData.endTime) return;

        const now = Date.now();
        const remaining = savedData.endTime - now;

        if (remaining <= 0) {
            savedData.currentTemp = savedData.targetTemp;
            savedData.startTime = null;
            savedData.endTime = null;
            if (estimatedTimeElement) estimatedTimeElement.textContent = "Temperatura osiągnięta!";
            showToast(`Temperatura w ${roomType} osiągnięta`);
            saveData();
            return;
        }

        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        if (estimatedTimeElement) estimatedTimeElement.textContent = `Pozostały czas: ${minutes}m ${seconds}s`;
    }

    if (confirmButton) {
        confirmButton.addEventListener("click", () => {
            const newTarget = parseInt(temperatureSlider.value);

            if (newTarget === savedData.currentTemp && !savedData.endTime) {
                estimatedTimeElement.textContent = "Temperatura już ustawiona!";
                return;
            }

            const diff = Math.abs(newTarget - savedData.currentTemp);
            const totalTime = diff * HEATING_TIME_PER_DEGREE;

            savedData.targetTemp = newTarget;
            savedData.startTime = Date.now();
            savedData.endTime = savedData.startTime + totalTime;

            saveData();
            updateCountdown();
            showToast(`Ustawiono temperaturę na ${newTarget}°C w ${roomType}`);
        });
    }

    function simulateOutsideInfluence() {
        if (!savedData.endTime) {
            if (savedData.currentTemp < OUTSIDE_TEMP) savedData.currentTemp = +(savedData.currentTemp + 0.01).toFixed(2);
            if (savedData.currentTemp > OUTSIDE_TEMP) savedData.currentTemp = +(savedData.currentTemp - 0.01).toFixed(2);
            saveData();
        }
    }

    if (savedData.endTime) {
        setInterval(updateCountdown, 1000);
    }

    setInterval(simulateOutsideInfluence, 1000);

    /* MAPA URZĄDZEŃ → POPRAWNE KOMUNIKATY */
    const deviceMap = {
        "światło": { on: "Światło włączone", off: "Światło wyłączone" },
        "ekspres": { on: "Ekspres włączony", off: "Ekspres wyłączony" },
        "komputer": { on: "Komputer włączony", off: "Komputer wyłączony" },
        "podlewanie": { on: "Podlewanie uruchomione", off: "Podlewanie wyłączone" },
        "wentylator": { on: "Wentylator włączony", off: "Wentylator wyłączony" },
        "brama": { on: "Brama otwarta", off: "Brama zamknięta" },
        "zasłony": { on: "Zasłony zasłonięte", off: "Zasłony odsłonięte" },
        "muzyka": { on: "Muzyka włączona", off: "Muzyka wyłączona" }
    };

    function detectDevice(text) {
        text = text.toLowerCase();

        if (text.includes("świat")) return "światło";
        if (text.includes("ekspres")) return "ekspres";
        if (text.includes("komputer")) return "komputer";
        if (text.includes("podlew")) return "podlewanie";
        if (text.includes("wentyl")) return "wentylator";
        if (text.includes("bram")) return "brama";
        if (text.includes("zasłon")) return "zasłony";
        if (text.includes("muzyk")) return "muzyka";

        return "światło";
    }

    document.querySelectorAll(".toggle-btn").forEach((btn, index) => {

        if (btn.id === "musicToggleBtn") return;
        if (btn.tagName.toLowerCase() === "input") return;

        if (savedData.toggles[index]) {
            btn.classList.add("on");
            btn.textContent = btn.textContent
                .replace("Włącz", "Wyłącz")
                .replace("Otwórz", "Zamknij")
                .replace("Zasłoń", "Odsłoń");
        }

        btn.addEventListener("click", () => {

            btn.classList.toggle("on");

            let action;
            if (btn.classList.contains("on")) {
                btn.textContent = btn.textContent
                    .replace("Włącz", "Wyłącz")
                    .replace("Otwórz", "Zamknij")
                    .replace("Zasłoń", "Odsłoń");
                savedData.toggles[index] = true;
                action = "włączone";
            } else {
                btn.textContent = btn.textContent
                    .replace("Wyłącz", "Włącz")
                    .replace("Zamknij", "Otwórz")
                    .replace("Odsłoń", "Zasłoń");
                savedData.toggles[index] = false;
                action = "wyłączone";
            }

            saveData();

            const device = detectDevice(btn.textContent);
            const msg = action === "włączone" ? deviceMap[device].on : deviceMap[device].off;

            showToast(`${msg} w ${roomType}`);
        });
    });

    /* MUZYKA – POPRAWIONY TOGGLE */
    const musicToggleBtn = document.getElementById("musicToggleBtn");
    const musicPanel = document.getElementById("musicPanel");

    if (musicToggleBtn && musicPanel) {

        if (savedData.toggles["music"]) {
            musicToggleBtn.classList.add("on");
            musicToggleBtn.textContent = "Wyłącz muzykę";
            musicPanel.classList.remove("hidden");
        }

        musicToggleBtn.addEventListener("click", () => {

            musicToggleBtn.classList.toggle("on");

            if (musicToggleBtn.classList.contains("on")) {
                musicToggleBtn.textContent = "Wyłącz muzykę";
                musicPanel.classList.remove("hidden");
                savedData.toggles["music"] = true;
                showToast(`Muzyka włączona w ${roomType}`);
            } else {
                musicToggleBtn.textContent = "Włącz muzykę";
                musicPanel.classList.add("hidden");
                savedData.toggles["music"] = false;
                showToast(`Muzyka wyłączona w ${roomType}`);
            }

            saveData();
        });
    }

});

/* TOAST */
function showToast(text){
    let t = document.getElementById("toast");

    if(!t){
        t = document.createElement("div");
        t.id = "toast";
        document.body.appendChild(t);
    }

    t.textContent = text;
    t.classList.add("show");

    setTimeout(()=>t.classList.remove("show"),3000);
}

/* MUZYKA – SALON */
if (document.body.classList.contains("salon-bg")) {

    const songs = [
        { title: "Midnight Echo", artist: "Neon District", duration: 150 },
        { title: "City Lights", artist: "Nova Pulse", duration: 172 },
        { title: "Digital Dreams", artist: "Synth Horizon", duration: 160 },
        { title: "Lost Frequency", artist: "Echo Frame", duration: 180 },
        { title: "Skyline Motion", artist: "Urban Phase", duration: 149 },
        { title: "Parallel Lines", artist: "Static Bloom", duration: 177 },
        { title: "Crystal Night", artist: "Arctic Signal", duration: 165 },
        { title: "Electric Dawn", artist: "Vector Sky", duration: 154 },
        { title: "Gravity Flow", artist: "Lunar State", duration: 168 },
        { title: "Silent Rush", artist: "Pulse Theory", duration: 179 }
    ];

    let musicData = JSON.parse(localStorage.getItem("salon_music")) || {
        index: 0,
        time: 0,
        playing: false,
        volume: 50
    };

    let currentTime = musicData.time;
    let timer = null;

    const playBtn = document.getElementById("playPause");
    const nextBtn = document.getElementById("nextSong");
    const prevBtn = document.getElementById("prevSong");
    const progress = document.getElementById("songSlider");
    const volume = document.getElementById("volumeSlider");
    const title = document.getElementById("songTitle");
    const artist = document.getElementById("songArtist");
    const timeDisplay = document.getElementById("songTime");

    function saveMusic() {
        localStorage.setItem("salon_music", JSON.stringify({
            index: musicData.index,
            time: currentTime,
            playing: musicData.playing,
            volume: volume ? volume.value : musicData.volume
        }));
    }

    function format(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function loadSong() {
        const song = songs[musicData.index];
        title.textContent = song.title;
        artist.textContent = song.artist;
        currentTime = musicData.time || 0;
        progress.value = (currentTime / song.duration) * 100;
        updateTime();
    }

    function updateTime() {
        const duration = songs[musicData.index].duration;
        timeDisplay.textContent = format(currentTime) + " / " + format(duration);
    }

    function play() {
        musicData.playing = true;
        if (playBtn) playBtn.textContent = "⏸";

        timer = setInterval(() => {
            currentTime++;
            const duration = songs[musicData.index].duration;

            if (currentTime >= duration) {
                next();
                return;
            }

            if (progress) progress.value = (currentTime / duration) * 100;
            updateTime();
            saveMusic();

        }, 1000);
    }

    function pause() {
        musicData.playing = false;
        if (playBtn) playBtn.textContent = "▶";
        clearInterval(timer);
        saveMusic();
    }

    function next() {
        clearInterval(timer);
        musicData.index = (musicData.index + 1) % songs.length;
        loadSong();
        if (musicData.playing) play();
    }

    function prev() {
        clearInterval(timer);
        musicData.index = (musicData.index - 1 + songs.length) % songs.length;
        loadSong();
        if (musicData.playing) play();
    }

    if (playBtn) playBtn.onclick = () => {
        musicData.playing ? pause() : play();
    };

    if (nextBtn) nextBtn.onclick = next;
    if (prevBtn) prevBtn.onclick = prev;

    if (progress) progress.oninput = () => {
        const duration = songs[musicData.index].duration;
        currentTime = Math.floor((progress.value / 100) * duration);
        updateTime();
        saveMusic();
    };

    if (volume) {
        volume.value = musicData.volume;
        volume.oninput = saveMusic;
    }

    loadSong();
    if (musicData.playing) play();
}
const globalAlarmBtn = document.getElementById("globalAlarmBtn");

if (globalAlarmBtn) {

    let previousStates = JSON.parse(localStorage.getItem("previousStates")) || null;
    let alarmActive = localStorage.getItem("globalAlarm") === "true";

    if (alarmActive) {
        globalAlarmBtn.classList.add("on");
        globalAlarmBtn.textContent = "Rozbrój alarm";
    }

    globalAlarmBtn.addEventListener("click", () => {

        const user = localStorage.getItem("currentUser");
        const rooms = JSON.parse(localStorage.getItem("rooms_" + user)) || [];

        if (!alarmActive) {

            previousStates = {};

            rooms.forEach(room => {
                const data = JSON.parse(localStorage.getItem(room)) || { toggles: {} };
                previousStates[room] = JSON.parse(JSON.stringify(data));

                Object.keys(data.toggles).forEach(key => {
                    data.toggles[key] = false;
                });

                localStorage.setItem(room, JSON.stringify(data));
            });

            localStorage.setItem("previousStates", JSON.stringify(previousStates));
            localStorage.setItem("globalAlarm", "true");
            alarmActive = true;

            globalAlarmBtn.classList.add("on");
            globalAlarmBtn.textContent = "Rozbrój alarm";

            showToast("Alarm uzbrojony — wszystkie urządzenia wyłączone");

        } else {

            if (previousStates) {
                Object.keys(previousStates).forEach(room => {
                    localStorage.setItem(room, JSON.stringify(previousStates[room]));
                });
            }

            localStorage.removeItem("previousStates");
            localStorage.setItem("globalAlarm", "false");
            alarmActive = false;

            globalAlarmBtn.classList.remove("on");
            globalAlarmBtn.textContent = "Uzbrój alarm";

            showToast("Alarm rozbrojony — poprzedni stan przywrócony");
        }
    });
}
function isAlarmActive() {
    return localStorage.getItem("globalAlarm") === "true";
}

function lockUI() {
    const locked = isAlarmActive();

    document.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.id !== "globalAlarmBtn") {
            btn.disabled = locked;
            btn.style.opacity = locked ? "0.5" : "1";
            btn.style.pointerEvents = locked ? "none" : "auto";
        }
    });

    const sliders = document.querySelectorAll("input[type='range']");
    sliders.forEach(sl => {
        sl.disabled = locked;
        sl.style.opacity = locked ? "0.5" : "1";
    });

    const musicPanel = document.getElementById("musicPanel");
    if (musicPanel && locked) {
        musicPanel.classList.add("hidden");
    }
}

setInterval(lockUI, 300);