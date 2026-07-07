
import {Fetcher} from './js/fetcher.js';
import {WikiCardParser, WikiPageListParser} from './js/parser.js';
import {SyntaxLatex, typesetCard} from './js/syntax/latex.js';




class PrintGenerator {
	constructor(options) {
		this._cfg = options;
		this.initForm();
	}
	initForm() {
		// populate checkbox list :
		this._cfg.options.forEach(config => {
			var optionEl = document.createElement('li');
			optionEl.innerHTML = `<input type="checkbox" name="deck" value="${config}"> ${config}`;
			this._cfg.selectEl.appendChild(optionEl);
		});
		// listen to tools:
		this._cfg.formEl.addEventListener('click', event => {
			var tool = event.target.dataset.tool;
			tool && this['tool_'+tool]();
		});
	}
	
// 	layoutCards(cardsFront, cardsBack, columns, rows, placeholder) {
// 		var rowsFront = [];
// 		var rowsBack = [];
// 		cardsBack = cardsBack.concat(Array(columns).fill('\\cardback{'+placeholder+'}')); // padding
// 		while (cardsFront.length) {
// 			rowsFront.push(cardsFront.splice(0, columns).join('%\n'));
// 			rowsBack.push(cardsBack.splice(0, columns).reverse().join(''));
// 		}
// 		var output = '';
// 		while (rowsFront.length) {
// 			output += rowsFront.splice(0, rows).join('\\\\%\n')
// 				+ '\\newpage'
// 				+ rowsBack.splice(0, rows).join('\\\\%\n')
// 				+ '\\newpage';
// 		}
// 		return output;
// 	}
	
	typesetCards(decks, selection) {
		var cardsFront = [];
		var cardsBack = [];
		selection.forEach(deckName => {
			if (!decks[deckName]) throw new Error('missing deck "'+deckName+'"');
//			var cards = new Generator(decks[deckName], config).getCardsList();
			// TODO
			var cards = decks[deckName].map(typesetCard);
			cardsFront = cardsFront.concat(cards);
			cardsBack = cardsBack.concat(new Array(cards.length).fill(`\\cardback{${deckName}}`));
		});
		return [cardsFront, cardsBack];
	}

	
	setAll(value) {
		this._cfg.selectEl.querySelectorAll('[type=checkbox]').forEach(checkbox => checkbox.checked = value);
	}
	getFilteredOptions() {
		return this._cfg.options.filter(deckName => this._cfg.selectEl.querySelector(`[type=checkbox][value="${deckName}"]`).checked);
	}

	tool_selectAll() {
		this.setAll(true);
	}
	tool_selectNone() {
		this.setAll(false);
	}
	tool_submit() {
		var cardsFront, cardsBack;
		var selection = this.getFilteredOptions();

		[cardsFront, cardsBack] = this.typesetCards(this._cfg.decks, selection);
		var output = cardsFront.join("\n");
// 		var output = this.layoutCards(cardsFront, cardsBack, 5, 2, 'PlaceholderMedium');
		this._cfg.resultEl.value = output;
	}
	
	
}


+async function(lang){
	var fetcher = new Fetcher('http://lt.izar.cz/');
	var parser = new WikiCardParser({
		syntax: new SyntaxLatex(),
	});

	var config = {'cs': {
		"neutralni_postavy": {deck: "Character", class: "Neutral"}, // Translates to "LongNeutral" or "ShortNeutral" in syntax/latex.js
		"elfove":            {deck: "Character", class: "Elf"},
		"skreti":            {deck: "Character", class: "Orc"},
		"trpaslici":         {deck: "Character", class: "Dwarf"},
		"nemrtvi":           {deck: "Character", class: "Undead"},
		"magicke_karty":     {deck: "Sorcery"},
		"svate_karty":       {deck: "Divine"},
		"bojove_karty":      {deck: "Combat"},
	}, 'en': {
		"en:neutralni_postavy": {deck: "Character", class: "Neutral"}, // Translates to "LongNeutral" or "ShortNeutral" in syntax/latex.js
		"en:elfove":            {deck: "Character", class: "Elf"},
		"en:skreti":            {deck: "Character", class: "Orc"},
		"en:trpaslici":         {deck: "Character", class: "Dwarf"},
		"en:nemrtvi":           {deck: "Character", class: "Undead"},
		"en:magicke_karty":     {deck: "Sorcery"},
		"en:svate_karty":       {deck: "Divine"},
		"en:bojove_karty":      {deck: "Combat"},
	}}[lang];
	const importantSections = {
		'cs': ["Postavy", "Události", "Vybavení", "Okouzlení", "Kouzla"],
		'en': ["Characters", "Events", "Equipment", "Enchantment", "Spells"],
	}[lang];

	await fetcher.fetchSources(Object.keys(config), (text, pageName) => {
		const namespace = pageName.split(':').slice(0,-1).join(':') + ':';
		var data = new WikiPageListParser(text, {namespace}).parse().result

		var defaults = config[pageName];
		var links = [];
		// collect links from the important sections
		// we might be able to deduce "class" from the non-"Postavy" sections, but we need to be able to deduce it from the card data anyway (for "Olafuv Stit" at least)
		for (var section of importantSections) {
			if (section in data) {
				links.push(...data[section]);
			}
		}
		return fetcher.fetchSources(links, (text, pageName) => parser.parseCards(text, {pageName, ...defaults}))
	});

	var decks = parser.getDecks();
	console.log(decks);

	var controller = new PrintGenerator({
		options: Object.keys(decks),
		decks: decks,
		resultEl: document.getElementById('latex'),
		formEl: document.querySelector('.col-setting'),
		selectEl: document.querySelector('.col-setting ul'),
	});
	
	controller.tool_selectAll();
	controller.tool_submit();
}(new URLSearchParams(window.location.search).get('lang') || 'cs');



