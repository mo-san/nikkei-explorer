import { type Article, NKM, type NextPage } from "./constants.ts";
import { func01, func02, func03, func04, func05, func06, func07, func08 } from "./sequencers.ts";
import {
	chromeStorage,
	constructUrl,
	getAvailableDates,
	getAvailableMedia,
	getCurrentMediaCode,
	getLinkTo,
	getNextMediaOf,
	getSubmitButton,
	isCurrentBaitaiWellKnown,
	isIntervalExpired,
	isOnHeadlinePage,
	isOnHonbunPage,
	isOnLicensePage,
	isOnSokuhouPage,
	today,
} from "./utils.ts";

// ----------------------------------------
// Main Functions
// ----------------------------------------

const getInfoForCheckedArticles = async (autopilot: boolean) => {
	const listItems = autopilot
		? document.querySelectorAll<HTMLLIElement>("li.headlineTwoToneA:not(:has(p a))") // 本文が公開されていない記事を除外する
		: document.querySelectorAll<HTMLLIElement>("li.headlineTwoToneA:has(:checked)"); // 主導でチェックを入れた記事のみを対象にする
	return collectMetadata(Array.from(listItems));
};

const filterHeadlines = async () => {
	const metadata = await getInfoForCheckedArticles(true);

	const filteredArticles = metadata
		.filter(({ genre }) => !/^(詩歌・教養|スポーツ|マーケットデータ|マーケット商品|投資情報|お知らせ)$/.test(genre))
		.filter(
			({ title }) =>
				!/^＜数表＞|（(格付け|死去|会社人事|人事|新社長|立会外分売|首相官邸|選挙|金利|為替|通貨番付|春秋)）$/.test(
					title,
				),
		)
		.filter(({ genre, chars }) => !(genre === "マーケット総合" && chars < 300))
		.filter(({ chars }) => chars > 200);

	for (const { checkbox } of metadata) {
		checkbox.checked = true;
	}

	await chromeStorage.set({ articles: filteredArticles });
	getSubmitButton()?.removeAttribute("disabled");
};

const collectMetadata = (listItems: HTMLLIElement[]) => {
	return listItems.map((item) => {
		const title = item.querySelector(":scope div.col > p > a")?.textContent ?? "";

		const genre = item.parentElement?.previousElementSibling?.textContent ?? "";

		// const checkbox = item.querySelector<HTMLInputElement>(":scope input");

		const element = item.querySelector<HTMLLIElement>(":scope div.col ul li");
		const text = (element?.textContent ?? "")
			.trim()
			.replace(/(?<=新聞)　/, "_")
			.replace(/\s+/g, " ")
			.replace(
				/(20\d\d\/\d+\/\d+) ([^ ]+) *(?:[^ ]+)? (\d+)ページ *(絵写表有)?(\d+)文字 *(PDF有)?/,
				"$1,$2,$3,$4,$5,$6",
			);
		const [date, newspaper, page, has_image, chars, has_pdf] = text.split(",");

		return {
			title,
			text: "",
			genre,
			date,
			newspaper,
			page: Number.parseInt(page),
			has_image: !!has_image,
			chars: Number.parseInt(chars),
			has_pdf: !!has_pdf,
			// checkbox,
		} as Article;
	});
};

const honbun = async () => {
	const content = Array.from(document.querySelectorAll("section.section > form") as NodeListOf<HTMLFormElement>).map(
		(item) => ({
			title: (item.querySelector("h2") as HTMLHeadingElement).textContent,
			text: (item.querySelector(":scope .Honbun p") as HTMLParagraphElement).innerHTML,
		}),
	);

	const infos = await chromeStorage.get("articles");
	if (!infos) return [];

	return infos
		.map(
			(item) =>
				Object.assign(item, {
					text: content.find(({ title }) => title === item.title)?.text || null,
				}) as Article,
		)
		.filter((item) => item.text !== null)
		.map(func01)
		.map(func02)
		.map(func03)
		.map(func04)
		.map(func05)
		.map(func06)
		.map(func07)
		.map(func08);
};

const addCss = () => {
	if (document.querySelector("#nikkei_explorer_styles")) return;

	document.head.insertAdjacentHTML(
		"beforeend",
		`<style id="nikkei_explorer_styles">
  #big_button {
    display: block;
    padding: 0.25em;
    text-align: center;
    font-size: 1.5em;
    border: rgba(172, 63, 84, 0.5) solid 1px;
    border-radius: 8px;
    background: linear-gradient(-20deg, #ee9ca7, #ffdde1);
    width: 70%;
    margin: 1em auto 0;
  }
  </style>`,
	);
};

const addButtonToSaveArticle = async (infos: Article[]) => {
	const blob = new Blob([JSON.stringify(infos, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	document
		.querySelector<HTMLHeadingElement>("h1")
		?.insertAdjacentHTML("afterend", `<a href=${url} id="big_button">【記事を保存する】</a>`);
	const bigButton = document.querySelector("#big_button") as HTMLAnchorElement;
	const date = infos[0].date.replace(/\//g, "-");
	const media = infos[0].newspaper;
	bigButton.download = `#Nikkei_${date}_${media}.json`;
	await chromeStorage.remove("articles");
};

const addButtonToFilterTitles = () => {
	document
		.querySelector<HTMLHeadingElement>("h1")
		?.insertAdjacentHTML("afterend", `<button id="big_button">【記事を選別する】</button>`);
	document.addEventListener("click", async (e) => {
		if ((e.target as HTMLElement).closest("#big_button")) {
			await filterHeadlines();
		}
	});
};

const setDocumentTitle = (text: string) => {
	document.title = text;
};

const onProcessFinished = async () => {
	// すべての媒体の巡回が終わったら
	setDocumentTitle("日経DL:Finished!");
	await chromeStorage.remove("availableMedia");
	await chromeStorage.remove("availableDates");
	// setTimeout(() => window.close(), 3 * 1000); // 3秒後に閉じる
};

const getNextPage = async (): Promise<NextPage> => {
	// 媒体が未知の場合は、日経朝刊のページに進む
	if (!isCurrentBaitaiWellKnown()) {
		return {
			href: getLinkTo(NKM),
			mediaCode: NKM,
			date: today(),
		};
	}

	const availableDates = await chromeStorage.get("availableDates");
	if (!availableDates) {
		throw new Error("利用可能な日付が取得できませんでした。");
	}

	// const nextDateElement = document.breadcrumbsForm.querySelector<HTMLAnchorElement>(":scope a:nth-of-type(3)");
	// if (!nextDateElement) {
	// 	throw Error("日付が見つかりませんでした。");
	// }
	// const currentDate = new Date(nextDateElement.text.replace(/（(.+?)）.+/, "$1"));

	const currentMedia = getCurrentMediaCode();
	const availableDatesForTheMedia = availableDates[currentMedia];
	if (availableDatesForTheMedia[0]) {
		// その媒体の未取得の日付がある
		await chromeStorage.set({
			availableDates: { ...availableDates, [currentMedia]: availableDatesForTheMedia.slice(1) },
		});
		return {
			href: constructUrl({ mediaCode: currentMedia, hiduke: availableDatesForTheMedia[0] }),
			mediaCode: currentMedia,
			date: availableDatesForTheMedia[0],
		};
	}

	// その媒体の全ての日付の記事が取得済み

	const nextMediaCode = await getNextMediaOf(currentMedia);
	if (nextMediaCode) {
		const nextUrl = nextMediaCode ? getLinkTo(nextMediaCode) : undefined;
		return {
			href: nextUrl,
			mediaCode: nextMediaCode,
			date: availableDates[nextMediaCode][0] ?? today(),
		};
	}

	return {}; // 全ての媒体の巡回が終わった
};

/** 見出しページ */
const whenOnHeadlinePage = async (autopilot: boolean) => {
	addCss();
	addButtonToFilterTitles();
	if (!autopilot) {
		getSubmitButton()?.addEventListener("click", async () => {
			const infos = await getInfoForCheckedArticles(false);
			await chromeStorage.set({ articles: infos });
		});
		return;
	}

	// 前回の実行から一定時間が経過していたら、今回の実行時刻を保存する
	if (await isIntervalExpired({ thresholdMs: 1 })) {
		await chromeStorage.set({
			timestamp: new Date().getTime(),
			availableMedia: getAvailableMedia(),
			availableDates: await getAvailableDates(),
		});
	}

	// 見出しを選別する
	await filterHeadlines();
	// 「本文を表示」ボタンをクリック
	(document.f1 as HTMLFormElement).submit();
};

/** 本文ページ */
const whenOnHonbunPage = async (autopilot: boolean) => {
	await addButtonToSaveArticle(await honbun());
	if (!autopilot) return;

	document.querySelector<HTMLLIElement>("#big_button")?.click();

	const { href } = await getNextPage();
	if (href) {
		window.location.href = href;
		return;
	}

	console.info("全ての媒体の巡回が終わりました。");
	await onProcessFinished();
};

const whenOnLicensePage = () => {
	// 「同意する」ボタンをクリック
	document.querySelector<HTMLFormElement>(`form[name="InfoJpNikkeiTelecomForm"]`)?.submit();
};

const whenOnSokuhouPage = () => {
	window.location.href = constructUrl({ mediaCode: NKM, hiduke: today() });
};

(async () => {
	const autopilot = await chromeStorage.get("autopilot");

	if (isOnLicensePage()) return whenOnLicensePage(); // 利用規約ページ
	if (isOnSokuhouPage()) return whenOnSokuhouPage();
	if (isOnHeadlinePage()) return await whenOnHeadlinePage(autopilot || false);
	if (isOnHonbunPage()) return await whenOnHonbunPage(autopilot || false);
})();
