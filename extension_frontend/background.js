let ports = {};
let blocked;
let blockedExtUrls = {};
let extRuleIds = {};
let recycleRuleIds = [];
let maxRuleId = 1;
let allRuleIds = [1];
let requests = {};
let needSave = false;
let lastNotify = +new Date();

// setting states in local storage
chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({ onInstalledDisplay: "on" });
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.set({ analyticsToggle: "off" });
});

chrome.storage.session.setAccessLevel({
  accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
});
chrome.storage.local.get((s) => {
  blocked = s?.blocked || {};
  extRuleIds = s?.extRuleIds || {};
  recycleRuleIds = s?.recycleRuleIds || [];
  maxRuleId = s?.maxRuleId || 1;
  allRuleIds = s?.allRuleIds || [1];
  blockedExtUrls = s?.blockedExtUrls || {};
  requests = s?.requests || {};
});

// console.log(blockedExtUrls, "blockurls");
// generates new rules id

async function generateRuleId(extId) {
  extRuleIds[extId] = extRuleIds[extId] ?? [];
  let ruleId;
  if (recycleRuleIds.length > 0) {
    ruleId = recycleRuleIds.pop();
  } else {
    ruleId = ++maxRuleId;
  }
  extRuleIds[extId].push(ruleId);
  extRuleIds[extId] = Array.from(new Set(extRuleIds[extId]));
  allRuleIds.push(ruleId);
  allRuleIds = Array.from(new Set(allRuleIds));
  await chrome.storage.local.set({ extRuleIds, maxRuleId, allRuleIds });
  return ruleId;
}

// to handle multiple function call
function debounce(func, delay) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

// sending data to popup through debounce

async function notifyPopup() {
  const data = await getExtensions();

  //   console.log(data, "this is from service worker line 54");
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "popup") {
      port.postMessage({ data: data });
    }
  });
  //  for request number
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "getYourData") {
      sendResponse({ data: data });
    }
  });
}

const d_notifyPopup = debounce(notifyPopup, 1000);

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (message) => {
    console.log("message received!", message);
    if (message.type === "toggleBlockExtUrl") {
      console.log(
        message.data.extId,
        message.data.method,
        message.data.apiUrl,
        "this is from line 76"
      );
      console.log(message);
      updateBlockedRules(message.data.extId, message.data.apiUrl);
    }
    await notifyPopup();
  });
});

chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  // Check if the message has the expected format
  if (request.popupMessage == "resetKaro") {
    console.log("Message received in background script:", request.popupMessage);

    requests = {};

    const previousRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: previousRules.map((rule) => rule.id),
    });
    await chrome.storage.local.set({ requests });
  }
});

async function setupListener() {
  const hasPerm = await chrome.permissions.contains({
    permissions: ["declarativeNetRequestFeedback"],
  });
  if (!hasPerm) {
    return;
  }

  //   from here we are matching and getting extension details
  if (!chrome.declarativeNetRequest?.onRuleMatchedDebug) return;
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
    if (e.request.initiator?.startsWith("chrome-extension://")) {
      const k = e.request.initiator.replace("chrome-extension://", "");

      // console.log(k, "network request");
      //   console.log("Network Request:", {
      //     extensionId: k,
      //     method: e.request.method,
      //     url: e.request.url,
      //     ruleId: e.rule.ruleId,
      //   });

      if (!requests[k]) {
        requests[k] = {
          reqUrls: {},
          numRequestsAllowed: 0,
          numRequestsBlocked: 0,
        };
      }
      const req = requests[k];
      const url = [e.request.method, e.request.url].filter(Boolean).join(" ");
      req.numRequestsAllowed = req.numRequestsAllowed || 0;
      req.numRequestsBlocked = req.numRequestsBlocked || 0;

      if (!req.reqUrls[url] || typeof req.reqUrls[url] !== "object") {
        req.reqUrls[url] = {
          blocked: 0,
          allowed: typeof req.reqUrls[url] === "number" ? req.reqUrls[url] : 0,
        };
      }
      if (allRuleIds.includes(e.rule.ruleId)) {
        req.numRequestsBlocked += 1;
        req.reqUrls[url].blocked += 1;
      } else {
        req.numRequestsAllowed += 1;
        req.reqUrls[url].allowed += 1;
      }
      const urlObj = new URL(e.request.url);
      const blockedUrl = [urlObj.protocol, "//", urlObj.host, urlObj.pathname]
        .filter(Boolean)
        .join("");
      req.reqUrls[url].isBlocked = blockedExtUrls[k]?.[blockedUrl] || false;

      needSave = true;

      d_notifyPopup();
    }
  });
}

setInterval(() => {
  if (needSave) {
    chrome.storage.local.set({ requests });
    needSave = false;
  }
}, 1000);

// getting all extension data here
async function getExtensions() {
  const extensions = {};
  const hasPerm = await chrome.permissions.contains({
    permissions: ["management"],
  });
  if (!hasPerm) return [];
  const extInfo = await chrome.management.getAll();
  for (let { enabled, name, id, icons } of extInfo) {
    // console.log(requests[id], id, "line 149");
    extensions[id] = {
      name,
      id,
      numRequestsAllowed: 0,
      numRequestsBlocked: 0,
      reqUrls: {},
      icon: icons?.[icons?.length - 1]?.url,
      enabled,
      ...(requests[id] || {}),
    };
  }
  return extensions;
}

chrome.runtime.onConnect.addListener(async (port) => {
  const name = port.name;
  port.onDisconnect.addListener(() => {
    delete ports[name];
  });
  ports[name] = port;

  await notifyPopup();
});

async function updateBlockedRules(extId, url) {
  console.log("updateBlock rules working now!");
  if (!blocked[extId] && extId && url) {
    console.log("blocked from background js!");
    const urlObj = new URL(url);
    const blockUrl = [urlObj.protocol, "//", urlObj.host, urlObj.pathname]
      .filter(Boolean)
      .join("");
    if (!blockedExtUrls[extId]) {
      blockedExtUrls[extId] = {};
    }
    blockedExtUrls[extId][blockUrl] = !blockedExtUrls[extId][blockUrl];
    requests[extId] = requests[extId] ?? {};
    requests[extId]["reqUrls"] = requests[extId]["reqUrls"] ?? {};
    Object.entries(requests[extId]["reqUrls"]).forEach(([url, urlInfo]) => {
      url.indexOf(blockUrl) > -1 &&
        (urlInfo.isBlocked = blockedExtUrls[extId][blockUrl]);
    });

    Object.entries(blockedExtUrls[extId]).forEach(([url, status]) => {
      !status && delete blockedExtUrls[extId][url];
    });

    d_notifyPopup();
    await chrome.storage.local.set({ blockedExtUrls });
    const removeRuleIds = extRuleIds[extId] || [];
    extRuleIds[extId] = [];
    recycleRuleIds = Array.from(new Set(recycleRuleIds.concat(removeRuleIds)));
    const urlFilters = Object.entries(blockedExtUrls[extId]).map(
      ([url, status]) => url
    );
    const addRules = [];
    for (const url of urlFilters) {
      addRules.push({
        id: await generateRuleId(extId),
        priority: 999,
        action: { type: "block" },
        condition: {
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "stylesheet",
            "script",
            "image",
            "font",
            "object",
            "xmlhttprequest",
            "ping",
            "csp_report",
            "media",
            "websocket",
            "webtransport",
            "webbundle",
            "other",
          ],
          domainType: "thirdParty",
          initiatorDomains: [extId],
          urlFilter: `${url}*`,
        },
      });
    }
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
      });
      await chrome.storage.local.set({ recycleRuleIds, extRuleIds });
    } catch (e) {
      const previousRules =
        await chrome.declarativeNetRequest.getDynamicRules();
      console.log({ e, previousRules, removeRuleIds, addRules });
    }
  } else {
    console.log("unblock from background js!");
    let initiatorDomains = [];
    for (let k in blocked) {
      if (blocked[k]) {
        initiatorDomains.push(k);
      }
    }
    let addRules;
    if (initiatorDomains.length) {
      addRules = [
        {
          id: 1,
          priority: 999,
          action: { type: "block" },
          condition: {
            resourceTypes: [
              "main_frame",
              "sub_frame",
              "stylesheet",
              "script",
              "image",
              "font",
              "object",
              "xmlhttprequest",
              "ping",
              "csp_report",
              "media",
              "websocket",
              "webtransport",
              "webbundle",
              "other",
            ],
            domainType: "thirdParty",
            initiatorDomains,
          },
        },
      ];
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules,
    });
  }
}

setupListener();

// code for clickstream

chrome.storage.local.get(["panelId"], function (result) {
  let panelId = result.panelId;

  if (!panelId) {
    panelId = generateUUID();
    chrome.storage.local.set({ panelId: panelId });
  }
  // dataToSend.panelid = panelId;
  let mainData = [];
  let tabMap = {};

  function dynamicArray(panel, referer, url) {
    const obj = {};
    obj.panelid = panel;
    obj.referer = referer;
    obj.url = url;
    mainData.push(obj);
    const Apiurl = "http://localhost:3000/clickstream";
    fetch(Apiurl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        console.log("Data sent successfully:", data);
      })
      .catch((error) => {
        console.error("There was a problem with the POST request:", error);
      });
    console.log(mainData, "mainData");
  }
  // creating panel id
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  // Listen for tab updates
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === "complete") {
      getMethod("onUpdated", tab.url);
      if (tab.url) {
        tabMap["1"] = tabMap["2"];
        tabMap["2"] = tab.url;
      }
    }
  });

  chrome.tabs.onActivated.addListener(function (activeInfo) {
    let tabId = activeInfo.tabId;
    chrome.tabs.get(tabId, function (tab) {
      if (tab.url) {
        tabMap["1"] = tabMap["2"];
        tabMap["2"] = tab.url;
      }
      getMethod("onActivated", tab.url, tabId);
    });
  });

  function getMethod(method, url) {
    chrome.storage.local.get(["storeUrl"]).then((result) => {
      const storedUrl = result.storeUrl || "";
      if (method == "onUpdated") {
        const regex = /\/\/newtab\//;
        if (storedUrl.length == 0 && !regex.test(url)) {
          dynamicArray(panelId, tabMap["1"], url);
        } else {
          if (storedUrl != url && !regex.test(url)) {
            dynamicArray(panelId, storedUrl, url);
          }
        }
      }
      chrome.storage.local.set({ storeUrl: url });
    });
  }
});