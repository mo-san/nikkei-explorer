// ----------------------------------------
// Utilities
// ----------------------------------------
import {
	type ChromeStorageData,
	type ChromeStorageKeys,
	type MediaCodeNames,
	NKE,
	NKM,
	NKP,
	NSS,
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

export const getCurrentMediaCode = (): MediaCodeNames => {
	if (isOnHeadlinePage()) {
		return getMediaCodeFromUrl(getCurrentMediaLink());
	}
	return (document.querySelector(`input[name="mediaCode"]`) as HTMLInputElement).value as MediaCodeNames;
};

export const getAvailableDates = (): Record<MediaCodeNames, string[]> => {
	const dateToString = (date: Date) =>
		date.toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });

	const otherDates = Array.from(getOtherDayLinks());
	return otherDates.reduce(
		(prev, link) => {
			const mediaCode = getMediaCodeFromUrl(link.href);
			// TODO 年が変わるケースの処理 (12/31 -> 1/1)
			const date = new Date(`${new Date().getFullYear()}/${link.text ?? "1/1"}`);
			const stringifiedDates = [...(prev[mediaCode] ?? []), dateToString(date)];
			const uniqueDateStrings = [...new Set(stringifiedDates)];
			return Object.assign(prev, {
				[mediaCode]: uniqueDateStrings,
			});
		},
		{} as NonNullable<ChromeStorageData["availableDates"]>,
	);
};

export const formatDate = (date: Date) => {
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0 based, so +1 and pad with 0
	const day = date.getDate().toString().padStart(2, "0");

	return `${year}${month}${day}`;
};

export const getAvailableDatesFromStorage = () => {
	return (localStorageApi.get("availableDates") ?? {}) as NonNullable<ChromeStorageData["availableDates"]>;
};

export const dateStringToDate = (dateString: string): Date => {
	if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
		// ISO-8601 format
		return new Date(dateString);
	}
	if (dateString.match(/^\d{4}\/\d{2}\/\d{2}/)) {
		// yyyy/MM/dd format
		return new Date(dateString.replace(/\//g, "-"));
	}
	if (dateString.match(/^\d{1,2}\/\d{1,2}/)) {
		// MM/dd format
		const year = new Date().getFullYear();
		const [month, day] = dateString.split("/").map(Number);
		return new Date(year, month - 1, day);
	}
	return new Date(dateString);
};

export const constructUrl = ({ mediaCode, hiduke }: { mediaCode: MediaCodeNames; hiduke?: Date | string }) => {
	const url = new URL("https://t21.nikkei.co.jp/g3/p03/LATCB012.do");
	url.searchParams.append("mediaCode", mediaCode);
	if (hiduke) {
		const date = typeof hiduke === "string" ? dateStringToDate(hiduke) : hiduke;
		url.searchParams.append("date", formatDate(date));
	}
	return url.toString();
};

// export const chromeStorage = {
// 	get: async <T extends ChromeStorageKeys>(key: T): Promise<ChromeStorageData[T]> => {
// 		const data = await chrome.storage.local.get(key);
// 		return data[key];
// 	},
//
// 	set: async (items: ChromeStorageData): Promise<void> => {
// 		for (const [key, value] of Object.entries(items)) {
// 			await chrome.storage.local.set({ [key]: value });
// 		}
// 	},
//
// 	remove: async (key: ChromeStorageKeys): Promise<void> => {
// 		await chrome.storage.local.remove(key);
// 	},
// };

export const localStorageApi = {
	get: <T extends ChromeStorageKeys>(key: T): ChromeStorageData[T] => {
		const item = localStorage.getItem(key);
		return item ? JSON.parse(item) : null;
	},

	set: <T extends ChromeStorageKeys>(items: ChromeStorageData): void => {
		for (const [key, value] of Object.entries(items)) {
			localStorage.setItem(key, JSON.stringify(value));
		}
	},

	remove: <T extends ChromeStorageKeys>(key: T): void => {
		localStorage.removeItem(key);
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
	return true;
};

export const isCurrentBaitaiWellKnown = () => {
	const mediaRegex = new RegExp(supportedMediaCodes.join("|"));
	const baitaiCurrent = getCurrentMediaCode();
	return mediaRegex.test(baitaiCurrent);
};

export const isIntervalExpired = async ({ thresholdMs = 1 }: { thresholdMs: number }) => {
	const timestamp = localStorageApi.get("timestamp") ?? 0;
	const now = new Date().getTime();
	return thresholdMs < (now - timestamp) / 1000 / 60;
};

export const getNextMediaOf = async (currentMedia: MediaCodeNames): Promise<MediaCodeNames | undefined> => {
	const availableMedia = localStorageApi.get("availableMedia");
	if (!availableMedia) return;

	const index = availableMedia.indexOf(currentMedia);
	if (index === -1 || index === availableMedia.length - 1) return;

	const nextMedia = availableMedia[index + 1];
	if (isMediaAccesible(nextMedia)) return nextMedia;

	return await getNextMediaOf(nextMedia);
};
