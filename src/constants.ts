export type Article = {
	title: string;
	text: string;
	date: Date;
	newspaper: string;
	page: number;
	chars: number;
};

export type ChromeStorageData = {
	autopilot?: boolean;
	timestamp?: number;
	availableMedia?: MediaCodeNames[];
	availableDates?: Record<MediaCodeNames, string[]>;
};

export type ChromeStorageKeys = keyof ChromeStorageData;

export const NKM = "NKM"; // 日経朝刊
export const NKE = "NKE"; // 日経夕刊
export const NSS = "NSS"; // 日経産業新聞
export const NKP = "NKP"; // 日経プラスワン
export const NRS = "NRS"; // 日経MJ (流通新聞)
export const NKL = "NKL"; // 日経地方経済面
export const supportedMediaCodes = [NKM, NKE, NSS, NKP, NRS, NKL] as const;
export type MediaCodeNames = (typeof supportedMediaCodes)[number];

export type NextPage = {
	href?: string;
	mediaCode?: MediaCodeNames;
	date?: Date;
};
