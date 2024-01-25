chrome.management.getAll((result) => {
  // console.log(result);
  // console.log(result[0].id, "response result");
  // console.log(result[0]["icons"][0]["url"], "this is icon");
  const reload = document.getElementById("reload_btn");

  let reset = document.getElementById("reset");

  reset.addEventListener("click", () => {
    console.log("reset clicked");
    chrome.runtime.sendMessage({ popupMessage: "resetKaro" });
    window.close();
  });
  document.querySelector(".heading").addEventListener("click", () => {
    console.log("clicked on heading");
  });

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

      // code to uninstall the extension

      let uninstall = document.createElement("div");
      uninstall.id = "uninstall";
      uninstall.innerHTML = `<i class="fa fa-trash-o" id="uninstall_icon" style="color:red"></i>`;

      uninstall.addEventListener("click", () => {
        console.log("clicked");
        chrome.management.uninstall(data[i].id, (result) => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
          } else {
            console.log("Extension uninstalled successfully");
          }
        });
      });

      // card.appendChild(uninstall);

      card.appendChild(icon);

      const nameElement = document.createElement("h2");
      nameElement.textContent = data[i].shortName;
      nameElement.id = "nameElement";
      card.appendChild(nameElement);
      //   permission.createElement = "permission";

      const description_heading = document.createElement("h4");
      description_heading.textContent = "Description: ";
      description_heading.id = "description_heading";
      card.appendChild(description_heading);
      // console.log(data[i].permissions);
      const description = document.createElement("div");
      description.innerHTML = data[i].description;
      description.className = "description_content";
      card.appendChild(description);

      const idElement = document.createElement("p");
      idElement.id = "idElement";
      idElement.textContent = `ID: ${data[i].id}`;
      card.appendChild(idElement);

      //   creating deactivate button
      const id = data[i].id;

      const deactivate = document.createElement("button");

      deactivate.className = "deactivate_btn";

      chrome.management.get(id, (result) => {
        // console.log(result.enabled, "this is result.enabled");
        if (result.enabled == true) {
          deactivate.innerHTML = "Deactivate";

          chrome.storage.local.set({ extName: "on" });
        } else {
          deactivate.innerHTML = "Activate";
          chrome.storage.local.set({ extName: "off" });
        }
      });

      deactivate.addEventListener("click", () => {
        // console.log(result.extName);
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

      let reqData = document.createElement("div");

      reqData.className = "reqData";

      reqData.innerHTML = "";
      const getApi = document.createElement("button");
      getApi.id = "get_apis";
      getApi.innerHTML = "View Request";

      let close = document.createElement("button");
      close.innerHTML = "Close";
      close.id = "api_close";

      // logic for request number

      let networkNum = document.createElement("div");

      let btnDiv = document.createElement("div");
      btnDiv.className = "btnDiv";

      let networkIcon = document.createElement("i");
      networkIcon.innerHTML = `<i class="material-icons" style="font-size:28px;color:white;margin: 10px 10px 0 0;">wifi</i>`;

      let upperDiv = document.createElement("div");
      upperDiv.id = "upperDiv";
      let numofrequest = document.createElement("div");
      numofrequest.id = "numofrequest";

      getApi.addEventListener("click", () => {
        reqData.style.display = "block";

        const port = chrome.runtime.connect({ name: "popup" });

        port.onMessage.addListener((message) => {
          const receivedObject = message.data;
          const responseObject = receivedObject[id].reqUrls;
          reqData.innerHTML = "";

          const requrls = Object.keys(responseObject);
          console.log(requrls.length, "this is length");
          console.log(requrls, "this is url");

          const uniqueUrls = new Set();

          console.log("Final unique URLs:", Array.from(uniqueUrls));

          numofrequest.innerHTML = `Number of Request: ${requrls.length}`;

          requrls.forEach((element, index) => {
            // Create a container div to hold both networkIcon and urls
            const containerDiv = document.createElement("div");

            // Append networkIcon to the container
            containerDiv.appendChild(networkIcon.cloneNode(true));
            containerDiv.style.display = "flex";
            // Create a div for urls
            const urls = document.createElement("div");
            urls.innerHTML += element;
            urls.id = `url-${index}`;

            // Append urls to the container
            containerDiv.appendChild(urls);

            let blockedUrls = {};
            const parts = element.split(" ");
            const u = parts.slice(1).join(" ");
            const urlBeforeQuestionMark = u.split("?")[0];
            // console.log(urlBeforeQuestionMark, index);

            chrome.storage.local.get(["blockedExtUrls"]).then((result) => {
              if (
                result.blockedExtUrls &&
                typeof result.blockedExtUrls === "object"
              ) {
                blockedUrls = { ...result.blockedExtUrls };

                // console.log(blockedUrls[id], "blockedurls");

                const urlsthatisblocked = Object.keys(blockedUrls[id] || {});

                // console.log(urlsthatisblocked.length, urlsthatisblocked);

                if (urlsthatisblocked.includes(urlBeforeQuestionMark)) {
                  console.log("found");
                  urls.style.color = "red";
                } else {
                  urls.style.color = "green";
                }
              } else {
                console.log(
                  "blockedExtUrls is not an object or is undefined/null"
                );
              }
            });

            containerDiv.addEventListener("click", () => {
              const parts = element.split(" ");
              const method = parts[0];
              const apiUrl = parts.slice(1).join(" ");

              function blockunblock() {
                port.postMessage({
                  type: "toggleBlockExtUrl",
                  data: { extId: id, method, apiUrl },
                });
              }
              blockunblock();

              if (urls.style.color == "green") {
                urls.style.color = "red";
                chrome.notifications.create(
                  {
                    type: "basic",
                    iconUrl: "wifi.png",
                    title: "Api Manager has Blocked an API!",
                    message: `URL:${apiUrl}`,
                  }
                  // () => {}
                );
              } else if (urls.style.color == "red") {
                urls.style.color = "green";
                chrome.notifications.create(
                  {
                    type: "basic",
                    iconUrl: "wifi.png",
                    title: "Api Manager has Unblocked an API!",
                    message: `URL:${apiUrl}`,
                  }
                  // () => {}
                );
              } else {
                urls.style.color = "red";
                chrome.notifications.create(
                  {
                    type: "basic",
                    iconUrl: "wifi.png",
                    title: "Api Manager has Blocked an API!",
                    message: `URL:${apiUrl}`,
                  }
                  // () => {}
                );
              }
            });

            // Append the container div to reqData
            reqData.appendChild(containerDiv);
          });

          // code for close btn
          close.style.display = "block";
          close.addEventListener("click", () => {
            console.log("closed clicked");
            reqData.style.display = "none";
            close.style.display = "none";
          });
        });
      });

      btnDiv.appendChild(deactivate);
      btnDiv.appendChild(getApi);
      btnDiv.appendChild(uninstall);

      upperDiv.appendChild(numofrequest);
      upperDiv.appendChild(close);
      card.appendChild(upperDiv);

      card.appendChild(reqData);
      card.appendChild(btnDiv);

      cardContainer.appendChild(card);
    }
  }
  createCard(result);
});
