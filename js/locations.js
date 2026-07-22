const locations = [{
	imageName: 'les',
	name: {cs:"Les", en:"Forest"},
	dice: [8, 2],
	bonus: ['Divine', 'Sorcery'],
	extra: ['elfDefense']
},{
	imageName: 'jeskyne',
	name: {cs:"Jeskyně", en:"Cave"},
	dice: [11, 9, 3],
	bonus: ['Combat', 'Sorcery'],
	extra: ['orcAttack']
},{
	imageName: 'carovnystrom',
	name: {cs:"Čarovný strom", en:"Mystical oak"},
	dice: [5],
	bonus: ['Damage2', 'Heal'],
},{
	imageName: 'hospoda',
	name: {cs:"Hospoda", en:"Tavern"},
	dice: [10],
	bonus: ['Steal', 'Brawl'],
},{
	imageName: 'kovarna',
	name: {cs:"Kovárna", en:"Blacksmith"},
	dice: [4],
	bonus: ['Combat'],
	extra: ['']
},{
	imageName: 'chram',
	name: {cs:"Chrám", en:"Temple"},
	dice: [6],
	bonus: ['Divine', 'Deenchant', 'Corrupt'],
	back: {
		imageName: 'chram',
		name: {cs:"Znesvěcený Chrám", en:"Corrupted Temple"},
		dice: [7, 6],
		bonus: ['Divine'],
		extra: ['corruptedDamage']
	}
}]

export function locationsDeck(lang)
{
	let cards = [];
	for (let location of locations) {
		let card = {...location, name: location.name[lang]};
		if (location.back) {
			location.back = {...location.back, name: location.back.name[lang]};
		}
		card.deck = 'location';
		cards.push(card);
	}
	return cards;
}
