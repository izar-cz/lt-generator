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
	return new CardGenerator(card).typeset();
}
class CardGenerator {
	constructor(card, options) {
		this.card = card;
	}
	typeset() {
		var imageName = this.card.imageName
			.normalize('NFD').replace(/[\u0300-\u036f]/g, "")  // remove diacritics
			.toLowerCase().replace(/[^a-z]+/g, "_");           // convert to snake_case
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

		var result = [`\\begin{card}{${this.card.deck}}{${cardClass}}{${imageName}}`]
//		var result = [`\\begin{card}{${cardClass}}{${imageName}}`]
		result.push(`\\cardName{${this.card.name}}`);
		if (this.card.race) {
			result.push(`\\cardRace{${this.card.race}}`);
		} else if (this.card.type) {
			result.push(`\\cardRace{${this.card.type}}`); // TODO ?
		}
		if (this.card.hp) {
			result.push(`\\cardHP{${this.card.hp}}`);
		}
		if (this.card.goal) {
			result.push(`\\cardDoubleText{${this.typesetText(this.card.ability)}}{${this.typesetText(this.card.goal)}}`);
		} else {
			result.push(`\\cardText{${this.typesetText(this.card.ability)}}`);
		}
		return `${result.join(`%\n\t`)}%\n\\end{card}%\n`;
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


