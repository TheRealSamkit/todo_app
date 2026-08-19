let todos = null;
document.addEventListener("DOMContentLoaded", () => {
	let todoDragging = null;
	const addNewTodoBtn = document.querySelectorAll(".add-todo-btn");
	const todoModal = document.querySelector(".modal");
	const closeModalBtn = document.querySelectorAll(".btn-cancel-todo");

	const todoTitleInp = document.querySelector("#todoTitle");
	const todoDescInp = document.querySelector("#todoDescription");
	const todoDueDateInp = document.querySelector("#todoDueDate");
	const todoStateInp = document.querySelector("#todoState");
	const todoCols = document.querySelectorAll(".todoCol");
	const themeToggle = document.querySelector(".theme-toggle");

	let isMobile = false;

	// functions
	const toggleModalVisibility = (bool, mode = "open", id = null) => {
		const submitTodoBtn = document.querySelector(".btn-submit-todo");
		let modalTitle = document.querySelector(".form-action");
		if (bool) {
			todoModal.classList.remove("hide");
			todoStateInp.parentNode.classList.add("hide");
			todoModal.classList.add("flex");

			todoTitleInp.value = "";
			todoDescInp.value = "";
			todoDueDateInp.value = "";
			todoStateInp.value = "todo";
			modalTitle.textContent = "Add New Todo";
			todoModal.addEventListener(
				"click",
				(ev) => {
					if (ev.target === todoModal) {
						toggleModalVisibility(false);
					}
				},
				{ once: true },
			);
		} else {
			todoModal.classList.add("hide");
			todoModal.classList.remove("flex");
			submitTodoBtn.replaceWith(submitTodoBtn.cloneNode(true));
			return;
		}

		if (mode === "edit" && id !== null) {
			todoStateInp.parentNode.classList.remove("hide");
			const idx = getTodoIndex(id);
			let todoData = todos[idx];

			modalTitle.textContent =
				"Edit " + todoData.todoTitle.substring(0, 16) + `${todoTitle.length >= 16 ? "..." : ""}`;

			todoTitleInp.value = todoData.todoTitle;
			todoDescInp.value = todoData.todoDesc;
			todoDueDateInp.value = todoData.todoDueDate;
			todoStateInp.value = todoData.state;

			submitTodoBtn.addEventListener(
				"click",
				() => {
					handleTodoSubmit(id, (mode = "edit"), idx);
				},
				{ once: true },
			);

			return;
		}
		submitTodoBtn.addEventListener("click", () => {
			handleTodoSubmit((mode = "add"));
		});
	};

	const handleTodoSubmit = (id = null, mode = "add", idx = null) => {
		let todoTitle = todoTitleInp.value;
		let todoDesc = todoDescInp.value;
		let todoDueDate = todoDueDateInp.value;
		let todoState = todoStateInp.value;
		let todoObj = {};

		todoTitleInp.classList.remove("false");
		todoDueDateInp.classList.remove("false");
		if (todoTitle === null || todoTitle === "") {
			todoTitleInp.classList.add("false");
			return;
		}
		if (todoDueDate === null || todoDueDate === "") {
			todoDueDateInp.classList.add("false");
			return;
		}
		if (mode === "add") {
			todoId = `${todoTitle.replace(/\s/g, "").substring(0, 5)}${Date.now()}`.toString().substring(0, 12);
			todoObj = { todoId, todoTitle, todoDesc, todoDueDate, state: "todo" };
		}

		if (mode === "edit" && id !== null && idx !== null) {
			todoObj = { todoId: id, todoTitle, todoDesc, todoDueDate, state: todoState };
			handleTodoDelete(id);
		}

		todos.unshift(todoObj);
		updateTodosLocalStorage();
		createTodoElement(todoObj);
		toggleModalVisibility(false);
		document.querySelector(".btn-submit-todo").removeEventListener("click", () => handleTodoSubmit((mode = "add")));
	};

	const handleTodoDelete = (id) => {
		const idx = getTodoIndex(id);

		if (idx !== -1) {
			todos.splice(idx, 1);
		}
		console.log("Removing with index: ", idx, "with id: ", id);
		if (todos.length === 0) toggleEmptyState(true);
		document.getElementById(id).remove();
		updateTodosLocalStorage();
		updateTodoCount();
	};

	const updateTodosLocalStorage = () => {
		let data = JSON.stringify(todos);
		localStorage.setItem("todos", data);
	};

	const readTodosLocalStorage = () => {
		if (localStorage.getItem("todos") === null) return;
		todos = JSON.parse(localStorage.getItem("todos"));
		return;
	};
	const createTodoElement = (todo) => {
		const todoItemsContainer = document.querySelector(".todo-container");
		const inProgressItemsContainer = document.querySelector(".in-progress-container");
		const completedItemsContainer = document.querySelector(".completed-container");
		let parent =
			todo.state === "todo"
				? todoItemsContainer
				: todo.state === "inProgress"
					? inProgressItemsContainer
					: completedItemsContainer;
		let todoDiv = Object.assign(document.createElement("div"), {
			className: "todo-card flex",
			id: todo.todoId,
			draggable: false,
			innerHTML: `<div class="todo-header flex">
							<span class="todo-title ${todo.todoTitle.length >= 30 ? "auto-scroll" : ""}">
								${todo.todoTitle}
							</span>
							<div class="action-wrapper">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 512 512"
									class="icon btn-edit"
								>
									<path
										d="M441 58.9L453.1 71c9.4 9.4 9.4 24.6 0 33.9L424 134.1 377.9 88 407 58.9c9.4-9.4 24.6-9.4 33.9 0zM209.8 256.2L344 121.9 390.1 168 255.8 302.2c-2.9 2.9-6.5 5-10.4 6.1l-58.5 16.7 16.7-58.5c1.1-3.9 3.2-7.5 6.1-10.4zM373.1 25L175.8 222.2c-8.7 8.7-15 19.4-18.3 31.1l-28.6 100c-2.4 8.4-.1 17.4 6.1 23.6s15.2 8.5 23.6 6.1l100-28.6c11.8-3.4 22.5-9.7 31.1-18.3L487 138.9c28.1-28.1 28.1-73.7 0-101.8L474.9 25C446.8-3.1 401.2-3.1 373.1 25zM88 64C39.4 64 0 103.4 0 152L0 424c0 48.6 39.4 88 88 88l272 0c48.6 0 88-39.4 88-88l0-112c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 112c0 22.1-17.9 40-40 40L88 464c-22.1 0-40-17.9-40-40l0-272c0-22.1 17.9-40 40-40l112 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 64z"
									/>
								</svg>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 448 512"
									class="icon btn-delete"
								>
									<path
										d="M136.7 5.9C141.1-7.2 153.3-16 167.1-16l113.9 0c13.8 0 26 8.8 30.4 21.9L320 32 416 32c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 8.7-26.1zM32 144l384 0 0 304c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-304zm88 64c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24zm104 0c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24zm104 0c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24z"
									/>
								</svg>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									height="30"
									width="30"
									viewBox="0 0 640 640"
									class="drag-btn icon"
									data-todo-id=${todo.todoId}
								>
									<path
										d="M288 104C288 81.9 270.1 64 248 64L200 64C177.9 64 160 81.9 160 104L160 152C160 174.1 177.9 192 200 192L248 192C270.1 192 288 174.1 288 152L288 104zM288 296C288 273.9 270.1 256 248 256L200 256C177.9 256 160 273.9 160 296L160 344C160 366.1 177.9 384 200 384L248 384C270.1 384 288 366.1 288 344L288 296zM160 488L160 536C160 558.1 177.9 576 200 576L248 576C270.1 576 288 558.1 288 536L288 488C288 465.9 270.1 448 248 448L200 448C177.9 448 160 465.9 160 488zM480 104C480 81.9 462.1 64 440 64L392 64C369.9 64 352 81.9 352 104L352 152C352 174.1 369.9 192 392 192L440 192C462.1 192 480 174.1 480 152L480 104zM352 296L352 344C352 366.1 369.9 384 392 384L440 384C462.1 384 480 366.1 480 344L480 296C480 273.9 462.1 256 440 256L392 256C369.9 256 352 273.9 352 296zM480 488C480 465.9 462.1 448 440 448L392 448C369.9 448 352 465.9 352 488L352 536C352 558.1 369.9 576 392 576L440 576C462.1 576 480 558.1 480 536L480 488z"
									/>
								</svg>
							</div>
						</div>
				<p class="todo-description">
						${todo.todoDesc}
				</p>
			<div class="todo-due-date ${new Date().toISOString().split("T")[0] === todo.todoDueDate ? "date-overdue" : ""}">Due: ${new Intl.DateTimeFormat("en-GB").format(new Date(todo.todoDueDate))}</div>`,
		});
		todoDiv.dataset.state = todo.state;
		todoDiv.querySelector(".btn-delete").addEventListener("click", () => {
			handleTodoDelete(todo.todoId);
		});
		todoDiv.querySelector(".btn-edit").addEventListener("click", () => {
			toggleModalVisibility(true, (mode = "edit"), todo.todoId);
		});
		todoDiv.querySelector(".drag-btn").addEventListener("mousedown", () => {
			todoDiv.draggable = true;
			todoDiv.style.opacity = 0.5;
		});
		todoDiv.querySelector(".drag-btn").addEventListener("mouseout", () => {
			todoDiv.draggable = false;
			todoDiv.style.opacity = 1;
		});
		todoDiv.addEventListener("dragstart", (event) => {
			handleTodoDragStart(event);
		});
		parent.appendChild(todoDiv);
		toggleEmptyState(false);
		updateTodoCount();
	};
	const handleTodoDragStart = (ev) => {
		todoDragging = document.getElementById(ev.target.id);
		ev.dataTransfer.effectAllowed = "move";
		ev.dataTransfer.setData("task", "");
	};

	const handleTodoDragEnd = (ev, column) => {
		ev.preventDefault();

		todoDragging.remove();
		todoDragging.style.opacity = 1;
		column.children[1].appendChild(todoDragging);
		const idx = getTodoIndex(todoDragging.id);
		todos[idx].state = column.dataset.state;
		// document.querySelectorAll(".placeholder").forEach((el) => el.remove());
		todoDragging = null;
		updateTodosLocalStorage();
		updateTodoCount();
	};

	const getTodoIndex = (todoId) => {
		return todos.findIndex((todo) => todo.todoId === todoId);
	};

	const updateTodoCount = () => {
		todoCols.forEach((col) => {
			let count = col.querySelectorAll(".todo-card").length;
			col.querySelector("#todoCount").textContent = count;
		});
	};

	const applyTheme = (theme) => {
		if (!document.startViewTransition) {
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

	const toggleEmptyState = (bool) => {
		document.querySelector(".something").classList = bool ? "something hide" : "something";
		document.querySelector(".empty-todo").classList = bool ? "empty-todo flex" : "empty-todo hide";
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
	// Adding Event Listeners
	addNewTodoBtn.forEach((btn) => {
		btn.addEventListener("click", () => {
			toggleModalVisibility(true);
		});
	});
	closeModalBtn.forEach((btn) => {
		btn.addEventListener("click", () => {
			toggleModalVisibility(false);
		});
	});
	todoCols.forEach((col) => {
		col.addEventListener("dragover", (ev) => {
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
		col.addEventListener("drop", (ev) => {
			handleTodoDragEnd(ev, col);
		});
	});
	themeToggle.addEventListener("click", () => {
		const currentTheme = document.documentElement.getAttribute("data-theme") || getTheme();
		const newTheme = currentTheme === "dark" ? "light" : "dark";
		themeToggle.innerHTML =
			currentTheme === "dark"
				? `<path d="M239.3 48.7c-107.1 8.5-191.3 98.1-191.3 207.3 0 114.9 93.1 208 208 208 33.3 0 64.7-7.8 92.6-21.7-103.4-23.4-180.6-115.8-180.6-226.3 0-65.8 27.4-125.1 71.3-167.3zM0 256c0-141.4 114.6-256 256-256 19.4 0 38.4 2.2 56.7 6.3 9.9 2.2 17.3 10.5 18.5 20.5s-4 19.8-13.1 24.4c-60.6 30.2-102.1 92.7-102.1 164.8 0 101.6 82.4 184 184 184 5 0 9.9-.2 14.8-.6 10.1-.8 19.6 4.8 23.8 14.1s2 20.1-5.3 27.1C387.3 484.8 324.8 512 256 512 114.6 512 0 397.4 0 256z"/>`
				: `<path
						d="M288-32c8 0 15.4 4 19.9 10.6l58.8 87.4 103.4-20.2c7.8-1.5 15.9 .9 21.6 6.6s8.1 13.8 6.6 21.6L478 177.3 565.4 236.1C572 240.5 576 248 576 256s-4 15.4-10.6 19.9L478 334.7 498.2 438c1.5 7.8-.9 15.9-6.6 21.6s-13.8 8.1-21.6 6.6L366.7 446 307.9 533.4C303.4 540 296 544 288 544s-15.4-4-19.9-10.6L209.3 446 105.9 466.2c-7.8 1.5-15.9-.9-21.6-6.6s-8.1-13.8-6.6-21.6L98 334.7 10.6 275.9C4 271.4 0 264 0 256s4-15.4 10.6-19.9L98 177.3 77.8 73.9c-1.5-7.8 .9-15.9 6.6-21.6s13.8-8.1 21.6-6.6l103.3 20.2 58.8-87.4 1.8-2.3C274.4-29 281-32 288-32zm-47.8 138c-5.4 8-15 12-24.5 10.2l-84-16.4 16.4 84c1.8 9.5-2.2 19.1-10.2 24.5L67 256 138 303.8c8 5.4 12 15 10.2 24.5l-16.4 84 84-16.4 3.5-.4c8.3-.4 16.3 3.6 21 10.6l47.8 71 47.8-71 2.2-2.8c5.6-6.1 14-9 22.3-7.3l84 16.4-16.4-84c-1.8-9.5 2.2-19.1 10.2-24.5l71-47.8-71-47.8c-8-5.4-12-15-10.2-24.5l16.4-84-84 16.4c-9.5 1.8-19.1-2.2-24.5-10.2l-47.8-71-47.8 71zM288 376a120 120 0 1 1 0-240 120 120 0 1 1 0 240zm0-192a72 72 0 1 0 0 144 72 72 0 1 0 0-144z"
					/>`;
		applyTheme(newTheme);
	});
	(() => {
		readTodosLocalStorage();
		applyTheme(document.documentElement.getAttribute("data-theme") || getTheme());
		if (todos === undefined || todos.length === 0) {
			toggleEmptyState(true);
			return;
		}
		todos.forEach((todo) => createTodoElement(todo));
	})();
});
