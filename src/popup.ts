const main = async () => {
	const data = await chrome.storage.local.get(null);
	(document.querySelector("#result") as HTMLElement).textContent = JSON.stringify(data, null, 2);
	document.querySelector<HTMLButtonElement>("#btn")?.addEventListener("click", async () => {
		console.log("clicked");
	});
};

const isDocumentLoaded = () => document.readyState === "complete";
isDocumentLoaded() ? main() : document.addEventListener("DOMContentLoaded", main);
