//alert("attempt to register listener...");
var bkg = chrome.extension.getBackgroundPage();
bkg.console.log("attempt to register listener...");
chrome.webRequest.onCompleted.addListener(
    function (details) {
        console.log(JSON.stringify(details));
    },
    {
        urls: [
            //"<all_urls>"
            "*://*.forgeofempires.com/*"
        ]
    },
);

// "permissions": [
//     "<all_urls>","webRequest","webRequestBlocking"
// ],
// "background": {
//     "scripts": ["reqListener.js"],
//     "persistent": true
//   }


