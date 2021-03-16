let tabsManaged = [];

function getDomainFromUrl(url) {
    let urlObj = (new URL(url));
    return urlObj.hostname.replace('www.','').toLowerCase();
}

chrome.tabs.onUpdated.addListener((tabId, updatedTab) => {
    if (!tabsManaged.includes(tabId) && updatedTab.url) {
        tabsManaged.push(tabId);

        let tabGroupInfo = {};
        chrome.tabGroups.query({}, function(tabGroups) {
            // For some reason, querying based on groupId isn't working
            chrome.tabs.query({ /* groupId: tabGroup.id */ }, function (tabs) {
                tabGroups.forEach(function(tabGroup) {
                    let domain;
                    let tabsInGroup = tabs.filter(function(tab) {
                        return tab.groupId === tabGroup.id;
                    });

                    tabGroupInfo[tabGroup.id] = {
                        name: tabGroup.title,
                        tabs: tabsInGroup,
                        isSameDomain: tabsInGroup.every(function(tab) {
                            if (!tab.url) {
                                // Ignore tabs that don't have any url yet
                                return true;
                            }

                            if (tab.id === tabId) {
                                // Ignore the tab we just opened
                                return true;
                            }

                            if (!domain) {
                                // First result becomes the domain for the group
                                domain = getDomainFromUrl(tab.url);
                                return true;
                            }

                            return domain === getDomainFromUrl(tab.url);
                        })
                    };

                    if (tabGroupInfo[tabGroup.id].isSameDomain) {
                        tabGroupInfo[tabGroup.id].domain = getDomainFromUrl(tabsInGroup[0].url);
                    }
                });

                let updatedDomain = getDomainFromUrl(updatedTab.url);
                let matchingGroupId = Object.keys(tabGroupInfo).find(function(tabGroupId) {
                    return tabGroupInfo[tabGroupId].domain === updatedDomain;
                });

                if (matchingGroupId) {
                    chrome.tabs.group({ groupId: Number(matchingGroupId), tabIds: tabId }, function(groupId) {
                        // No callback
                    });
                }
            });
        });
    }
});