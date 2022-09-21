var version = 'v2.0.24:';

// from https://gist.github.com/frontenddeveloping/e7dc48bc82bccf37cd8e

var offlineFundamentals = [
    '/',
    'jerios.png',
    'mc_cursor.png',
    'curselogo.png',
    'github-mark-120px-plus_orig',
    'main_dark_ing.png',
    '/offline/'
];

//Add core website files to cache during serviceworker installation
var updateStaticCache = function() {
    return caches.open(version + 'fundamentals').then(function(cache) {
        return Promise.all(offlineFundamentals.map(function(value) {
            var request = new Request(value);
            var url = new URL(request.url);
            if (url.origin != location.origin) {
                request = new Request(value, {mode: 'no-cors'});
            }
            return fetch(request).then(function(response) {
                var cachedCopy = response.clone();
                return cache.put(request, cachedCopy);
            });
        }))
    })
};

//Clear caches with a different version number
var clearOldCaches = function() {
    return caches.keys().then(function(keys) {
            return Promise.all(
                      keys
                        .filter(function (key) {
                              return key.indexOf(version) != 0;
                        })
                        .map(function (key) {
                              return caches.delete(key);
                        })
                );
        })
}

/*
    limits the cache
    If cache has more than maxItems then it removes the first item in the cache
*/
var limitCache = function(cache, maxItems) {
    cache.keys().then(function(items) {
        if (items.length > maxItems) {
            cache.delete(items[0]);
        }
    })
}


//When the service worker is first added to a computer
self.addEventListener("install", function(event) {
    event.waitUntil(updateStaticCache())
})

//Service worker handles networking
self.addEventListener("fetch", function(event) {

    //Fetch from network and cache
    var fetchFromNetwork = function(response) {
        var cacheCopy = response.clone();
        if (event.request.headers.get('Accept').indexOf('text/html') != -1) {
            caches.open(version + 'pages').then(function(cache) {
                cache.put(event.request, cacheCopy).then(function() {
                    limitCache(cache, 25);
                })
            });
        } else if (event.request.headers.get('Accept').indexOf('image') != -1) {
            caches.open(version + 'images').then(function(cache) {
                cache.put(event.request, cacheCopy).then(function() {
                    limitCache(cache, 10);
                });
            });
        } else {
            caches.open(version + 'assets').then(function add(cache) {
                cache.put(event.request, cacheCopy);
            });
        }

        return response;
    }

    //Fetch from network failed
    var fallback = function() {
        if (event.request.headers.get('Accept').indexOf('text/html') != -1) {
            return caches.match(event.request).then(function (response) { 
                return response || caches.match('/offline/');
            })
        } else if (event.request.headers.get('Accept').indexOf('image') != -1) {
            return new Response('<svg width="400" height="300" role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><path fill="#D8D8D8" d="M0 0h400v300H0z"/><text fill="#9B9B9B" font-family="Helvetica Neue,Arial,Helvetica,sans-serif" font-size="72" font-weight="bold"><tspan x="93" y="172">offline</tspan></text></g></svg>', { headers: { 'Content-Type': 'image/svg+xml' }});
        }
    }

    //This service worker won't touch non-get requests
    if (event.request.method != 'GET') {
        return;
    }

    //For HTML requests, look for file in network, then cache if network fails.
    if (event.request.headers.get('Accept').indexOf('text/html') != -1) {
            event.respondWith(fetch(event.request).then(fetchFromNetwork, fallback));
        return;
        }

    //For non-HTML requests, look for file in cache, then network if no cache exists.
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request).then(fetchFromNetwork, fallback);
        })
    )
});

//After the install event
self.addEventListener("activate", function(event) {
    event.waitUntil(clearOldCaches())
});