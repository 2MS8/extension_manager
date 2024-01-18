chrome.management.getAll((result) => {
  console.log(result);
  console.log(result[0].id, "response result");
  // console.log(result[0]["icons"][0]["url"], "this is icon");
  const reload = document.getElementById("reload_btn");

  reload.addEventListener("click", () => {
    console.log("reload clicked");

    for (let i = 0; i < result.length; i++) {
      const extID = result[i].id;

      if (extID != "mocfpcgonolmeglhpdijfohddhcfkkii") reloadAll(extID);
    }
  });

  function reloadAll(id) {
    // var extensionId = "your_extension_id";
    chrome.management.get(id, (result) => {
      if (result.enabled == true) {
        chrome.management.setEnabled(id, false, function () {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
          }

          console.log("Extension disabled successfully");

          // Enable the extension after a short delay
          setTimeout(function () {
            chrome.management.setEnabled(id, true, function () {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
              }

              console.log("Extension re-enabled successfully");
            });
          }, 100); // You can adjust the delay as needed
        });
      }
    });
  }

  function createCard(data) {
    for (let i = 0; i < data.length; i++) {
      const cardContainer = document.getElementById("card-container");

      const card = document.createElement("div");
      card.className = "card";

      const icon = document.createElement("img");
      icon.className = "icon_image";
      const iconsArray = data[i]["icons"];

      if (iconsArray && iconsArray.length > 0) {
        icon.src = iconsArray[0]["url"];
      } else {
        icon.src = "default-icon-url";
      }
      card.appendChild(icon);

      const nameElement = document.createElement("h2");
      nameElement.textContent = data[i].shortName;
      card.appendChild(nameElement);
      //   permission.createElement = "permission";

      const permission_heading = document.createElement("h4");
      permission_heading.textContent = "Permissions: ";
      card.appendChild(permission_heading);

      const permission = document.createElement("p");
      permission.textContent = data[i].permissions;
      permission.className = "permission_content";
      card.appendChild(permission);

      const idElement = document.createElement("p");
      idElement.textContent = `ID: ${data[i].id}`;
      card.appendChild(idElement);

      //   creating deactivate button
      const id = data[i].id;

      const deactivate = document.createElement("button");

      deactivate.className = "deactivate_btn";

      let reqData = document.createElement("div");

      reqData.className = "reqData";

      reqData.innerHTML = "data will shown here!";

      chrome.management.get(id, (result) => {
        console.log(result.enabled, "this is result.enabled");
        if (result.enabled == true) {
          deactivate.innerHTML = "Deactivate";

          chrome.storage.local.set({ extName: "on" });
        } else {
          deactivate.innerHTML = "Activate";
          chrome.storage.local.set({ extName: "off" });
        }
      });

      deactivate.addEventListener("click", () => {
        console.log(result.extName);
        if (deactivate.innerHTML == "Deactivate") {
          chrome.management.setEnabled(id, false);
          console.log("on clicked");
          deactivate.innerHTML = "Activate";
        } else {
          chrome.management.setEnabled(id, true);
          deactivate.innerHTML = "Deactivate";
          console.log("off clicked");
        }
      });

      const getApi = document.createElement("button");
      getApi.className = "download_Btn";
      getApi.innerHTML = "Get API's";

      getApi.addEventListener("click", async () => {
        const data = await getExtensions();
        const requestUrl = data[id].reqUrls;
        const urlList = Object.keys(requestUrl);

        console.log(urlList);
        reqData.innerHTML = " ";
        reqData.className = "reqData";

        urlList.forEach((urlKey, index) => {
          // console.log(urlKey);

          // const reqData_child = document.createElement("div");
          const reqData_Child_icon = document.createElement("span");
          // reqData_Child_icon.innerHTML = `<i class="fa fa-check" style="font-size:28px;color:green"></i>`;

          // reqData_child.innerHTML += urlKey;

          // const currentElement = `element-${index}`;

          // reqData_child.className = currentElement;

          const reqData_child = document.createElement("div");

          // Set a unique class for each element
          const currentElement = `element-${index}`;
          reqData_child.className = currentElement;

          // Add content to the div
          reqData_child.innerHTML = urlKey;

          // Append the div to the document body or another container
          reqData.appendChild(reqData_child);
          reqData_child.appendChild(reqData_Child_icon);

          // Add a click event listener for each element

          // let blockState = false;
          chrome.storage.local.set({ blockState: false });
          const extractedMethods = urlList.map((urlString) => {
            const parts = urlString.split(" ");
            const method = parts[0];
            const url = parts.slice(1).join(" ");
            return {
              method,
              url,
            };
          });

          // Retrieve blockState when popup is opened
          chrome.storage.local.get(["blockState"], (result) => {
            const newState = result.blockState;
            // Apply styles based on the retrieved state
            if (newState) {
              // reqData_Child_icon.innerHTML = `<i class="fa fa-close" style="font-size:28px;color:red"></i>`;
              reqData_child.style.color = "red";
            } else {
              // reqData_Child_icon.innerHTML = `<i class="fa fa-check" style="font-size:28px;color:green"></i>`;
              reqData_child.style.color = "green";
            }
          });

          reqData_child.addEventListener("click", () => {
            chrome.storage.local.get(["blockState"]).then((result) => {
              const newState = !result.blockState; // Toggle the state

              chrome.storage.local.set({ blockState: newState });

              if (newState) {
                // Blocking is active
                updateBlockedRules(
                  id,
                  extractedMethods[index].method,
                  extractedMethods[index].url
                );

                // reqData_Child_icon.innerHTML = `<i class="fa fa-close" style="font-size:28px;color:red"></i>`;
                reqData_child.style.color = "red";
              } else {
                // Blocking is inactive
                unblockRules(
                  id,
                  extractedMethods[index].method,
                  extractedMethods[index].url
                );

                // reqData_Child_icon.innerHTML = `<i class="fa fa-check" style="font-size:28px;color:green"></i>`;
                reqData_child.style.color = "green";
              }
            });
          });

          // reqData_child.addEventListener("click", () => {
          //   chrome.storage.local.get(["blockState"]).then((result) => {
          //     if (result.blockState == false) {
          //       console.log(`Clicked on ${currentElement}`);

          //       console.log(extractedMethods[index].method);
          //       console.log(result.blockState, "state");

          //       // blockState = true;

          //       chrome.storage.local.set({ blockState: true });

          //       updateBlockedRules(
          //         id,
          //         extractedMethods[index].method,
          //         extractedMethods[index].url
          //       );
          //       console.log("blocked");
          //       reqData_Child_icon.innerHTML = `<i class="fa fa-close" style="font-size:28px;color:red"></i>`;
          //       reqData_child.style.color = "green";
          //     } else {
          //       console.log(result.blockState, "state");

          //       unblockRules(
          //         id,
          //         extractedMethods[index].method,
          //         extractedMethods[index].url
          //       );

          //       // blockState = false;
          //       chrome.storage.local.set({ blockState: false });

          //       reqData_Child_icon.innerHTML = `<i class="fa fa-check" style="font-size:28px;color:green"></i>`;
          //       reqData_child.style.color = "red";
          //     }
          //   });
          // });
        });
      });
      card.appendChild(reqData);

      card.appendChild(deactivate);
      card.appendChild(getApi);

      cardContainer.appendChild(card);
    }
  }

  createCard(result);
});

// code for request url

let badgeNum = 0;
let ports = {};
let muted;
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
  muted = s?.muted || {};
  blocked = s?.blocked || {};
  extRuleIds = s?.extRuleIds || {};
  recycleRuleIds = s?.recycleRuleIds || [];
  maxRuleId = s?.maxRuleId || 1;
  allRuleIds = s?.allRuleIds || [1];
  blockedExtUrls = s?.blockedExtUrls || {};
  requests = s?.requests || {};
});

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

async function setupListener() {
  const hasPerm = await chrome.permissions.contains({
    permissions: ["declarativeNetRequestFeedback"],
  });
  if (!hasPerm) {
    return;
  }
  if (!chrome.declarativeNetRequest?.onRuleMatchedDebug) return;
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
    if (e.request.initiator?.startsWith("chrome-extension://")) {
      const k = e.request.initiator.replace("chrome-extension://", "");

      // console.log(k, "network request");

      // console.log("Network Request:", {
      //   extensionId: k,
      //   method: e.request.method,
      //   url: e.request.url,
      //   ruleId: e.rule.ruleId,
      // });

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

      if (!ports.popup && !muted?.[k]) {
        badgeNum += 1;
        // updateBadge();
      }
      //   d_notifyPopup();
    }
  });
}
setupListener();

async function getExtensions() {
  const extensions = {};
  const hasPerm = await chrome.permissions.contains({
    permissions: ["management"],
  });
  if (!hasPerm) return [];
  const extInfo = await chrome.management.getAll();
  for (let { enabled, name, id, icons } of extInfo) {
    extensions[id] = {
      name,
      id,
      numRequestsAllowed: 0,
      numRequestsBlocked: 0,
      reqUrls: {},
      icon: icons?.[icons?.length - 1]?.url,
      blocked: blocked[id],
      muted: muted[id],
      enabled,
      ...(requests[id] || {}),
    };
  }
  return extensions;
}

// code to block the extension

async function updateBlockedRules(extId, method, url) {
  if (!blocked[extId] && extId && url) {
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

    // d_notifyPopup();
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

async function unblockRules(extId, method, url) {
  if (!blocked[extId] && extId && url) {
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

    // d_notifyPopup();
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
          action: { type: "allow" },
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
