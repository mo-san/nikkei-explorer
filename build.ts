import { rmSync, watch } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Glob } from "bun";

const cleanUp = () => {
	rmSync("dist", { recursive: true, force: true });
};

const copyStaticFiles = async () => {
	// 出力先ディレクトリが存在しなければ作成する
	await mkdir("dist", { recursive: true });

	const staticFiles = Array.from(new Glob("src/*.{json,html}").scanSync());
	for (const staticFile of staticFiles) {
		const dest = staticFile.replace("src", "dist");
		await Bun.write(dest, Bun.file(staticFile));
	}
};

const buildTailwind = async () => {
	Bun.spawn(["bun", "run", "tailwindcss", "-i", "src/css/popup.css", "-o", "dist/css/popup.css"]);
};

/** 指定されたエントリーポイントに対してビルドを行います。 */
const build = async (entryPoint: string[]) => {
	const result = await Bun.build({
		entrypoints: entryPoint,
		outdir: "dist",
		root: "src",
		splitting: false,
		sourcemap: "external",
		minify: false,
	});

	if (!result.success) {
		console.error("Build failed:");
		for (const message of result.logs) {
			console.error(message);
		}
	}

	return result;
};

/** すべてのエントリーポイントに対してビルドを行います。 */
const buildAll = async (entryPoints: string[]) => {
	console.log("Building all entry points...");
	await build(entryPoints);
};

/**
 * watchAndBuild 関数は、ファイルの変更を監視し、変更があった場合にビルドを行います。
 * 以下の issue で提案された方法を参考にしています。
 * @link https://github.com/oven-sh/bun/issues/5866#issuecomment-1868329613
 */
const watchAndBuild = async (entryPoints: string[]) => {
	console.log("Watching for changes...");

	const srcWatcher = watch(`${import.meta.dir}/src`, { recursive: true }, async (_event, filename) => {
		if (!filename) return;
		if (filename.endsWith("~")) return; // temporary backup files

		console.log(`File changed: "${join("src", filename)}". Rebuilding...`);

		cleanUp();
		await copyStaticFiles();
		await buildTailwind();
		await build(entryPoints);
	});

	process.on("exit", () => {
		srcWatcher.close();
		process.exit(0);
	});
};

const options: Parameters<typeof parseArgs>[0] = {
	args: Bun.argv,
	options: {
		// "--watch" オプションが指定されている場合は watch モードでビルドを行う
		watch: {
			type: "boolean",
		},
	},
	strict: true,
	allowPositionals: true,
};

const {
	values: { watch: watchMode },
} = parseArgs(options);

const main = async () => {
	/** すべてのエントリーポイント */
	// const entryPoints = Array.from(new Glob(`${SRC}/*.ts`).scanSync());
	const entryPoints = ["src/index.ts", "src/popup.tsx", "src/options.ts"];

	cleanUp();
	await copyStaticFiles();
	await buildTailwind();

	if (watchMode) {
		await build(entryPoints);
		await watchAndBuild(entryPoints);
	} else {
		await buildAll(entryPoints);
	}
};

void main();
