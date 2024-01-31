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

// analytics code

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "analytics") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Send the tab details back to the content script
      sendResponse({ details: tabs[0] });
      // console.log(tabs[0])
    });
  }
  return true;
});

// code for clickStream
let mainData = [];

let deviceType = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.variable) {
    const receivedVariable = message.variable;
    console.log("Variable received in background script:", receivedVariable);
  }
});

// console.log("Updated deviceType:", deviceType);

// console.log(deviceType, "devicetypeeeee");
// code to generate panel id
function generateRandomAlphanumeric(length) {
  const characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  return result;
}
const randomId = generateRandomAlphanumeric(10);
let ipaddress = null;
// ip
fetch("https://httpbin.org/ip")
  .then((response) => response.json())
  .then((data) => {
    getipaddress(data.origin);
  })
  .catch((error) => console.error("Error", error));

function getipaddress(ip) {
  // console.log(ip, "ip");
  ipaddress = ip;
}

// country code
let CouCode = null;
fetch("https://ipinfo.io/json")
  .then((response) => response.json())
  .then((data) => {
    countryCodefunc(data.country);
  })
  .catch((error) => console.error("Error", error));

function countryCodefunc(code) {
  CouCode = code;
}

// console.log(CouCode, "code");

// computer details
const userAgent = navigator.userAgent;
function dynamicArray(
  panelid,
  ip,
  address,
  url,
  time,
  counrtycode,
  transitionType
) {
  const obj = {};
  obj.panelid = panelid;
  obj.ip = ip;
  obj.address = address;
  obj.url = url;
  obj.time = time;
  obj.countryCode = counrtycode;
  obj.transitionType = transitionType;
  mainData.push(obj);
}

// let urlhai = null;

chrome.tabs.onActivated.addListener(function () {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    async function (tabs) {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        const tabUrl = currentTab.url;
        var timestamp = new Date().getTime();

        chrome.webNavigation.onCommitted.addListener((details) => {
          if (details.url.startsWith(tabUrl)) {
            console.log("Navigation Committed:", details);
            methodis = details.transitionType;
            console.log(methodis, "merhodis");
          }
        });

        let urlhai = null;

        if (mainData && mainData.length > 0) {
          let lastObj = mainData[mainData.length - 1];
          urlhai = lastObj.url;
        }
        console.log(urlhai, "urlhai");
        if (tabUrl.length != 0 && tabUrl != urlhai) {
          dynamicArray(
            randomId,
            ipaddress,
            userAgent,
            tabUrl,
            timestamp,
            CouCode
          );
        } else {
          console.log("same url found in onactivated");
        }
      }
    }
  );
});

// console.log(urlhai,"urlhai");
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    var timestamp = new Date().getTime();
    let urlhai = null;
    if (mainData && mainData.length > 0) {
      let lastObj = mainData[mainData.length - 1];
      urlhai = lastObj.url;
    }
    console.log(urlhai, "urlhai");

    if (tab.url != urlhai) {
      dynamicArray(randomId, ipaddress, userAgent, tab.url, timestamp, CouCode);
    } else {
      console.log("same url found in onupdated");
    }
  }
});

// let methodis = null;
// chrome.webNavigation.onCommitted.addListener((details) => {
//   if (details.url.startsWith(tab.url)) {
//     console.log("Navigation Committed:", details);
//     methodis = details.transitionType;
//     console.log(methodis, "merhodis");
//   }
// });
// console.log(methodis, "methodis");

let len = mainData.length;
console.log(mainData, "mainData");
