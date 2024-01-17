// let badgeNum = 0;
// let ports = {};
// let muted;
// let blocked;
// let blockedExtUrls = {};
// let extRuleIds = {};
// let recycleRuleIds = [];
// let maxRuleId = 1;
// let allRuleIds = [1];
// let requests = {};
// let needSave = false;
// let lastNotify = +new Date();

// chrome.storage.local.get((s) => {
//   muted = s?.muted || {};
//   blocked = s?.blocked || {};
//   extRuleIds = s?.extRuleIds || {};
//   recycleRuleIds = s?.recycleRuleIds || [];
//   maxRuleId = s?.maxRuleId || 1;
//   allRuleIds = s?.allRuleIds || [1];
//   blockedExtUrls = s?.blockedExtUrls || {};
//   requests = s?.requests || {};
// });

// async function generateRuleId(extId) {
//   extRuleIds[extId] = extRuleIds[extId] ?? [];
//   let ruleId;
//   if (recycleRuleIds.length > 0) {
//     ruleId = recycleRuleIds.pop();
//   } else {
//     ruleId = ++maxRuleId;
//   }
//   extRuleIds[extId].push(ruleId);
//   extRuleIds[extId] = Array.from(new Set(extRuleIds[extId]));
//   allRuleIds.push(ruleId);
//   allRuleIds = Array.from(new Set(allRuleIds));
//   await chrome.storage.local.set({ extRuleIds, maxRuleId, allRuleIds });
//   return ruleId;
// }

// // function debounce(func, delay) {
// //   let timeout;
// //   return function () {
// //     const context = this;
// //     const args = arguments;
// //     clearTimeout(timeout);
// //     timeout = setTimeout(() => func.apply(context, args), delay);
// //   };
// // }

// async function notifyPopup() {
//   const data = await getExtensions();

//   console.log(data, "this is from service worker line 54");

//   //   Object.values(ports).forEach((port) =>
//   //     port.postMessage({ type: "init", data })
//   //   );
// }
// // async function myFunction() {
// //   const myObject = await notifyPopup();
// //   console.log("Function executed with object:", myObject);
// // }

// async function myFunction() {
//   const myObject = await notifyPopup();
//   console.log("Function executed with object:", myObject);
// }
// myFunction();
// // Send the function to the popup script
// // chrome.runtime.onConnect.addListener((port) => {
// //   if (port.name === "popup") {
// //     port.postMessage({ type: "sendFunction", data: myFunction() });
// //   }
// // });
// // notifyPopup();

// // const d_notifyPopup = debounce(notifyPopup, 1000);

// // function updateBadge() {
// //   if (badgeNum > 0) {
// //     chrome.action.setBadgeBackgroundColor({ color: "#F00" });
// //     chrome.action.setBadgeTextColor({ color: "#FFF" });
// //     chrome.action.setBadgeText({ text: badgeNum.toString() });
// //   }
// // }

// async function setupListener() {
//   const hasPerm = await chrome.permissions.contains({
//     permissions: ["declarativeNetRequestFeedback"],
//   });
//   if (!hasPerm) {
//     return;
//   }
//   if (!chrome.declarativeNetRequest?.onRuleMatchedDebug) return;
//   chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
//     if (e.request.initiator?.startsWith("chrome-extension://")) {
//       const k = e.request.initiator.replace("chrome-extension://", "");

//       // console.log(k, "network request");

//       console.log("Network Request:", {
//         extensionId: k,
//         method: e.request.method,
//         url: e.request.url,
//         ruleId: e.rule.ruleId,
//       });

//       if (!requests[k]) {
//         requests[k] = {
//           reqUrls: {},
//           numRequestsAllowed: 0,
//           numRequestsBlocked: 0,
//         };
//       }
//       const req = requests[k];
//       const url = [e.request.method, e.request.url].filter(Boolean).join(" ");
//       req.numRequestsAllowed = req.numRequestsAllowed || 0;
//       req.numRequestsBlocked = req.numRequestsBlocked || 0;

//       if (!req.reqUrls[url] || typeof req.reqUrls[url] !== "object") {
//         req.reqUrls[url] = {
//           blocked: 0,
//           allowed: typeof req.reqUrls[url] === "number" ? req.reqUrls[url] : 0,
//         };
//       }

//       if (allRuleIds.includes(e.rule.ruleId)) {
//         req.numRequestsBlocked += 1;
//         req.reqUrls[url].blocked += 1;
//       } else {
//         req.numRequestsAllowed += 1;
//         req.reqUrls[url].allowed += 1;
//       }
//       const urlObj = new URL(e.request.url);
//       const blockedUrl = [urlObj.protocol, "//", urlObj.host, urlObj.pathname]
//         .filter(Boolean)
//         .join("");
//       req.reqUrls[url].isBlocked = blockedExtUrls[k]?.[blockedUrl] || false;

//       needSave = true;

//       if (!ports.popup && !muted?.[k]) {
//         badgeNum += 1;
//         // updateBadge();
//       }
//       //   d_notifyPopup();
//     }
//   });
// }
// setupListener();

// async function getExtensions() {
//   const extensions = {};
//   const hasPerm = await chrome.permissions.contains({
//     permissions: ["management"],
//   });
//   if (!hasPerm) return [];
//   const extInfo = await chrome.management.getAll();
//   for (let { enabled, name, id, icons } of extInfo) {
//     extensions[id] = {
//       name,
//       id,
//       numRequestsAllowed: 0,
//       numRequestsBlocked: 0,
//       reqUrls: {},
//       icon: icons?.[icons?.length - 1]?.url,
//       blocked: blocked[id],
//       muted: muted[id],
//       enabled,
//       ...(requests[id] || {}),
//     };
//   }
//   return extensions;
// }
// // setInterval(() => {
// //   if (needSave) {
// //     chrome.storage.local.set({ requests });
// //     needSave = false;
// //   }
// // }, 1000);

// // chrome.runtime.onConnect.addListener(async (port) => {
// //   const name = port.name;
// //   port.onDisconnect.addListener(() => {
// //     delete ports[name];
// //   });
// //   ports[name] = port;
// //   if (name === "popup") {
// //     badgeNum = 0;
// //     chrome.action.setBadgeText({ text: "" });
// //   }

// // // this is reset button
// // //   port.onMessage.addListener(async (message) => {
// // //     if (message.type === "reset") {
// // //       requests = {};
// // //       const previousRules =
// // //         await chrome.declarativeNetRequest.getDynamicRules();
// // //       await chrome.declarativeNetRequest.updateDynamicRules({
// // //         removeRuleIds: previousRules.map((rule) => rule.id),
// // //       });
// // //       await chrome.storage.local.set({ requests });
// // //     }
// // //     await notifyPopup();
// // //   });

// //   port.onMessage.addListener(async (message) => {
// //     if (message.type === "toggleMute") {
// //       muted[message.data.id] = !muted[message.data.id];
// //       chrome.storage.local.set({ muted });
// //     } else if (message.type === "toggleBlock") {
// //       blocked[message.data.id] = !blocked[message.data.id];
// //       chrome.storage.local.set({ blocked });
// //       updateBlockedRules();
// //     } else if (message.type === "toggleBlockExtUrl") {
// //       updateBlockedRules(
// //         message.data.extId,
// //         message.data.method,
// //         message.data.url
// //       );
// //     } else if (message.type === "toggleExt") {
// //       const ext = await chrome.management.get(message.data.id);
// //       await chrome.management.setEnabled(message.data.id, !ext.enabled);
// //     }
// //     await notifyPopup();
// //   });

// //   await notifyPopup();
// // });

// // this function is called in this code after getting message from popup js
// // async function updateBlockedRules(extId, method, url) {
// //   if (!blocked[extId] && extId && url) {
// //     const urlObj = new URL(url);
// //     const blockUrl = [urlObj.protocol, "//", urlObj.host, urlObj.pathname]
// //       .filter(Boolean)
// //       .join("");
// //     if (!blockedExtUrls[extId]) {
// //       blockedExtUrls[extId] = {};
// //     }
// //     blockedExtUrls[extId][blockUrl] = !blockedExtUrls[extId][blockUrl];
// //     requests[extId] = requests[extId] ?? {};
// //     requests[extId]["reqUrls"] = requests[extId]["reqUrls"] ?? {};
// //     Object.entries(requests[extId]["reqUrls"]).forEach(([url, urlInfo]) => {
// //       url.indexOf(blockUrl) > -1 &&
// //         (urlInfo.isBlocked = blockedExtUrls[extId][blockUrl]);
// //     });

// //     Object.entries(blockedExtUrls[extId]).forEach(([url, status]) => {
// //       !status && delete blockedExtUrls[extId][url];
// //     });

// //     d_notifyPopup();
// //     await chrome.storage.local.set({ blockedExtUrls });
// //     const removeRuleIds = extRuleIds[extId] || [];
// //     extRuleIds[extId] = [];
// //     recycleRuleIds = Array.from(new Set(recycleRuleIds.concat(removeRuleIds)));
// //     const urlFilters = Object.entries(blockedExtUrls[extId]).map(
// //       ([url, status]) => url
// //     );
// //     const addRules = [];
// //     for (const url of urlFilters) {
// //       addRules.push({
// //         id: await generateRuleId(extId),
// //         priority: 999,
// //         action: { type: "block" },
// //         condition: {
// //           resourceTypes: [
// //             "main_frame",
// //             "sub_frame",
// //             "stylesheet",
// //             "script",
// //             "image",
// //             "font",
// //             "object",
// //             "xmlhttprequest",
// //             "ping",
// //             "csp_report",
// //             "media",
// //             "websocket",
// //             "webtransport",
// //             "webbundle",
// //             "other",
// //           ],
// //           domainType: "thirdParty",
// //           initiatorDomains: [extId],
// //           urlFilter: `${url}*`,
// //         },
// //       });
// //     }
// //     try {
// //       await chrome.declarativeNetRequest.updateDynamicRules({
// //         removeRuleIds,
// //         addRules,
// //       });
// //       await chrome.storage.local.set({ recycleRuleIds, extRuleIds });
// //     } catch (e) {
// //       const previousRules =
// //         await chrome.declarativeNetRequest.getDynamicRules();
// //       console.log({ e, previousRules, removeRuleIds, addRules });
// //     }
// //   } else {
// //     let initiatorDomains = [];
// //     for (let k in blocked) {
// //       if (blocked[k]) {
// //         initiatorDomains.push(k);
// //       }
// //     }
// //     let addRules;
// //     if (initiatorDomains.length) {
// //       addRules = [
// //         {
// //           id: 1,
// //           priority: 999,
// //           action: { type: "block" },
// //           condition: {
// //             resourceTypes: [
// //               "main_frame",
// //               "sub_frame",
// //               "stylesheet",
// //               "script",
// //               "image",
// //               "font",
// //               "object",
// //               "xmlhttprequest",
// //               "ping",
// //               "csp_report",
// //               "media",
// //               "websocket",
// //               "webtransport",
// //               "webbundle",
// //               "other",
// //             ],
// //             domainType: "thirdParty",
// //             initiatorDomains,
// //           },
// //         },
// //       ];
// //     }

// //     await chrome.declarativeNetRequest.updateDynamicRules({
// //       removeRuleIds: [1],
// //       addRules,
// //     });
// //   }
// // }

// // setupListener();
