export type Article = {
	title: string;
	text: string;
	genre: string;
	date: string;
	newspaper: string;
	page: number;
	has_image: boolean;
	chars: number;
	has_pdf: boolean;
	checkbox: HTMLInputElement;
};

export type Article2 = {
	title: string;
	text: string;
	date: Date;
	newspaper: string;
	page: number;
	chars: number;
	has_pdf: boolean;
};

export type ChromeStorageData = {
	autopilot?: boolean;
	articles?: Article[];
	timestamp?: number;
	availableMedia?: MediaCodeNames[];
	availableDates?: Record<MediaCodeNames, Date[]>;
};

export type chromeStorageKeys = keyof ChromeStorageData;

export const NKM = "NKM"; // 日経朝刊
export const NKE = "NKE"; // 日経夕刊
export const NSS = "NSS"; // 日経産業新聞
export const NKP = "NKP"; // 日経プラスワン
export const supportedMediaCodes = [NKM, NKE, NSS, NKP] as const;
export type MediaCodeNames = (typeof supportedMediaCodes)[number];

export type NextPage = {
	href?: string;
	mediaCode?: MediaCodeNames;
	date?: Date;
};
