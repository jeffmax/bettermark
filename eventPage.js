chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
       console.log(request);
       console.log(sender);
       getOtherBookmarksChildren(function(other){
           if (other == null) {
               console.error("'Other Bookmarks' not found."); 
               return;
           }
           var folders = retrieveFolders(other);
           var folder = determineBestFolder(request, folders);
       });
});

function getOtherBookmarksChildren(callback) {
    chrome.bookmarks.getTree(function(results){
        var title = "Other Bookmarks";
        var topLevel = results[0].children;
        for (var nodeKey in topLevel){
           var node = topLevel[nodeKey];
           if (node.title == title)
              return callback(node.children);
        }
        return callback(null);
     });
}

function retrieveFolders(folder) {
    var folders = [];
    for (var nodeKey in folder){
      var node = folder[nodeKey];
      if (!node.hasOwnProperty("url"))
          folders.push(node);
    }
    return folders;
}

function getUncategorizedFolder(folders){

}

function determineBestFolder(page, folders){
  return "Folder";
}
