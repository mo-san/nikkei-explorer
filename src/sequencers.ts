import type { Article } from "./constants.ts";

// ----------------------------------------
// Text Processors
// ----------------------------------------

// 数字とアルファベットと記号を半角に変換する(「～」を除く)
const zen2han = (str: string) => str.replace(/[\uff01-\uff5d]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
export const func01 = (item: Article) =>
	Object.assign(item, {
		genre: zen2han(item.genre),
		title: zen2han(item.title),
		text: zen2han(item.text),
	}) as Article;

// 数字に挟まれた「・」を「.」に変換する
const regex02 = (str: string) => str.replace(/(?<=[\d０-９])・(?=[\d０-９])/g, ".");
export const func02 = (item: Article) =>
	Object.assign(item, {
		title: regex02(item.title),
		text: regex02(item.text),
	}) as Article;

// アルファベットに挟まれた全角空白を半角に変換する
const regex03 = (str: string) => str.replace(/(?<=[a-z])　(?=[a-z])/gi, " ");
export const func03 = (item: Article) =>
	Object.assign(item, {
		title: regex03(item.title),
		text: regex03(item.text),
	}) as Article;

// 本文行末の全角空白を削除する
const regex04 = (str: string) => str.replace(/　(?=<br>)|　$/g, "");
export const func04 = (item: Article) =>
	Object.assign(item, {
		text: regex04(item.text),
	}) as Article;

// 「【」で始まる行以降の行頭に「> 」をつける
export const func05 = (item: Article) => {
	let found = false;

	const text = item.text
		.split("<br>")
		.map((line) => {
			if (!found && !line.startsWith("【")) return line;
			if (line.startsWith("【")) found = true;
			return `> ${line}`;
		})
		.join("<br>");

	return Object.assign(item, { text: text }) as Article;
};

// 行頭が全角空白でも「>」でも「【（〈・」のいずれでもなく、数字で始まらず15文字以内の行の頭に見出し用の「## 」をつける
export const func06 = (item: Article) => {
	const text = item.text
		.split("<br>")
		.map((line) => {
			if (/^[>　【（(〈・]|^\d+[ 　]/.test(line)) return line;
			if (line.length > 15) return line;
			return `## ${line}`;
		})
		.join("<br>");

	return Object.assign(item, { text: text }) as Article;
};

// 行頭の全角空白を削除する
const regex07 = (str: string) => str.replace(/^　|(?<=<br>)　/g, "");
export const func07 = (item: Article) =>
	Object.assign(item, {
		text: regex07(item.text),
	}) as Article;
// 「<br>」を「\n\n」に変換する (ただし「> 」以降の行では\nだけ)

const regex08 = (str: string) => str.replace(/<br>/g, "\n\n").replace(/(> [^\\]+?)\\n/, "$1");
export const func08 = (item: Article) =>
	Object.assign(item, {
		text: regex08(item.text),
	}) as Article;
