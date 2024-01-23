chrome.management.getAll((result) => {
  console.log(result);
  // console.log(result[0].id, "response result");
  // console.log(result[0]["icons"][0]["url"], "this is icon");
  const reload = document.getElementById("reload_btn");

  reload.addEventListener("click", () => {
    // console.log("reload clicked");

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
            // console.error(chrome.runtime.lastError);
            return;
          }

          // console.log("Extension disabled successfully");

          // Enable the extension after a short delay
          setTimeout(function () {
            chrome.management.setEnabled(id, true, function () {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
              }

              // console.log("Extension re-enabled successfully");
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

      const description_heading = document.createElement("h4");
      description_heading.textContent = "Description: ";
      card.appendChild(description_heading);
      console.log(data[i].permissions);
      const description = document.createElement("div");
      description.innerHTML = data[i].description;
      description.className = "description_content";
      card.appendChild(description);

      const idElement = document.createElement("p");
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

      reqData.innerHTML = "data will shown here!";
      const getApi = document.createElement("button");
      getApi.id = "get_apis";
      getApi.innerHTML = "Get API's";

      // const urls = document.createElement("div");
      let close = document.createElement("button");
      close.innerHTML = "Close";
      close.id = "api_close";
      //   let searchBar=`<div class="search-container">
      //   <input type="text" id="searchInput" placeholder="Search...">
      //   <button id="searchButton">Search</button>
      // </div>`;

      // let searchDiv = document.createElement("div");
      // searchDiv.id = "searchDiv";

      // let searchInput = document.createElement("input");
      // searchInput.type = "text";
      // searchInput.id = "searchInput";

      // let searchBtn = document.createElement("button");
      // searchBtn.id = "searchBtn";
      // searchBtn.innerHTML = "Search";

      // let searchResults = document.createElement("div");
      // searchResults.innerHTML = " ";

      // searchDiv.appendChild(searchInput);
      // searchDiv.appendChild(searchBtn);

      getApi.addEventListener("click", () => {
        const port = chrome.runtime.connect({ name: "popup" });
        console.log("getapi clicked");
        port.onMessage.addListener((message) => {
          const receivedObject = message.data;
          const responseObject = receivedObject[id].reqUrls;
          reqData.innerHTML = "";
          const requrls = Object.keys(responseObject);
          console.log(typeof requrls, requrls, "requrls");
          requrls.forEach((element, index) => {
            const urls = document.createElement("div");
            urls.innerHTML += element;
            urls.id = `url-${index}`;

            let blockedUrls = {};
            const parts = element.split(" ");

            const u = parts.slice(1).join(" ");

            const urlBeforeQuestionMark = u.split("?")[0];
            console.log(urlBeforeQuestionMark, index); //this gives an string

            chrome.storage.local.get(["blockedExtUrls"]).then((result) => {
              if (
                result.blockedExtUrls &&
                typeof result.blockedExtUrls === "object"
              ) {
                blockedUrls = { ...result.blockedExtUrls };

                console.log(blockedUrls[id], "blockedurls");

                const urlsthatisblocked = Object.keys(blockedUrls[id] || {});

                console.log(urlsthatisblocked.length, urlsthatisblocked); ///this is an array that contain all blocked urls
                console.log(u, "this is from line 156");

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

            urls.addEventListener("click", () => {
              const parts = element.split(" ");

              // Extract the method and URL
              const method = parts[0]; // "POST"
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
              } else if (urls.style.color == "red") {
                urls.style.color = "green";
              } else {
                urls.style.color = "red";
              }
            });

            reqData.appendChild(urls);

            // searchInput.addEventListener("input", function () {
            //   console.log(searchInput.value);
            //   const searchTerm = searchInput.value.trim().toLowerCase();
            //   if (searchTerm !== "") {
            //     const matchingItems = requrls.filter((item) =>
            //       item.toLowerCase().includes(searchTerm)
            //     );
            //     displaySearchResults(matchingItems);
            //   } else {
            //     displaySearchResults([]);
            //   }
            // });

            // function displaySearchResults(results) {
            //   const resultsHTML =
            //     results.length > 0
            //       ? `<p>Search results:</p><ul>${results
            //           .map((item) => `<li>${item}</li>`)
            //           .join("")}</ul>`
            //       : "<p>No matching results found.</p>";

            //   searchResults.innerHTML = resultsHTML;
            //   console.log(resultsHTML);
            // }
          });

          close.style.display = "block";
          reqData.style.display = "block";

          close.addEventListener("click", () => {
            console.log("closed clicked");
            reqData.style.display = "none";
            close.style.display = "none";
          });

          // code for search btn
          // searchDiv.style.display = "block";
        });

        // code for close btn
      });
      // card.appendChild(searchDiv);
      // card.appendChild(searchResults);
      card.appendChild(reqData);
      card.appendChild(deactivate);
      card.appendChild(getApi);
      card.appendChild(close);
      cardContainer.appendChild(card);
    }
  }
  createCard(result);
});

// code to block extensions
