import { State } from "../background/messaging";

let observer: MutationObserver | null = null;

function proxyURL(originalSrc: string): string {
return `https://wsrv.io/?url=${encodeURIComponent(originalSrc)}&q=35&w=480`;
}

function downgradeImage(img: HTMLImageElement): void {
    const src= img.src;
    if(!src || src.startsWith("data:") 
        || src.endsWith(".svg") || img.dataset.originalSrc){

            return; // skip if no src or already a data/blob URL
        }

    img.dataset.originalSrc = src;
    img.src = proxyURL(src);
    img.removeAttribute("srcset"); // remove srcset to prevent browser from loading higher res images
    img.removeAttribute("sizes"); // remove sizes to prevent browser from loading higher res images

    img.onerror = () => {
        // If the proxy fails, fallback to original src
        img.onerror = null; // prevent infinite loop if original also fails
            img.src = img.dataset.originalSrc || "";
    };
}

//this downgrades all of the iamges on the webpage
function downgradeImages(): void{
    document.querySelectorAll<HTMLImageElement>("img").forEach(downgradeImage);
}

function observeNewImages(mode: "medium" | "high"): void {
    observer?.disconnect();
    observer = new MutationObserver((mutations) => {
        for(const mutation of mutations){
            for(const node of mutation.addedNodes){
                if(node instanceof HTMLImageElement){
                    if(mode === "high"){
                        hideImage(node);
                        attachRevealListenersHidden(node);
                    }
                    else{
                        downgradeImage(node);
                        attachRevealListeners(node);
                    }
                }
                if(node instanceof HTMLElement){
                    node.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
                        if(mode === "high"){
                            hideImage(img);
                            attachRevealListenersHidden(img);
                        }
                        else{
                            downgradeImage(img);
                            attachRevealListeners(img);
                        }
                    });
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}


//restore a single image
function restoreImage(img: HTMLImageElement): void {
    const originalSrc = img.dataset.originalSrc;
    if(originalSrc){
        img.src = originalSrc;
        delete img.dataset.originalSrc;
        img.style.backgroundColor = "";
        img.style.minHeight = "";
        img.style.minWidth = "";
        img.style.cursor = "";
        img.style.display = img.dataset.originalDisplay || "";
        delete img.dataset.originalDisplay;
    }
}

//restore all images on the webpage
function restoreImages(): void {
    document.querySelectorAll<HTMLImageElement>("img[data-original-src]").forEach(restoreImage);
}

//attaches hover/click listeners to images to show original on hover/click
function attachRevealListeners(img: HTMLImageElement): void {
    img.style.cursor = "pointer"; // indicate interactivity
    img.addEventListener("mouseenter", () => restoreImage(img), { once: true });

    img.addEventListener("click", (e) => {
        e.preventDefault();
        restoreImage(img);
    }, { once: true });
}

function hideImage(img: HTMLImageElement): void {
    const src= img.src;
    if(!src || src.startsWith("data:")
        || src.endsWith(".svg") || img.dataset.originalSrc){

            return; // skip if no src or already a data/blob URL
        }

    img.dataset.originalSrc = src;
    img.dataset.originalDisplay = img.style.display || "";
    img.removeAttribute("srcset"); // remove srcset to prevent browser from loading higher res images
    img.removeAttribute("sizes"); // remove sizes to prevent browser from loading higher res images
    img.src = "";
    img.style.backgroundColor = "#d0d0d0"; // placeholder background
    img.style.minHeight = "60px"; // prevent layout collapse
    img.style.minWidth = "60px"; // prevent layout collapse
    img.style.cursor = "default"; // indicate interactivity
}

function hideImages(): void{
    document.querySelectorAll<HTMLImageElement>("img").forEach(hideImage);
}

function revealImage(img: HTMLImageElement): void {
    const originalSrc = img.dataset.originalSrc;
    if(originalSrc){
        img.src = originalSrc;
        delete img.dataset.originalSrc;
        img.style.backgroundColor = "";
        img.style.minHeight = "";
        img.style.minWidth = "";
        img.style.cursor = "";
        img.style.display = img.dataset.originalDisplay || "";
        delete img.dataset.originalDisplay;
    }
}

function attachRevealListenersHidden(img: HTMLImageElement): void {
    img.addEventListener("mouseenter", () => revealImage(img), { once: true });
    img.addEventListener("click", (e) => {
        e.preventDefault();
        revealImage(img);
    }, { once: true });
}

function applyDomOptimizations(state: State){
    if(!state?.mode) {
        return;
    }

    observer?.disconnect();
    observer = null;

    document.documentElement.dataset.mode = state.mode;

    //example tiny visible indicator for debugign
    const id = "__mode_badge";
let badge = document.getElementById(id);

if(state.mode === "off"){
    badge?.remove();
    restoreImages();
    return;
}

if(state.mode !== "medium" && state.mode !== "high"){
    restoreImages();
}

if(state.mode === "medium"){
    downgradeImages();
    document.querySelectorAll<HTMLImageElement>("img[data-original-src]")
    .forEach(attachRevealListeners);
    observeNewImages("medium");
}

if(state.mode === "high"){
    hideImages();
    observeNewImages("high");
    document.querySelectorAll<HTMLImageElement>("img[data-original-src]")
    .forEach(attachRevealListenersHidden);
}


if(!badge){
    badge = document.createElement("div");
    badge.id = id;
    badge.style.position = "fixed";
    badge.style.bottom = "12px";
    badge.style.right = "12px";
    badge.style.zIndex = "2147483647"; // max z-index to ensure it's on top
    badge.style.padding = "6px 10px";
    badge.style.borderRadius = "10px";
    badge.style.font = "12px system-ui, sans-serif";
    badge.style.background = "rgba(0,0,0,0.75)";
    badge.style.color = "white";
    badge.style.pointerEvents = "none"; // allow clicks to pass through

    document.body.appendChild(badge);
}

const warningId = "__extreme_mode_warning";
let warning = document.getElementById(warningId);

if (state.mode === "extreme") {
    if (!warning){
        warning = document.createElement("div");
        warning.id = warningId;
        warning.textContent = "Extreme Mode Active — Media & Images Blocked";
        warning.style.position = "fixed";
        warning.style.top = "0";
        warning.style.left = "0";
        warning.style.right = "0";
        warning.style.background = "red";
        warning.style.color = "white";
        warning.style.padding = "6px";
        warning.style.fontSize = "12px";
        warning.style.zIndex = "2147483647";
        warning.style.textAlign = "center";
        document.body?.appendChild(warning);
    }
} else {
    warning?.remove();
}


badge.textContent = `Mode: ${state.mode}`;
}

chrome.runtime.onMessage.addListener((msg: any) => {
    if(msg?.type === "STATE_UPDATE"){
        applyDomOptimizations(msg.state as State);
    }
});

//on first load, ask background for state and apply it
(async () => {
    try{
        const result = await chrome.runtime.sendMessage({ type: "GET_STATE" });
        if(result?.ok && result.state?.mode){
            applyDomOptimizations(result.state);
        }
    }
    catch(e){
        //just ignore
    }
})();
