import { Mode } from "../background/messaging";

const currentEl = document.getElementById("current")!;

async function refresh(){
    const result = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if(!result?.ok){
        currentEl.textContent = "Error reading state";
        return;
    }

    currentEl.textContent = `Current: ${result.state.mode}`;

    document.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === result.state.mode);
    });
}

async function setMode(mode: Mode){
    const result = await chrome.runtime.sendMessage({ type: "SET_MODE", mode });
    if(result?.ok){
        await refresh();
    }
};

function formatBytes(bytes: number): string {
    if(bytes < 1024) {
        return `${bytes} B`;
    }
    if(bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function refreshStats(){
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    const result = await chrome.runtime.sendMessage({ 
        type: "GET_STATS", 
        tabId: tab?.id 
    });
    if(!result?.ok){
        return;
    }

    const { currentTab, session, allTime } = result.stats;

    document.getElementById("stats-blocked")!.textContent = `${
        currentTab.blockedRequests} requests blocked`;
    document.getElementById("stats-saved")!.textContent = formatBytes(
        currentTab.estimatedBytesSaved);

    document.getElementById("session-blocked")!.textContent = `${
        session.blockedRequests} blocked`;
    document.getElementById("session-saved")!.textContent = formatBytes(
        session.estimatedBytesSaved);

    document.getElementById("allTime-blocked")!.textContent = `${
        allTime.blockedRequests} blocked`;
    document.getElementById("allTime-saved")!.textContent = formatBytes(
        allTime.estimatedBytesSaved);
}


document.querySelectorAll<HTMLButtonElement>("button[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
        setMode(btn.dataset.mode as Mode);
    });
});

document.getElementById("stats-toggle")!.addEventListener("click", () => {
    const expanded = document.getElementById("stats-expanded")!;
    const btn = document.getElementById("stats-toggle")!;

    expanded.classList.toggle("hidden");
    btn.textContent = expanded.classList.contains("hidden") ? 
        "Show more" : "Show less";
});


refresh();
refreshStats();
