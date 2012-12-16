chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
       getOtherBookmarksChildren(function(other, otherID){
           if (other == null) {
               console.error("'Other Bookmarks' not found."); 
               return;
           }
           var folders = retrieveFolders(other, otherID);
           var folder = determineBestFolder(sender.tab, request, folders);
           if (folder == null){
               // Find the uncategorized folder and create bookmark there
               getUncategorizedFolder(other, otherID, function(uncategorized){
                   chrome.bookmarks.create({'parentId': uncategorized.id,
                         'title': sender.tab.title,
                         'url': sender.tab.url});
                   folder = uncategorized;
               });
           }else{
               chrome.bookmarks.create({'parentId': folder.id,
                  'title': sender.tab.title,
                  'url': sender.tab.url});
           }
           // At this point folder will be the folder containing the bookmark
           populateInterface(folder, folders, sender.tab);
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

function populateInterface(folder, otherFolders, page){
    var views = chrome.extension.getViews({type:"popup"});
    var title_input = views[0].document.getElementById("bookmark_title");
    title_input.value = page.title;
}

function determineBestFolder(page, folders){

}
