

//easisest URL
const EASYLIST_URL = "https://easylist.to/easylist/easylist.txt";
const CACHE_KEY = "filter_list_cache_v1";
const MAX_RULES = 4990; //left space for some custom rules if needed
    
//fetch the list raw from the text of remote url
async function fetchList(): Promise<string> { 
    const response = await fetch(EASYLIST_URL);
    if(!response.ok){
        throw new Error(`Failed to fetch EasyList: ${response.status}`);
    }
    return response.text();
}

//function parseABP(raw: string): string[] {...}

//convert the list of domains into declarativeNetRequest rules
//start with rule IDs at 100 to avoid conflicts with any custom rules
//we might wanna add in the future
function toRules(domains: string[]): chrome.declarativeNetRequest.Rule[] {
    return domains.slice(0, MAX_RULES).map((domain, index) => ({
        id: 100 + index,
        priority: 1,
        action: { 
            type: "block" as const
        },
        condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: [
                "script",
                "image",
                "xmlhttprequest",
                "sub_frame",
                "stylesheet",
                "font",
                "media",
                "ping",
                "other"
            ] as chrome.declarativeNetRequest.ResourceType[]
        }
    }));

}


//PUBLIC API: to get the rules from cache or fetch and parse if not cached or expired
export async function getFilterRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] as FilterCache | undefined;

    //if the cache exists and is less than 7 days old, use it
    if(cache && (Date.now() - cache.fetchedAt) < 7 * 24 * 60 * 60 * 1000){
        return toRules(cache.domains);
    }

    //fetches fresh filters
    const raw = await fetchList();
    const domains = parseABP(raw);

    //store in cache
    const newCache: FilterCache = {
        fetchedAt: Date.now(),
        domains
    };
    await chrome.storage.local.set({ [CACHE_KEY]: newCache });

    return toRules(domains);
}

//PUBLIC API: force refresh the cache
export async function refreshFilterList(): Promise<void> {
    const raw = await fetchList();
    const domains = parseABP(raw);

    const cache: FilterCache = {
        fetchedAt: Date.now(),
        domains
    };
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
}

//the ABP parser logic for domain||^ rules:
//parse the ABP format into an array of rules then looks for lines
//that match: ||domain.com^ and extracts domain.com into the rules list
//skips commments (!), exceptions (@@), and element hiding (##)
//      regex patterns, rules with complex modifiers
function parseABP(raw: string): string[] {
    const domains: string[] = [];
    for(const line of raw.split("\n")){
        const trimmed = line.trim();

        //skip empty lines, comments, element hiding, exceptions, and complex rules
        if(!trimmed || trimmed.startsWith("!") || trimmed.startsWith("@@") 
            || trimmed.includes("##") || trimmed.includes("#@#")){
            continue;
        }

        //match |domain.com^ pattern with some $ modifiers
        //rules like ||domain.com^ ||domain.com^$third-party
        const match = trimmed.match(/^\|\|([^\/\^]+)\^/);
        if(match){
            domains.push(match[1]);
        }
    }

    return domains;
}

//cache structure
type FilterCache = {
    fetchedAt: number;  //timestamp
    domains: string[];  //parsed domain list
}


