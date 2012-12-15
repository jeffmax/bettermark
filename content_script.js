var metaTags = document.getElementsByTagName("meta");
var response = {};

for (var metaKey in metaTags){
    var metaTag = metaTags[metaKey];
    if (metaTag.name && metaTag.name.toLowerCase() == "description"){
        response.description = metaTag.content.toLowerCase().split(" ");
    }
    if (metaTag.name && metaTag.name.toLowerCase() == "keywords"){
        response.keywords = metaTag.content.toLowerCase().split(",");
        for (keywordKey in response.keywords)
            response.keywords[keywordKey] = response.keywords[keywordKey].trim()
    }
}

chrome.extension.sendMessage(response, function(response) {
});
