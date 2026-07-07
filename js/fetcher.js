export class Fetcher {
	constructor(baseUrl) {
		this._baseUrl = baseUrl;
	}
	fetchSource(pageName) {
		let pageSlug = this.cleanID(pageName);
		return fetch(this._baseUrl+pageSlug+'?do=export_raw', {
			mode: 'cors',
		}).then((response) => response.text());
	}

// 	fetchSource(pageName) {
// 		return fetch(this._baseUrl+pageName+'?do=edit', {
// 			mode: 'cors',
// 		}).then((response) => response.text()).then((text) => {
// 			var doc = new window.DOMParser().parseFromString(text, "text/xml");
// 			var el = doc.getElementById('wiki__text');
// 			if (!el) {
// 				throw new Error(`invalid page for ${pageName}`);
// 			}
// 			return el.textContent; // el.innerHTML would yield &lt;entities&gt; instead of <originalCharacters>
// 		});
// 	}

	fetchSources(pageNames, onPageFetched /*, onPageFailed*/){
		return Promise.all(pageNames.map(pageName => {
			return this.fetchSource(pageName).then(
				result => onPageFetched(result, pageName)
				//, onPageFailed
			);
		}))
	}
	
	cleanID(id) {
		const $conf_useslash = false; // $conf['useslash']
		const $conf_sepchar = '_';    // $conf['sepchar'];
		const $conf_deaccent = 1;     // $conf['deaccent']

		id = id.trim().toLowerCase()

		//alternative namespace seperator
		id = id.replace(/;/g, ':');
		if($conf_useslash){
			id = id.replace(/[/]/g, ':');
		}else{
			id = id.replace(/[/]/g, $conf_sepchar);
		}

	//	if($conf_deaccent == 2 ) id = \dokuwiki\Utf8\Clean::romanize(id);
		if($conf_deaccent) {
			id = id.normalize("NFD").replace(/\p{Diacritic}/gu, ""); // \dokuwiki\Utf8\Clean::deaccent(id,-1);
		}

		//remove specials
		//id = \dokuwiki\Utf8\Clean::stripspecials(id, $conf_sepchar, '\*');

		//clean up
		id = id.replace(/ /g, $conf_sepchar); // id = id.replace('#\\' + $conf_sepchar + '+#', $conf_sepchar);
		
		id = id.replace(/#:+#/g, ':');
		id = id.replace(/^[:._-]+/, '').replace(/[:._-]+$/, '');
		id = id.replace(/#:[:\._\-]+#/g, ':');
		id = id.replace(/#[:\._\-]+:#/g, ':');

		return id;
	}


}
