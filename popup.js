chrome.management.getAll((result) => {
  console.log(result);
  console.log(result[0].id, "response result");
  console.log(result[0]["icons"][0]["url"], "this is icon");
  // const reload = document.createElement("div");

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

        // console.log("btn clicked");
      });

      card.appendChild(deactivate);

      // button to reload

      // const reload = document.createElement("div");
      // reload.className = "reload_btn";

      // reload.textContent = "Reload";

      cardContainer.appendChild(card);
    }
    // cardContainer.appendChild(reload);
  }
  createCard(result);
});
