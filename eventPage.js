chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      getOtherBookmarksChildren(function(other, otherID){
          if (other == null) {
              console.error("'Other Bookmarks' not found."); 
              return;
          }
          var folders = retrieveFolders(other, otherID);
          var alreadyBookmarked = false;
          chrome.bookmarks.search(sender.tab.url, function(results){
              var bookmarkFolderID = null;
              results.forEach(function(bookmark){
                 if (bookmark.url == sender.tab.url){
                   alreadyBookmarked = true; 
                   bookmarkFolderID = bookmark.parentId;
                   return false;
                 }
              });
              if (alreadyBookmarked){
                  chrome.bookmarks.get(bookmarkFolderID, function(bookmarkFolder){
                     populateInterface(bookmarkFolder[0], folders, sender.tab); 
                  });
                  return;
              }
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
    var folder_input =  views[0].document.getElementById("bookmark_folders");
    title_input.value = page.title;
    otherFolders.forEach(function(currentFolder){
        var newOption = new Option(currentFolder.title, " ");
        newOption.selected = folder.id == currentFolder.id;
        folder_input.add(newOption, null);
    });
}

// For now just look for folder name in page title
function determineBestFolder(page, meta, folders){
    var folder = null;
    folders.forEach(function(currentFolder){
        if (page.title.toLowerCase().indexOf(currentFolder.title.toLowerCase()) != -1){
           folder = currentFolder;
           return false;
        }
    });
    return folder;
}
