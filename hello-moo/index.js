const moo = require('moo');

let lexer = moo.compile({
	WS: /[ \t]+/,
	comment: /\/\/.*?$/,
	number: /0|[1-9][0-9]*/,
	string: /"(?:\\["\\]|[^\n"\\])*"/,
	lparen: '(',
	rparen: ')',
	keyword: ['while', 'if', 'else', 'moo', 'cows'],
	NL: { match: /\n/, lineBreaks: true },
});
lexer.reset('while (10) cows\nmoo');
lexer.next(); // -> { type: 'keyword', value: 'while' }
lexer.next(); // -> { type: 'WS', value: ' ' }
lexer.next(); // -> { type: 'lparen', value: '(' }
lexer.next(); // -> { type: 'number', value: '10' }
