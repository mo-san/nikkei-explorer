import { rmSync, watch } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Glob } from "bun";

/** ソースコードのあるディレクトリ */
const SRC = "src";
/** 出力先ディレクトリ */
const DIST = "dist";

const cleanUp = async (dist: string) => {
	// 出力先ディレクトリが存在しない場合は何もしない
	if (!(await Bun.file(dist).exists())) return;

	console.log("Cleaning up the dist directory...");
	rmSync(dist, { recursive: true, force: true });
	await mkdir(DIST, { recursive: true });
};

const copyStaticFiles = async () => {
	console.log("Copying static files...");

	const staticFiles = Array.from(new Glob(`${SRC}/*.{json,html,css}`).scanSync());
	for (const staticFile of staticFiles) {
		const path = staticFile.replace(SRC, DIST);
		await Bun.write(path, Bun.file(staticFile));
	}
};

/** 指定されたエントリーポイントに対してビルドを行います。 */
const build = async (entryPoint: string[]) => {
	const result = await Bun.build({
		entrypoints: entryPoint,
		outdir: DIST,
		root: SRC,
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

	console.info("Successfully built:", entryPoint);
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

	const srcWatcher = watch(`${import.meta.dir}/${SRC}`, { recursive: true }, async (_event, filename) => {
		if (!filename) return;
		if (filename.endsWith("~")) return; // temporary backup files

		console.log(`File changed: "${join(import.meta.dir, SRC, filename)}". Rebuilding...`);

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
	const entryPoints = Array.from(new Glob(`${SRC}/index.ts`).scanSync());

	await cleanUp(DIST);
	await copyStaticFiles();

	if (watchMode) {
		await build(entryPoints);
		await watchAndBuild(entryPoints);
	} else {
		await buildAll(entryPoints);
	}
};

void main();
