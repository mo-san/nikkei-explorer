import { type Article, NKM, type NextPage } from "./constants.ts";
// import { func01, func02, func03, func04, func05, func06, func07, func08 } from "./sequencers.ts";
import {
	constructUrl,
	getAvailableDates,
	getAvailableDatesFromStorage,
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
	localStorageApi,
	today,
} from "./utils.ts";

// ----------------------------------------
// Main Functions
// ----------------------------------------

const filterHeadlines = async () => {
	return collectMetadataFromHeadlinePage();
	// .filter(
	// 	({ title }) =>
	// 		!/^＜数表＞|（(格付け|死去|会社人事|人事|新社長|立会外分売|首相官邸|選挙|金利|為替|通貨番付|春秋)）$/.test(
	// 			title,
	// 		),
	// )
	// .filter(({ chars }) => chars > 200);
};

const composeMetadata = (element: HTMLElement | null): Omit<Article, "title" | "text"> => {
	const [date, newspaper, newspaper2, pageAndChars, chars] = (element?.textContent ?? "").trim().split(/\s+/);

	const pageMatch = pageAndChars.match(/^\d+/) ?? ["0"];
	const charMatch = pageAndChars.match(/^\d+/) ?? chars.match(/\d+(?=文字)/) ?? ["0"];
	return {
		date: new Date(date),
		newspaper: `${newspaper} ${newspaper2}`,
		page: Number.parseInt(pageMatch[0]),
		chars: Number.parseInt(charMatch[0]),
	};
};

const collectMetadata = (): Article[] => {
	const titles = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2.title")).map(
		(item) => item.textContent ?? "",
	);
	const metadata = Array.from(document.querySelectorAll<HTMLParagraphElement>(".text.atc_txt01")).map((item) =>
		composeMetadata(item),
	);
	const text = Array.from(document.querySelectorAll<HTMLDivElement>(".Honbun .col10")).map((item) =>
		(item.textContent ?? "").trim(),
	);
	return titles.map((title, i) => Object.assign({ ...metadata[i], title, text: text[i] }, {}));
};

const collectMetadataFromHeadlinePage = (): (Omit<Article, "text"> & { checkbox: HTMLInputElement | null })[] => {
	return Array.from(document.querySelectorAll<HTMLLIElement>("li.headlineTwoToneA:has(div.col p a)")).map((item) => ({
		checkbox: item.querySelector<HTMLInputElement>(":scope input[type='checkbox']"),
		title: item.querySelector(":scope div.col p a")?.textContent ?? "",
		...composeMetadata(item.querySelector(":scope li.AttInfoBody")),
	}));
};

// const honbun = async (infos: Article[]): Promise<Article[]> => {
// 	return infos.map(func01).map(func02).map(func03).map(func04).map(func05).map(func06).map(func07).map(func08);
// };

const makeFileName = async (infos: Article[]) => {
	const date = infos[0].date
		.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })
		.replace(/\//g, "-");
	const media = infos[0].newspaper;
	return `Nikkei_${date}_${media}.json`;
};

const addButtonToSaveArticle = async (infos: Article[], url: string) => {
	document
		.querySelector<HTMLHeadingElement>("h1")
		?.insertAdjacentHTML("afterend", `<a href=${url} id="big_button">【記事を保存する】</a>`);
	const bigButton = document.querySelector("#big_button") as HTMLAnchorElement;
	bigButton.download = await makeFileName(infos);
};

const setDocumentTitle = (text: string) => {
	document.title = text;
};

const onProcessFinished = async () => {
	// すべての媒体の巡回が終わったら
	setDocumentTitle("日経DL:Finished!");
	localStorageApi.remove("availableMedia");
	localStorageApi.remove("availableDates");
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

	const availableDates = getAvailableDatesFromStorage();

	const currentMedia = getCurrentMediaCode();
	const availableDatesForTheMedia = availableDates[currentMedia];
	if (availableDatesForTheMedia[0]) {
		// その媒体の未取得の日付がある
		localStorageApi.set({
			availableDates: { ...availableDates, [currentMedia]: availableDatesForTheMedia.slice(1) },
		});
		return {
			href: constructUrl({ mediaCode: currentMedia, hiduke: availableDatesForTheMedia[0] }),
			mediaCode: currentMedia,
			date: new Date(availableDatesForTheMedia[0]),
		};
	}

	// その媒体の全ての日付の記事が取得済み

	const nextMediaCode = await getNextMediaOf(currentMedia);
	if (nextMediaCode) {
		const nextUrl = nextMediaCode ? getLinkTo(nextMediaCode) : undefined;
		return {
			href: nextUrl,
			mediaCode: nextMediaCode,
			date: new Date(availableDates[nextMediaCode][0]) ?? today(),
		};
	}

	return {}; // 全ての媒体の巡回が終わった
};

/** 見出しページ */
const whenOnHeadlinePage = async (autopilot: boolean) => {
	if (!autopilot) {
		return;
	}

	// 前回の実行から一定時間が経過していたら、今回の実行時刻を保存する
	if (await isIntervalExpired({ thresholdMs: 1 })) {
		localStorageApi.set({
			timestamp: new Date().getTime(),
			availableMedia: getAvailableMedia(),
			availableDates: getAvailableDates(),
		});
	}

	// 見出しを選別する
	const metadata = await filterHeadlines();
	if (metadata.length === 0) {
		console.info("適切な見出しが見つかりませんでした。");
		await onProcessFinished();
		return;
	}

	for (const { checkbox } of metadata) {
		(checkbox as HTMLInputElement).checked = true;
	}
	// 「本文を表示」ボタンをクリック
	getSubmitButton()?.removeAttribute("disabled");
	// getSubmitButton()?.click();
};

/** 本文ページ */
const whenOnHonbunPage = async (autopilot: boolean) => {
	const infos = collectMetadata();
	const blob = new Blob([JSON.stringify(infos, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	await addButtonToSaveArticle(infos, url);
	if (!autopilot) return;

	// document.querySelector<HTMLLIElement>("#big_button")?.click();

	const { href } = await getNextPage();
	if (href) {
		// window.location.href = href;
		document.body.insertAdjacentHTML("afterbegin", `<a href=${href}>${href}</a>`);
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
	const autopilot = localStorageApi.get("autopilot") ?? true;

	if (isOnLicensePage()) return whenOnLicensePage(); // 利用規約ページ
	if (isOnSokuhouPage()) return whenOnSokuhouPage();
	if (isOnHeadlinePage()) return await whenOnHeadlinePage(autopilot || false);
	if (isOnHonbunPage()) return await whenOnHonbunPage(autopilot || false);
})();
