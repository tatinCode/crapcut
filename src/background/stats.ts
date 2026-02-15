const AVG_BYTES_PER_REQUEST = 30_000;   //30Kb avg request size
const STATS_KEY = "stats_v1";

type Stats = {
    blockedRequests: number;
    estimatedBytesSaved: number;
}

type StoredStats = {
    alltime: Stats;
}

export async function getTabStats(tabId:number): Promise<Stats> {
    const match = await chrome.declarativeNetRequest.getMatchedRules({ tabId });
    const count = match.rulesMatchedInfo.length;
    return{
        blockedRequests: count,
        estimatedBytesSaved: count * AVG_BYTES_PER_REQUEST
    };
}

export async function getSessionStats(): Promise<Stats> {
    const match = await chrome.declarativeNetRequest.getMatchedRules();
    const count = match.rulesMatchedInfo.length;
    return{
        blockedRequests: count,
        estimatedBytesSaved: count * AVG_BYTES_PER_REQUEST
    };
}

export async function getAllTimeStats(): Promise<Stats> {
    const result = await chrome.storage.local.get(STATS_KEY);
    const stored = result[STATS_KEY] as StoredStats | undefined;

    if(stored){
        return stored.alltime;
    }

    return {
        blockedRequests: 0,
        estimatedBytesSaved: 0
    };
}

export async function updateAllTimeStats(): Promise<void> {
    //get stats for current session
    const sesssion = await getSessionStats();

    //gets all time stats
    const current = await getAllTimeStats();

    //adds current sesssion stats to all time stats
    const updated: StoredStats = {
        alltime: {
            blockedRequests: current.blockedRequests + sesssion.blockedRequests,
            estimatedBytesSaved: current.estimatedBytesSaved + sesssion.estimatedBytesSaved
        }
    };

    await chrome.storage.local.set({ [STATS_KEY]: updated });
}

export function formatBytes(bytes: number): string {
    if(bytes < 1024) {
        return `${bytes} B`;
    }
    if(bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}



