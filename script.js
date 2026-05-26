document.addEventListener("DOMContentLoaded", () => {
	const todoItemsContainer = document.querySelector(".todo-container");
	const inProgressItemsContainer = document.querySelector(
		".in-progress-container",
	);
	const completedItemsContainer = document.querySelector(
		".completed-container",
	);
	const addNewTodoBtn = document.querySelector(".add-todo-btn");
	const todoModal = document.querySelector(".modal");
	const closeModalBtn = document.querySelectorAll(".btn-cancel-todo");
	// Adding EventListeners
	addNewTodoBtn.addEventListener("click", () => {
		todoModal.classList.remove("hide");
		todoModal.classList.add("flex");
	});
	closeModalBtn.forEach((elem) => {
		elem.addEventListener("click", () => {
			todoModal.classList.add("hide");
			todoModal.classList.remove("flex");
		});
	});
});
