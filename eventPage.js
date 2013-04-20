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
                                'title': sender.tab.title || "",
                                'url': sender.tab.url}, function(bookmark) {
                             populateInterface(uncategorized.id, folders, bookmark);
                          });
                      });
                  }else{
                      getFolder(folderName, other, otherID, false, function(folder) {
                          chrome.bookmarks.create({'parentId': folder.id,
                             'title': sender.tab.title || "",
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
function retrieveFolders(nodes) {
    var folders = [];
    for (var nodeKey in nodes){
      var node = nodes[nodeKey];
      if (!node.hasOwnProperty("url"))
          folders.push(node);
    }
    return folders;
}

// Given a list of folder objects, returns one with a the given name
// If not found, and create is true, creates the folder under folder
// otherID
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
    // Odd results if folder name is all spaces
    folders = folders.filter(function(folder){
        if (folder.title.trim()) return true;
        return false;
    });

    folders.forEach(function(currentFolder){
        var regex = new RegExp("\\b"+currentFolder.title+"\\b","i");
        if (regex.test(page.title)){
           folder = currentFolder;
           return false;
        }
    });

    if (folder) {
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
        if (child.hasOwnProperty("url") && child.hasOwnProperty('title') && child.title.trim().length)
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
           callback(false, undefined);
           return;
     }
     if (!node.hasOwnProperty("url") && node.parentId == "0" && node.title == "Other Bookmarks"){
          // it is possible this was called on the "Other Bookmarks" itself, in which case the answer
          // is undefined
          if (typeof descendant === "undefined"){
              callback(false, undefined);
              return;
          }
          callback(node.title !== "Uncategorized" && descendant.trim(),  descendant || node.title);
          return;
     }
     chrome.bookmarks.get(node.parentId, function(results){
          findKlass(results[0], callback, node.title);
     });
};

function isKlassNode(node, callback){
     chrome.bookmarks.get(node.parentId, function(results){
         var parent = results[0];
         if (!node.hasOwnProperty("url") && parent.parentId == "0" && parentNode.title == "Other Bookmarks")
             callback(true);
         else
             callback(false);
     }
}


function trainFolder(klass, node, classifier, untrain) {
    var verb = untrain ?  'untrain' : 'train';
    function train(c){
        var index;
        for (index in getAllPagesInFolder(node){
               page = node[index];
               c[verb](page.title, klass);
        }
    }

    if (typeof classifier === "undefined") {
        chrome.storage.local.get({
            "feature_count":{},
            "klass_count":{},
            "cache":{}
        }, function(storage){
             var c = new NaiveBayesClassifier(storage);
             train(c);
             chrome.storage.local.set(c.to_object(), function(){
             });
        });
    }else{
        train(c);
    }
}

// Events
//
// On install, scan all bookmarks and train the classifier
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install"){
        var c = new NaiveBayesClassifier();
        getOtherBookmarksChildren(function(nodes, otherID){
           var topLevelFolders = retrieveFolders(nodes);
           topLevelFolders = topLevelFolders.filter(function(bookmark){
               if (bookmark.title.trim()) return true;
               return false;
           });
           for (var folderIndex in topLevelFolders){
               var klass = topLevelFolders[folderIndex].title;
               if (klass == "Uncategorized") continue;
               var pages = getAllPagesInFolder(topLevelFolders[folderIndex]);
               for (var pageIndex in pages){
                   if (pages[pageIndex].title.trim())
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
    if (bookmark.hasOwnProperty("url") && bookmark.title && bookmark.title.trim()) {
          findKlass(bookmark, function(train, klass){
                 if (train){
                       chrome.storage.local.get({
                           "feature_count":{},
                           "klass_count":{},
                           "cache" : {}
                       }, function(storage){
                          var c = new NaiveBayesClassifier(storage);
                          c.train(bookmark.title, klass);
                          var new_cache = c.to_object();
                          new_cache.cache[id] = bookmark.title.trim();
                          chrome.storage.local.set(c.to_object(), function(){});
                       });
                 }
          });
    }
});

// Bookmarks are created and moved often, need to make it possible to
// untrain and train on the new folder
chrome.bookmarks.onMoved.addListener(function(id, moveInfo) {
    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{}
    }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        chrome.bookmarks.get(id, function(bookmark) {
             // It moved, but does it matter?
             if (bookmark.parentId === moveInfo.oldParentId) true;
             // Is this a bookmark or a folder that was moved
             if (bookmark.hasOwnProperty("url")){
                  // can't train a bookmark with no title
                  if (!bookmark.title || !bookmark.title.trim()) return;
                  // untrain
                  findKlass(moveInfo.oldParentId, function(train, oldKlass){
                         if (train){
                               // Don't do anything for empty folder names
                               c.untrain(bookmark.title, oldKlass);
                         };
                         // train, this has to come last so we only need to save once
                         findKlass(moveInfo.newParentId, function(train, newKlass){
                                if (train){
                                      // Don't do anything for empty folder names
                                      c.train(bookmark.title, newKlass);
                                }
                                chrome.storage.local.set(c.to_object(), function(){});
                         });
                  });
             }else{
                 chrome.bookmarks.get([id, moveInfo.oldParentId], function(results]){
                     var node = results[0], 
                         oldParent = results[1],
                         wasAKlass = false,
                     if (oldParent.id === "0" && oldParent.title === "Other Bookmarks"){
                         wasAKlass = true;
                     }
                     findKlass(oldParent, function(untrain, oldKlass){
                         // if the node was a root node than we can't use its oldParent's klass
                         // as the old klass because it would have had no klass
                         if (wasAKlass)
                             oldKlass = node.title;
                         findKlass(node, function(train, newKlass){
                             // Note it really doesn't matter if we were or root node before or are one now
                             // As long as we get the old and new klass designations right, that will take
                             // care of itself
                             if (oldKlass === newKlass){
                                 // Either folder was outside "Other Bookmarks" folder and still is
                                 // or the klass did not change during the move
                                 return;
                             }
                             if (typeof oldKlass !== "undefined" && oldKlass !== "Uncategorized" && oldKlass.trim().length)
                                 trainFolder(node, oldKlass, c, true);
                             if (typeof newKlass !== "undefined" && newKlass !== "Uncategorized" && newKlass.trim().length)
                                 trainFolder(node, newKlass, c);
                         });
                     });
                });
             }
         });
    });
});



// If a bookmark title was changed, we have to untrain on its title and retrain
// If a top-level folder changes, we have to untrain change the name of its Klass 
// inside the klassifier
chrome.bookmarks.onChanged.addListener(function(id, changeInfo) {
    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{},
        "cache":{}
    }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        var old_title = storage.cache[id].title;
        if (old_title === changeInfo.title) return;
        if (changeInfo.hasOwnProperty("url")){
               // can't train a bookmark with no title
               find_klass(id, function(train, klass){
                   if (!train) return;
                   if (old_title && old_title.trim().length){
                       c.untrain(old_title, klass);
                   }
                   if (changeInfo.title && changeInfo.title.trim().length){
                       c.train(changeInfo.title, klass);
                   }
                   storage.cache[id].title = changeInfo.title.trim();
                   var new_storage = c.to_object();
                   new_storage.cache = storage.cache;
                   chrome.storage.local.set(new_storage, function(){});
               });
        } else {
            // This only matters if this folder is a klass folder
            chrome.bookmarks.get(id, function(results){
                isKlassNode(results[0], function(klassNode){
                    if (!klassNode) return;
                    node = results[0];
                    if (old_title === "Uncategorized" || old_title.trim().length === 0) {
                        // No retraining, things in an uncategorized folder do not get trained
                        if (changeInfo.title.trim().length)
                           trainFolder(node, changeInfo.title, c);
                    }else if (changeInfo.title === "Uncategorized" || old_title.trim().length === 0){
                        // Changed title to Uncategorized, just untrain on old folder
                        if (old_title.trim().length)
                           trainFolder(node, old_title, c, true);
                    }else{
                         c.renameKlass(old_title, changeInfo.title);
                    }
                    storage.cache[id].title = changeInfo.title;
                    var new_storage = c.to_object();
                    new_storage.cache = storage.cache;
                    chrome.storage.local.set(new_storage, function(){});
                });
            });
        }
    });
});
 //TODO
//What about importing
//What if they try to rename the uncategorized folder = just train on the new name
//What is happening if we train on a title that contains nothing but stop words
//A bookmark or folder is deleted
