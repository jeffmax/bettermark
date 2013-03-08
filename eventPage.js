chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      getOtherBookmarksChildren(function(other, otherID){
          if (other == null) {
              console.error("'Other Bookmarks' not found."); 
              return;
          }
          var folders = retrieveFolders(other);
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
              var folder = determineBestFolder(sender.tab, request, folders, function(folderName){
                  if (folderName == "Uncategorized"){
                      // Find the uncategorized folder and create bookmark there
                      getFolder(folderName, other, otherID, true, function(uncategorized){
                          chrome.bookmarks.create({'parentId': uncategorized.id,
                                'title': sender.tab.title || "No title",
                                'url': sender.tab.url}, function(bookmark) {
                             populateInterface(uncategorized.id, folders, bookmark);
                          });
                      });
                  }else{
                      getFolder(folderName, other, otherID, false, function(folder) {
                          chrome.bookmarks.create({'parentId': folder.id,
                             'title': sender.tab.title,
                             'url': sender.tab.url}, function(bookmark) {
                             populateInterface(folder.id, folders, bookmark);
                          });
                      });
                  }
              });
          });
     });
});

// Return everything in the "Other bookmarks" folder
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


// Given a list of bookmark nodes, return those that are folders (not actual bookmarks)
function retrieveFolders(folder) {
    var folders = [];
    for (var nodeKey in folder){
      var node = folder[nodeKey];
      if (!node.hasOwnProperty("url"))
          folders.push(node);
    }
    return folders;
}

function getFolder(name, folders, otherID, create, callback){
    for (var folderKey in folders){
        var folder = folders[folderKey];
        if (folder.title == name)
            return callback(folder);
    }
    if (create){
        // Create uncategorized folder
        chrome.bookmarks.create({'parentId': otherID, 'title': name},
            function(folder) {
                callback(folder); 
            }
        );
    }else{
        callback(null);
    }
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

function determineBestFolder(page, meta, folders, callback){
    
    // First check to see if the title of the page contains
    // the name of the folder
    var folder = null;
    folders.forEach(function(currentFolder){
        var regex = new RegExp("\\b"+currentFolder.title+"\\b","i");
        if (regex.test(page.title)){
           folder = currentFolder;
           return false;
        }
    });

    if (folder) {
        console.log(folder.title);
        callback(folder.title);
        return;
    }
    
    // If first guess failed, try the bayes classifier
    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{}
    }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        callback(c.classify(page.title));
    });
}

// Given a top level folder, return all descendant 
// children that are not folders
function getAllPagesInFolder(folder){
    var pages = []
    for (var childIndex in folder.children){
        var child = folder.children[childIndex];
        if (child.hasOwnProperty("url"))
          pages.push(child);
        else
          pages.concat(getAllPagesInFolder(child));
    }
    return pages;
}


// Given a bookmark, navigate up the tree to find its highest
// parent folder immediately below "Other Bookmarks"

function findKlass(node, callback, descendant){
     if (!node.hasOwnProperty("parentId")){
           callback(false);
           return;
     }
     // not sure if other bookmarks doesn't have a parentid or not, it might
     if (!node.hasOwnProperty("url") && node.parentId=="0" && node.title == "Other Bookmarks"){
          callback(true, descendant); 
          return;
     }
     chrome.bookmarks.get(node.parentId, function(results){
          findKlass(results[0], callback, node.title);
     });
};


// Events 
//
// On install, scan all bookmarks and train the classifier
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install"){
        var c = new NaiveBayesClassifier();
        getOtherBookmarksChildren(function(nodes, otherID){
           var topLevelFolders = retrieveFolders(nodes);
           for (var folderIndex in topLevelFolders){
               var klass = topLevelFolders[folderIndex].title;
               if (klass == "Uncategorized") continue;
               var pages = getAllPagesInFolder(topLevelFolders[folderIndex]);
               for (var pageIndex in pages){
                   c.train(pages[pageIndex].title, klass);
               }
           }
           chrome.storage.local.set(c.to_object(), function(){
           });
        });
    }
});

// On bookmark created, determine its root parent
// if it is "Other Bookmarks", train on the folder
chrome.bookmarks.onCreated.addListener(function(id, bookmark) {
    // determine if a bookmark was created or just a folder 
    if (bookmark.hasOwnProperty("url")) {
          findKlass(bookmark, function(train, klass){
                 if (klass == "Uncategorized") return;
                 if (train){
                       chrome.storage.local.get({
                           "feature_count":{},
                           "klass_count":{}
                       }, function(storage){
                          var c = new NaiveBayesClassifier(storage);
                          c.train(bookmark.title, klass);
                          chrome.storage.local.set(c.to_object(), function(){});
                       });
                 }
          });
    }
});
//TODO
//move? train and save
//What about importing
