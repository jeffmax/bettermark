chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      getOtherBookmarksChildren(function(other, otherID){
          if (other == null) {
              console.error("'Other Bookmarks' not found."); 
              return;
          }
          var folders = retrieveFolders(other, otherID);
          var alreadyBookmarked = false;
          var bookmarkID = null;
          var bookmarkFolderID = null;
          chrome.bookmarks.search(sender.tab.url, function(results){
              results.forEach(function(bookmark){
                 if (bookmark.url == sender.tab.url){
                   alreadyBookmarked = true; 
                   bookmarkFolderID = bookmark.parentId;
                   bookmarkID = bookmark.id;
                   return false;
                 }
              });
              if (alreadyBookmarked){
                     populateInterface(bookmarkFolderID, folders, sender.tab, bookmarkID);
                  return;
              }
              var folder = determineBestFolder(sender.tab, request, folders);
              if (folder == null){
                  // Find the uncategorized folder and create bookmark there
                  getUncategorizedFolder(other, otherID, function(uncategorized){
                      chrome.bookmarks.create({'parentId': uncategorized.id,
                            'title': sender.tab.title || "No title",
                            'url': sender.tab.url}, function(bookmark) {
                         populateInterface(uncategorized.id, folders, sender.tab, bookmark.id);
                      });
                  });
              }else{
                  chrome.bookmarks.create({'parentId': folder.id,
                     'title': sender.tab.title,
                     'url': sender.tab.url}, function(bookmark) {
                     populateInterface(folder.id, folders, sender.tab, bookmark.id);
                  });
              }
              // At this point folder will be the folder containing the bookmark
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

function populateInterface(folderID, otherFolders, page, bookmarkID){
    var views = chrome.extension.getViews({type:"popup"});
    var pop_doc = views[0].document;
    var title_input = pop_doc.getElementById("bookmark_title");
    var folder_input =  pop_doc.getElementById("bookmark_folders");
    title_input.value = page.title;
    chrome.bookmarks.getRecent(1, function(bookmarks){
        if (bookmarks.length > 0)
            id = bookmarks[0].parentId
        else
            id = null
        otherFolders.forEach(function(currentFolder){
            var newOption = new Option(currentFolder.title, currentFolder.id);
            newOption.selected = (folderID == currentFolder.id);
            if (currentFolder.id == id) newOption.className = "last";
            folder_input.add(newOption, null);
        });
        pop_doc.getElementById("remove").addEventListener("click", function(){
            chrome.bookmarks.remove(bookmarkID);
            window.close();
        }, false);
    });
}

// For now just look for folder name in page title
function determineBestFolder(page, meta, folders){
    var folder = null;
    folders.forEach(function(currentFolder){
        var regex = new RegExp("\\b"+currentFolder.title+"\\b","i");
        if (regex.test(page.title)){
           folder = currentFolder;
           return false;
        }
    });
    return folder;
}
