import { data as fileData } from './mockFileData.js';

// Older approach
/*
function flattenTree(nodes) {
	const stack = nodes.map(node => [node, 0, true]).reverse(); // [node, depth, isParentExpanded]
	const result = [];

	while (stack.length > 0) {
		const [{ id, name, children = [] }, depth, isParentExpanded] = stack.pop();
		result.push({
			id,
			name,
			depth,
			isVisible: isParentExpanded,
			isExpanded: false,
			isFolder: children.length > 0
		});

		for (let i = children.length - 1; i >= 0; i--) {
			stack.push([children[i], depth + 1, false]);
		}
	}

	return result;
}
*/
(function() {
	// Input Tree -> | Normalizer | -> NodeMap -> | Projection | -> visibleList -> | Virtualizer | -> virtualList
	// Model

	let state = {
	   nodeMap: new Map(), // Store
	   rootIds: [], 
	   visibleItems: [] // Flattened list used for virtualization
	};

	function buildNodeMap(nodes) {
		const map = new Map();
		const stack = nodes.map(node => ({ ...node, parentId: null }));

		while (stack.length) {
			const { id, name, parentId, children } = stack.pop();
			map.set(id, {
				id,
				name,
				childrenIds: (children || []).map(c => c.id),
				isExpanded: true,
				parentId,
				depth: 0
			});

			if (children) {
				children.forEach(child => {
					stack.push({ ...child, parentId: id });
				});
			}
		}

		return map;
	}

	// Projection function
	function getVisibleItems(rootIds, nodeMap) {
		const result = [];
		const stack = rootIds.slice().reverse().map(id => [id, 0]);

		while (stack.length) {
			const [id, depth] = stack.pop();
			const node = nodeMap.get(id);

			result.push({
				id,
				name: node.name,
				isExpanded: node.isExpanded,
				depth
			});

			if (node.isExpanded) {
				node.childrenIds.toReversed().forEach(childId => {
					stack.push([childId, 1 + depth]);
				})
			}
		}

		return result;
	}

	// Controller
	function toggleNode(id) {
	    const node = state.nodeMap.get(id);
	    if (node) {
	        node.isExpanded = !node.isExpanded;
	        state.visibleItems = getVisibleItems(state.rootIds, state.nodeMap);
	        renderVirtualList(); 
	    }
	}

	// Setup
	state.nodeMap = buildNodeMap(fileData);
	state.rootIds = Array(100).fill(0).map((_, index) => index + 1);
	state.visibleItems = getVisibleItems(state.rootIds, state.nodeMap);

	// View
	const itemHeight = 30;

	const container = document.getElementById('container');
	container.style.position = 'relative';
	container.style.overflowY = 'auto';

	const spacer = document.createElement('div');
	container.appendChild(spacer);

	const buffer = 5;
	const containerHeight = container.clientHeight;
	const numberOfVisibleItems = Math.ceil(containerHeight / itemHeight);
	const poolSize = numberOfVisibleItems + (buffer * 2);

	const pool = [];
	for (let i = 0; i < poolSize; i++) {
		const item = document.createElement('div');
		item.style.position = 'absolute';
		item.style.height = `${itemHeight}px`;
		item.style.width = '100%';
		item.style.top = '0';
		item.style.willChange = 'transform';

		container.appendChild(item);
		pool.push(item);
	}

	function renderVirtualList() {
		const scrollTop = container.scrollTop;
		const totalItems = state.visibleItems.length;

		// Dynamically adjust the height based on the latest visible Items
		spacer.style.height = `${itemHeight * state.visibleItems.length}px`;

		const indexStart = Math.floor(scrollTop / itemHeight);
		const renderingStart = Math.max(indexStart - buffer, 0);

		for (let i = 0; i < poolSize; i++) {
			const dataIndex = renderingStart + i;
			const domNode = pool[i];

			if (dataIndex < totalItems) {
				const itemData = state.visibleItems[dataIndex];
				domNode.style.visibility = 'block';
				domNode.style.transform = `translateY(${dataIndex * itemHeight}px)`;

				domNode.innerText = `${itemData.isExpanded ? '▼' : '▶'} ${itemData.name}`;
	            domNode.style.paddingLeft = `${itemData.depth * 20 + 10}px`;

	            domNode.dataset.id = itemData.id;
			} else {
				domNode.style.display = 'none';
			}

		}

	}

	renderVirtualList();

	let isTicking = false;
	// scroll listener
	container.addEventListener('scroll', () => {
		if (!isTicking) {
			window.requestAnimationFrame(() => {
				renderVirtualList();
	            isTicking = false;
			});
			isTicking = true;
		}
	});

	// delegate click event handler

	container.addEventListener('click', (e) => {
	    // Only care if we clicked a row
	    const row = e.target.closest('div'); // or whatever class you gave the rows
	    if (row && row.dataset.id) {
	        toggleNode(parseInt(row.dataset.id));
	    }
	});
}())
