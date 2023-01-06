(function () {
'use strict';

function GET(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    if (xhr.status != 200) {
      console.warn('Unexpected status code ' + xhr.status + ' for ' + url);
      return false;
    }
    callback(xhr.response);
  };
  xhr.send();
}

var utils = {
  GET
}

// var videoUrl = 'http://tbfliving.alicdn.com/mediaplatform/ce3456e6-1916-48dc-b4cf-c1d9204c4a2e_2.m3u8';
var videoUrl = 'http://tbflive.alicdn.com/mediaplatform/2db999ae-fec9-4116-a8bc-2eec48a06af8_daren360.flv?auth_key=1495860334-0-0-fbb17e291504c234cd990974d82bd63f';
var ms = new MediaSource();
var video = document.getElementById('video');
video.src = window.URL.createObjectURL(ms);
ms.addEventListener('sourceopen', onMediaSourceOpen);

function onMediaSourceOpen() {
	utils.GET(videoUrl, function(data) {
			debugger;
	});
}

}());
//# sourceMappingURL=flv.js.map
