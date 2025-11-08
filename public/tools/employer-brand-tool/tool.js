
    {
        "imports": {
            "@wix/sdk": "https://cdn.jsdelivr.net/npm/@wix/sdk@1.17.1/+esm",
            "@wix/data": "https://cdn.jsdelivr.net/npm/@wix/data@1.0.306/+esm",
            "@wix/media": "https://cdn.jsdelivr.net/npm/@wix/media@1.0.195/+esm"
        }
    }
    

        function toggleBackgroundControls() {
            const controls = document.getElementById('backgroundControls');
            const header = controls.previousElementSibling;
            const icon = header.querySelector('.padding-toggle-icon');
            
            if (controls.classList.contains('expanded')) {
                controls.classList.remove('expanded');
                icon.classList.remove('expanded');
                icon.textContent = '▼';
            } else {
                controls.classList.add('expanded');
                icon.classList.add('expanded');
                icon.textContent = '▲';
            }
        }
        
        function toggleMainTextControls() {
            const controls = document.getElementById('mainTextControls');
            const header = controls.previousElementSibling;
            const icon = header.querySelector('.padding-toggle-icon');
            
            if (controls.classList.contains('expanded')) {
                controls.classList.remove('expanded');
                icon.classList.remove('expanded');
                icon.textContent = '▼';
            } else {
                controls.classList.add('expanded');
                icon.classList.add('expanded');
                icon.textContent = '▲';
            }
        }
    

	// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
		(function () {
			function refreshCSS() {
				var sheets = [].slice.call(document.getElementsByTagName("link"));
				var head = document.getElementsByTagName("head")[0];
				for (var i = 0; i < sheets.length; ++i) {
					var elem = sheets[i];
					var parent = elem.parentElement || head;
					parent.removeChild(elem);
					var rel = elem.rel;
					if (elem.href && typeof rel != "string" || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
						var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '');
						elem.href = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cacheOverride=' + (new Date().valueOf());
					}
					parent.appendChild(elem);
				}
			}
			var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
			var address = protocol + window.location.host + window.location.pathname + '/ws';
			var socket = new WebSocket(address);
			socket.onmessage = function (msg) {
				if (msg.data == 'reload') window.location.reload();
				else if (msg.data == 'refreshcss') refreshCSS();
			};
			if (sessionStorage && !sessionStorage.getItem('IsThisFirstTime_Log_From_LiveServer')) {
				console.log('Live reload enabled.');
				sessionStorage.setItem('IsThisFirstTime_Log_From_LiveServer', true);
			}
		})();
	}
	else {
		console.error('Upgrade your browser. This Browser is NOT supported WebSocket for Live-Reloading.');
	}
	// ]]>
