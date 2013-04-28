chrome.extension.onMessage.addListener(
    function(request, sender, sendResponse) {
      getTopLevelBookmarkNode("Other Bookmarks", function(otherNode){
          if (other === null) {
              console.error("'Other Bookmarks' not found."); 
              return;
          }
          var other = otherNode.children, otherID = otherNode.id;
          var flattenedFolders = retrieveFlatFolderNames(otherNode);
          var folders = onlyFolders(other);
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
                  populateInterface(bookmarkFolderID, flattenedFolders, bookmark);
                  return;
              }
              var folder = determineBestFolder(sender.tab, request, folders, function(folderName){
                  if (folderName == "Uncategorized"){
                      // Find the uncategorized folder and create bookmark there
                      getFolder(folderName, other, otherID, true, function(uncategorized){
                          chrome.bookmarks.create({'parentId': uncategorized.id,
                                'title': sender.tab.title || "",
                                'url': sender.tab.url}, function(bookmark) {
                             populateInterface(uncategorized.id, flattenedFolders, bookmark);
                          });
                      });
                  }else{
                      getFolder(folderName, other, otherID, false, function(folder) {
                          chrome.bookmarks.create({'parentId': folder.id,
                             'title': sender.tab.title || "",
                             'url': sender.tab.url}, function(bookmark) {
                             populateInterface(folder.id, flattenedFolders, bookmark);
                          });
                      });
                  }
              });
          });
     });
});

// Given a string and a length, return the string at that length or shorter broken at the last
// full word
function trimDocument(dokument, length){
    var d, i;
    if (!dokument)
        return dokument;
    if (dokument && dokument.length <= length)
        return dokument;

    d = dokument.substring(0, length);
    if (/\W/.test(dokument[length]) || /\W/.test(dokument[length-1])){
        return d;
    }

    d = d.split(/\W/);
    if (d.length === 1){
        return d[0];
    }
    i =  d.slice(0, d.length-1).join(" ").length;
    return dokument.substring(0, i);
}

// Convenience function to create string from a response object that 
// contains a title, meta and description string
function createDocument(title, response){
    if (response.description.length)
       return trimDocument(title + " " + response.description + " " + response.meta, 250);
    return trimDocument(title + " " + response.meta, 250);
}


// Repeat string function from http://stackoverflow.com/questions/202605/repeat-string-javascript
function repeat(pattern, count) {
    if (count < 1) return '';
    var result = '';
    while (count > 0) {
        if (count & 1) result += pattern;
        count >>= 1, pattern += pattern;
    }
    return result;
}

// Given a node, retrieve all children folders in a flat list
// with optional leading spaces to express depth
function retrieveFlatFolderNames(folder, indent, depth){
    if (typeof indent === "undefined")
        indent = unescape("  ".replace(/ /g, "%A0"));
    if (typeof depth === "undefined")
        depth = 0;

    var folders = [];
    for (var childIndex in folder.children){
        var child = folder.children[childIndex];
        if (!child.hasOwnProperty("url")) {
          child.indentedTitle = repeat(indent, depth) + child.title;
          folders.push(child);
          folders = folders.concat(retrieveFlatFolderNames(child, indent, depth+1));
        }
    }
    return folders;
}

// find a toplevel bookmark with a given name 
function getTopLevelBookmarkNode(name, callback){
    chrome.bookmarks.getTree(function(results){
        var topLevel = results[0].children, nodeKey;
        for (nodeKey in topLevel){
           var node = topLevel[nodeKey];
           if (node.title == name)
              return callback(node);
        }
        return callback(null);
    });
}

// Given a list of bookmark nodes, return those that are folders (not actual bookmarks)
function onlyFolders(nodes) {
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
        if (folder.title.trim() === name.trim())
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
        // We couldn't find the folder, this should not happen, but 
        // if it does, get the uncategorized folder
        getFolder("Uncategorized", folders, otherId, true, callback);
    }
}

function populateInterface(folderID, otherFolders, bookmark){
    var views = chrome.extension.getViews({type:"popup"});
    var pop_doc = views[0].document;
    var title_input = pop_doc.getElementById("bookmark_title");
    var folder_input =  pop_doc.getElementById("bookmark_folders");
    var chevron = pop_doc.getElementById("expand");
    var create_folder_btn = pop_doc.getElementById("create_folder");
    var create_folder_txt = pop_doc.getElementById("folder_name");

    chevron.addEventListener("click", function(event) { 
        if (chevron.className === "icon-chevron-right"){
            chevron.className = "icon-chevron-down";
            create_folder_btn.style.display = "block";
            create_folder_txt.style.display = "block";
        }else{
            chevron.className = "icon-chevron-right";
            create_folder_btn.style.display = "none";
            create_folder_txt.style.display = "none";
        }
    });
    
    create_folder_btn.addEventListener("click", function(){
        var folder_name = create_folder_txt.value;
        if (folder_name.trim().length)
        {
            chrome.bookmarks.create({title:folder_name.trim()}, function(node){
                chrome.bookmarks.move(bookmark.id, {parentId:node.id});
                window.close();
            });
        } 
    });

    title_input.value = bookmark.title;
    
    title_input.addEventListener("keyup", function(event) {
        chrome.bookmarks.update(bookmark.id, {title: title_input.value}, function(){});
    });
    
    chrome.bookmarks.getRecent(2, function(bookmarks){
        if (bookmarks.length > 0)
            if ((bookmarks[0].url === bookmark.url) && (bookmarks.length > 1))
                id = bookmarks[1].parentId;
            else
                id = bookmarks[0].parentId;
        else
            id = null;
        var cache_option;
        otherFolders.forEach(function(currentFolder){
            var newOption = new Option(currentFolder.indentedTitle, currentFolder.id);
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
            if (cache_option !== null){
               chrome.bookmarks.move(bookmark.id, {parentId:id},function(){
                    cache_option.selected = true; 
               });
            }
        });
        // Setup change handler
        folder_input.addEventListener("change", function(event) {
           chrome.bookmarks.move(bookmark.id, {parentId: folder_input.selectedOptions[0].value}, function(){});
        });
    });
}

function determineBestFolder(page, resp, folders, callback){
    if (!page.title || page.title.trim().length === 0){
        callback("Uncategorized");
        return;
    }
    // First check to see if the title of the page contains
    // the name of the folder
    var folder = null;
    // Odd results if folder name is all spaces
    folders = folders.filter(function(folder){
        if (folder.title.trim()) return true;
        callback("Uncategorized");
        return;
    });

    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{}
    }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        callback(c.classify(createDocument(page.title.toLowerCase(), resp)));
    });
}

// Given a top level folder, return all descendants
// children that are not folders
function getAllPagesInFolder(folder){
    var pages = [];
    for (var childIndex in folder.children){
        var child = folder.children[childIndex];
        if (child.hasOwnProperty("url") && child.hasOwnProperty('title') && child.title.trim().length)
          pages.push(child);
        else
          pages = pages.concat(getAllPagesInFolder(child));
    }
    return pages;
}


// Given a return all descendant 
// children that are folders
function getAllFoldersInFolder(folder){
    var folders = [];
    for (var childIndex in folder.children){
        var child = folder.children[childIndex];
        if (!child.hasOwnProperty("url"))
          folders.push(child);
        else
          folders = folders.concat(getAllFoldersInFolder(child));
    }
    return folders;
}
// Given a bookmark, navigate up the tree to find its highest
// parent folder immediately below "Other Bookmarks"
function findKlass(node, callback, descendant) {
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
          callback(descendant.title !== "Uncategorized" && descendant.title.trim().length,
                   descendant.title.trim(), descendant.id);
          return;
     }
     chrome.bookmarks.get(node.parentId, function(results){
          findKlass(results[0], callback, node);
     });
}

function isKlassNode(node, callback){
     chrome.bookmarks.get(node.parentId, function(results){
         var parent = results[0];
         if (!node.hasOwnProperty("url") && parent.parentId == "0" && parentNode.title == "Other Bookmarks")
             callback(true);
         else
             callback(false);
     });
}


function trainFolder(node, klass, classifier, cache,  untrain) {
    var verb = untrain ?  'untrain' : 'train';
    cache = cache ? cache : {};
    function train(c, cache){
        var pages = getAllPagesInFolder(node), index;
        for (index in pages){
               page = pages[index];
               c[verb](page.title, klass);
        }
        var folders = getAllFoldersInFolder(node);
        folders.push(node);
        for (index in folders){
            folder = folders[index];
            cache[folder.id] =  folder.title.trim();
        }
    }

    if (typeof classifier === "undefined" || typeof cache === "undefiend") {
        chrome.storage.local.get({
            "feature_count":{},
            "klass_count":{},
            "cache":{}
        }, function(storage){
             var c = new NaiveBayesClassifier(storage);
             train(c, storage.cache);
             var save = c.to_object();
             save.cache = cache;
             // Since we aren't monitoring for folder creation
             // whenever we train on a klass we need to cache its name
             save.cache[node.id] = klass;
             chrome.storage.local.set(save, function(){});
        });
    }else{
        train(classifier, cache);
        cache[node.id] = klass;
    }
}

// Events
//
// On install, scan all bookmarks and train the classifier
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == "install"){
        var c = new NaiveBayesClassifier(),
        cache = {};
        getTopLevelBookmarkNode("Other Bookmarks", function(node){
           var nodes = node.children;
           var topLevelFolders = onlyFolders(nodes);
           topLevelFolders = topLevelFolders.filter(function(bookmark){
               if (bookmark.title.trim()) return true;
               return false;
           });
           for (var folderIndex in topLevelFolders){
               var klass = topLevelFolders[folderIndex].title;
               if (klass === "Uncategorized") continue;
               var folder = topLevelFolders[folderIndex];
               trainFolder(folder, klass, c, cache);
           }
           var save = c.to_object();
           save.cache = cache;
           chrome.storage.local.set(save, function(){
           });
        });
    }
});

// Helper function taking a classifier, document, and class
// Trains on the document and saves the state to local disk
function trainHelper(dokument, klass, klass_id) {
     chrome.storage.local.get({
         "feature_count":{},
         "klass_count":{},
         "cache" : {}
     }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        // We don't look for folder creation so make sure this 
        // klass has been cached.
        storage.cache[klass_id] = klass;
        c.train(dokument, klass);
        var save = c.to_object();
        save.cache = storage.cache;
        chrome.storage.local.set(save, function(){});
     });
}

// On bookmark created, determine its root parent
// if it is "Other Bookmarks", train on the folder
// determine if a bookmark was created or just a folder 
chrome.bookmarks.onCreated.addListener(function(id, bookmark) {
    if (bookmark.hasOwnProperty("url") && bookmark.title && bookmark.title.trim()) {
        findKlass(bookmark, function(train, klass, klass_id){
             if (train){
                  // If possible (the user just hit the star button on a 
                  // live page) we would like to train on the meta data
                  // associated with the page as well (not just the title)
                  chrome.tabs.query({url:bookmark.url}, function(tabs){
                      if (tabs.length){
                         var tab_id = tabs[0].id;
                         chrome.tabs.sendMessage(tab_id,{}, function(response){
                             // Now we have the additional info about the page
                             var dokument = createDocument(bookmark.title.toLowerCase(),  response);
                             trainHelper(dokument, klass, klass_id);
                         });
                      }else{
                          trainHelper(bookmark.title.toLowerCase(), klass, klass_id);
                      }
                  });
             }
        });
    }
 });

// The api doesn't tell us the children of nodes that were deleted
// would have to track this ourself. This does not seem worth it.
// If the root folder is deleted, we will remove the class
chrome.bookmarks.onRemoved.addListener(function(id, removeInfo) {
    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{},
        "cache" : {}
    }, function(storage){
        chrome.bookmarks.get(removeInfo.parentId, function(parentNode){
            var cache = storage.cache;
            var c = new NaiveBayesClassifier(storage);
            if (cache[id]){
                var title = cache[id];
                delete cache[id];
                // If it's a class folder, remove the class from the classifier
                if (parentNode.parentId === "0" && parentNode.title === "Other Bookmarks"){
                    c.delete_klass(title);
                }
                var save = c.to_object();
                save.cache = cache;
                chrome.storage.local.set(save, function(){});
            }
        });
      });
});

// Bookmarks are created and moved often, need to make it possible to
// untrain and train on the new folder
chrome.bookmarks.onMoved.addListener(function(id, moveInfo) {
    chrome.storage.local.get({
        "feature_count": {},
        "klass_count": {},
        "cache": {}
    }, function(storage){
        var c = new NaiveBayesClassifier(storage);
        chrome.bookmarks.get(id, function(bookmark) {
             // It moved, but does it matter?
             if (bookmark.parentId === moveInfo.oldParentId) return;
             // Is this a bookmark or a folder that was moved
             if (bookmark.hasOwnProperty("url")) {
                  // can't train a bookmark with no title
                  if (!bookmark.title || !bookmark.title.trim()) return;
                  // untrain
                  findKlass(moveInfo.oldParentId, function(train, oldKlass){
                         if (train){
                              // If we had trained on meta too we aren't tracking it
                              // so we can't fully untrain on this, but we can do our best
                              // TODO this may be bad because we are reversing some of the features
                              // but fully decrementing the document count for this class
                              c.untrain(bookmark.title, oldKlass);
                         }
                         // train, this has to come last so we only need to save once
                         findKlass(moveInfo.newParentId, function(train, newKlass){
                              if (train){
                                    // Don't do anything for empty folder names
                                    c.train(bookmark.title, newKlass);
                              }
                              chrome.storage.local.set(c.to_object(), function(){});
                         });
                  });
             } else {
                 chrome.bookmarks.get([id, moveInfo.oldParentId], function(results){
                     var node = results[0], 
                         oldParent = results[1],
                         wasAKlass = false;
                     if (oldParent.parentId === "0" && oldParent.title === "Other Bookmarks"){
                         wasAKlass = true;
                     }
                     findKlass(oldParent, function(untrain, oldKlass){
                         // if the node was a root node than we can't use its oldParent's klass
                         // as the old klass because it would have had no klass
                         if (wasAKlass)
                             oldKlass = node.title;
                         findKlass(node, function(train, newKlass){
                             // Note it really doesn't matter if we were a root node before or are one now
                             // As long as we get the old and new klass designations right, that will take
                             // care of itself
                             if (oldKlass === newKlass){
                                 // Either folder was outside "Other Bookmarks" folder and still is
                                 // or the klass did not change during the move
                                 return;
                             }
                             // if this was a folder that was moved from outside "Other bookmarks"
                             // we need to cache it's title, because that may not have happened previously
                             if (typeof oldKlass === "undefined")
                                 cache[id] = node.title;
                             if (typeof oldKlass !== "undefined" && oldKlass !== "Uncategorized" && oldKlass.trim().length)
                                 c.delete_class(oldKlass);
                             if (typeof newKlass !== "undefined" && newKlass !== "Uncategorized" && newKlass.trim().length){
                                 trainFolder(node, newKlass, c, storage.cache);
                             }
                             var save = c.to_object();
                             save.cache = storage.cache;
                             chrome.storage.local.set(save, function(){});
                         });
                     });
                });
             }
         });
    });
});



// If a bookmark folder title was changed, update its cache
// If a top-level folder changes, we have to untrain change the name of its Klass 
// inside the klassifier
chrome.bookmarks.onChanged.addListener(function(id, changeInfo) {
    chrome.storage.local.get({
        "feature_count":{},
        "klass_count":{},
        "cache":{}
    }, function(storage){
        if (!c.hasOwnProperty('title')) {
            var c = new NaiveBayesClassifier(storage);
            // We may not have the old title cached here if they created a root 
            // folder, never added any children, and renamed it 
            var old_title = storage.cache[id] || "";
            if (old_title === changeInfo.title) return;
            // This only matters if this folder is a klass folder
            chrome.bookmarks.get(id, function(results){
                isKlassNode(results[0], function(klassNode){
                    if (!klassNode) return;
                    node = results[0];
                    if (old_title === "Uncategorized" || old_title.trim().length === 0) {
                        // No untraining, things in an uncategorized never got trained
                        if (changeInfo.title.trim().length)
                           trainFolder(node, changeInfo.title, c, storage.cache);
                    }else if (changeInfo.title === "Uncategorized" || changeInfo.title.trim().length === 0){
                        // Changed title to Uncategorized, just untrain on old folder
                        if (old_title.trim().length)
                           trainFolder(node, old_title, c, storage.cache, true);
                    }else{
                         c.rename_class(old_title, changeInfo.title);
                    }
                    storage.cache[id] = changeInfo.title;
                    var save = c.to_object();
                    save.cache = storage.cache;
                    chrome.storage.local.set(save, function(){});
                });
            });
        }
    });
});
