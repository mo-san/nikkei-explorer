import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const App = () => {
	const [isAuto, setIsAuto] = useState(false);

	useEffect(() => {
		setIsAuto(localStorage.getItem("autopilot") === "true");
	}, []);

	return (
		<div className="flex items-center justify-center w-full">
			<label className="inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					className="sr-only peer"
					checked={isAuto}
					onChange={(e) => {
						const checked = (e.target as HTMLInputElement).checked;
						localStorage.setItem("autopilot", checked.toString());
						setIsAuto(checked);
					}}
				/>
				<div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
				<span className="ms-3 text-sm font-medium text-gray-900">自動操作する</span>
			</label>
		</div>
	);
};

const root = document.getElementById("root") ?? document.body.appendChild(document.createElement("div"));
createRoot(root).render(<App />);
