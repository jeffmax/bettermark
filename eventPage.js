chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      getOtherBookmarksChildren(function(other, otherID){
          if (other == null) {
              console.error("'Other Bookmarks' not found."); 
              return;
          }
          var folders = retrieveFolders(other, otherID);
          var alreadyBookmarked = false;
          var bookmark = null;
          var bookmarkFolderID = null;
          chrome.bookmarks.search(sender.tab.url, function(results){
              results.forEach(function(currentBookmark){
                 if (currentBookmark.url == sender.tab.url){
                   alreadyBookmarked = true; 
                   bookmarkFolderID = currentBookmark.parentId;
                   bookmark = currentBookmark;
                   return false;
                 }
              });
              if (alreadyBookmarked){
                     populateInterface(bookmarkFolderID, folders, bookmark);
                  return;
              }
              var folder = determineBestFolder(sender.tab, request, folders);
              if (folder == null){
                  // Find the uncategorized folder and create bookmark there
                  getUncategorizedFolder(other, otherID, function(uncategorized){
                      chrome.bookmarks.create({'parentId': uncategorized.id,
                            'title': sender.tab.title || "No title",
                            'url': sender.tab.url}, function(bookmark) {
                         populateInterface(uncategorized.id, folders, bookmark);
                      });
                  });
              }else{
                  chrome.bookmarks.create({'parentId': folder.id,
                     'title': sender.tab.title,
                     'url': sender.tab.url}, function(bookmark) {
                     populateInterface(folder.id, folders, bookmark);
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

function populateInterface(folderID, otherFolders, bookmark){
    var views = chrome.extension.getViews({type:"popup"});
    var pop_doc = views[0].document;
    var title_input = pop_doc.getElementById("bookmark_title");
    var folder_input =  pop_doc.getElementById("bookmark_folders");
    title_input.value = bookmark.title;
    
    title_input.addEventListener("keyup", function(event) {
        chrome.bookmarks.update(bookmark.id, {title: title_input.value}, function(){});
    });
    
    chrome.bookmarks.getRecent(2, function(bookmarks){
        if (bookmarks.length > 0)
            if ((bookmarks[0].url === bookmark.url) && (bookmarks.length > 1))
                id = bookmarks[1].parentId
            else
                id = bookmarks[0].parentId
        else
            id = null
        var cache_option;
        otherFolders.forEach(function(currentFolder){
            var newOption = new Option(currentFolder.title, currentFolder.id);
            newOption.selected = (folderID == currentFolder.id);
            if (currentFolder.id == id) {
                newOption.className = "last";
                cache_option = newOption;
            }
            folder_input.add(newOption, null);
        });
        pop_doc.getElementById("remove").addEventListener("click", function(){
            chrome.bookmarks.remove(bookmark.id);
            window.close();
        }, false);
        // Setup move to last used folder option 
        var last_folder = pop_doc.getElementById("last_folder");
        last_folder.addEventListener("click", function(){
            if (cache_option != null){
               chrome.bookmarks.move(bookmark.id, {parentId:id},function(){
                    cache_option.selected = true; 
               });
            }else{
               //TODO notify user of error somehow 
            }
        });
        // Setup change handler
        folder_input.addEventListener("change", function(event) {
           chrome.bookmarks.move(bookmark.id, {parentId: folder_input.selectedOptions[0].value}, function(){});
        });
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
