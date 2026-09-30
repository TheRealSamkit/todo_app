let taskList = [];
import { emptyMessages, vehicles, moonSvgPath, sunSvgPath, taskCardTemplate } from "./assets/constants.js";

let currentDraggingTask,
	currentEditId = null;
const wheels = Object.values(vehicles);

const STATES = { TODO: "todo", IN_PROGRESS: "inProgress", COMPLETED: "completed" };
const PRIORITIES = ["low", "medium", "high"];
const STORAGE_KEYS = { TODOS: "todos", THEME: "theme" };
const TITLE_PREVIEW_LEN = 16;
const AUTO_SCROLL_TITLE_LEN = 30;
const CONFETTI_MS = 3000;
const CURRENT_SCHEMA_VERSION = 2;

//Initializations...?

const toast = new Toast(); // toast management ke liye object create hoga

const taskModal = document.querySelector("#addEditTodoModal");
const addTaskBtn = document.querySelectorAll(".add-todo-btn");
const closeFormBtn = document.querySelectorAll(".btn-cancel-todo");
const exportBtn = document.querySelector(".export-btn");
const submitFormBtn = document.querySelector(".btn-submit-todo");
const modalFormTitle = document.querySelector(".form-action");

const taskColumns = Array.from(document.querySelectorAll(".todoCol"));
// isko ek array me convert kiya, kyuki nodeList return hota hn jispe koi bhi
// method ya function use ho sakta jaise ki map/find/filter etc..

const themeToggle = document.querySelector(".theme-toggle");
const delRegion = document.querySelector(".delete-region");
const svgVehicle = document.querySelector(".vehicle");

const inputs = {
	title: document.querySelector("#todoTitle"),
	desc: document.querySelector("#todoDescription"),
	dueDate: document.querySelector("#todoDueDate"),
	state: document.querySelector("#todoState"),
	radios: Array.from(document.querySelectorAll("input[name='Priority']")),
}; // Cached input elements

const toggleTaskModal = (isOpen, id = null) => {
	taskModal.dataset.modalOpen = isOpen;
	taskModal.classList.toggle("hide", !isOpen);
	taskModal.classList.toggle("flex", isOpen);

	if (!isOpen) {
		currentEditId = null;
		return;
	}

	currentEditId = id;
	// submit button ke liye state set kiya hn
	// ye form submit karte vakt use hogi handleFormSubmit ke andar..

	svgVehicle.innerHTML = wheels[rand(wheels.length)];
	// ^ Chota sa easter egg ;)

	inputs.state.parentNode.classList.toggle("hide", !id);
	inputs.title.classList.toggle("false", false);
	inputs.dueDate.classList.toggle("false", false);
	// Agar id pass ki hogi to edit mode me jagya nhi to add mode
	if (id) {
		const todo = taskList[getTodoIndex(id)];
		modalFormTitle.textContent = `Edit ${todo.title.substring(0, 16)}${todo.title.length > TITLE_PREVIEW_LEN ? "..." : ""}`;
		submitFormBtn.textContent = "Update Task";

		inputs.title.value = todo.title;
		inputs.desc.value = todo.desc;
		inputs.dueDate.value = todo.dueDate;
		inputs.state.value = todo.state;
		inputs.radios.forEach((r) => (r.checked = r.value === todo.priority));
	} else {
		modalFormTitle.textContent = "Add New Task";
		submitFormBtn.textContent = "Add Task";

		inputs.title.value = "";
		inputs.desc.value = "";
		inputs.dueDate.value = "";
		inputs.state.value = "todo";
		inputs.radios.forEach((r) => (r.checked = r.value === "low"));
	}
	inputs.title.focus();
};

const saveTasks = () => {
	let data = JSON.stringify(taskList);
	try {
		localStorage.setItem("todos", data);
	} catch (error) {
		toast.show("error", "Error Saving Tasks", "Please Export Instead..!");
	}
};

const migrateTask = (task) => {
	// Old shape had "todo"-prefixed keys; if title isn't there but title is, it's old
	if (task.title !== undefined || task.todoTitle === undefined) {
		return { task, changed: false }; // already new shape (or unrecognized), leave as-is
	}

	const migrated = {
		id: task.todoId,
		title: task.todoTitle,
		desc: task.todoDesc,
		dueDate: task.todoDueDate,
		priority: task.todoPriority,
		state: task.state,
	};

	return { task: migrated, changed: true };
};

const loadTasks = () => {
	const raw = localStorage.getItem(STORAGE_KEYS.TODOS);
	if (raw === null) return;

	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		taskList = [];
		return;
	}

	if (!Array.isArray(parsed)) {
		taskList = [];
		return;
	}

	let anyChanged = false;
	const migratedList = [];

	for (const task of parsed) {
		try {
			const { task: result, changed } = migrateTask(task);
			if (changed) anyChanged = true;
			migratedList.push(result);
		} catch {
			// skip this one bad task rather than losing the whole list
			continue;
		}
	}

	taskList = migratedList;

	if (anyChanged) {
		saveTasks(); // persist new shape so next load skips migration
	}
};

const renderTask = (taskItem) => {
	const isOverdue = new Date().toISOString().split("T")[0] > taskItem.dueDate && taskItem.state !== STATES.COMPLETED;
	const formattedDueDate = document.createTextNode(
		new Intl.DateTimeFormat("en-GB").format(new Date(taskItem.dueDate)),
	); //^ ye kuch is tarah se format hoga: DD/MM/YYYY

	const taskElem = document.createElement("div");
	taskElem.className = `todo-card flex priority-${taskItem.priority}`;
	taskElem.dataset.state = taskItem.state;
	taskElem.id = taskItem.id;
	taskElem.draggable = false;
	taskElem.innerHTML = taskCardTemplate;

	let titleSpan = taskElem.querySelector(".todo-title");
	titleSpan.textContent = taskItem.title;
	titleSpan.classList.toggle("auto-scroll", taskItem.title.length >= AUTO_SCROLL_TITLE_LEN);

	taskElem.querySelector(".todo-description").textContent = taskItem.desc;

	let dueDateDiv = taskElem.querySelector(".todo-due-date");
	dueDateDiv.classList.toggle("date-overdue", isOverdue);
	// ^ yaha future me aur easter eggs add ho skte hn
	dueDateDiv.append(formattedDueDate);

	//Final Append, Cleanup and Update in count
	taskColumns
		.find((taskCol) => taskCol.dataset.state === taskItem.state)
		.querySelector(".card-container")
		.prepend(taskElem);
	// yaha se sahi parent container
	//  decide hota hn jis ke andar task insert hoga
	toggleEmptyState(false);
	updateTasksCount();
};

const exportTodos = () => {
	if (taskList.length < 1) {
		return;
	}
	const blob = new Blob([JSON.stringify(taskList)], { type: "application/json" });
	const todosURL = URL.createObjectURL(blob);
	// ye client side me ek temp object create karega and uska url provide karega..

	let downloadAnchor = document.createElement("a");
	downloadAnchor.href = todosURL;
	downloadAnchor.download = `todos_${new Date().toISOString().split("T")[0].replaceAll("-", "_")}.json`;
	downloadAnchor.click();
	URL.revokeObjectURL(todosURL);
};

//Todo Management Functions

const handleFormSubmit = () => {
	const title = inputs.title.value.trim();
	const dueDate = inputs.dueDate.value;
	const priority = document.querySelector("input[name='Priority']:checked")?.value || PRIORITIES[0];

	inputs.title.classList.toggle("false", !title);
	inputs.dueDate.classList.toggle("false", !dueDate);
	if (!title || !dueDate) return;
	// ^agar title ya due-date empty ho to task create nahi hoga

	// Agar id set hogi state me to existing task to edit/update karega
	// nhi to naya create karega ..
	if (currentEditId) {
		const idx = getTodoIndex(currentEditId);
		taskList[idx] = {
			...taskList[idx],
			title: title,
			desc: inputs.desc.value,
			dueDate: dueDate,
			priority: priority,
			state: inputs.state.value,
		};

		document.getElementById(currentEditId).remove();
		renderTask(taskList[idx]);
	} else {
		const newTask = {
			id: crypto.randomUUID(),
			title: title,
			desc: inputs.desc.value,
			dueDate: dueDate,
			priority: priority,
			state: "todo",
		};
		taskList.unshift(newTask);
		renderTask(newTask);
	}

	saveTasks();
	toggleTaskModal(false);
};

const handleTaskDelete = (id) => {
	taskList = taskList.filter((t) => t.id !== id);
	console.log("Removing task with this id: ", id);
	toast.show("normal", "Task Deleted");
	// ^ future me undo task delete add ho skta hn
	// localstorage ya temp caching se
	if (taskList.length === 0) toggleEmptyState(true);
	document.getElementById(id)?.remove();
	updateTasksCount();
	saveTasks();
};

const handleTaskDrop = (ev, column) => {
	ev.preventDefault();

	const targetState = column.dataset.state;

	currentDraggingTask.style.opacity = 1;
	currentDraggingTask.remove();
	if (targetState === "completed" && currentDraggingTask.dataset.state !== targetState) confettiAnimation();

	column.querySelector(".card-container").prepend(currentDraggingTask);
	taskList[getTodoIndex(currentDraggingTask.id)].state = targetState;
	currentDraggingTask.dataset.state = targetState;
	delRegion.classList.add("hide");
	currentDraggingTask.draggable = false;

	updateTasksCount();
	saveTasks();
	currentDraggingTask = null;
	return;
	// document.querySelectorAll(".placeholder").forEach((el) => el.remove());
};

// Helper Functions

const rand = (len) => {
	return Math.floor(Math.random() * len);
};

const getTodoIndex = (id) => {
	return taskList.findIndex((todo) => todo.id === id);
	// ye jyda optimised nhi hn future me kuch aur use karna hoga
	// koi sorting algorithm ya kuch aur..!?
};

const makePlaceHolder = () => {
	const placeholder = document.createElement("div");
	placeholder.classList.add("placeholder");
	placeholder.innerHTML = `<div class="todo-header">
									<span class="todo-title"></span>
								</div>
								<p class="todo-description"></p>
								<div class="todo-due-date"></div>`;
	return placeholder;
};

const createSampleTasks = (max = 5) => {
	let states = Object.values(STATES);
	for (let i = 0; i < max; i++) {
		const newTask = {
			id: crypto.randomUUID(),
			title: `test ${i + 1}`,
			desc: `This is test task number: ${i + 1}`,
			dueDate: new Date().toISOString().split("T")[0],
			priority: PRIORITIES[rand(PRIORITIES.length)],
			state: states[rand(states.length)],
		};
		taskList.unshift(newTask);
		renderTask(newTask);
	}
	saveTasks();
	toggleEmptyState(false);
};

//UX ke liye functions

const updateTasksCount = () => {
	taskColumns.forEach((c) => {
		c.querySelector(".todo-count").textContent = c.querySelectorAll(".todo-card").length;
	});
};

const toggleEmptyState = (bool) => {
	if (bool) {
		document.querySelector(".empty-title").textContent = emptyMessages[rand(emptyMessages.length)];
	}
	document.querySelector(".something").classList = bool ? "something hide" : "something";
	document.querySelector(".empty-todo").classList = bool ? "empty-todo flex" : "empty-todo hide";
};

const confettiAnimation = () => {
	// in future remove this and create own
	if (typeof confetti === "undefined") return;

	const duration = CONFETTI_MS;
	const animationEnd = Date.now() + duration;
	const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
	const interval = setInterval(() => {
		const timeLeft = animationEnd - Date.now();
		if (timeLeft <= 0) return clearInterval(interval);

		const particleCount = 50 * (timeLeft / duration);
		const createConfetti = (x) => confetti({ ...defaults, particleCount, origin: { x, y: Math.random() - 0.2 } });
		createConfetti(0.2);
		createConfetti(0.8);
	}, 250);
};

const applyTheme = (theme) => {
	if (!document.startViewTransition) {
		// Ye fallback hn agar browser ke andar view trans. available na ho
		document.documentElement.setAttribute("data-theme", theme);
		try {
			localStorage.setItem(STORAGE_KEYS.THEME, theme);
		} catch (error) {
			toast.show("error", "Error Saving the theme.");
		}
		return;
	}
	document.startViewTransition(() => {
		document.documentElement.setAttribute("data-theme", theme);
		try {
			localStorage.setItem(STORAGE_KEYS.THEME, theme);
		} catch (error) {
			toast.show("error", "Error Saving the theme.");
		}
	});
};

const getTheme = () => {
	const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
	if (savedTheme) return savedTheme;
	// pele se theme saved ho to vo return hogi nhi to jo
	// user ke os/browser me set hogi vo
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const init = () => {
	addTaskBtn.forEach((btn) => {
		btn.addEventListener("click", () => {
			toggleTaskModal(true);
		});
	});

	closeFormBtn.forEach((btn) => {
		btn.addEventListener("click", () => {
			toggleTaskModal(false);
		});
	});

	submitFormBtn.addEventListener("click", handleFormSubmit);
	exportBtn.addEventListener("click", exportTodos);

	taskModal.addEventListener("click", (e) => {
		if (e.target === taskModal) toggleTaskModal(false);
		// ye jab he close hoga agar modal ka parent target ho
	});

	taskColumns.forEach((taskCol) => {
		/* is ke andar most-of listeners ke liye event delegation ka use huva hn
		jaise ki ek primary evt listener sirf parent pe attached hn aur
		jab parent ke andar koi evt perform hoga to vo closest ya fir target
		element ko find karega aur jis operation ke btn ko click kiya hoga
		uske handler ko fire karega .. ye explanation future me update ho skti hn */

		taskCol.addEventListener("click", (e) => {
			const card = e.target.closest(".todo-card");
			if (!card) return;

			if (e.target.closest(".btn-delete")) handleTaskDelete(card.id);
			if (e.target.closest(".btn-edit")) toggleTaskModal(true, card.id);
		});

		taskCol.addEventListener("dragover", (ev) => {
			if (!ev.dataTransfer.types.includes("task")) {
				return;
			}
			ev.preventDefault();

			//placeholder management ye future me add hoga

			// let cardContainer = col.querySelector(".card-container");
			// console.log(todoDragging);
			// if (cardContainer.querySelector(".placeholder")) return;
			// if (todoDragging.dataset.state === col.dataset.state) return;
			// cardContainer.appendChild(makePlaceHolder());
		});
		taskCol.addEventListener("drop", (e) => {
			handleTaskDrop(e, taskCol);
		});

		taskCol.addEventListener("dragstart", (ev) => {
			const card = ev.target.closest(".todo-card");
			if (card) {
				currentDraggingTask = card;
				ev.dataTransfer.effectAllowed = "move";
				ev.dataTransfer.setData("task", "");
				delRegion?.classList.remove("hide");
			}
		});

		taskCol.addEventListener("dragend", (ev) => {
			const card = ev.target.closest(".todo-card");
			if (card) {
				card.draggable = false;
				card.style.opacity = 1;
			}
			delRegion?.classList.add("hide");
			delRegion?.classList.remove("delete-region-active");
			currentDraggingTask = null;
		});

		/* niche ke do listeners sirf user experience ko improve karne ke liye hn
		 ye dono mouse ko track karenge and if user drag btn pe hover karega
		 to hee vo task ko draggable banayega .. ye kyu add kiya hn ?
		 cause jo elem draggable hota hn uske andar ke text ka selection hard ho
		 jata hn isliye user ki convenience ke liye yee add kiya hn
		 future me settings me iske toggle add kiya ja skta hn */

		taskCol.addEventListener("mousedown", (e) => {
			const card = e.target.closest(".todo-card");

			if (card && e.target.closest(".drag-btn")) {
				card.draggable = true;
				card.style.opacity = 0.5;
			}
		});
		taskCol.addEventListener("mouseout", (e) => {
			const card = e.target.closest(".todo-card");

			if (card && e.target.closest(".drag-btn")) {
				card.draggable = false;
				card.style.opacity = 1;
			}
		});
	});

	// Listeners for delete region with guard statement

	if (delRegion) {
		delRegion.addEventListener("dragenter", () => {
			delRegion.classList.toggle("delete-region-active");
		});

		delRegion.addEventListener("dragleave", () => {
			delRegion.classList.toggle("delete-region-active");
		});

		delRegion.addEventListener("dragover", (e) => {
			e.preventDefault();
		});

		delRegion.addEventListener("drop", () => {
			handleTaskDelete(currentDraggingTask.id);
			currentDraggingTask = null;
			delRegion.classList.add("hide");
			delRegion.classList.remove("delete-region-active");
		});
	}

	// keyboard shortcuts

	document.addEventListener("keyup", (evt) => {
		const activeElem = document.activeElement;
		if (evt.key === "Escape") {
			if (activeElem.tagName === "SELECT" || activeElem.type === "date") return;
			// Agar koi select element ya date element focused hoga to esc default behaviour kam karega
			let modal = document.querySelector(`.modal[data-modal-open="true"]`);

			if (!modal) return;

			if (modal.dataset.modalName === "addEditTodoModal") {
				toggleTaskModal(false);
			}
		}

		const isEditing =
			activeElem.tagName === "INPUT" || activeElem.tagName === "TEXTAREA" || activeElem.isContentEditable;
		if (isEditing) return;
		// Agar koi editable element focused hoga to ye operations nhi honge

		if (evt.ctrlKey && evt.key.toLowerCase() === "m") {
			createSampleTasks(10);
			// Ye test ke liye sample task generate karyega 5 at a time
		}
		if (evt.ctrlKey || evt.metaKey || evt.altKey) return;
		// default shortcuts se bachne ke liye
		if (evt.key.toLowerCase() === "n") {
			if (taskModal.dataset.modalOpen === "true") return;
			toggleTaskModal(true);
		}
		if (evt.key.toLowerCase() === "t") {
			themeToggle.click();
		}
	});

	// Theme ke management ke liye functions

	themeToggle.addEventListener("click", () => {
		const currentTheme = document.documentElement.getAttribute("data-theme") || getTheme();
		const newTheme = currentTheme === "dark" ? "light" : "dark";
		themeToggle.querySelector(".icon").innerHTML = currentTheme === "dark" ? moonSvgPath : sunSvgPath;
		applyTheme(newTheme);
	});

	loadTasks();
	applyTheme(document.documentElement.getAttribute("data-theme") || getTheme());
	if (taskList === undefined || taskList.length === 0) {
		toggleEmptyState(true); // agar task list khali ho to empty state show karva do
	} else {
		taskList.forEach((todo) => renderTask(todo));
	}
};

document.addEventListener("DOMContentLoaded", init);
