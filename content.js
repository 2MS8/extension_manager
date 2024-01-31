// console.log("this is content js!");

chrome.runtime.sendMessage(
  {
    type: "analytics",
  },
  (response) => {
    if (response && response.details) {
      fn_accordian();
    }
  }
);

function fn_accordian() {
  const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
  const MEASUREMENT_ID = `G-GEZVMSL1HL`;
  const API_SECRET = `kFBU-1fVRQeXnpGPFBQUYA`;
  const DEFAULT_ENGAGEMENT_TIME_IN_MSEC = 100;

  async function getOrCreateClientId() {
    const result = await chrome.storage.local.get("clientId");
    let clientId = result.clientId;
    if (!clientId) {
      clientId = self.crypto.randomUUID();
      await chrome.storage.local.set({ clientId });
    }
    return clientId;
  }

  const SESSION_EXPIRATION_IN_MIN = 30;

  async function getOrCreateSessionId() {
    let { sessionData } = await chrome.storage.session.get("sessionData");

    const currentTimeInMs = Date.now();
    if (sessionData && sessionData.timestamp) {
      const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000;

      if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
        sessionData = null;
      } else {
        sessionData.timestamp = currentTimeInMs;
        await chrome.storage.session.set({ sessionData });
      }
    }
    if (!sessionData) {
      sessionData = {
        session_id: currentTimeInMs.toString(),
        timestamp: currentTimeInMs.toString(),
      };
      await chrome.storage.session.set({ sessionData });
    }
    return sessionData.session_id;
  }

  async function otheranalytics() {
    fetch(
      `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
      {
        method: "POST",
        body: JSON.stringify({
          // client_id: await getOrCreateSessionId(),
          client_id: await getOrCreateClientId(),
          events: [
            {
              name: "button_clicked",
              params: {
                session_id: await getOrCreateSessionId(),
                engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
                id: "my-button",
              },
            },
          ],
        }),
      }
    );
  }
  otheranalytics();
  console.log("Analytics Working");
}

function getDeviceType() {
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;

  if (screenWidth < 768) {
    return "Mobile";
  } else if (screenWidth < 1024) {
    return "Tablet";
  } else {
    return "Desktop";
  }
}

const deviceType = getDeviceType();
console.log("Device Type:", deviceType);

chrome.runtime.sendMessage({ variable: deviceType }, (response) => {
  console.log("Response from background script:", response);
});
