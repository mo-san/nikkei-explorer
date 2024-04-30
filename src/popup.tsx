import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const App = () => {
	const [isAuto, setIsAuto] = useState(false);

	useEffect(() => {
		setIsAuto(localStorage.getItem("autopilot") === "true");
	}, []);

	useEffect(() => {
		console.log("isAuto", isAuto);
	}, [isAuto]);

	return (
		<div className="flex items-center justify-center w-full">
			<label className="flex items-center cursor-pointer">
				<div className="relative">
					<input
						id="toggle"
						type="checkbox"
						className="hidden"
						onChange={(e) => {
							const checked = (e.target as HTMLInputElement).checked;
							localStorage.setItem("autopilot", checked.toString());
							setIsAuto(checked);
						}}
						checked={isAuto}
					/>
					<div className="toggle__line w-10 h-4 bg-gray-400 rounded-full shadow-inner" />
					<div className="toggle__dot absolute w-6 h-6 bg-white rounded-full shadow inset-y-0 left-0" />
				</div>
				<div className="ml-3 text-gray-700 font-medium">自動操作する</div>
			</label>
		</div>
	);
};

const root = document.getElementById("root") ?? document.body.appendChild(document.createElement("div"));
createRoot(root).render(<App />);
