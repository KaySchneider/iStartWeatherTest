/**
 * Created by kay on 02.11.13.
 */
chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('tab.html', {
        bounds: {
            width:1200,
            height:600
        }
    });
});

//implement the simple iStart API to answer the question if we are an istart widget