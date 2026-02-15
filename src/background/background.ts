import type { Msg } from "./messaging";
import { getState, setMode } from "./modeManager";
import type { Mode } from "./messaging";
import { getFilterRules, refreshFilterList } from "./filterList";
import { getSessionStats, getAllTimeStats, getTabStats, updateAllTimeStats} from "./stats";

async function broadcastToTab(tabId: number){
    const state = await getState();
    await chrome.tabs.sendMessage(tabId, { type: "STATE_UPDATE", state }).catch(() => {
        // Ignore errors, likely because the content script isn't injected in this tab.
    });
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
    (async () => {
        try{
            if (msg.type === "GET_STATE") {
                const state = ({ok: true, state: await getState()});
                sendResponse(state);
            }
            else if(msg.type === "SET_MODE"){
                const currentState = await getState();

                //removes all previously applied rules to avoid conflicts
                if(currentState.mode === msg.mode){
                    sendResponse({ok: true, state: currentState});
                    return;
                }

                const state = await setMode(msg.mode);

                await applyRulesForMode(msg.mode);

                const [tab] = await chrome.tabs.query({ 
                    active: true, 
                    currentWindow: true 
                });
                if(tab?.id){
                    await broadcastToTab(tab.id);
                }

                sendResponse({ok: true, state});
            }
            else if(msg.type === "APPLY_TO_TAB"){
                await broadcastToTab(msg.tabId);
                sendResponse({ok: true});
            }
            else if(msg.type === "GET_STATS"){
                const tabStats = msg.tabId ? await getTabStats(msg.tabId) :
                    { blockedRequests: 0, estimatedBytesSaved: 0 };
                const sessionStats = await getSessionStats();
                const allTimeStats = await getAllTimeStats();

                sendResponse({
                    ok: true, 
                    stats: { currentTab: tabStats, session: sessionStats, allTime: allTimeStats }
                });
            }
            else{
                sendResponse({ok: false, error: "Unknown message type"});
            }
        } catch (e) {
            sendResponse({ok: false, error: String(e)});
        }
    })();
    return true;
});

chrome.runtime.onInstalled.addListener(async () => {
    //Fetch filter list immediately 
    await refreshFilterList();

    //Schedule weekly refresh
    chrome.alarms.create("refresh_filter_list", {
        periodInMinutes: 7 * 24 * 60
    });

    //initialize
    const state = await getState();
    await applyRulesForMode(state.mode);
});

chrome.runtime.onStartup.addListener(async () => {
    await updateAllTimeStats();

    const state = await getState();
    await applyRulesForMode(state.mode);
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if(alarm.name === "refresh_filter_list"){
        await refreshFilterList();
        const state = await getState();
        await applyRulesForMode(state.mode);
    }

});

async function applyRulesForMode(mode: Mode){
    const existing = await chrome.declarativeNetRequest.getDynamicRules();

    const ids = existing.map(rule => rule.id);

    const newRules = await buildRulesForMode(mode);

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ids,
        addRules: newRules
    });
}

async function buildRulesForMode(mode: Mode): Promise<chrome.declarativeNetRequest.Rule[]> {
    //off mode so theres no rules at all
    if(mode === "off"){
        return [];
    }

    const filterRules = await getFilterRules();

    if(mode === "low" || mode === "medium" || mode === "high"){
        return filterRules;
    }

    if(mode === "extreme"){
        const maxId = filterRules.reduce((max, rule) => Math.max(max, rule.id), 0);
        return [
            ...filterRules,
            {
                id: maxId + 1,
                priority: 1,
                action: { 
                    type: "block" as const
                },
                condition: { 
                    resourceTypes: ["image"] as chrome.declarativeNetRequest.ResourceType[]
                }
            },
            {
                id: maxId + 2,
                priority: 1,
                action: { 
                    type: "block" as const
                },
                condition: { 
                    resourceTypes: ["media"] as chrome.declarativeNetRequest.ResourceType[]
                }
            },
            {
                id: maxId + 3,
                priority: 1,
                action: { 
                    type: "block" as const
                },
                condition: { 
                    resourceTypes: ["font"] as chrome.declarativeNetRequest.ResourceType[]
                }
            }
        ];
    }

    return [];
}

chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
    console.log("Blocked:", info.request.url);
});

