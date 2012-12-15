chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
       console.log(request);
       console.log(sender);
       getOtherBookmarksChildren(function(other, otherID){
           if (other == null) {
               console.error("'Other Bookmarks' not found."); 
               return;
           }
           var folders = retrieveFolders(other, otherID);
           var folder = determineBestFolder(request, folders);
           getUncategorizedFolder(other, otherID, function(uncategorized){
              console.log(uncategorized);
           });
       });
});

function getOtherBookmarksChildren(callback) {
    chrome.bookmarks.getTree(function(results){
        var title = "Other Bookmarks";
        var topLevel = results[0].children;
        for (var nodeKey in topLevel){
           var node = topLevel[nodeKey];
           if (node.title == title)
              return callback(node.children, node.id);
        }
        return callback(null, null);
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

function getUncategorizedFolder(folders, otherID, callback){
    for (var folderKey in folders){
        var folder = folders[folderKey];
        if (folder.title == "Uncategorized")
            return callback(folder);
    }
    // Create uncategorized folder
    chrome.bookmarks.create({'parentId': otherID, 'title': 'Uncategorized'},
        function(uncategorizedFolder) {
            callback(uncategorizedFolder); 
        }
    );
}

function determineBestFolder(page, folders){

}
