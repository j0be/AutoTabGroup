let tabsManaged = [];

function noop() {}

function getDomainFromUrl(url) {
    let urlObj = (new URL(url));
    return urlObj.hostname.replace('www.','').toLowerCase();
}

chrome.tabs.onUpdated.addListener((currentTabId, updatedTab) => {
    if (!tabsManaged.includes(currentTabId) && updatedTab.url) {
        tabsManaged.push(currentTabId);

        let tabGroupInfo = {};
        let currentGroupId;

        chrome.tabGroups.query({}, function(tabGroups) {
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

                            if (tab.id === currentTabId) {
                                // Ignore the tab we just opened
                                currentGroupId = tabGroup.id;
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
                    //Add tab to group
                    chrome.tabs.group({ groupId: Number(matchingGroupId), tabIds: currentTabId }, noop);
                    //Expand group if it's collapse to avoid dark pattern
                    chrome.tabGroups.update(Number(matchingGroupId), { collapsed: false }, noop)
                } else if (tabGroupInfo[currentGroupId] && tabGroupInfo[currentGroupId].isSameDomain) {
                    //Remove tab from group
                    chrome.tabs.ungroup(currentTabId, noop);
                }
            });
        });
    }
});