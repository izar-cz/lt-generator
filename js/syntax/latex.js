// import {DeckTemplate, CardTemplate, Tags} from './base.js';
import {Syntax} from '../parser.js';


function getIcon(name) {
	return `((${name}))`;
}
function capitalize(text) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export class SyntaxLatex extends Syntax {
	fromDokuwiki(text) {
		return super.fromDokuwiki(text)
			.replace(/([&{}_%#])/g, "\\$1")
			// dokuwiki
			.replace(/\*{2}(.*?)\*{2}/g, '{\\bf $1}') //  **bold**
			.replace(/\/{2}(.*?)\/{2}/g, '{\\it $1}') //  //italics//
// 			.replace(/[\\]{2}/g, '\\\\')
// 			.replace(/--/g, "&ndash;")
			.replace(/×/g, '$\\times$')
			.replace(/\.\.\./g, '\\textellipsis{}')
			.replace(/"([^"]+)"/g, '\\uv{$1}')
			.replace(/\\\{\(([^{}\(\)]+)\)\\\}/g, (match, mark) => this.renderMark(mark)); // this is already 'escaped'
	}
	block(tag, text) {
		return `\\begin{${tag}}${text}\\end{${tag}}`;
	}
	renderMark(mark) {
		return getIcon(mark);
	}
	static typesetCard(card) {
		return card.deck === 'location'
			? new LocationCardGenerator(card).typeset()
			: new CardGenerator(card).typeset();
	}
}

const NEWLINE = '\\cardNewline';
class CardGenerator {
	constructor(card, options) {
		this.card = card;
	}
	imageName(card) {
		return card.imageName
			.normalize('NFD').replace(/[\u0300-\u036f]/g, "")  // remove diacritics
			.toLowerCase().replace(/[^a-z]+/g, "_");           // convert to snake_case
	}
	typeset() {
		var cardClass = this.card.class;
		if ('Neutral' === cardClass) {
			cardClass = (
				(this.card.ability.length + this.card.goal.length) > 125
				? 'Short'
				: 'Long'
			) + cardClass
			console.log("choose layout:", this.card.name, (this.card.ability.length + this.card.goal.length), " -> ", cardClass)
		} else if ('Equipment' === cardClass) {
			const t = this.card.type.toLowerCase()
			if (t.startsWith('cursed') || t.startsWith('proklet')) cardClass = 'EquipmentCursed'
		}

		var result = [`\\begin{card}{${this.card.deck}}{${cardClass}}{${this.imageName(this.card)}}`]
		result.push(`\\cardName{${this.card.name}}`);
		if (this.card.race) {
			result.push(`\\cardRace{${capitalize(this.card.race)}}`);
		} else if (this.card.type) {
			result.push(`\\cardType{${capitalize(this.card.type)}}`);
		}
		if (this.card.hp) {
			result.push(`\\cardHP{${this.card.hp}}`);
		}
		if (this.card.goal) {
			result.push(`\\cardDoubleText{%\n${
					this.typesetTextCondensed(this.card.ability)
				}%\n}{%\n${
					this.typesetTextCondensed(this.card.goal)
				}%\n}`);
		} else {
			result.push(`\\cardText{%\n${this.typesetText(this.card.ability)}%\n}`);
		}
		return `${result.join(`%\n\t`)}%\n\\end{card}%\n\\cardBack{${this.card.deck}}%\n`;
	}
	typesetText(text) {
		const THRESHOLD_SHORTLINE = 26;
		const THRESHOLD_SPACING_ALL = 50;
		const THRESHOLD_SPACING_1 = 106;

		let result = [];
		const pars = this._pars(text);
		const parLens = pars.map(p => p.replace(/(\\[a-zA-Z]+(?:{[^}]*})?)/g, 'x').length);
		const totalLength = parLens.reduce((a, b) => a + b, 0);

		if (parLens[0] < THRESHOLD_SHORTLINE) { // if the first paragraph is short, center the text
			pars[0] = `\\shortLine{${pars[0]}}`;
			if (pars.length === 1) {
				pars.push(''); // workaround: \shortLine doesn't work properly if it is the last line.
			}
		}

		if (totalLength < THRESHOLD_SHORTLINE) { // single short line, put an extra vertical space before it
			result.push('');
		}
		if (totalLength < THRESHOLD_SPACING_ALL) {
			for (let i = 0; i < pars.length; i++) {
				result.push('');
				result.push(pars[i]);
			}
		} else {
			if (totalLength < THRESHOLD_SPACING_1) {
				result.push('');
			}
			result.push(...pars);
		}

		// text = text.trim().replace("\t", '\\hspace{0.5em}\\textbullet{} ');
		return this._combinePars(result);
	}
	typesetTextCondensed(text) {
		return this._combinePars(this._pars(text));
	}
	_pars(text) {
		return text.trim().split(/\n{2,}/g).map(p => p.trim()).filter(p => p.length > 0);
	}
	_combinePars(pars) {
		return pars.join(`%\n${NEWLINE}%\n`); //+NEWLINE;
	}
}

class LocationCardGenerator extends CardGenerator {
	typeset() {
		let result = this.typesetLocationCard(this.card);
		if (this.card.back) {
			result += this.typesetLocationCard(this.card.back);
		} else {
			result += `\\locationCardBack{}%\n`;
		}
		return result;
	}
	typesetLocationCard(card) {
		const result = [
			`\\begin{locationCard}{${this.imageName(card)}}`,
			`\\locationName{${card.name}}`
		];
		for (let die of card.dice) {
			result.push(`\\locationDice{${die}}`);
		}
		for (let bonus of card.bonus) {
			result.push(`\\locationBonus{${bonus}}`);
		}
		for (let extra of card.extra || []) {
			result.push(`\\locationExtra{${extra}}`);
		}
		return `${result.join(`%\n\t`)}%\n\\end{locationCard}%\n`;
	}
}

