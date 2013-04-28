!function(){
    var metaTags = document.getElementsByTagName("meta"),
        response = {}, metaKey, metaTag, keywordKey;
    
    for (metaKey in metaTags){
        metaTag = metaTags[metaKey];
        if (metaTag.name && metaTag.name.toLowerCase() == "description"){
            response.description = metaTag.content.toLowerCase();
        }
        if (metaTag.name && metaTag.name.toLowerCase() == "keywords"){
            response.keywords = metaTag.content.toLowerCase();
        }
    }
    
    chrome.runtime.sendMessage(response, function(response) {
    });
    
    // Also responde with this message
    chrome.runtime.onMessage.addListener(function(request, sender, callback){
        callback(response);
    });
}();
