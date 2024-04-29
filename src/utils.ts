// ----------------------------------------
// Utilities
// ----------------------------------------
import {
	type ChromeStorageData,
	type MediaCodeNames,
	NKE,
	NKM,
	NKP,
	NSS,
	type chromeStorageKeys,
	supportedMediaCodes,
} from "./constants.ts";

export const isOnHeadlinePage = () => document.URL.match(/.*LATCB012\.do.*/);
export const isOnHonbunPage = () => document.URL.match(/.*LATCB014\.do.*/);
export const isOnLicensePage = () => document.URL.match(/.*info_jp_nikkei_telecom\.do.*/); // 利用規約ページ
export const isOnSokuhouPage = () => document.URL.match(/.*LATCA011\.do.*/); // ニュース速報ページ

export const getSubmitButton = () => document.querySelector<HTMLInputElement>("input[value='本文を表示']");

export const getTodayLink = () => {
	return document.querySelector<HTMLAnchorElement>("#subcategory .menuFolderList a.current");
};

export const getOtherDayLinks = () => {
	return document.querySelectorAll<HTMLAnchorElement>("#subcategory .menuFolderList a:not(.current)");
};

export const getCurrentMediaLink = () => {
	if (isOnHeadlinePage()) {
		return document.querySelector<HTMLAnchorElement>("#subcategory2 .menuFolderList a.current");
	}
	if (isOnHonbunPage()) {
		return document.breadcrumbsForm.querySelector<HTMLAnchorElement>(":scope a:nth-of-type(2)");
	}
	return null;
};

export const getOtherMediaLinks = () => {
	return document.querySelectorAll<HTMLAnchorElement>("#subcategory2 .menuFolderList a:not(.current)");
};

export const getAvailableMedia = () => {
	const mediaElements = document.querySelectorAll<HTMLAnchorElement>("#subcategory2 .menuFolderList a");
	const mediaAll = Array.from(mediaElements).map(getMediaCodeFromUrl);
	return supportedMediaCodes.filter((media) => mediaAll.includes(media));
};

export const getMediaCodeFromUrl = (link: string | HTMLAnchorElement | null) => {
	if (link instanceof HTMLAnchorElement) {
		return link.href.replace(/.*mediaCode=([A-Z]+).*/, "$1") as MediaCodeNames;
	}
	return (link ?? document.URL).replace(/.*mediaCode=([A-Z]+).*/, "$1") as MediaCodeNames;
};

export const getCurrentMediaCode = () => {
	return getMediaCodeFromUrl(getCurrentMediaLink());
};

export const getAvailableDates = async (): Promise<Record<MediaCodeNames, Date[]>> => {
	const availableDates = await chromeStorage.get("availableDates");

	const otherDates = getOtherDayLinks();
	return Array.from(otherDates).reduce(
		(prev, link) => {
			const mediaCode = getMediaCodeFromUrl(link.href);
			// TODO 年が変わるケースの処理 (12/31 -> 1/1)
			const newDate = new Date(link.text ?? "1/1");
			return Object.assign(prev, {
				[mediaCode]: [...prev[mediaCode], newDate],
			});
		},
		availableDates as Record<MediaCodeNames, Date[]>,
	);
};

export const formatDate = (date: Date) => {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0 based, so +1 and pad with 0
	const day = date.getDate().toString().padStart(2, "0");

	return `${year}${month}${day}`;
};

export const dateStringToDate = (dateString: string): Date => {
	const year = new Date().getFullYear();
	const [month, day] = dateString.split("/").map(Number);
	return new Date(year, month - 1, day);
};

export const constructUrl = ({ mediaCode, hiduke }: { mediaCode: MediaCodeNames; hiduke?: Date | string }) => {
	const url = new URL("https://t21.nikkei.co.jp/g3/p03/LATCB012.do");
	const date = typeof hiduke === "string" ? dateStringToDate(hiduke) : hiduke ? hiduke : new Date();
	url.searchParams.append("mediaCode", mediaCode);
	url.searchParams.append("date", formatDate(date));
	return url.toString();
};

export const chromeStorage = {
	get: async <T extends chromeStorageKeys>(key: T): Promise<ChromeStorageData[T]> => {
		const data = await chrome.storage.local.get(key);
		return data[key];
	},

	set: async (items: ChromeStorageData): Promise<void> => {
		for (const [key, value] of Object.entries(items)) {
			await chrome.storage.local.set({ [key]: value });
		}
	},

	remove: async (key: chromeStorageKeys): Promise<void> => {
		await chrome.storage.local.remove(key);
	},
};

export const today = () => {
	const now = new Date();
	if (now.getHours() <= 5) {
		now.setDate(now.getDate() - 1);
	}
	return now;
};

export const getYoubi = () => ["日", "月", "火", "水", "木", "金", "土"][today().getDay()];

export const isMediaAccesible = (code: MediaCodeNames) => {
	/*
  [更新時間]
  日本経済新聞 朝刊: 月～日の5：20頃
  日経産業新聞     : 月～金の3：00頃
  日経プラスワン   : 土の5：20頃
  */
	if (code === NKM) {
		return today().getHours() !== 5;
	}
	if (code === NSS) {
		return /[月火水木金]/.test(getYoubi()) && today().getHours() !== 3;
	}
	if (code === NKP) {
		return /土/.test(getYoubi()) && today().getHours() !== 5;
	}
	if (code === NKE) {
		return today().getHours() !== 5; // TODO: 未検証
	}
	return false;
};

export const isCurrentBaitaiWellKnown = () => {
	const mediaRegex = new RegExp(supportedMediaCodes.join("|"));
	const baitaiCurrent = getCurrentMediaLink();
	if (!baitaiCurrent) return false;

	return mediaRegex.test(baitaiCurrent.href);
};

export const getLinkTo = (mediaCode: MediaCodeNames) => {
	// 媒体の一覧表がない場合は、本日の日付のページに進む
	if (document.querySelectorAll("#subcategory2").length === 0) {
		return constructUrl({ mediaCode: mediaCode, hiduke: today() });
	}

	const otherMedia = getOtherMediaLinks();
	const mediaWithCode = Array.from(otherMedia).filter((a) => new RegExp(`mediaCode=${mediaCode}`).test(a.href));
	if (mediaWithCode.length === 0) return;
	return mediaWithCode[0].href;
};

export const testCurrentHiduke = (hidukeToFind: Date) => {
	// 一桁の日付はページで「1/01」のように表示される
	const current = getTodayLink();
	if (!current) return false;

	const hidukeThisPage = new Date(current.text);
	return hidukeThisPage.getDate() === hidukeToFind.getDate();
};

export const isThisDateAvailable = (hidukeToFind: Date): [false, null] | [true, string] => {
	const otherDateLinks = getOtherDayLinks();
	if (!otherDateLinks) return [false, null];

	const hidukeOthers = Array.from(otherDateLinks).filter((a) => new Date(a.text).getDate() === hidukeToFind.getDate());
	if (hidukeOthers.length > 0) {
		return [true, hidukeOthers[0].href];
	}
	return [false, null];
};

export const isIntervalExpired = async ({ thresholdMs = 1 }: { thresholdMs: number }) => {
	const timestamp = (await chromeStorage.get("timestamp")) ?? 0;
	const now = new Date().getTime();
	return thresholdMs < (now - timestamp) / 1000 / 60;
};

export const getNextMediaOf = async (currentMedia: MediaCodeNames): Promise<MediaCodeNames | undefined> => {
	const availableMedia = await chromeStorage.get("availableMedia");
	if (!availableMedia) return;

	const index = availableMedia.indexOf(currentMedia);
	if (index === -1 || index === availableMedia.length - 1) return;

	const nextMedia = availableMedia[index + 1];
	if (isMediaAccesible(nextMedia)) return nextMedia;

	return await getNextMediaOf(nextMedia);
};
