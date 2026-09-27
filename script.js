let taskList = [];
import { emptyMessages, vehicles, moonSvgPath, sunSvgPath, taskCardTemplate } from "./assets/constants.js";

document.addEventListener("DOMContentLoaded", () => {
	let currentDraggingTask,
		currentEditId = null;
	const wheels = Object.values(vehicles);
	//Initializations...?

	const toast = new Toast();

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
	};

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

		// Agar id pass ki hogi to edit mode me jagya nhi to add mode
		if (id) {
			const todo = taskList[getTodoIndex(id)];
			modalFormTitle.textContent = `Edit ${todo.todoTitle.substring(0, 16)}${todo.todoTitle.length >= 16 ? "..." : ""}`;
			submitFormBtn.textContent = "Update Task";

			inputs.title.value = todo.todoTitle;
			inputs.desc.value = todo.todoDesc;
			inputs.dueDate.value = todo.todoDueDate;
			inputs.state.value = todo.state;
			inputs.radios.forEach((r) => (r.checked = r.value === todo.todoPriority));
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
			//notify and tell user to export instead i future add toasts
		}
	};

	const loadTasks = () => {
		if (localStorage.getItem("todos") === null) return;
		try {
			taskList = JSON.parse(localStorage.getItem("todos"));
		} catch {
			taskList = [];
		}
		return;
	};

	const renderTask = (taskItem) => {
		const isOverdue =
			new Date().toISOString().split("T")[0] > taskItem.todoDueDate && taskItem.state !== "completed";
		const formattedDueDate = document.createTextNode(
			new Intl.DateTimeFormat("en-GB").format(new Date(taskItem.todoDueDate)),
		);

		const taskElem = document.createElement("div");
		taskElem.className = `todo-card flex priority-${taskItem.todoPriority}`;
		taskElem.dataset.state = taskItem.state;
		taskElem.id = taskItem.todoId;
		taskElem.draggable = false;
		taskElem.innerHTML = taskCardTemplate;

		let titleSpan = taskElem.querySelector(".todo-title");
		titleSpan.textContent = taskItem.todoTitle;
		titleSpan.classList.toggle("auto-scroll", taskItem.todoTitle.length >= 30);

		taskElem.querySelector(".todo-description").textContent = taskItem.todoDesc;

		let dueDateDiv = taskElem.querySelector(".todo-due-date");
		dueDateDiv.classList.toggle("date-overdue", isOverdue);
		dueDateDiv.append(formattedDueDate);

		//Final Append, Cleanup and Update in count

		taskColumns
			.find((taskCol) => taskCol.dataset.state === taskItem.state)
			.querySelector(".card-container")
			.appendChild(taskElem);
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
		const priority = document.querySelector("input[name='Priority']:checked")?.value || "low";

		inputs.title.classList.toggle("false", !title);
		inputs.dueDate.classList.toggle("false", !dueDate);
		if (!title || !dueDate) return;

		// Agar id set hogi state me to existing task to edit/update karega
		// nhi to naya create karega ..
		if (currentEditId) {
			const idx = getTodoIndex(currentEditId);
			taskList[idx] = {
				...taskList[idx],
				todoTitle: title,
				todoDesc: inputs.desc.value,
				todoDueDate: dueDate,
				todoPriority: priority,
				state: inputs.state.value,
			};

			document.getElementById(currentEditId).remove();
			renderTask(taskList[idx]);
		} else {
			const newTask = {
				todoId: crypto.randomUUID(),
				todoTitle: title,
				todoDesc: inputs.desc.value,
				todoDueDate: dueDate,
				todoPriority: priority,
				state: "todo",
			};
			taskList.unshift(newTask);
			renderTask(newTask);
		}

		saveTasks();
		toggleTaskModal(false);
	};

	const handleTaskDelete = (id) => {
		taskList = taskList.filter((t) => t.todoId !== id);
		console.log("Removing task with this id: ", id);
		toast.show("normal", "Task Deleted");
		if (taskList.length === 0) toggleEmptyState(true);
		document.getElementById(id)?.remove();
		updateTasksCount();
		saveTasks();
	};

	const handleTodoDrop = (ev, column) => {
		ev.preventDefault();

		const targetState = column.dataset.state;

		currentDraggingTask.style.opacity = 1;
		currentDraggingTask.remove();
		if (targetState === "completed" && currentDraggingTask.dataset.state !== targetState) confettiAnimation();

		column.querySelector(".card-container").appendChild(currentDraggingTask);
		taskList[getTodoIndex(currentDraggingTask.id)].state = targetState;
		currentDraggingTask.dataset.state = targetState;
		delRegion.classList.add("hide");

		saveTasks();
		updateTasksCount();
		currentDraggingTask = null;
		return;
		// document.querySelectorAll(".placeholder").forEach((el) => el.remove());
	};

	// Helper Functions

	function rand(len) {
		return Math.floor(Math.random() * len);
	}

	const getTodoIndex = (todoId) => {
		return taskList.findIndex((todo) => todo.todoId === todoId);
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

	//UX ke liye functions

	const updateTasksCount = () => {
		taskColumns.forEach((col) => {
			col.querySelector(".todo-count").textContent = col.querySelectorAll(".todo-card").length;
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
		if (typeof confetti === "undefined") return;

		const duration = 3000;
		const animationEnd = Date.now() + duration;
		const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
		const interval = setInterval(() => {
			const timeLeft = animationEnd - Date.now();
			if (timeLeft <= 0) return clearInterval(interval);

			const particleCount = 50 * (timeLeft / duration);
			const createConfetti = (x) =>
				confetti({ ...defaults, particleCount, origin: { x, y: Math.random() - 0.2 } });
			createConfetti(0.2);
			createConfetti(0.8);
		}, 250);
	};

	// saare btn ke event listeners
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
	});

	taskColumns.forEach((taskCol) => {
		taskCol.addEventListener("click", (e) => {
			const card = e.target.closest(".todo-card");
			if (!card) return;

			if (e.target.closest(".btn-delete")) handleTaskDelete(card.id);
			if (e.target.closest(".btn-edit")) toggleTaskModal(true, card.id);
		});

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

		taskCol.addEventListener("dragover", (ev) => {
			if (!ev.dataTransfer.types.includes("task")) {
				return;
			}
			ev.preventDefault();
			// let cardContainer = col.querySelector(".card-container");
			// console.log(todoDragging);
			// if (cardContainer.querySelector(".placeholder")) return;
			// if (todoDragging.dataset.state === col.dataset.state) return;
			// cardContainer.appendChild(makePlaceHolder());
		});
		taskCol.addEventListener("drop", (e) => {
			handleTodoDrop(e, taskCol);
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
	});

	// Listeners for delete region

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

	document.addEventListener("keyup", (evt) => {
		const activeElem = document.activeElement;
		if (evt.key === "Escape") {
			if (activeElem.tagName === "SELECT" || activeElem.type === "date") return;

			let modal = document.querySelector(`.modal[data-modal-open="true"]`);

			if (!modal) return;

			if (modal.dataset.modalName === "addEditTodoModal") {
				toggleTaskModal(false);
			}
		}

		const isEditing =
			activeElem.tagName === "INPUT" || activeElem.tagName === "TEXTAREA" || activeElem.isContentEditable;
		if (isEditing) return;
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

	const applyTheme = (theme) => {
		if (!document.startViewTransition) {
			// Ye fallback hn agar browser ke andar view trans. available na ho
			document.documentElement.setAttribute("data-theme", theme);
			localStorage.setItem("theme", theme);
			return;
		}
		document.startViewTransition(() => {
			document.documentElement.setAttribute("data-theme", theme);
			localStorage.setItem("theme", theme);
		});
	};

	const getTheme = () => {
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme) return savedTheme;
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	};

	//Ye apne aap run hoga jab page/script load hogi
	(() => {
		loadTasks();
		applyTheme(document.documentElement.getAttribute("data-theme") || getTheme());
		if (taskList === undefined || taskList.length === 0) {
			toggleEmptyState(true);
		} else {
			taskList.forEach((todo) => renderTask(todo));
		}
		toast.show("success", "Hello!", "Mission complete.");
	})();
});
