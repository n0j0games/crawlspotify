//const redirect_uri = "http://localhost:63342/crawlspotify/index.html";
const redirect_uri = "https://crawlspotify.netlify.app/index.html"
const client_id = "d1cc5a453d334f8f968e03fb6ba1be00";
const client_secret = "ef56b93808c24a91bda1f2ee35b78c85";
const authorize = "https://accounts.spotify.com/authorize";
const TOKEN = "https://accounts.spotify.com/api/token";
let access_token = "";
let refresh_token = "";

/*----------------------------------------------------------------------------------------------------------------------
MAIN
----------------------------------------------------------------------------------------------------------------------*/

window.onPageLoad = function (){
    const location = window.location.href.split("?")[0];
    if (location !== redirect_uri) {
        console.log("wrong uri", location, redirect_uri);
        return;
    }

    //document.getElementById("app").style.display = 'none';
    if ( window.location.search.length > 0 ){
        handleRedirect();
    } else {
        access_token = localStorage.getItem("access_token");
        if ( access_token == null ){
            // we don't have an access token so present token section
            document.getElementById("authorize").style.display = 'block';
            document.getElementById("app").style.display = 'none';
        }
        else {
            // present app section
            document.getElementById("app").style.display = 'block';
            document.getElementById("authorize").style.display = 'none';
        }
    }
}

/*----------------------------------------------------------------------------------------------------------------------
SPOTIFY-API
----------------------------------------------------------------------------------------------------------------------*/

const collectionDiv = document.getElementById("collection");
const featDiv = document.getElementById("collectionFeat");
const variousDiv = document.getElementById("collectionsVarious");
const counterP = document.getElementById("counter");
const artistP = document.getElementById("artistInfo");
let songlist = [];
let albumlist = [];
let counter = 0;
let counterWithVarious = 0;

window.findArtist = function () {
    const input = document.getElementById("search").value;
    if (input === "")
        return;
    const string = input.replaceAll(" ","%20");
    const search = `https://api.spotify.com/v1/search?type=artist&q=${string}`;
    callApi("GET", search, null, handleSearch);
}

function handleSearch() {
    if ( this.status === 200 ){
        let data = JSON.parse(this.responseText).artists;
        console.log(data);
        if (data.total == 0) {
            artistInfo.innerHTML = "No artist found";
            return;
        }
        const artist = data.items[0];
        artistInfo.innerHTML = `Searching for <a href="${artist.external_urls.spotify}">${artist.name}</a>`;
        artist_id = artist.id;
        artist_name = artist.name;
        initGetArtists();
    } else if ( this.status === 401 ){
        refreshToken();
    } else {
        console.error(this.responseText);
    }
}

function initGetArtists() {
    counter = 0;
    counterWithVarious = 0;
    songlist = [];
    albumlist = [];
    /*const html = `<tr>
                <th></th>
                <th>Main Artist</th>
                <th>Name</th>
                <th>Album Type</th>
                <th>Date</th>
            </tr>
            `;
    const feathtml = `<tr>
                <th></th>
                <th>Main Artist</th>
                <th>Name</th>
                <th>Date</th>
            </tr>
            `;*/
    collectionDiv.innerHTML = ``;
    featDiv.innerHTML = ``;
    //variousDiv.innerHTML = html;
    getArtistsSongs(0);
}

let artist_id = "";
let artist_name = "";

window.getArtistsSongs = function(offset) {
    const artist = `https://api.spotify.com/v1/artists/${artist_id}/albums?limit=50&offset=${offset}`;
    callApi("GET", artist, null, handleAlbums);
}

function handleAlbums() {
    if ( this.status === 200 ){
        let data = JSON.parse(this.responseText);
        console.log(data);
        let items = data.items;
        for (let item in items) {
            if (albumlist.includes(items[item].name))
                continue;
            albumlist.push(items[item].name);
            const content = `<tr>
                <th><img src="${items[item].images[0].url}" alt=""></th>
                <th><p class="artist">${items[item].artists[0].name}</p></th>
                <th><b><a class="name" target="_blank" href="${items[item].external_urls.spotify}">${items[item].name}</a></b></th>
                <th><p class="album">${items[item].album_type}</p></th>
                <th><p class="date">${items[item].release_date}</p></th>
                </th>`;

            const featcontent = `<tr>
                <th><img src="${items[item].images[0].url}" alt=""></th>
                <th><p class="artist">${items[item].artists[0].name}</p></th>
                <th><b><a class="name" target="_blank" href="${items[item].external_urls.spotify}">${items[item].name}</a></b></th>
                <th><p class="date">${items[item].release_date}</p></th>
                </th>`;

            if (/*items[item].artists[0].name === "Verschiedene Interpreten" ||*/ items[item].album_type === "compilation") {
                //variousDiv.innerHTML += content;
                counterWithVarious++;
                continue;
            }
            counter++;
            //counterP.innerHTML = `Found: ${counter} albums/singles, and ${counterWithVarious} compilations: `;
            counterP.innerHTML = `Found: ${counter} items`;
            if (items[item].album_group === "appears_on") {
                /*if (items[item].album_type === "album") {

                } else {
                    featDiv.innerHTML += featcontent;
                }*/
                console.log(items[item].name)
                getAlbumTracks(items[item]);
            } else {
                collectionDiv.innerHTML += content;
            }
        }
        if (data.total > data.offset + data.limit) {
            getArtistsSongs(data.offset + data.limit);
        }
    } else if ( this.status === 401 ){
        refreshToken();
    } else {
        console.error(this.responseText);
    }
}

function getAlbumTracks(albumInfo) {
    const album = `https://api.spotify.com/v1/albums/${albumInfo.id}/tracks?limit=50`;
    callApi("GET", album, null, function () {
        if ( this.status === 200 ){
            let data = JSON.parse(this.responseText);
            console.log("album:", data);
            let items = data.items;
            for (let item in items) {
                let artists = items[item].artists
                let hasArtist = false
                for (let artist in artists) {
                    if (artists[artist].name == artist_name)
                        hasArtist = true
                }
                if (!hasArtist)
                    continue;

                const content = `<tr>
                <th><img src="${albumInfo.images[0].url}" alt=""></th>
                <th><p class="artist">${items[item].artists[0].name}</p></th>
                <th>
                    <div class="featInfo">
                        <a class="name" target="_blank" href="${items[item].external_urls.spotify}">${items[item].name}</a>
                        <p class="album">${albumInfo.name}</p>
                    </div>
                </th>
                <th><p class="date">${albumInfo.release_date}</p></th>
                </th>`;
                featDiv.innerHTML += content;
            }
            if (data.total > data.offset + data.limit) {
                getArtistsSongs(data.offset + data.limit);
            }

        } else if ( this.status === 401 ){
            refreshToken();
        } else {
            console.error(this.responseText);
        }
    });
}

/*
    Authorization & Login Section
 */

function handleRedirect() {
    let code = getCode();
    fetchAccessToken( code );
    window.history.pushState("", "", redirect_uri); // remove param from url
}

function fetchAccessToken( code ){
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&client_id=" + client_id;
    body += "&client_secret=" + client_secret;
    callAuthorizationApi(body);
}

function refreshToken() {
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&client_id=" + client_id;
    callAuthorizationApi(body);
}

function callAuthorizationApi(body){
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ":" + client_secret));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

function handleAuthorizationResponse(){
    if ( this.status === 200 ) {
        let data = JSON.parse(this.responseText);
        if ( data.access_token !== undefined ){
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if ( data.refresh_token  !== undefined ){
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        location.reload();
    } else {
        console.error(this.responseText);
        console.log(this.status, this.responseText);
        logout();
    }
}

function getCode() {
    let code = null;
    const queryString = window.location.search;
    if ( queryString.length > 0 ){
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}

//Authorize user to app
window.requestAuthorization = function (){
    let url = authorize;
    url += "?client_id=" + client_id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-follow-read user-read-private playlist-modify-public";
    //url += "&scope=user-follow-read user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    window.location.href = url; // Show Spotify's authorization screen
}

window.logout = function () {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    location.reload();
}

/*
    Create Playlist
 */

window.createPlaylist = function () {
    console.log(collectionDiv,featDiv)
    let featJSON = []
    for (let i = 0, row; row = featDiv.rows[i]; i++) {
        for (let j = 0, col; col = row.cells[j]; j++) {
            console.log(featDiv[row][col].toString())
        }
    }

}

/*
    Spotify Api Call Function
 */

function callApi(method, url, body, callback){
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}