import { data as fileData } from './mockFileData.js';

const DEFAULT_ITEM_HEIGHT = 30;

class FileExplorer {
	#data = null;
	#nodeMap = new Map();
	#rootIds = [];
	#visibleItems = [];
	#container = null;
	#spacer = document.createElement('div');
	#buffer = 5;
	#poolSize = 2 * this.#buffer;
	#pool = [];
	#scrollListener = null;
	#clickListener = null;

	constructor(containerId, { data, hasFixedHeight = true }) {
		this.#data = data;
		this.#rootIds = data.map(rootEntry => rootEntry.id);
		this.#container = document.getElementById(containerId);
		this.#spacer = document.createElement('div');
	}

	startup() {
		this.#buildNodeMap();
		this.#updateVisibleItems();
		this.#setupDOM();
		this.#setupListeners();
		this.#render();
	}

	#buildNodeMap() {
		const fileData = this.#data;
		const map = new Map();
		const stack = fileData.map(data => ({ data, parentId: null }));

		while (stack.length) {
			const { data, parentId } = stack.pop();
			map.set(data.id, {
				name: data.name,
				parentId,
				childrenIds: (data.children || []).map(child => child.id),
				isExpanded: false,
				isDir: !!data.children
			});

			if (data.children) {
				data.children.forEach(child => {
					stack.push({ data: child, parentId: data.id });
				})
			}
		}

		this.#nodeMap = map;
	}

	#updateVisibleItems() {
		const nodeMap = this.#nodeMap;
		const stack = this.#rootIds.map(id => ({ id, depth: 0 })).reverse();
		const result = [];

		while (stack.length) {
			const { id, depth } = stack.pop();
			const node = nodeMap.get(id);

			result.push({ id, depth, isExpanded: node.isExpanded, name: node.name, isDir: node.isDir });

			if (node.isDir && node.childrenIds.length && node.isExpanded) {
				node.childrenIds.toReversed().forEach(id => stack.push({id, depth: depth + 1}));
			}
		}

		this.#visibleItems = result;
	}

	#setupDOM() {
		// Setup container to be scrollable and allow for absolute positioning for children
		this.#container.style.position = 'relative';
		this.#container.style.overflowY = 'auto';

		const containerHeight = this.#container.clientHeight;
		const numberOfVisibleItems = Math.ceil(containerHeight / DEFAULT_ITEM_HEIGHT);

		// Add the spacer element
		this.#spacer.style.width = '100%';
		this.#container.appendChild(this.#spacer);

		// Build the DOM pool
		this.#poolSize = numberOfVisibleItems + (this.#buffer * 2);
		for (let i = 0; i < this.#poolSize; i++) {
			const domNode = document.createElement('div');
			domNode.style.height = `${DEFAULT_ITEM_HEIGHT}px`;
			domNode.style.position = 'absolute';
			domNode.style.top = 0;
			domNode.style.width = '100%';
			domNode.style.cursor = 'pointer';
			domNode.style.willChange = 'transform';

			const deleteBtn = document.createElement('button');
			deleteBtn.style.backgroundColor = 'transparent';
			deleteBtn.style.border = '1px solid #EEE';
			deleteBtn.innerText = 'x';

			const span = document.createElement('span');
			domNode.appendChild(span);
			domNode.appendChild(deleteBtn);

			this.#pool.push(domNode);
			this.#container.appendChild(domNode);
		}
	}

	#setupListeners() {
		let isTicking = false;
		this.#scrollListener = (event) => {
			if (!isTicking) {
				window.requestAnimationFrame(() => {
					this.#render();
					isTicking = false;
				});
				isTicking = true;
			}
		};
		this.#container.addEventListener('scroll', this.#scrollListener);


		this.#clickListener = (event) => {
			const divParent = event.target.closest('div');
			const deleteParent = event.target.closest('button');
			if (divParent) {
				const id = divParent.dataset.id;

				if (deleteParent) {
					this.deleteNode(parseInt(id, 10));
				} else {
					this.toggleNodeIsExpanded(parseInt(id, 10));
				}
			}
		}

		this.#container.addEventListener('click', this.#clickListener);
	}

	#removeEventListeners() {
		this.#container.removeEventListeners('scroll', this.#scrollListener);
		this.#container.removeEventListeners('click', this.#clickListener);
	}

	toggleNodeIsExpanded(id) {
		const node = this.#nodeMap.get(id);
		if (node && node.isDir) {
			node.isExpanded = !node.isExpanded;
			this.#updateVisibleItems();
			this.#render();
		}
	}

	deleteNode(id) {
		const node = this.#nodeMap.get(id);
		if (node) {
			// Mark for deletion
			node.isDeleting = true;
			this.#updateVisibleItems();
			this.#render();

			setTimeout(() => {
				// Mimic async call
				const random = Math.floor(Math.random() * 10) + 1;
				if (random > 7) {
					// Show toast to user to inform deletion went wrong

					delete node.isDeleting;
					this.#updateVisibleItems();
					this.#render();
				} else {
					this.#nodeMap.delete(id);
					node.childrenIds.forEach(id => this.#nodeMap.delete(id));
				}

			}, 2000);
		}
	}

	#render() {
		const containerHeight = this.#container.clientHeight;
		const scrollTop = this.#container.scrollTop;

		// Adjust spacer height to set the scroll position correctly
		this.#spacer.style.height = `${this.#visibleItems.length * DEFAULT_ITEM_HEIGHT}px`;

		// Find the items that are currently viewable in the view port
		const startIndex = Math.floor(scrollTop / DEFAULT_ITEM_HEIGHT);

		// start rendering from 5 items above
		const renderStartIdx = Math.max(startIndex - this.#buffer, 0);

		for (let i = 0; i < this.#poolSize; i++) {
			const itemIdx = renderStartIdx + i;
			const domNode = this.#pool[i];

			if (itemIdx < this.#visibleItems.length) {
				const item = this.#visibleItems[itemIdx];

				domNode.style.display = 'block';
				domNode.style.transform = `translateY(${DEFAULT_ITEM_HEIGHT * itemIdx}px)`;
				domNode.dataset.id = item.id;

				let spanText = '';
				if (!item.isDir) {
					spanText = item.name;
				} else {
					spanText = `${item.isExpanded ? '▼' : '▶'} ${item.name}`
				}

				const span = domNode.firstElementChild;
				const deleteBtn = domNode.lastElementChild;

				span.textContent = spanText;

				domNode.style.paddingLeft = `${10 + item.depth * 20}px`;
			} else {
				domNode.style.display = 'none';
			}
		}
	}

	destroy() {
		this.#nodeMap = null;
		this.#rootIds = null;
		this.#visibleItems = null;
		this.#removeEventListeners();
		this.#spacer.remove();
		this.#pool.forEach(domNode => domNode.remove());
		this.#container.innerHTML = '';
		this.#container = null;
	}
}

const fileExplorer = new FileExplorer('container', { data: fileData });
fileExplorer.startup();
