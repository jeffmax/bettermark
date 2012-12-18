chrome.tabs.executeScript(null, {file: "content_script.js"});
document.getElementById("done").addEventListener("click", function(){window.close()}, false);
