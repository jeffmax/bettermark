console.log("sending message to extension");
chrome.extension.sendMessage({title: document.title}, function(response) {
});
