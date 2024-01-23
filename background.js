// let badgeNum = 0;
let ports = {};
// let muted;
let blocked;
let blockedExtUrls = {};
let extRuleIds = {};
let recycleRuleIds = [];
let maxRuleId = 1;
let allRuleIds = [1];
let requests = {};
let needSave = false;
let lastNotify = +new Date();

chrome.storage.local.get((s) => {
  //   muted = s?.muted || {};
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

      //   if (!ports.popup && !muted?.[k]) {
      //     badgeNum += 1;
      //     updateBadge();
      //   }
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
      blocked: blocked[id],
      //   muted: muted[id],
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
