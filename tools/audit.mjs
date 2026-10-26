import { DICE, ITEMS, BARRELS, BOSSES, MINIONS, TABLES, LEVELS } from '../src/data.js';
const by = (arr, key) => arr.reduce((m,x)=>(m[x[key]]=(m[x[key]]||0)+1,m),{});
console.log('dice', DICE.length, by(DICE,'rarity'));
console.log('items', ITEMS.length, by(ITEMS,'type'));
console.log('barrels', BARRELS.length, by(BARRELS,'type'));
console.log('bosses', BOSSES.length, BOSSES.map(b=>b.level));
console.log('minions', MINIONS.length);
console.log('tables', TABLES.length);
console.log('levels', LEVELS.map(l=>l.target));
console.log('set counts', DICE.reduce((m,d)=>(m[d.setId]=(m[d.setId]||0)+1,m),{}));

