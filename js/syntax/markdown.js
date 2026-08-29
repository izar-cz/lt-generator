// import {DeckTemplate, CardTemplate, Tags} from './base.js';
import {Syntax} from '../parser.js';


function getIcon(name) {
	return `((${name}))`;
}

export class SyntaxMarkdown extends Syntax {
	fromDokuwiki(text) {
		return super.fromDokuwiki(text)
			// .replace(/([&{}_%#])/g, "\\$1")
			// dokuwiki
			// .replace(/\*{2}(.*?)\*{2}/g, '{\\bf $1}') //  **bold**
			.replace(/\/{2}(.*?)\/{2}/g, '__$1__')       //  //italics//
			// .replace(/\\\{\(([^{}\(\)]+)\)\\\}/g, (match, mark) => this.renderMark(mark)); // this is already 'escaped'
	}
	block(tag, text) {
		return text;
	}
	renderMark(mark) {
		return getIcon(mark);
	}
	static typesetCard(card, lang) {
		return card.deck === 'location'
			? new LocationCardGenerator(card, {lang}).typeset()
			: new CardGenerator(card, {lang}).typeset();
	}
}

const deckDict = {
	cs:{
		"faction": "frakce",
		"race": "rasa",
		"category": "kategorie",
		"type": "typ",
		"hitpoints": "životy",
		"Divine": "Svaté karty",
		"Combat": "Bojové karty",
		"Sorcery": "Magické karty",
		"Orc": "Skřeti",
		"Elf": "Elfové",
		"Dwarf": "Trpaslíci",
		"Undead": "Nemrtví",
		"Neutral": "Neutrální postavy",
		// location cards:
		"location": "pole",
		"move roll": "hod na přesun",
		"entry bonus": "vstupní bonus",
		"or": "nebo",
		"Deenchant": "„Odmodlení“ – zruš libovolné okouzlení nebo znič jedno vlastní prokleté vybavení.",
		"Divine": "Lízni si Svatou kartu",
		"Combat": "Lízni si Bojovou kartu",
		"Sorcery": "Lízni si Magickou kartu",
		"Steal": "Krádež – vezmi si jednu kartu vybavení libovolné postavy.",
		"Brawl": "Opilecká rvačka – Přesuň sebe a libovolnou jinou postavu na pole hospoda. Oběma je uděleno 1 fyzické zranění. Tím končí tvůj tah.",
		"corruptedDamage": "Při vstupu je ti způsobeno 1 zranění, pokud nejsi nemrtvý",
		"orcAttack": "Postavy rasy skřet mají bonus k útoku +1",
		"Damage2": "Uděl libovolné postavě 2 magická zranění",
		"Heal": "Vyléč libovolné postavě 1 zranění",
		"elfDefense": "Postavy rasy elf mají bonus k obraně +1",
	},
	en:{
		"Divine": "Divine cards",
		"Combat": "Combat cards",
		"Sorcery": "Sorcery cards",
		"Orc": "Orcs",
		"Elf": "Elves",
		"Dwarf": "Dwarves",
		"Undead": "Undead",
		"Neutral": "Neutral characters",
		// location cards:
		"Deenchant": "„Prayer“ – discard any enchantment or destroy one of your own cursed equipment.",
		"Divine": "Draw a Divine card",
		"Combat": "Draw a Combat card",
		"Sorcery": "Draw a Sorcery card",
		"Steal": "Thievery – take one equipment card from any character.",
		"Brawl": "Drunken fistfight – move yourself and any other character to the tavern. Both players take 1 physical damage. This ends your turn.",
		"corruptedDamage": "On entry you take 1 damage unless you are undead",
		"orcAttack": "Orc characters have +1 attack bonus",
		"Damage2": "Deal 2 magic damage to any character",
		"Heal": "Heal any character for 1 damage",
		"elfDefense": "Elves have +1 defense bonus",
	}
}
class CardGenerator {
	constructor(card, options) {
		this.card = card;
		this.dict = deckDict[options.lang];
	}
	_(text) {
		return this.dict[text] || text;
	}
	typeset() {
		var cardClass = this.card.class;
		if ('Equipment' === cardClass) {
			const t = this.card.type.toLowerCase()
			if (t.startsWith('cursed') || t.startsWith('proklet')) cardClass = 'EquipmentCursed'
		}

		var result = [`## ${this.card.name}`,''];
		if (this.card.race) {
			result.push(`* ${this._('faction')}: ${this._(cardClass)}`);
			result.push(`* ${this._('race')}: ${this.card.race}`);
		} else if (this.card.type) {
			result.push(`* ${this._('category')}: ${this._(this.card.deck)}`);
			result.push(`* ${this._('type')}: ${this.card.type}`);
		}
		if (this.card.hp) {
			result.push(`* ${this._('hitpoints')}: ${this.card.hp}`);
		}
		result.push(this.typesetText(this.card.ability));
		if (this.card.goal) {
			result.push(this.typesetText(this.card.goal));
		}
		return `${result.join(`\n`)}\n\n`;
	}
	typesetText(text) {
		text = text.replace("\t", '* ');
		return text;
	}
}

class LocationCardGenerator extends CardGenerator {
	typeset() {
		let result = this.typesetLocationCard(this.card);
		if (this.card.back) {
			result += this.typesetLocationCard(this.card.back);
		}
		return result;
	}
	typesetLocationCard(card) {
		const result = [`## ${this._('location')}: ${card.name}`,''];
		result.push(`* ${this._('move roll')}: ${card.dice.join(` ${this._('or')} `)}`);
		for (let bonus of card.bonus) {
			result.push(`* ${this._('entry bonus')}: ${this._(bonus)}`);
		}
		for (let extra of card.extra || []) {
			result.push(`* ${this._(extra)}`);
		}
		return `${result.join(`\n`)}\n\n`;
	}
}

