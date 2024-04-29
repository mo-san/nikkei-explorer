document.querySelectorAll(".color").forEach((elm) => {
  elm.addEventListener("click", (e) => {
    var options = {
      colorValue: e.target.style.backgroundColor,
      colorName: e.target.innerText
    }
    chrome.storage.sync.set(options);
    document.querySelector("#msg").innerText = `Set color to ${options.colorName}.`;
  });
});
