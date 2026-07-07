// import {DeckTemplate, CardTemplate, Tags, PATH_SEPARATOR} from './base.js';


export class Syntax {
	fromDokuwiki(text) {
		return text.replace(/\{\*(.*?)\*\}/g, ''); //  {*comments*}
	}
	block(tag, text) {
		return text;
	}
}


/**
 * generic parser of dokuwiki pages
 * override on* methods to define behavior 
 */ 
class WikiPageParser {
	constructor(rawText, options){
		this._lines = rawText.split('\n');
		this._nextLine = 0;
		this._cfg = options || {};

		this.syntax = this._cfg.syntax || new Syntax();
		this.namespace = this._cfg.namespace || '';
		if (!(this.syntax instanceof Syntax)) { throw new Error('invalid syntax'); }
	}

	parse(){
		var line;
		while (null !== (line = this.nextLine())) {
			this.parseTopLevel(line);
		}
		return this;
	}

	parseTopLevel(/*current*/line) {
		var match;
		if (match = line.match(/^(={2,6}) +(.*) +=+ *$/)) { // heading
			var headingLevel = 7 - match[1].length; // 1 == <H1>...
			var heading = match[2];
			this.onHeading(headingLevel, heading);
		} else if (match = line.match(/^(  +)[\*-] /)) { // list item
			var listItemLevel = Math.floor(match[1].length/2);
			this.onBeforeListItem(listItemLevel); // note that there is a new item, before executing readPar
			this.onListItem(listItemLevel, this.readPar(line.substring(match[0].length)));
		} else if (match = line.match(/^[|^]/)) {
			this.onBeforeTableRow();
			// TODO table parsing?
			this.onTopLevelPar(this.readPar(line));
		} else {
			this.onBeforeTopLevelPar();
			this.onTopLevelPar(this.readPar(line));
		}
	}

	readPar(currentLine) {
		var match = currentLine.match(/<([a-zA-Z]+)(?: +([^>]*))?>/)
		if (!match) {
			return this.dokuwikiToSyntax(currentLine); // no block, only replace dokuwiki markup
		}
		var tagName = match[1];
		if (tagName == "WRAP") {
			// TODO FIXME: proces other tags on the line
			return this.dokuwikiToSyntax(currentLine); // ignore WRAP blocks, replace dokuwiki markup inside
		}
		var tagParams = match[2];
		var before = currentLine.substring(0, match.index);
		var line = currentLine.substring(match.index + match[0].length);
		var contents = '';
		var startTag = match[0];
		var endTag = '</'+tagName+'>';
		var endTagPosition;
		while (-1 === (endTagPosition = line.search(endTag))) {
			if (contents.length) {
				contents += "\n";
			}
			contents += line;
			line = this.nextLine();
			if (line === null) {
				// TODO
				console.error('cannot find end of block', tagName);
				throw new Error('cannot find end of block ' + tagName);
			}
		}
		contents += line.substring(0,endTagPosition); //
		var after = line.substring(endTagPosition + endTag.length);

		// TODO: do not discard this information
		return this.dokuwikiToSyntax(before)    // text preceeding block, with dokuwiki markup replaced
			+ this.blockToSyntax(tagName, tagParams, contents) // block converted to html
			+ this.readPar(after);       // process the rest
	}
	nextLine(){
		if (this._lines.length > this._nextLine) {
			return this._lines[this._nextLine++];
		}
		return null;
	}

	/**
	 * process parsed block and return its html, if applicable
	 */
	blockToSyntax(tag, tagParams, text) {
		if ('code' === tag) {
			return this.onCode(text);
		} else {
			return this.onBlock(tag, text, tagParams);
		}
	}

	/**
	 * converts inline dokuwiki markup into HTML
	 */
	dokuwikiToSyntax(text){
		text = text.replace(/\{:([^{}:]+):([^{}]*):\}/g, (match, tagName, tagValue) => {
			return this.onTag(tagName, tagValue);
		}).replace(/\[{2}([^\[\]]*[:#>])?([^\[\]|:#>]+)(?:\|([^\[\]|:#>]+))?\]{2}/g, (match, targetPrefix, target, text) => {
			if (targetPrefix === undefined) targetPrefix = this.namespace;
			return this.onHyperlink(text||target, targetPrefix + target);
		});
		return this.syntax.fromDokuwiki(text);
	}

	onHeading(level, text) {}
	onBeforeListItem(level) {}
	onBeforeTableRow() {}
	onListItem(level, text) {}
	onBeforeTopLevelPar() {}
	onTopLevelPar(text) {}
	onHyperlink(linkText, linkTrget) {
		return linkText; // [[links]] to plaintext
	}
	onCode(text) {
		return '';
	}
	onBlock(tag, text, tagParams) {
		// TODO do more than dokuwikiToSyntax (replace also lists)
		return this.syntax.block(tag, this.dokuwikiToSyntax(text));
	}
	onTag(tagName, tagValue) {
		return '';
	}
}
/**
 * parser generating deck- and card- templates.
 */ 
class WikiPageCardParser extends WikiPageParser {
	constructor(rawText, options){
		super(rawText, options);
		this.cards = [];
		this.subparser = Object.create(this, {
			onBlock:  { value: this.onCardSubBlock },
			nextLine: { value: null },
		});
	}

	onHeading(level, text) {
		if (level === 1) {
			this.mainHeading = text;
		}
	}

	onBlock(tag, text, tagParams) { // parse <card>...</card> tags
		if ('card' === tag) {
			if (tagParams && (-1 !== tagParams.search("historic"))) {
				//this card should be ignored
				return
			}
			this.currentCard = Object.create(null);
			this.currentCard.name = this.mainHeading; // use page main heading as default name
			this.currentCard.deck = this._cfg.defaults.deck;   // use configured default deck
			this.subparser.readPar(text);

			if (! this.currentCard.class) {
				this.currentCard.class = this._guessClass(this.currentCard, this._cfg.defaults.class);
			}
			this.cards.push(this.currentCard);
			this.currentCard = undefined;
		} else {
			return super.onBlock(tag, text);
		}
	}
	onCardSubBlock(tag, text) {
		this.currentCard[tag] = this.dokuwikiToSyntax(text);
	}
	getCards() {
		return this.cards;
	}
	
	_guessClass(card, defaultClass) {
		if (card.type) {
			var mapping = {
				"událost": "Event",
				"vybavení": "Equipment",
				"okouzlení": "Enchantment",
				"kouzlo": "Spell",
			}
			var type = card.type.toLowerCase();
			for (const [expectedType, correspondingClass] of Object.entries(mapping)) {
				// expectedType is the czech type label, correspondingClass is the english one. check both.
				if (type.includes(expectedType) || type.includes(correspondingClass.toLowerCase())) return correspondingClass;
			}
		}
		if (defaultClass) return defaultClass;
		console.error("cannot deduce class for card", card);
		throw new Error(`cannot deduce class for card ${card.name} (type=${card.type})`);
	}
}

export class WikiCardParser {
	constructor(options){
		this._cfg = options || {};
		if (!this._cfg.syntax instanceof Syntax) {throw new Error('invalid syntax');}
		this.decks = Object.create(null);
	}
	parseCards(rawText, defaults) {
		defaults || (defaults = {});

		var cardParser = new WikiPageCardParser(rawText, {
			defaults: defaults,
			syntax: this._cfg.syntax,
		});
		cardParser.parse();
		let firstCard = true;
		for (var card of cardParser.getCards()) {
			if (firstCard) {
				card.imageName = defaults.pageName.replace(/.*:/,'')
				firstCard = false;
			} else {
				card.imageName = card.name;
			}
			console.log(card);
			if (card.deck in this.decks) {
				this.decks[card.deck].push(card);
			} else {
				this.decks[card.deck] = [card];
			}
		}
		return this;
	}
	getDecks() {
		// sort decks and cards within decks to make the output deterministic
		for (var deckName in this.decks) {
			this.decks[deckName].sort(
				(cardA,cardB) => cardA.class.localeCompare(cardB.class) || cardA.name.localeCompare(cardB.name)
			);
		}
		const sortedDecks = Object.create(null);
		for (let deckName of Object.keys(this.decks).sort()) {
			sortedDecks[deckName] = this.decks[deckName];
		}
		return sortedDecks;
	}
}



/**
 * parser for parsing lists of links.
 */ 
export class WikiPageListParser extends WikiPageParser {
	constructor(rawText, options) {
		// TODO: make WikiPageParser Syntax-unaware
		super(rawText, {...options, syntax: new Syntax()});
		this.result = {};
		this.currentSection = null;
	}
	onHeading(level, text) {
		this.currentSection = this._cfg.key
			? this._cfg.key(text)
			: text;
	}
	onBeforeTableRow() {
		this.acceptLink = true;
	}
	onBeforeListItem(level) {
		if (1 === level) {
			this.acceptLink = true;
		} else {
			this.acceptLink = false;
		}
	}
	onBeforeTopLevelPar() {
		this.acceptLink = false;
	}
	onHyperlink(linkText, linkTarget) {
		if(this.acceptLink && this.currentSection) {
			(this.result[this.currentSection] || (this.result[this.currentSection] = [])).push(linkTarget);
			this.acceptLink = false;
		}
		return linkText;
	}
}

