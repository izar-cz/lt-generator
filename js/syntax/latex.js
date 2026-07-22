// import {DeckTemplate, CardTemplate, Tags} from './base.js';
import {Syntax} from '../parser.js';


function getIcon(name) {
	return `((${name}))`;
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
}

export function typesetCard(card) {
	return card.deck === 'location'
		? new LocationCardGenerator(card).typeset()
		: new CardGenerator(card).typeset();
}
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
			result.push(`\\cardRace{${this.card.race}}`);
		} else if (this.card.type) {
			result.push(`\\cardType{${this.card.type}}`);
		}
		if (this.card.hp) {
			result.push(`\\cardHP{${this.card.hp}}`);
		}
		if (this.card.goal) {
			result.push(`\\cardDoubleText{${this.typesetText(this.card.ability)}}{${this.typesetText(this.card.goal)}}`);
		} else {
			result.push(`\\cardText{${this.typesetText(this.card.ability)}}`);
		}
		return `${result.join(`%\n\t`)}%\n\\end{card}%\n\\cardBack{${this.card.deck}}%\n`;
	}
	typesetText(text) {
		var paragraphs = [];
		var shortLinesThreshold = 0; // This was 12;
		text = text.replace("\t", '\\hspace{0.5em}\\textbullet{} ');
		let replacedTextLength = text.replace(/(\\[a-zA-Z]+(?:{[^}]*})?)/g, 'x').length;
		paragraphs.push(replacedTextLength > shortLinesThreshold
			? text
			: `\\begin{center}{\\large ${text}}\\end{center}`)
		return paragraphs.join('\\par\\smallskip{}');
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

