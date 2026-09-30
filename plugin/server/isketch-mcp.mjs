// isketch MCP server, bundled by scripts/make-plugin.mjs. Do not edit; run npm run plugin.
import { createRequire } from "node:module";
import process from "node:process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region src/domain/constants.js
/**
* @typedef {'process'|'terminal'|'decision'|'data'|'database'|'document'|'note'|'table'|'text'} Shape
*/
const SHAPE = Object.freeze({
	PROCESS: "process",
	TERMINAL: "terminal",
	DECISION: "decision",
	DATA: "data",
	DATABASE: "database",
	DOCUMENT: "document",
	NOTE: "note",
	TABLE: "table",
	TEXT: "text",
	SCREEN: "screen",
	BUTTON: "button",
	INPUT: "input",
	CARD: "card",
	LIST: "list",
	IMAGE: "image",
	INK: "ink",
	FRAME: "frame"
});
/** Shared by the layout function and the node card. */
const NODE_SIZE = Object.freeze({
	WIDTH: 232,
	HEIGHT: 104
});
/** A frame starts large enough to hold a few shapes. */
const FRAME_SIZE = Object.freeze({
	WIDTH: 560,
	HEIGHT: 360
});
const NODE_GAP = Object.freeze({
	X: 44,
	Y: 72
});
Object.freeze({
	WIDTH: 80,
	HEIGHT: 40
});
/**
* A node's size: its own once resized, its kind's standard one until then.
* @param {{ type?: string, size?: { width: number, height: number } | null }} node
* @returns {{ width: number, height: number }}
*/
const sizeOf = (node) => {
	if (node?.size?.width && node?.size?.height) return {
		width: node.size.width,
		height: node.size.height
	};
	return node?.type === SHAPE.FRAME ? {
		width: FRAME_SIZE.WIDTH,
		height: FRAME_SIZE.HEIGHT
	} : {
		width: NODE_SIZE.WIDTH,
		height: NODE_SIZE.HEIGHT
	};
};
//#endregion
//#region src/domain/format.js
/**
* @param {string} value
* @param {number} [limit]
* @returns {string}
*/
function truncate(value, limit = 90) {
	const text = String(value ?? "").trim();
	return text.length <= limit ? text : `${text.slice(0, limit).trimEnd()}...`;
}
//#endregion
//#region src/domain/legacy.js
/**
* The node types Flow started with, as a chat-bot flow builder. Read only by
* the v3 migration; nothing else should know they existed.
*/
const LEGACY = Object.freeze({
	TRIGGER: "trigger",
	SEND_MESSAGE: "sendMessage",
	DATE_TIME: "dateTime",
	BRANCH: "dateTimeConnector",
	ADD_COMMENT: "addComment"
});
Object.freeze({
	[LEGACY.TRIGGER]: SHAPE.TERMINAL,
	[LEGACY.SEND_MESSAGE]: SHAPE.PROCESS,
	[LEGACY.DATE_TIME]: SHAPE.DECISION,
	[LEGACY.ADD_COMMENT]: SHAPE.NOTE
});
//#endregion
//#region src/domain/document.js
const DEFAULT_TITLE = "Untitled diagram";
/**
* Older documents mix a numeric id with hex strings; route params are strings.
* @param {unknown} id
* @returns {string}
*/
const toNodeId = (id) => String(id);
/**
* One edge per ordered pair, so the pair is the key: an undone removal draws
* the same edge again rather than a second one beside it.
* @param {string} source
* @param {string} target
*/
const edgeIdFor = (source, target) => `e-${source}-${target}`;
//#endregion
//#region src/domain/nodeMeta.js
/**
* @typedef {Object} NodeMeta
* @property {string} label
* @property {string} hint      what the shape conventionally means
* @property {string} accent    token name, resolved to classes by the canvas
* @property {'diagram' | 'wireframe' | 'ink'} group where the palette lists it; ink is drawn with the pen, not picked
* @property {boolean} openable can the drawer be opened
* @property {boolean} editable
* @property {boolean} deletable
* @property {(node: import('./types.js').FlowNode) => string} summary
*/
/** @param {import('./types.js').FlowNode} node */
const describe = (node) => node.data.description ? truncate(node.data.description) : "";
/**
* @param {string} label
* @param {string} hint
* @param {string} accent
* @param {NodeMeta['group']} [group]
* @returns {NodeMeta}
*/
const shape = (label, hint, accent, group = "diagram") => ({
	label,
	hint,
	accent,
	group,
	openable: true,
	editable: true,
	deletable: true,
	summary: describe
});
/**
* Every per-shape difference, as data. Components read this instead of
* branching on type, so adding a shape is one entry here and one outline in
* `shapes.js`. Order is palette order.
*
* @type {Readonly<Record<string, NodeMeta>>}
*/
const NODE_META = Object.freeze({
	[SHAPE.PROCESS]: shape("Process", "A step", "message"),
	[SHAPE.TERMINAL]: shape("Start / end", "Where a flow begins or ends", "trigger"),
	[SHAPE.DECISION]: shape("Decision", "A question with more than one way out", "hours"),
	[SHAPE.DATA]: shape("Input / output", "Data going in or out", "branch"),
	[SHAPE.DATABASE]: shape("Database", "A store of data", "branch"),
	[SHAPE.DOCUMENT]: shape("Document", "A file or report", "comment"),
	[SHAPE.NOTE]: shape("Note", "An annotation", "comment"),
	[SHAPE.TABLE]: shape("Table", "A database table and its columns", "branch"),
	[SHAPE.TEXT]: shape("Text", "A label with no outline", "unknown"),
	[SHAPE.FRAME]: {
		...shape("Frame", "A named region; the shapes inside it belong to it", "unknown"),
		openable: false
	},
	[SHAPE.SCREEN]: shape("Screen", "A page or screen of the interface", "trigger", "wireframe"),
	[SHAPE.BUTTON]: shape("Button", "Something to press", "message", "wireframe"),
	[SHAPE.INPUT]: shape("Input", "A form field", "branch", "wireframe"),
	[SHAPE.CARD]: shape("Card", "A panel that groups content", "comment", "wireframe"),
	[SHAPE.LIST]: shape("List", "Repeated items, such as rows or results", "hours", "wireframe"),
	[SHAPE.IMAGE]: shape("Image", "A picture, video or chart", "comment", "wireframe"),
	[SHAPE.INK]: shape("Pen stroke", "A mark drawn by hand", "unknown", "ink")
});
/**
* So an unfamiliar type renders instead of crashing the canvas.
* @type {NodeMeta}
*/
const FALLBACK_META = Object.freeze(shape("Unknown", "A shape this version does not know", "unknown"));
/** @param {string} type @returns {NodeMeta} */
const metaFor = (type) => NODE_META[type] ?? FALLBACK_META;
/** @param {string} type */
const isKnownShape = (type) => Object.hasOwn(NODE_META, type);
/** Every shape a picker offers, in palette order. A stroke is drawn, not picked. */
const SHAPE_OPTIONS = Object.freeze(Object.entries(NODE_META).filter(([, meta]) => meta.group !== "ink").map(([value, meta]) => ({
	value,
	label: meta.label,
	hint: meta.hint,
	group: meta.group
})));
//#endregion
//#region src/domain/routes.js
/**
* Where a connection runs between two shapes, shared by the canvas and the SVG
* renderer so both draw the same line. It leaves from the side that faces the
* other shape: down to a shape below, across to one beside it.
*
* @typedef {{ x: number, y: number, width: number, height: number }} Box
* @typedef {'top' | 'right' | 'bottom' | 'left'} Side
* @typedef {{ d: string, label: { x: number, y: number }, from: Side, to: Side }} Route
*/
const LINE = Object.freeze({
	STEP: "step",
	CURVED: "curved",
	STRAIGHT: "straight"
});
/** @type {readonly string[]} */
const LINES = Object.freeze(Object.values(LINE));
/** Shapes closer than this, one above the other, connect side to side instead. */
const MIN_GAP = 16;
/** @param {number} value */
const round$1 = (value) => Math.round(value * 10) / 10;
/**
* @param {Box} from
* @param {Box} to
* @param {string} [line] one of LINES; anything else is a step
* @returns {Route}
*/
function routeEdge(from, to, line = LINE.STEP) {
	const below = to.y - (from.y + from.height);
	const above = from.y - (to.y + to.height);
	const vertical = below >= MIN_GAP || above >= MIN_GAP;
	const down = below >= MIN_GAP;
	const right = to.x + to.width / 2 >= from.x + from.width / 2;
	/** @type {[Side, Side]} */
	const sides = vertical ? down ? ["bottom", "top"] : ["top", "bottom"] : right ? ["right", "left"] : ["left", "right"];
	const start = anchor(from, sides[0]);
	const end = anchor(to, sides[1]);
	const middle = {
		x: (start.x + end.x) / 2,
		y: (start.y + end.y) / 2
	};
	let d;
	if (line === LINE.STRAIGHT) d = `M${round$1(start.x)},${round$1(start.y)} L${round$1(end.x)},${round$1(end.y)}`;
	else if (line === LINE.CURVED) {
		const pull = Math.max(24, Math.abs(vertical ? end.y - start.y : end.x - start.x) / 2);
		const [c1, c2] = vertical ? [{
			x: start.x,
			y: start.y + (down ? pull : -pull)
		}, {
			x: end.x,
			y: end.y + (down ? -pull : pull)
		}] : [{
			x: start.x + (right ? pull : -pull),
			y: start.y
		}, {
			x: end.x + (right ? -pull : pull),
			y: end.y
		}];
		d = `M${round$1(start.x)},${round$1(start.y)} C${round$1(c1.x)},${round$1(c1.y)} ${round$1(c2.x)},${round$1(c2.y)} ${round$1(end.x)},${round$1(end.y)}`;
	} else d = vertical ? `M${round$1(start.x)},${round$1(start.y)} V${round$1(middle.y)} H${round$1(end.x)} V${round$1(end.y)}` : `M${round$1(start.x)},${round$1(start.y)} H${round$1(middle.x)} V${round$1(end.y)} H${round$1(end.x)}`;
	return {
		d,
		label: {
			x: round$1(middle.x),
			y: round$1(middle.y)
		},
		from: sides[0],
		to: sides[1]
	};
}
/**
* The middle of one side of a box.
* @param {Box} box
* @param {Side} side
*/
function anchor(box, side) {
	if (side === "top") return {
		x: box.x + box.width / 2,
		y: box.y
	};
	if (side === "bottom") return {
		x: box.x + box.width / 2,
		y: box.y + box.height
	};
	if (side === "left") return {
		x: box.x,
		y: box.y + box.height / 2
	};
	return {
		x: box.x + box.width,
		y: box.y + box.height / 2
	};
}
//#endregion
//#region src/domain/layout.js
const STEP_X = NODE_SIZE.WIDTH + NODE_GAP.X;
const STEP_Y = NODE_SIZE.HEIGHT + NODE_GAP.Y;
/** Marks a layout's own placeholders, which no id from a diagram can start with. */
const PLACEHOLDER = "\0";
/**
* Where every shape goes when nobody has placed it: a tidy tree for a tree,
* and layers for any other graph, so merges and cycles read top down too.
*
* Hand written rather than dagre: a pure function tests without a canvas.
*
* @param {import('./types.js').FlowNode[]} nodes
* @param {{ source: string, target: string }[]} [edges]
* @returns {Map<string, { x: number, y: number }>}
*/
function layoutTree(nodes, edges = []) {
	return isForest(nodes, edges) ? tidyTree(nodes, edges) : layered(nodes, edges);
}
/**
* Tidy top-down tree: leaves take a left-to-right cursor, a parent centres over
* its outermost children, depth maps to `y`.
*
* @param {import('./types.js').FlowNode[]} nodes
* @param {{ source: string, target: string }[]} edges
* @returns {Map<string, { x: number, y: number }>}
*/
function tidyTree(nodes, edges) {
	const positions = /* @__PURE__ */ new Map();
	if (!nodes?.length) return positions;
	const parentOf = treeParents(nodes, edges);
	const childrenOf = groupChildren(nodes, parentOf);
	const roots = nodes.filter((node) => !parentOf.has(node.id));
	const visited = /* @__PURE__ */ new Set();
	let cursor = 0;
	/**
	* @param {string} id
	* @param {number} depth
	* @returns {number} the x this node was given
	*/
	function place(id, depth) {
		if (visited.has(id)) return cursor;
		visited.add(id);
		const children = childrenOf.get(id) ?? [];
		let x;
		if (children.length === 0) {
			x = cursor;
			cursor += STEP_X;
		} else {
			const childXs = children.map((child) => place(child.id, depth + 1));
			x = (childXs[0] + childXs[childXs.length - 1]) / 2;
		}
		positions.set(id, {
			x,
			y: depth * STEP_Y
		});
		return x;
	}
	roots.forEach((root) => place(root.id, 0));
	nodes.filter((node) => !positions.has(node.id)).forEach((node) => place(node.id, 0));
	return positions;
}
/**
* No node with two ways in, and no cycle: a tree, or several.
* @param {import('./types.js').FlowNode[]} nodes
* @param {{ source: string, target: string }[]} edges
*/
function isForest(nodes, edges) {
	const ids = new Set(nodes.map((node) => node.id));
	const inner = edges.filter(({ source, target }) => source !== target && ids.has(source) && ids.has(target));
	const parents = /* @__PURE__ */ new Map();
	for (const { source, target } of inner) {
		if (parents.has(target)) return false;
		parents.set(target, source);
	}
	for (const id of ids) {
		const seen = /* @__PURE__ */ new Set([id]);
		for (let at = parents.get(id); at !== void 0; at = parents.get(at)) {
			if (seen.has(at)) return false;
			seen.add(at);
		}
	}
	return true;
}
/**
* A layered layout for any graph, after Sugiyama: edges that close a cycle are
* turned round, each node goes one layer below its lowest source, a few sweeps
* order each layer to uncross edges, and nodes then drift towards the middle
* of their sources without overlapping.
*
* @param {import('./types.js').FlowNode[]} nodes
* @param {{ source: string, target: string }[]} edges
* @returns {Map<string, { x: number, y: number }>}
*/
function layered(nodes, edges) {
	const ids = nodes.map((node) => node.id);
	const known = new Set(ids);
	const links = acyclic(ids, edges.filter(({ source, target }) => source !== target && known.has(source) && known.has(target)));
	const sourcesOf = new Map(ids.map((id) => [id, []]));
	const targetsOf = new Map(ids.map((id) => [id, []]));
	links.forEach(({ source, target }) => {
		sourcesOf.get(target)?.push(source);
		targetsOf.get(source)?.push(target);
	});
	/** @type {Map<string, number>} */
	const layerOf = /* @__PURE__ */ new Map();
	const layerFor = (id, trail = /* @__PURE__ */ new Set()) => {
		const known = layerOf.get(id);
		if (known !== void 0) return known;
		trail.add(id);
		const layer = Math.max(0, ...(sourcesOf.get(id) ?? []).filter((up) => !trail.has(up)).map((up) => layerFor(up, trail) + 1));
		layerOf.set(id, layer);
		return layer;
	};
	ids.forEach((id) => layerFor(id));
	const order = [...ids];
	let placeholders = 0;
	links.forEach(({ source, target }) => {
		const from = layerOf.get(source);
		const to = layerOf.get(target);
		if (to - from < 2) return;
		const down = targetsOf.get(source);
		const up = sourcesOf.get(target);
		down.splice(down.indexOf(target), 1);
		up.splice(up.indexOf(source), 1);
		let previous = source;
		for (let layer = from + 1; layer < to; layer += 1) {
			const id = `${PLACEHOLDER}${placeholders += 1}`;
			layerOf.set(id, layer);
			sourcesOf.set(id, [previous]);
			targetsOf.set(id, []);
			targetsOf.get(previous)?.push(id);
			order.push(id);
			previous = id;
		}
		targetsOf.get(previous)?.push(target);
		up.push(previous);
	});
	/** @type {string[][]} */
	const layers = [];
	order.forEach((id) => {
		const layer = layerOf.get(id);
		(layers[layer] ??= []).push(id);
	});
	const indexIn = (layer) => new Map(layer.map((id, index) => [id, index]));
	const sortBy = (layer, reference, neighbours) => {
		const current = indexIn(layer);
		const weight = (id) => {
			const near = (neighbours.get(id) ?? []).filter((other) => reference.has(other));
			return near.length ? near.reduce((sum, other) => sum + reference.get(other), 0) / near.length : current.get(id);
		};
		return [...layer].sort((a, b) => weight(a) - weight(b) || current.get(a) - current.get(b));
	};
	for (let sweep = 0; sweep < 4; sweep += 1) {
		for (let at = 1; at < layers.length; at += 1) layers[at] = sortBy(layers[at], indexIn(layers[at - 1]), sourcesOf);
		for (let at = layers.length - 2; at >= 0; at -= 1) layers[at] = sortBy(layers[at], indexIn(layers[at + 1]), targetsOf);
	}
	const widest = Math.max(...layers.map((layer) => layer.length));
	/** @type {Map<string, number>} */
	const xOf = /* @__PURE__ */ new Map();
	layers.forEach((layer) => layer.forEach((id, index) => xOf.set(id, (index + (widest - layer.length) / 2) * STEP_X)));
	for (let pass = 0; pass < 3; pass += 1) layers.slice(1).forEach((layer) => {
		const wanted = layer.map((id) => {
			const up = sourcesOf.get(id) ?? [];
			return up.length ? up.reduce((sum, other) => sum + xOf.get(other), 0) / up.length : xOf.get(id);
		});
		const placed = [...wanted];
		for (let index = 1; index < placed.length; index += 1) placed[index] = Math.max(placed[index], placed[index - 1] + STEP_X);
		const drift = wanted.reduce((sum, x) => sum + x, 0) / wanted.length - placed.reduce((sum, x) => sum + x, 0) / placed.length;
		layer.forEach((id, index) => xOf.set(id, placed[index] + drift));
	});
	const left = Math.min(...xOf.values());
	const positions = /* @__PURE__ */ new Map();
	layers.forEach((layer, depth) => layer.filter((id) => !id.startsWith(PLACEHOLDER)).forEach((id) => positions.set(id, {
		x: Math.round(
			/** @type {number} */
			xOf.get(id) - left
		),
		y: depth * STEP_Y
	})));
	return positions;
}
/**
* The edges with any that closes a cycle turned round, found by a depth-first
* walk in node order so the result does not depend on how edges were drawn.
* @param {string[]} ids
* @param {{ source: string, target: string }[]} edges
*/
function acyclic(ids, edges) {
	const out = new Map(ids.map((id) => [id, []]));
	edges.forEach(({ source, target }) => out.get(source)?.push(target));
	const state = /* @__PURE__ */ new Map();
	const back = /* @__PURE__ */ new Set();
	const visit = (id) => {
		state.set(id, "open");
		for (const next of out.get(id) ?? []) if (state.get(next) === "open") back.add(`${id}\u0000${next}`);
		else if (!state.has(next)) visit(next);
		state.set(id, "done");
	};
	ids.forEach((id) => state.has(id) || visit(id));
	return edges.map((edge) => back.has(`${edge.source}\u0000${edge.target}`) ? {
		source: edge.target,
		target: edge.source
	} : edge);
}
/**
* @param {import('./types.js').FlowNode[]} nodes
* @param {{ source: string, target: string }[]} edges
* @returns {Map<string, string>} each node's parent in the spanning tree
*/
function treeParents(nodes, edges) {
	const ids = new Set(nodes.map((node) => node.id));
	const parentOf = /* @__PURE__ */ new Map();
	edges.forEach(({ source, target }) => {
		if (source === target || !ids.has(source) || !ids.has(target)) return;
		if (!parentOf.has(target)) parentOf.set(target, source);
	});
	return parentOf;
}
/**
* In node order, so the layout is stable whatever order the edges were drawn in.
* @param {import('./types.js').FlowNode[]} nodes
* @param {Map<string, string>} parentOf
* @returns {Map<string, import('./types.js').FlowNode[]>}
*/
function groupChildren(nodes, parentOf) {
	const map = /* @__PURE__ */ new Map();
	nodes.forEach((node) => {
		const parent = parentOf.get(node.id);
		if (parent === void 0) return;
		map.set(parent, [...map.get(parent) ?? [], node]);
	});
	return map;
}
//#endregion
//#region src/domain/graph.js
/**
* @param {Record<string, any>} raw
* @returns {import('./types.js').FlowNode}
*/
function normaliseNode(raw) {
	return {
		id: toNodeId(raw.id),
		type: raw.type,
		name: raw.name ?? "Untitled",
		data: raw.data ?? {},
		position: raw.position ?? null,
		size: raw.size ?? null
	};
}
/**
* Only edges whose ends both exist: a half-deleted edge has nothing to draw to.
*
* @param {import('./types.js').FlowEdge[]} edges
* @param {Set<string>} ids
* @returns {import('./types.js').VueFlowEdge[]}
*/
function buildEdges(edges, ids) {
	return edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target)).map((edge) => ({
		id: edge.id,
		type: "flow",
		source: edge.source,
		target: edge.target,
		...edge.label ? { label: edge.label } : {},
		data: {
			dashed: Boolean(edge.dashed),
			both: Boolean(edge.both)
		}
	}));
}
/**
* Where every node sits: its own position if it has one, else the layout's.
* @param {import('./types.js').FlowDocument | null | undefined} document
* @returns {Map<string, { x: number, y: number }>}
*/
function documentPositions(document) {
	return new Map(documentToGraph(document).nodes.map((node) => [node.id, node.position]));
}
/**
* A dragged node keeps where it was put; everything else is laid out.
* @param {import('./types.js').FlowDocument | null | undefined} document
* @returns {{ nodes: import('./types.js').VueFlowNode[], edges: import('./types.js').VueFlowEdge[] }}
*/
function documentToGraph(document) {
	const nodes = (document?.nodes ?? []).map(normaliseNode);
	const ids = new Set(nodes.map((node) => node.id));
	const edges = buildEdges(document?.edges ?? [], ids);
	const positions = layoutTree(nodes, edges);
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			type: "shape",
			position: node.position ?? positions.get(node.id) ?? {
				x: 0,
				y: 0
			},
			...sizeOf(node),
			...node.type === SHAPE.FRAME ? { zIndex: -2e3 } : {},
			data: { node }
		})),
		edges
	};
}
//#endregion
//#region src/domain/colors.js
/**
* Colours a person can give a shape or a pen stroke. Each is a name, not a hex,
* so `.flow` stays readable and an agent can make colour mean something. A
* coloured shape strokes in the colour and fills with its soft tint; a stroke
* draws in the colour. Values from Open Color (MIT), as Excalidraw uses, with
* lighter strokes and darker tints for the dark theme. The canvas reads the
* same values from `--paint-*` in `style.css`: keep the two in step.
*
* @typedef {{ stroke: string, fill: string }} Paint
*/
const COLORS = Object.freeze({
	red: {
		light: {
			stroke: "#e03131",
			fill: "#ffe3e3"
		},
		dark: {
			stroke: "#ff8787",
			fill: "#4a1c1f"
		}
	},
	orange: {
		light: {
			stroke: "#e8590c",
			fill: "#ffe8cc"
		},
		dark: {
			stroke: "#ffa94d",
			fill: "#4a2c12"
		}
	},
	yellow: {
		light: {
			stroke: "#f08c00",
			fill: "#fff3bf"
		},
		dark: {
			stroke: "#ffd43b",
			fill: "#4a3f10"
		}
	},
	green: {
		light: {
			stroke: "#2f9e44",
			fill: "#d3f9d8"
		},
		dark: {
			stroke: "#69db7c",
			fill: "#173d22"
		}
	},
	teal: {
		light: {
			stroke: "#099268",
			fill: "#c3fae8"
		},
		dark: {
			stroke: "#38d9a9",
			fill: "#10392f"
		}
	},
	blue: {
		light: {
			stroke: "#1971c2",
			fill: "#d0ebff"
		},
		dark: {
			stroke: "#74c0fc",
			fill: "#13324d"
		}
	},
	violet: {
		light: {
			stroke: "#6741d9",
			fill: "#e5dbff"
		},
		dark: {
			stroke: "#b197fc",
			fill: "#2c2352"
		}
	},
	pink: {
		light: {
			stroke: "#c2255c",
			fill: "#ffdeeb"
		},
		dark: {
			stroke: "#f783ac",
			fill: "#4a1c30"
		}
	},
	grey: {
		light: {
			stroke: "#495057",
			fill: "#e9ecef"
		},
		dark: {
			stroke: "#adb5bd",
			fill: "#2a2f35"
		}
	}
});
/** @typedef {keyof typeof COLORS} ColorName */
/** In the order the swatches show. */
const COLOR_NAMES = Object.keys(COLORS);
/** @param {unknown} name */
const isColor = (name) => typeof name === "string" && Object.prototype.hasOwnProperty.call(COLORS, name);
/**
* A node's colour, when it has a known one.
* @param {{ data?: { color?: string } } | null | undefined} node
* @returns {ColorName | ''}
*/
const colorOf = (node) => isColor(node?.data?.color) ? node?.data?.color : "";
/**
* @param {string} name
* @param {'light' | 'dark'} [theme]
* @returns {Paint | null}
*/
function paintOf(name, theme = "light") {
	return isColor(name) ? COLORS[name][theme] : null;
}
//#endregion
//#region src/domain/flowText.js
/**
* The `.flow` text format: a diagram as lines a person can read, write and
* review in a pull request.
*
*     title: Web app architecture
*     style: sketch
*     note: Use NestJS and PostgreSQL
*
*     browser = terminal "Browser" -- Single page app
*     api = process "API"
*     api note: Paginate every list endpoint
*     api color: blue
*
*     browser -> api : HTTPS
*
*     @layout
*     browser 276,0
*     api 276,176 300x120
*
* One node or edge per line, in document order, so a diff shows exactly what
* changed. Positions sit in their own block at the end: moving a box never
* touches the lines that say what the system is. Notes are instructions for
* whoever builds from the diagram, one line each, for the diagram or a shape.
*
* @typedef {{ line: number, message: string }} FlowTextError
*/
const ID = String.raw`[A-Za-z0-9_][\w-]*`;
const NODE_LINE = new RegExp(String.raw`^(${ID})\s*=\s*([A-Za-z][\w-]*)\s*(.*)$`);
const EDGE_LINE = new RegExp(String.raw`^(${ID})\s*(<?--?>)\s*(${ID})\s*(?::\s?(.*))?$`);
const LINES_LINE = /^lines:\s*(\S*)\s*$/;
const LAYOUT_LINE = new RegExp(String.raw`^(${ID})\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s+(\d+)\s*x\s*(\d+))?$`);
const NOTE_LINE = new RegExp(String.raw`^(${ID})\s+note:\s?(.*)$`);
const ARROW_LINE = new RegExp(String.raw`^(${ID})\s+arrow:\s*(\S*)\s*$`);
const ARROWS = ["end", "both"];
const COLOR_LINE = new RegExp(String.raw`^(${ID})\s+colou?r:\s*(\S*)\s*$`);
const DIAGRAM_NOTE = "note:";
const STYLE_LINE = /^style:\s*(\S*)\s*$/;
const STYLES = ["clean", "sketch"];
const LAYOUT_HEADER = "@layout";
const INK_HEADER = "@ink";
const INK_LINE = new RegExp(String.raw`^(${ID})((?:\s+-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)+)$`);
const DESCRIPTION_MARK = "--";
/**
* Descriptions and labels run to the end of their line, so a newline in one is
* written as `\n`, and a backslash as `\\`.
* @param {string} text
*/
const escapeRest = (text) => text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
/** @param {string} text */
const unescapeRest = (text) => text.replace(/\\(\\|n)/g, (_match, char) => char === "n" ? "\n" : "\\");
/**
* Notes are written one line per line of text, so each reads, and diffs, on
* its own. Blank lines are dropped.
* @param {string | undefined} notes
*/
const noteLines$1 = (notes) => String(notes ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
/**
* `->`, dashed `-->`, both ways `<->`, or both `<-->`.
* @param {import('./types.js').FlowEdge} edge
*/
const arrowOf = (edge) => `${edge.both ? "<" : ""}${edge.dashed ? "--" : "-"}>`;
/** @param {number} value */
const coordinate = (value) => String(Math.round(value));
/**
* @param {import('./types.js').FlowDocument} document
* @returns {string}
*/
function serialiseFlow(document) {
	const sections = [[
		`title: ${escapeRest(document.title ?? "Untitled diagram")}`,
		...document.style === "sketch" ? ["style: sketch"] : [],
		...document.lines && LINES.includes(document.lines) && document.lines !== LINE.STEP ? [`lines: ${document.lines}`] : [],
		...noteLines$1(document.notes).map((line) => `${DIAGRAM_NOTE} ${line}`)
	].join("\n")];
	const nodes = document.nodes.map((node) => {
		const description = node.data?.description;
		const name = JSON.stringify(node.name ?? "");
		const tail = description ? ` ${DESCRIPTION_MARK} ${escapeRest(description)}` : "";
		return [
			`${node.type === SHAPE.INK && !node.name ? `${node.id} = ${node.type}` : `${node.id} = ${node.type} ${name}`}${tail}`,
			...isColor(node.data?.color) ? [`${node.id} color: ${node.data.color}`] : [],
			...node.type === SHAPE.INK && ARROWS.includes(node.data?.arrow) ? [`${node.id} arrow: ${node.data.arrow}`] : [],
			...noteLines$1(node.data?.notes).map((line) => `${node.id} note: ${line}`)
		].join("\n");
	});
	if (nodes.length) sections.push(nodes.join("\n"));
	const edges = document.edges.map((edge) => {
		const label = edge.label ? ` : ${escapeRest(edge.label)}` : "";
		return `${edge.source} ${arrowOf(edge)} ${edge.target}${label}`;
	});
	if (edges.length) sections.push(edges.join("\n"));
	const placed = document.nodes.filter((node) => node.position);
	if (placed.length) sections.push([LAYOUT_HEADER, ...placed.map((node) => `${node.id} ${coordinate(node.position.x)},${coordinate(node.position.y)}${node.size ? ` ${coordinate(node.size.width)}x${coordinate(node.size.height)}` : ""}`)].join("\n"));
	const inked = document.nodes.filter((node) => node.type === SHAPE.INK && node.data?.points);
	if (inked.length) sections.push([INK_HEADER, ...inked.map((node) => `${node.id} ${node.data.points}`)].join("\n"));
	return `${sections.join("\n\n")}\n`;
}
/**
* Every problem is reported, each with its line, rather than stopping at the
* first: an editor can mark them all at once. The document is null whenever
* there is any error, so a half-read diagram is never mistaken for the whole.
*
* @param {string} text
* @returns {{ document: import('./types.js').FlowDocument | null, errors: FlowTextError[] }}
*/
function parseFlow(text) {
	/** @type {FlowTextError[]} */
	const errors = [];
	/** @type {Record<string, any>[]} */
	const nodes = [];
	/** @type {import('./types.js').FlowEdge[]} */
	const edges = [];
	/** @type {Map<string, Record<string, any>>} */
	const byId = /* @__PURE__ */ new Map();
	/** @type {{ line: number, id: string, x: number, y: number, width?: number, height?: number }[]} */
	const layout = [];
	/** @type {{ line: number, source: string, target: string, label: string, dashed: boolean, both: boolean }[]} */
	const pendingEdges = [];
	/** @type {{ line: number, id: string, text: string }[]} */
	const pendingNotes = [];
	/** @type {{ line: number, id: string, color: string }[]} */
	const pendingColors = [];
	/** @type {{ line: number, id: string, arrow: string }[]} */
	const pendingArrows = [];
	/** @type {string[]} */
	const diagramNotes = [];
	let title = DEFAULT_TITLE;
	/** @type {string} */
	let style = "clean";
	/** @type {string} */
	let lines = LINE.STEP;
	let inLayout = false;
	let inInk = false;
	/** @type {{ line: number, id: string, points: string }[]} */
	const inks = [];
	String(text ?? "").split(/\r?\n/).forEach((raw, index) => {
		const line = index + 1;
		const content = raw.trim();
		/** @param {string} message */
		const fail = (message) => errors.push({
			line,
			message
		});
		if (!content || content.startsWith("#")) return;
		if (content === LAYOUT_HEADER) {
			inLayout = true;
			inInk = false;
			return;
		}
		if (content === INK_HEADER) {
			inInk = true;
			inLayout = false;
			return;
		}
		if (inInk) {
			const match = INK_LINE.exec(content);
			if (!match) return fail("Expected a pen stroke, like `m1 0,0 40,20 100,0`.");
			inks.push({
				line,
				id: match[1],
				points: match[2].trim().split(/\s+/).join(" ")
			});
			return;
		}
		if (inLayout) {
			const match = LAYOUT_LINE.exec(content);
			if (!match) return fail("Expected a position, like `api 120,340`, or `api 120,340 300x120`.");
			layout.push({
				line,
				id: match[1],
				x: Number(match[2]),
				y: Number(match[3]),
				...match[4] ? {
					width: Number(match[4]),
					height: Number(match[5])
				} : {}
			});
			return;
		}
		if (content.startsWith("title:")) {
			title = unescapeRest(content.slice(6).trim());
			return;
		}
		const lined = LINES_LINE.exec(content);
		if (lined) {
			if (!LINES.includes(lined[1])) return fail(`Unknown lines "${lined[1]}". Use one of: ${LINES.join(", ")}.`);
			lines = lined[1];
			return;
		}
		const styled = STYLE_LINE.exec(content);
		if (styled) {
			if (!STYLES.includes(styled[1])) return fail(`Unknown style "${styled[1]}". Use one of: ${STYLES.join(", ")}.`);
			style = styled[1];
			return;
		}
		if (content.startsWith(DIAGRAM_NOTE)) {
			diagramNotes.push(content.slice(5).trim());
			return;
		}
		const note = NOTE_LINE.exec(content);
		if (note) {
			pendingNotes.push({
				line,
				id: note[1],
				text: note[2].trim()
			});
			return;
		}
		const headed = ARROW_LINE.exec(content);
		if (headed) {
			if (!ARROWS.includes(headed[2])) return fail(`Unknown arrow "${headed[2]}". Use one of: ${ARROWS.join(", ")}.`);
			pendingArrows.push({
				line,
				id: headed[1],
				arrow: headed[2]
			});
			return;
		}
		const colored = COLOR_LINE.exec(content);
		if (colored) {
			if (!isColor(colored[2])) return fail(`Unknown color "${colored[2]}". Use one of: ${COLOR_NAMES.join(", ")}.`);
			pendingColors.push({
				line,
				id: colored[1],
				color: colored[2]
			});
			return;
		}
		const edge = EDGE_LINE.exec(content);
		if (edge) {
			pendingEdges.push({
				line,
				source: edge[1],
				target: edge[3],
				label: unescapeRest((edge[4] ?? "").trim()),
				dashed: edge[2].includes("--"),
				both: edge[2].startsWith("<")
			});
			return;
		}
		const node = NODE_LINE.exec(content);
		if (!node) return fail("Expected a node, like `api = process \"API\"`, or an edge, like `a -> b`.");
		const [, id, shape, rest] = node;
		if (!isKnownShape(shape)) return fail(`Unknown shape "${shape}". Use one of: ${SHAPE_OPTIONS.map((o) => o.value).join(", ")}.`);
		if (byId.has(id)) return fail(`"${id}" is already defined.`);
		const parsed = readNameAndDescription(rest);
		if (parsed.error) return fail(parsed.error);
		const record = {
			id,
			type: shape,
			name: parsed.name ?? (shape === SHAPE.INK ? "" : id),
			data: parsed.description ? { description: parsed.description } : {}
		};
		nodes.push(record);
		byId.set(id, record);
	});
	pendingEdges.forEach(({ line, source, target, label, dashed, both }) => {
		const missing = [source, target].find((id) => !byId.has(id));
		if (missing) return errors.push({
			line,
			message: `No node called "${missing}".`
		});
		if (source === target) return errors.push({
			line,
			message: "A node cannot connect to itself."
		});
		const id = edgeIdFor(source, target);
		if (edges.some((existing) => existing.id === id)) return errors.push({
			line,
			message: `${source} -> ${target} is already connected.`
		});
		edges.push({
			id,
			source,
			target,
			...label ? { label } : {},
			...dashed ? { dashed: true } : {},
			...both ? { both: true } : {}
		});
	});
	pendingNotes.forEach(({ line, id, text }) => {
		const node = byId.get(id);
		if (!node) return errors.push({
			line,
			message: `No node called "${id}".`
		});
		node.data.notes = node.data.notes ? `${node.data.notes}\n${text}` : text;
	});
	pendingColors.forEach(({ line, id, color }) => {
		const node = byId.get(id);
		if (!node) return errors.push({
			line,
			message: `No node called "${id}".`
		});
		node.data.color = color;
	});
	pendingArrows.forEach(({ line, id, arrow }) => {
		const node = byId.get(id);
		if (!node) return errors.push({
			line,
			message: `No node called "${id}".`
		});
		if (node.type !== SHAPE.INK) return errors.push({
			line,
			message: `"${id}" is not an ink shape; connect shapes with ->.`
		});
		node.data.arrow = arrow;
	});
	inks.forEach(({ line, id, points }) => {
		const node = byId.get(id);
		if (!node) return errors.push({
			line,
			message: `No node called "${id}".`
		});
		if (node.type !== SHAPE.INK) return errors.push({
			line,
			message: `"${id}" is not an ink shape, so it has no stroke.`
		});
		node.data.points = points;
	});
	const positioned = /* @__PURE__ */ new Set();
	layout.forEach(({ line, id, x, y, width, height }) => {
		const node = byId.get(id);
		if (!node) return errors.push({
			line,
			message: `No node called "${id}".`
		});
		if (positioned.has(id)) return errors.push({
			line,
			message: `"${id}" already has a position.`
		});
		positioned.add(id);
		node.position = {
			x,
			y
		};
		if (width && height) node.size = {
			width,
			height
		};
	});
	errors.sort((a, b) => a.line - b.line);
	return errors.length ? {
		document: null,
		errors
	} : {
		document: {
			version: 3,
			title,
			...style === "sketch" ? { style: "sketch" } : {},
			...lines !== LINE.STEP ? { lines } : {},
			...diagramNotes.length ? { notes: diagramNotes.join("\n") } : {},
			nodes,
			edges
		},
		errors
	};
}
/**
* `"Name" -- description`, where both parts are optional.
* @param {string} rest
* @returns {{ name?: string, description?: string, error?: string }}
*/
function readNameAndDescription(rest) {
	let remaining = rest.trim();
	/** @type {string | undefined} */
	let name;
	if (remaining.startsWith("\"")) {
		const end = closingQuote(remaining);
		if (end === -1) return { error: "The name is missing its closing quote." };
		try {
			name = JSON.parse(remaining.slice(0, end + 1));
		} catch {
			return { error: "The name has an escape JSON does not allow." };
		}
		remaining = remaining.slice(end + 1).trim();
	}
	if (!remaining) return { name };
	if (!remaining.startsWith(DESCRIPTION_MARK)) return { error: "Put the name in quotes, and start a description with `--`." };
	return {
		name,
		description: unescapeRest(remaining.slice(2).trim())
	};
}
/**
* The index of the quote that closes the one at 0, skipping escaped quotes.
* @param {string} text
*/
function closingQuote(text) {
	for (let index = 1; index < text.length; index += 1) if (text[index] === "\\") index += 1;
	else if (text[index] === "\"") return index;
	return -1;
}
const FLOW_EXTENSION = ".flow";
//#endregion
//#region src/domain/frames.js
/**
* Frames: named regions that group the shapes inside them. Membership is where
* a shape sits, not a list to keep in step: a shape belongs to the smallest
* frame its centre is in, so dragging it in or out is all it takes.
*/
/** @param {{ type?: string }} node */
const isFrame = (node) => node.type === SHAPE.FRAME;
/**
* Each frame's members, frames inside frames included.
* @param {import('./types.js').FlowDocument} document
* @returns {Map<string, string[]>} frame id to member ids, in document order
*/
function frameMembers(document) {
	const at = documentPositions(document);
	const box = (node) => ({
		...at.get(toNodeId(node.id)) ?? {
			x: 0,
			y: 0
		},
		...sizeOf(node)
	});
	const frames = document.nodes.filter(isFrame).map((node) => ({
		id: toNodeId(node.id),
		...box(node)
	}));
	const members = new Map(frames.map((frame) => [frame.id, []]));
	if (!frames.length) return members;
	document.nodes.forEach((node) => {
		const id = toNodeId(node.id);
		const own = box(node);
		const centre = {
			x: own.x + own.width / 2,
			y: own.y + own.height / 2
		};
		const holder = frames.filter((frame) => frame.id !== id && frame.width * frame.height > own.width * own.height && centre.x >= frame.x && centre.x <= frame.x + frame.width && centre.y >= frame.y && centre.y <= frame.y + frame.height).sort((a, b) => a.width * a.height - b.width * b.height)[0];
		if (holder) members.get(holder.id)?.push(id);
	});
	return members;
}
//#endregion
//#region src/domain/brief.js
/**
* What each shape asks of whoever builds from the diagram. The palette's hints
* say what a shape looks like; these say what it means for the code.
* @type {Readonly<Record<string, string>>}
*/
const INTENT = Object.freeze({
	[SHAPE.PROCESS]: "a component or step",
	[SHAPE.TERMINAL]: "where a flow starts or ends, or something outside the system",
	[SHAPE.DECISION]: "a branch the code must handle",
	[SHAPE.DATA]: "data going in or out",
	[SHAPE.DATABASE]: "a data store",
	[SHAPE.DOCUMENT]: "a file or document",
	[SHAPE.NOTE]: "a note for whoever builds this",
	[SHAPE.TABLE]: "a database table",
	[SHAPE.TEXT]: "a label",
	[SHAPE.SCREEN]: "a screen or page of the interface",
	[SHAPE.BUTTON]: "a button",
	[SHAPE.INPUT]: "a form field",
	[SHAPE.CARD]: "a card or panel",
	[SHAPE.LIST]: "a list of repeated items",
	[SHAPE.IMAGE]: "an image or media"
});
/** @param {string} type */
const intentOf = (type) => INTENT[type] ?? "a shape";
/** One line, so a description cannot break the list it sits in. */
/** @param {string | undefined} text */
const oneLine = (text) => String(text ?? "").replace(/\s*\n\s*/g, "; ").trim();
/** @param {string | undefined} text */
const noteLines = (text) => String(text ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
/** @param {string} text */
const escapeMarkdown = (text) => text.replace(/([\\`*_[\]])/g, "\\$1");
/**
* A fence longer than any run of backticks inside, so the source cannot close
* it early.
* @param {string} text
*/
function fence(text) {
	const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
	return "`".repeat(Math.max(3, longest + 1));
}
/**
* The diagram as a Markdown brief for a coding agent: what each shape is for,
* every connection in words, then the `.flow` source to edit and hand back.
* Ids are kept, so an agent can refer to a shape without guessing.
*
* @param {import('./types.js').FlowDocument} document
* @returns {string}
*/
function toBrief(document) {
	const names = new Map(document.nodes.map((node) => [node.id, node.name || node.id]));
	const label = (id) => `**${escapeMarkdown(names.get(id) ?? id)}**`;
	const count = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;
	const shapes = document.nodes.filter((node) => node.type !== SHAPE.INK && !isFrame(node));
	const frames = document.nodes.filter(isFrame);
	const strokes = document.nodes.filter((node) => node.type === SHAPE.INK).length;
	const lines = [
		`# ${oneLine(document.title) || "Untitled diagram"}`,
		"",
		`A design sketched in isketch: ${count(shapes.length, "shape")} and ${count(document.edges.length, "connection")}. Build from it, and refer to shapes by their ids. To change the diagram, edit the source at the end and hand it back.`
	];
	const notes = noteLines(document.notes);
	if (notes.length) {
		lines.push("", "## Notes", "", "From whoever sketched this; follow them.", "");
		notes.forEach((note) => lines.push(`- ${note}`));
	}
	if (shapes.length) {
		lines.push("", "## Shapes", "");
		shapes.forEach((node) => {
			const description = oneLine(node.data?.description);
			const detail = node.type === SHAPE.TABLE && description ? `Columns: ${description}` : description;
			lines.push(`- ${label(node.id)} \`${node.id}\`: ${intentOf(node.type)}.${detail ? ` ${detail}` : ""}`, ...noteLines(node.data?.notes).map((note) => `  - Note: ${note}`));
		});
	}
	if (frames.length) {
		const members = frameMembers(document);
		lines.push("", "## Frames", "", "Named regions; each groups the shapes inside it.", "");
		frames.forEach((frame) => {
			const inside = (members.get(frame.id) ?? []).map(label);
			const description = oneLine(frame.data?.description);
			lines.push(`- ${label(frame.id)} \`${frame.id}\`: ${inside.length ? `groups ${inside.join(", ")}` : "empty"}.${description ? ` ${description}` : ""}`, ...noteLines(frame.data?.notes).map((note) => `  - Note: ${note}`));
		});
	}
	if (strokes) lines.push("", `The sketch also has ${count(strokes, "pen stroke")} drawn over it by hand, left out here.`);
	if (document.edges.length) {
		lines.push("", "## Connections", "");
		document.edges.forEach((edge) => {
			const text = oneLine(edge.label);
			const arrow = edge.both ? "↔" : "→";
			const dashed = edge.dashed ? " (dashed: optional or asynchronous)" : "";
			lines.push(`- ${label(edge.source)} ${arrow} ${label(edge.target)}${text ? `: ${text}` : ""}${dashed}`);
		});
	}
	const source = serialiseFlow(document).trimEnd();
	const marks = fence(source);
	lines.push("", "## Source", "", "The same diagram in the `.flow` format: `id = shape \"Name\" -- description`, `id note: ...`, `a -> b : label` (`-->` dashed, `<->` both ways), and positions under `@layout`.", "", `${marks}text`, source, marks);
	return `${lines.join("\n")}\n`;
}
//#endregion
//#region src/mcp/protocol.js
/**
* The Model Context Protocol, one JSON-RPC message at a time, for any set of
* tools. Shared by the local server over stdio (`isketch mcp`) and the hosted
* one over HTTP, so both speak exactly the same protocol.
*/
/** @typedef {{ jsonrpc: '2.0', id?: string | number | null, method?: string, params?: any }} Message */
/**
* @template Context
* @typedef {{
*   name: string,
*   description: string,
*   inputSchema: object,
*   run: (context: Context, args: Record<string, unknown>) => Promise<string>,
* }} Tool
*/
const SERVER_INFO = Object.freeze({
	name: "isketch",
	version: "0.1.0"
});
/** Newest first; a client asking for one we do not know gets the newest. */
const PROTOCOL_VERSIONS = Object.freeze([
	"2025-06-18",
	"2025-03-26",
	"2024-11-05"
]);
/** A tool's failure the agent should read and act on, rather than a protocol error. */
var ToolError = class extends Error {};
/**
* @template Context
* @param {{ tools: readonly Tool<Context>[], instructions: string, context: Context }} server
* @returns {(message: Message) => Promise<object | null>} a response, or null for a notification
*/
function createProtocol({ tools, instructions, context }) {
	return async function handle(message) {
		const { id, method, params } = message ?? {};
		const isRequest = id !== void 0 && id !== null;
		if (message?.jsonrpc !== "2.0" || typeof method !== "string") return isRequest ? failure(id ?? null, -32600, "Invalid request") : null;
		if (!isRequest) return null;
		try {
			switch (method) {
				case "initialize": return success(id, {
					protocolVersion: PROTOCOL_VERSIONS.includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSIONS[0],
					capabilities: { tools: {} },
					serverInfo: SERVER_INFO,
					instructions
				});
				case "ping": return success(id, {});
				case "tools/list": return success(id, { tools: tools.map(({ name, description, inputSchema }) => ({
					name,
					description,
					inputSchema
				})) });
				case "tools/call": return success(id, await callTool(tools, context, params));
				default: return failure(id, -32601, `Unknown method: ${method}`);
			}
		} catch (error) {
			return failure(id, -32603, error instanceof Error ? error.message : String(error));
		}
	};
}
/**
* @template Context
* @param {readonly Tool<Context>[]} tools
* @param {Context} context
* @param {{ name?: string, arguments?: Record<string, unknown> }} params
*/
async function callTool(tools, context, params) {
	const tool = tools.find((candidate) => candidate.name === params?.name);
	if (!tool) return toolResult(`Unknown tool: ${params?.name}`, true);
	try {
		return toolResult(await tool.run(context, params.arguments ?? {}));
	} catch (error) {
		if (error instanceof ToolError) return toolResult(error.message, true);
		throw error;
	}
}
/** @param {string} text @param {boolean} [isError] */
const toolResult = (text, isError = false) => ({
	content: [{
		type: "text",
		text
	}],
	...isError ? { isError: true } : {}
});
/** @param {string | number} id @param {object} result */
const success = (id, result) => ({
	jsonrpc: "2.0",
	id,
	result
});
/** @param {string | number | null} id @param {number} code @param {string} message */
const failure = (id, code, message) => ({
	jsonrpc: "2.0",
	id,
	error: {
		code,
		message
	}
});
//#endregion
//#region src/domain/diff.js
/**
* @typedef {'added' | 'removed' | 'changed'} Change
*
* @typedef {Object} DocumentDiff
* @property {{ added: string[], removed: string[], changed: string[], moved: string[] }} nodes
* @property {{ added: string[], removed: string[], changed: string[] }} edges
*/
/**
* What changed between two versions of a diagram. A node is changed when what
* it says changes (name, shape, description) and moved when only where it sits
* does, because a review cares about the first far more than the second.
*
* @param {import('./types.js').FlowDocument} before
* @param {import('./types.js').FlowDocument} after
* @returns {DocumentDiff}
*/
function diffDocuments(before, after) {
	const oldNodes = new Map(before.nodes.map((node) => [String(node.id), node]));
	const newNodes = new Map(after.nodes.map((node) => [String(node.id), node]));
	const oldEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
	const newEdges = new Map(after.edges.map((edge) => [edge.id, edge]));
	/** @param {Record<string, any>} node */
	const meaning = (node) => JSON.stringify([
		node.name ?? "",
		node.type,
		node.data?.description ?? "",
		node.data?.notes ?? ""
	]);
	/** @param {Record<string, any>} node */
	const place = (node) => JSON.stringify([node.position ?? null, node.size ?? null]);
	/** What an edge says and how it is drawn; moving its ends is not a change. */
	/** @param {import('./types.js').FlowEdge | undefined} edge */
	const look = (edge) => JSON.stringify([
		edge?.label ?? "",
		Boolean(edge?.dashed),
		Boolean(edge?.both)
	]);
	const both = [...newNodes.keys()].filter((id) => oldNodes.has(id));
	return {
		nodes: {
			added: [...newNodes.keys()].filter((id) => !oldNodes.has(id)),
			removed: [...oldNodes.keys()].filter((id) => !newNodes.has(id)),
			changed: both.filter((id) => meaning(oldNodes.get(id) ?? {}) !== meaning(newNodes.get(id) ?? {})),
			moved: both.filter((id) => meaning(oldNodes.get(id) ?? {}) === meaning(newNodes.get(id) ?? {}) && place(oldNodes.get(id) ?? {}) !== place(newNodes.get(id) ?? {}))
		},
		edges: {
			added: [...newEdges.keys()].filter((id) => !oldEdges.has(id)),
			removed: [...oldEdges.keys()].filter((id) => !newEdges.has(id)),
			changed: [...newEdges.keys()].filter((id) => oldEdges.has(id) && look(oldEdges.get(id)) !== look(newEdges.get(id)))
		}
	};
}
/** @param {DocumentDiff} diff */
const isUnchanged = (diff) => [...Object.values(diff.nodes), ...Object.values(diff.edges)].every((ids) => ids.length === 0);
/**
* The diff as lines a pull request comment or a terminal can show.
* @param {import('./types.js').FlowDocument} before
* @param {import('./types.js').FlowDocument} after
* @param {DocumentDiff} diff
* @returns {string[]}
*/
function describeDiff(before, after, diff) {
	const name = (document, id) => {
		const node = document.nodes.find((candidate) => String(candidate.id) === id);
		return node?.name || (node?.type === "ink" ? "pen stroke" : id);
	};
	const edgeName = (document, id) => {
		const edge = document.edges.find((candidate) => candidate.id === id);
		if (!edge) return id;
		const label = edge.label ? ` (${edge.label})` : "";
		return `${name(document, edge.source)} → ${name(document, edge.target)}${label}`;
	};
	return [
		...diff.nodes.added.map((id) => `+ ${name(after, id)}`),
		...diff.nodes.removed.map((id) => `- ${name(before, id)}`),
		...diff.nodes.changed.map((id) => `~ ${name(before, id)}${name(before, id) === name(after, id) ? "" : ` → ${name(after, id)}`}`),
		...diff.edges.added.map((id) => `+ ${edgeName(after, id)}`),
		...diff.edges.removed.map((id) => `- ${edgeName(before, id)}`),
		...diff.edges.changed.map((id) => `~ ${edgeName(after, id)}`),
		...diff.nodes.moved.length ? [`  ${diff.nodes.moved.length} moved`] : []
	];
}
//#endregion
//#region src/domain/shapes.js
/**
* SVG path data for each shape's outline in a `width` by `height` box, inset by
* `inset` so a stroke is not clipped at the edge. Pure, so the same outline can
* be drawn on the canvas, in the palette and, later, by the SVG exporter.
*
* @param {string} shape
* @param {number} width
* @param {number} height
* @param {number} [inset]
* @returns {string}
*/
function shapePath(shape, width, height, inset = 1) {
	const l = inset;
	const t = inset;
	const r = width - inset;
	const b = height - inset;
	const w = r - l;
	const h = b - t;
	const cx = l + w / 2;
	const cy = t + h / 2;
	switch (shape) {
		case SHAPE.TERMINAL: {
			const radius = h / 2;
			return `M${l + radius},${t} H${r - radius} A${radius},${radius} 0 0 1 ${r - radius},${b} H${l + radius} A${radius},${radius} 0 0 1 ${l + radius},${t} Z`;
		}
		case SHAPE.DECISION: return `M${cx},${t} L${r},${cy} L${cx},${b} L${l},${cy} Z`;
		case SHAPE.DATA: {
			const slant = Math.min(w * .12, h * .5);
			return `M${l + slant},${t} H${r} L${r - slant},${b} H${l} Z`;
		}
		case SHAPE.DATABASE: {
			const ry = Math.min(h * .12, 12);
			const rx = w / 2;
			return `M${l},${t + ry} A${rx},${ry} 0 0 1 ${r},${t + ry} V${b - ry} A${rx},${ry} 0 0 1 ${l},${b - ry} Z M${l},${t + ry} A${rx},${ry} 0 0 0 ${r},${t + ry}`;
		}
		case SHAPE.DOCUMENT: {
			const wave = Math.min(h * .12, 10);
			return `M${l},${t} H${r} V${b - wave} C${r - w / 4},${b - wave * 3} ${l + w / 4},${b + wave} ${l},${b - wave} Z`;
		}
		case SHAPE.NOTE: {
			const fold = Math.min(w, h) * .18;
			return `M${l},${t} H${r - fold} L${r},${t + fold} V${b} H${l} Z M${r - fold},${t} V${t + fold} H${r}`;
		}
		case SHAPE.TABLE: return `M${l},${t} H${r} V${b} H${l} Z M${l},${t + Math.min(h * .32, 30)} H${r}`;
		case SHAPE.TEXT:
		case SHAPE.INK: return "";
		case SHAPE.FRAME: return roundedRect(l, t, r, b, Math.min(12, h / 6));
		case SHAPE.SCREEN: {
			const bar = t + Math.min(h * .2, 18);
			const dot = Math.min(2.5, (bar - t) / 5);
			return `M${l},${t} H${r} V${b} H${l} Z M${l},${bar} H${r} ${[
				1,
				2,
				3
			].map((n) => {
				const x = l + n * dot * 3.5;
				const y = t + (bar - t) / 2;
				return `M${x - dot},${y} A${dot},${dot} 0 1 0 ${x + dot},${y} A${dot},${dot} 0 1 0 ${x - dot},${y}`;
			}).join(" ")}`;
		}
		case SHAPE.BUTTON: {
			const radius = Math.min(h / 2, 12);
			return roundedRect(l, t, r, b, radius);
		}
		case SHAPE.INPUT: return `M${l},${t} H${r} V${b} H${l} Z M${l + Math.min(10, w * .08)},${t + h * .3} V${b - h * .3}`;
		case SHAPE.CARD: {
			const lift = Math.min(4, w * .04, h * .04);
			return `${roundedRect(l, t, r - lift, b - lift, Math.min(8, h / 4))} M${l + 6},${b} H${r - 6} Q${r},${b} ${r},${b - 6} V${t + 6}`;
		}
		case SHAPE.LIST: return `M${l},${t} H${r} V${b} H${l} Z ${[
			.3,
			.5,
			.7
		].map((at) => `M${l + 8},${t + h * at} H${l + Math.min(w * .25, 40)}`).join(" ")}`;
		case SHAPE.IMAGE: {
			const sun = Math.min(w, h) * .07;
			const sx = r - sun * 3;
			const sy = t + sun * 3;
			const hill = (at) => b - h * at;
			return `M${l},${t} H${r} V${b} H${l} Z M${l},${hill(.08)} L${l + w * .25},${hill(.22)} L${l + w * .45},${hill(.1)} L${l + w * .7},${hill(.25)} L${r},${hill(.06)} M${sx - sun},${sy} A${sun},${sun} 0 1 0 ${sx + sun},${sy} A${sun},${sun} 0 1 0 ${sx - sun},${sy}`;
		}
		default: return roundedRect(l, t, r, b, Math.min(6, h / 4));
	}
}
/**
* @param {number} l
* @param {number} t
* @param {number} r
* @param {number} b
* @param {number} radius
*/
const roundedRect = (l, t, r, b, radius) => `M${l + radius},${t} H${r - radius} Q${r},${t} ${r},${t + radius} V${b - radius} Q${r},${b} ${r - radius},${b} H${l + radius} Q${l},${b} ${l},${b - radius} V${t + radius} Q${l},${t} ${l + radius},${t} Z`;
/**
* How far in from each side a shape's text must sit to stay inside the outline.
* @param {string} shape
* @param {number} width
* @param {number} height
* @returns {{ x: number, y: number }}
*/
function textInset(shape, width, height) {
	switch (shape) {
		case SHAPE.DECISION: return {
			x: width / 4,
			y: height / 8
		};
		case SHAPE.DATA: return {
			x: Math.min(width * .12, height * .5),
			y: 0
		};
		case SHAPE.TERMINAL: return {
			x: height / 3,
			y: 0
		};
		case SHAPE.DATABASE: return {
			x: 0,
			y: Math.min(height * .12, 12)
		};
		case SHAPE.SCREEN: return {
			x: 0,
			y: Math.min(height * .2, 18) / 2
		};
		case SHAPE.INPUT: return {
			x: 16,
			y: 0
		};
		case SHAPE.LIST: return {
			x: Math.min(width * .25, 40) + 4,
			y: 0
		};
		default: return {
			x: 0,
			y: 0
		};
	}
}
//#endregion
//#region src/domain/sketch.js
var import_rough_cjs = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	var t = function(e, n) {
		return t = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t, e) {
			t.__proto__ = e;
		} || function(t, e) {
			for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (t[n] = e[n]);
		}, t(e, n);
	};
	function e(e, n) {
		if ("function" != typeof n && null !== n) throw new TypeError("Class extends value " + String(n) + " is not a constructor or null");
		function r() {
			this.constructor = e;
		}
		t(e, n), e.prototype = null === n ? Object.create(n) : (r.prototype = n.prototype, new r());
	}
	var n = function() {
		return n = Object.assign || function(t) {
			for (var e, n = 1, r = arguments.length; n < r; n++) for (var a in e = arguments[n]) Object.prototype.hasOwnProperty.call(e, a) && (t[a] = e[a]);
			return t;
		}, n.apply(this, arguments);
	};
	function r(t, e, n) {
		if (n || 2 === arguments.length) for (var r, a = 0, s = e.length; a < s; a++) !r && a in e || (r || (r = Array.prototype.slice.call(e, 0, a)), r[a] = e[a]);
		return t.concat(r || Array.prototype.slice.call(e));
	}
	function a(t, e, n) {
		if (t && t.length) {
			const [r, a] = e, s = Math.PI / 180 * n, o = Math.cos(s), i = Math.sin(s);
			for (const e of t) {
				const [t, n] = e;
				e[0] = (t - r) * o - (n - a) * i + r, e[1] = (t - r) * i + (n - a) * o + a;
			}
		}
	}
	function s(t, e) {
		return t[0] === e[0] && t[1] === e[1];
	}
	function o(t, e, n, r = 1) {
		const o = n, i = Math.max(e, .1), h = t[0] && t[0][0] && "number" == typeof t[0][0] ? [t] : t, u = [0, 0];
		if (o) for (const t of h) a(t, u, o);
		const p = function(t, e, n) {
			const r = [];
			for (const e of t) {
				const t = [...e];
				s(t[0], t[t.length - 1]) || t.push([t[0][0], t[0][1]]), t.length > 2 && r.push(t);
			}
			const a = [];
			e = Math.max(e, .1);
			const o = [];
			for (const t of r) for (let e = 0; e < t.length - 1; e++) {
				const n = t[e], r = t[e + 1];
				if (n[1] !== r[1]) {
					const t = Math.min(n[1], r[1]);
					o.push({
						ymin: t,
						ymax: Math.max(n[1], r[1]),
						x: t === n[1] ? n[0] : r[0],
						islope: (r[0] - n[0]) / (r[1] - n[1])
					});
				}
			}
			if (o.sort(((t, e) => t.ymin < e.ymin ? -1 : t.ymin > e.ymin ? 1 : t.x < e.x ? -1 : t.x > e.x ? 1 : t.ymax === e.ymax ? 0 : (t.ymax - e.ymax) / Math.abs(t.ymax - e.ymax))), !o.length) return a;
			let i = [], h = o[0].ymin, u = 0;
			for (; i.length || o.length;) {
				if (o.length) {
					let t = -1;
					for (let e = 0; e < o.length && !(o[e].ymin > h); e++) t = e;
					o.splice(0, t + 1).forEach(((t) => {
						i.push({
							s: h,
							edge: t
						});
					}));
				}
				if (i = i.filter(((t) => !(t.edge.ymax <= h))), i.sort(((t, e) => t.edge.x === e.edge.x ? 0 : (t.edge.x - e.edge.x) / Math.abs(t.edge.x - e.edge.x))), (1 !== n || u % e == 0) && i.length > 1) for (let t = 0; t < i.length; t += 2) {
					const e = t + 1;
					if (e >= i.length) break;
					const n = i[t].edge, r = i[e].edge;
					a.push([[Math.round(n.x), h], [Math.round(r.x), h]]);
				}
				h += n, i.forEach(((t) => {
					t.edge.x = t.edge.x + n * t.edge.islope;
				})), u++;
			}
			return a;
		}(h, i, r);
		if (o) {
			for (const t of h) a(t, u, -o);
			(function(t, e, n) {
				const r = [];
				t.forEach(((t) => r.push(...t))), a(r, e, n);
			})(p, u, -o);
		}
		return p;
	}
	function i(t, e) {
		var n, r = e.hachureAngle + 90, a = e.hachureGap;
		a < 0 && (a = 4 * e.strokeWidth), a = Math.round(Math.max(a, .1));
		var s = 1;
		return e.roughness >= 1 && ((null === (n = e.randomizer) || void 0 === n ? void 0 : n.next()) || Math.random()) > .7 && (s = a), o(t, a, r, s || 1);
	}
	var h = function() {
		function t(t) {
			this.helper = t;
		}
		return t.prototype.fillPolygons = function(t, e) {
			return this._fillPolygons(t, e);
		}, t.prototype._fillPolygons = function(t, e) {
			var n = i(t, e);
			return {
				type: "fillSketch",
				ops: this.renderLines(n, e)
			};
		}, t.prototype.renderLines = function(t, e) {
			for (var n = [], r = 0, a = t; r < a.length; r++) {
				var s = a[r];
				n.push.apply(n, this.helper.doubleLineOps(s[0][0], s[0][1], s[1][0], s[1][1], e));
			}
			return n;
		}, t;
	}();
	function u(t) {
		var e = t[0], n = t[1];
		return Math.sqrt(Math.pow(e[0] - n[0], 2) + Math.pow(e[1] - n[1], 2));
	}
	var p = function(t) {
		function n() {
			return null !== t && t.apply(this, arguments) || this;
		}
		return e(n, t), n.prototype.fillPolygons = function(t, e) {
			var n = e.hachureGap;
			n < 0 && (n = 4 * e.strokeWidth), n = Math.max(n, .1);
			for (var a = i(t, Object.assign({}, e, { hachureGap: n })), s = Math.PI / 180 * e.hachureAngle, o = [], h = .5 * n * Math.cos(s), p = .5 * n * Math.sin(s), l = 0, c = a; l < c.length; l++) {
				var f = c[l], d = f[0], g = f[1];
				u([d, g]) && o.push([[d[0] - h, d[1] + p], r([], g, !0)], [[d[0] + h, d[1] - p], r([], g, !0)]);
			}
			return {
				type: "fillSketch",
				ops: this.renderLines(o, e)
			};
		}, n;
	}(h);
	var l = function(t) {
		function n() {
			return null !== t && t.apply(this, arguments) || this;
		}
		return e(n, t), n.prototype.fillPolygons = function(t, e) {
			var n = this._fillPolygons(t, e), r = Object.assign({}, e, { hachureAngle: e.hachureAngle + 90 }), a = this._fillPolygons(t, r);
			return n.ops = n.ops.concat(a.ops), n;
		}, n;
	}(h);
	var c = function() {
		function t(t) {
			this.helper = t;
		}
		return t.prototype.fillPolygons = function(t, e) {
			var n = i(t, e = Object.assign({}, e, { hachureAngle: 0 }));
			return this.dotsOnLines(n, e);
		}, t.prototype.dotsOnLines = function(t, e) {
			var n = [], r = e.hachureGap;
			r < 0 && (r = 4 * e.strokeWidth), r = Math.max(r, .1);
			var a = e.fillWeight;
			a < 0 && (a = e.strokeWidth / 2);
			for (var s = r / 4, o = 0, i = t; o < i.length; o++) for (var h = i[o], p = u(h), l = p / r, c = Math.ceil(l) - 1, f = p - c * r, d = (h[0][0] + h[1][0]) / 2 - r / 4, g = Math.min(h[0][1], h[1][1]), y = 0; y < c; y++) {
				var v = g + f + y * r, M = d - s + 2 * Math.random() * s, k = v - s + 2 * Math.random() * s, b = this.helper.ellipse(M, k, a, a, e);
				n.push.apply(n, b.ops);
			}
			return {
				type: "fillSketch",
				ops: n
			};
		}, t;
	}();
	var f = function() {
		function t(t) {
			this.helper = t;
		}
		return t.prototype.fillPolygons = function(t, e) {
			var n = i(t, e);
			return {
				type: "fillSketch",
				ops: this.dashedLine(n, e)
			};
		}, t.prototype.dashedLine = function(t, e) {
			var n = this, r = e.dashOffset < 0 ? e.hachureGap < 0 ? 4 * e.strokeWidth : e.hachureGap : e.dashOffset, a = e.dashGap < 0 ? e.hachureGap < 0 ? 4 * e.strokeWidth : e.hachureGap : e.dashGap, s = [];
			return t.forEach((function(t) {
				var o = u(t), i = Math.floor(o / (r + a)), h = (o + a - i * (r + a)) / 2, p = t[0], l = t[1];
				p[0] > l[0] && (p = t[1], l = t[0]);
				for (var c = Math.atan((l[1] - p[1]) / (l[0] - p[0])), f = 0; f < i; f++) {
					var d = f * (r + a), g = d + r, y = [p[0] + d * Math.cos(c) + h * Math.cos(c), p[1] + d * Math.sin(c) + h * Math.sin(c)], v = [p[0] + g * Math.cos(c) + h * Math.cos(c), p[1] + g * Math.sin(c) + h * Math.sin(c)];
					s.push.apply(s, n.helper.doubleLineOps(y[0], y[1], v[0], v[1], e));
				}
			})), s;
		}, t;
	}();
	var d = function() {
		function t(t) {
			this.helper = t;
		}
		return t.prototype.fillPolygons = function(t, e) {
			var n = e.hachureGap < 0 ? 4 * e.strokeWidth : e.hachureGap, r = e.zigzagOffset < 0 ? n : e.zigzagOffset, a = i(t, e = Object.assign({}, e, { hachureGap: n + r }));
			return {
				type: "fillSketch",
				ops: this.zigzagLines(a, r, e)
			};
		}, t.prototype.zigzagLines = function(t, e, n) {
			var a = this, s = [];
			return t.forEach((function(t) {
				var o = u(t), i = Math.round(o / (2 * e)), h = t[0], p = t[1];
				h[0] > p[0] && (h = t[1], p = t[0]);
				for (var l = Math.atan((p[1] - h[1]) / (p[0] - h[0])), c = 0; c < i; c++) {
					var f = 2 * c * e, d = 2 * (c + 1) * e, g = Math.sqrt(2 * Math.pow(e, 2)), y = [h[0] + f * Math.cos(l), h[1] + f * Math.sin(l)], v = [h[0] + d * Math.cos(l), h[1] + d * Math.sin(l)], M = [y[0] + g * Math.cos(l + Math.PI / 4), y[1] + g * Math.sin(l + Math.PI / 4)];
					s.push.apply(s, r(r([], a.helper.doubleLineOps(y[0], y[1], M[0], M[1], n), !1), a.helper.doubleLineOps(M[0], M[1], v[0], v[1], n), !1));
				}
			})), s;
		}, t;
	}();
	var g = {};
	var y = function() {
		function t(t) {
			this.seed = t;
		}
		return t.prototype.next = function() {
			return this.seed ? (Math.pow(2, 31) - 1 & (this.seed = Math.imul(48271, this.seed))) / Math.pow(2, 31) : Math.random();
		}, t;
	}();
	const v = 0;
	const M = 1;
	const k = 2;
	const b = {
		A: 7,
		a: 7,
		C: 6,
		c: 6,
		H: 1,
		h: 1,
		L: 2,
		l: 2,
		M: 2,
		m: 2,
		Q: 4,
		q: 4,
		S: 4,
		s: 4,
		T: 2,
		t: 2,
		V: 1,
		v: 1,
		Z: 0,
		z: 0
	};
	function m(t, e) {
		return t.type === e;
	}
	function w(t) {
		const e = [], n = function(t) {
			const e = new Array();
			for (; "" !== t;) if (t.match(/^([ \t\r\n,]+)/)) t = t.substr(RegExp.$1.length);
			else if (t.match(/^([aAcChHlLmMqQsStTvVzZ])/)) e[e.length] = {
				type: v,
				text: RegExp.$1
			}, t = t.substr(RegExp.$1.length);
			else {
				if (!t.match(/^(([-+]?[0-9]+(\.[0-9]*)?|[-+]?\.[0-9]+)([eE][-+]?[0-9]+)?)/)) return [];
				e[e.length] = {
					type: M,
					text: `${parseFloat(RegExp.$1)}`
				}, t = t.substr(RegExp.$1.length);
			}
			return e[e.length] = {
				type: k,
				text: ""
			}, e;
		}(t);
		let r = "BOD", a = 0, s = n[a];
		for (; !m(s, k);) {
			let o = 0;
			const i = [];
			if ("BOD" === r) {
				if ("M" !== s.text && "m" !== s.text) return w("M0,0" + t);
				a++, o = b[s.text], r = s.text;
			} else m(s, M) ? o = b[r] : (a++, o = b[s.text], r = s.text);
			if (!(a + o < n.length)) throw new Error("Path data ended short");
			for (let t = a; t < a + o; t++) {
				const e = n[t];
				if (!m(e, M)) throw new Error("Param not a number: " + r + "," + e.text);
				i[i.length] = +e.text;
			}
			if ("number" != typeof b[r]) throw new Error("Bad segment: " + r);
			{
				const t = {
					key: r,
					data: i
				};
				e.push(t), a += o, s = n[a], "M" === r && (r = "L"), "m" === r && (r = "l");
			}
		}
		return e;
	}
	function P(t) {
		let e = 0, n = 0, r = 0, a = 0;
		const s = [];
		for (const { key: o, data: i } of t) switch (o) {
			case "M":
				s.push({
					key: "M",
					data: [...i]
				}), [e, n] = i, [r, a] = i;
				break;
			case "m":
				e += i[0], n += i[1], s.push({
					key: "M",
					data: [e, n]
				}), r = e, a = n;
				break;
			case "L":
				s.push({
					key: "L",
					data: [...i]
				}), [e, n] = i;
				break;
			case "l":
				e += i[0], n += i[1], s.push({
					key: "L",
					data: [e, n]
				});
				break;
			case "C":
				s.push({
					key: "C",
					data: [...i]
				}), e = i[4], n = i[5];
				break;
			case "c": {
				const t = i.map(((t, r) => r % 2 ? t + n : t + e));
				s.push({
					key: "C",
					data: t
				}), e = t[4], n = t[5];
				break;
			}
			case "Q":
				s.push({
					key: "Q",
					data: [...i]
				}), e = i[2], n = i[3];
				break;
			case "q": {
				const t = i.map(((t, r) => r % 2 ? t + n : t + e));
				s.push({
					key: "Q",
					data: t
				}), e = t[2], n = t[3];
				break;
			}
			case "A":
				s.push({
					key: "A",
					data: [...i]
				}), e = i[5], n = i[6];
				break;
			case "a":
				e += i[5], n += i[6], s.push({
					key: "A",
					data: [
						i[0],
						i[1],
						i[2],
						i[3],
						i[4],
						e,
						n
					]
				});
				break;
			case "H":
				s.push({
					key: "H",
					data: [...i]
				}), e = i[0];
				break;
			case "h":
				e += i[0], s.push({
					key: "H",
					data: [e]
				});
				break;
			case "V":
				s.push({
					key: "V",
					data: [...i]
				}), n = i[0];
				break;
			case "v":
				n += i[0], s.push({
					key: "V",
					data: [n]
				});
				break;
			case "S":
				s.push({
					key: "S",
					data: [...i]
				}), e = i[2], n = i[3];
				break;
			case "s": {
				const t = i.map(((t, r) => r % 2 ? t + n : t + e));
				s.push({
					key: "S",
					data: t
				}), e = t[2], n = t[3];
				break;
			}
			case "T":
				s.push({
					key: "T",
					data: [...i]
				}), e = i[0], n = i[1];
				break;
			case "t":
				e += i[0], n += i[1], s.push({
					key: "T",
					data: [e, n]
				});
				break;
			case "Z":
			case "z": s.push({
				key: "Z",
				data: []
			}), e = r, n = a;
		}
		return s;
	}
	function x(t) {
		const e = [];
		let n = "", r = 0, a = 0, s = 0, o = 0, i = 0, h = 0;
		for (const { key: u, data: p } of t) {
			switch (u) {
				case "M":
					e.push({
						key: "M",
						data: [...p]
					}), [r, a] = p, [s, o] = p;
					break;
				case "C":
					e.push({
						key: "C",
						data: [...p]
					}), r = p[4], a = p[5], i = p[2], h = p[3];
					break;
				case "L":
					e.push({
						key: "L",
						data: [...p]
					}), [r, a] = p;
					break;
				case "H":
					r = p[0], e.push({
						key: "L",
						data: [r, a]
					});
					break;
				case "V":
					a = p[0], e.push({
						key: "L",
						data: [r, a]
					});
					break;
				case "S": {
					let t = 0, s = 0;
					"C" === n || "S" === n ? (t = r + (r - i), s = a + (a - h)) : (t = r, s = a), e.push({
						key: "C",
						data: [
							t,
							s,
							...p
						]
					}), i = p[0], h = p[1], r = p[2], a = p[3];
					break;
				}
				case "T": {
					const [t, s] = p;
					let o = 0, u = 0;
					"Q" === n || "T" === n ? (o = r + (r - i), u = a + (a - h)) : (o = r, u = a);
					const l = r + 2 * (o - r) / 3, c = a + 2 * (u - a) / 3, f = t + 2 * (o - t) / 3, d = s + 2 * (u - s) / 3;
					e.push({
						key: "C",
						data: [
							l,
							c,
							f,
							d,
							t,
							s
						]
					}), i = o, h = u, r = t, a = s;
					break;
				}
				case "Q": {
					const [t, n, s, o] = p, u = r + 2 * (t - r) / 3, l = a + 2 * (n - a) / 3, c = s + 2 * (t - s) / 3, f = o + 2 * (n - o) / 3;
					e.push({
						key: "C",
						data: [
							u,
							l,
							c,
							f,
							s,
							o
						]
					}), i = t, h = n, r = s, a = o;
					break;
				}
				case "A": {
					const t = Math.abs(p[0]), n = Math.abs(p[1]), s = p[2], o = p[3], i = p[4], h = p[5], u = p[6];
					if (0 === t || 0 === n) e.push({
						key: "C",
						data: [
							r,
							a,
							h,
							u,
							h,
							u
						]
					}), r = h, a = u;
					else if (r !== h || a !== u) O(r, a, h, u, t, n, s, o, i).forEach((function(t) {
						e.push({
							key: "C",
							data: t
						});
					})), r = h, a = u;
					break;
				}
				case "Z": e.push({
					key: "Z",
					data: []
				}), r = s, a = o;
			}
			n = u;
		}
		return e;
	}
	function S(t, e, n) {
		return [t * Math.cos(n) - e * Math.sin(n), t * Math.sin(n) + e * Math.cos(n)];
	}
	function O(t, e, n, r, a, s, o, i, h, u) {
		const p = (l = o, Math.PI * l / 180);
		var l;
		let c = [], f = 0, d = 0, g = 0, y = 0;
		if (u) [f, d, g, y] = u;
		else {
			[t, e] = S(t, e, -p), [n, r] = S(n, r, -p);
			const o = (t - n) / 2, u = (e - r) / 2;
			let l = o * o / (a * a) + u * u / (s * s);
			l > 1 && (l = Math.sqrt(l), a *= l, s *= l);
			const c = a * a, v = s * s, M = c * v - c * u * u - v * o * o, k = c * u * u + v * o * o, b = (i === h ? -1 : 1) * Math.sqrt(Math.abs(M / k));
			g = b * a * u / s + (t + n) / 2, y = b * -s * o / a + (e + r) / 2, f = Math.asin(parseFloat(((e - y) / s).toFixed(9))), d = Math.asin(parseFloat(((r - y) / s).toFixed(9))), t < g && (f = Math.PI - f), n < g && (d = Math.PI - d), f < 0 && (f = 2 * Math.PI + f), d < 0 && (d = 2 * Math.PI + d), h && f > d && (f -= 2 * Math.PI), !h && d > f && (d -= 2 * Math.PI);
		}
		let v = d - f;
		if (Math.abs(v) > 120 * Math.PI / 180) {
			const t = d, e = n, i = r;
			d = h && d > f ? f + 120 * Math.PI / 180 * 1 : f + 120 * Math.PI / 180 * -1, c = O(n = g + a * Math.cos(d), r = y + s * Math.sin(d), e, i, a, s, o, 0, h, [
				d,
				t,
				g,
				y
			]);
		}
		v = d - f;
		const M = Math.cos(f), k = Math.sin(f), b = Math.cos(d), m = Math.sin(d), w = Math.tan(v / 4), P = 4 / 3 * a * w, x = 4 / 3 * s * w, L = [t, e], T = [t + P * k, e - x * M], _ = [n + P * m, r - x * b], D = [n, r];
		if (T[0] = 2 * L[0] - T[0], T[1] = 2 * L[1] - T[1], u) return [
			T,
			_,
			D
		].concat(c);
		{
			c = [
				T,
				_,
				D
			].concat(c);
			const t = [];
			for (let e = 0; e < c.length; e += 3) {
				const n = S(c[e][0], c[e][1], p), r = S(c[e + 1][0], c[e + 1][1], p), a = S(c[e + 2][0], c[e + 2][1], p);
				t.push([
					n[0],
					n[1],
					r[0],
					r[1],
					a[0],
					a[1]
				]);
			}
			return t;
		}
	}
	var L = {
		randOffset: function(t, e) {
			return F(t, e);
		},
		randOffsetWithRange: function(t, e, n) {
			return q(t, e, n);
		},
		ellipse: function(t, e, n, r, a) {
			return C(t, e, a, I(n, r, a)).opset;
		},
		doubleLineOps: function(t, e, n, r, a) {
			return V(t, e, n, r, a, !0);
		}
	};
	function T(t, e, n, r, a) {
		return {
			type: "path",
			ops: V(t, e, n, r, a)
		};
	}
	function _(t, e, n) {
		var r = (t || []).length;
		if (r > 2) {
			for (var a = [], s = 0; s < r - 1; s++) a.push.apply(a, V(t[s][0], t[s][1], t[s + 1][0], t[s + 1][1], n));
			return e && a.push.apply(a, V(t[r - 1][0], t[r - 1][1], t[0][0], t[0][1], n)), {
				type: "path",
				ops: a
			};
		}
		return 2 === r ? T(t[0][0], t[0][1], t[1][0], t[1][1], n) : {
			type: "path",
			ops: []
		};
	}
	function D(t, e, n, r, a) {
		return function(t, e) {
			return _(t, !0, e);
		}([
			[t, e],
			[t + n, e],
			[t + n, e + r],
			[t, e + r]
		], a);
	}
	function A(t, e) {
		if (t.length) {
			for (var n = "number" == typeof t[0][0] ? [t] : t, r = Q(n[0], 1 * (1 + .2 * e.roughness), e), a = e.disableMultiStroke ? [] : Q(n[0], 1.5 * (1 + .22 * e.roughness), R(e)), s = 1; s < n.length; s++) {
				var o = n[s];
				if (o.length) {
					for (var i = Q(o, 1 * (1 + .2 * e.roughness), e), h = e.disableMultiStroke ? [] : Q(o, 1.5 * (1 + .22 * e.roughness), R(e)), u = 0, p = i; u < p.length; u++) "move" !== (f = p[u]).op && r.push(f);
					for (var l = 0, c = h; l < c.length; l++) {
						var f;
						"move" !== (f = c[l]).op && a.push(f);
					}
				}
			}
			return {
				type: "path",
				ops: r.concat(a)
			};
		}
		return {
			type: "path",
			ops: []
		};
	}
	function I(t, e, n) {
		var r = Math.sqrt(2 * Math.PI * Math.sqrt((Math.pow(t / 2, 2) + Math.pow(e / 2, 2)) / 2)), a = Math.ceil(Math.max(n.curveStepCount, n.curveStepCount / Math.sqrt(200) * r)), s = 2 * Math.PI / a, o = Math.abs(t / 2), i = Math.abs(e / 2), h = 1 - n.curveFitting;
		return {
			increment: s,
			rx: o += F(o * h, n),
			ry: i += F(i * h, n)
		};
	}
	function C(t, e, n, r) {
		var a = $(r.increment, t, e, r.rx, r.ry, 1, r.increment * q(.1, q(.4, 1, n), n), n), s = a[0], o = a[1], i = H(s, null, n);
		if (!n.disableMultiStroke && 0 !== n.roughness) {
			var h = H($(r.increment, t, e, r.rx, r.ry, 1.5, 0, n)[0], null, n);
			i = i.concat(h);
		}
		return {
			estimatedPoints: o,
			opset: {
				type: "path",
				ops: i
			}
		};
	}
	function z(t, e, n, a, s, o, i, h, u) {
		var p = t, l = e, c = Math.abs(n / 2), f = Math.abs(a / 2);
		c += F(.01 * c, u), f += F(.01 * f, u);
		for (var d = s, g = o; d < 0;) d += 2 * Math.PI, g += 2 * Math.PI;
		g - d > 2 * Math.PI && (d = 0, g = 2 * Math.PI);
		var y = 2 * Math.PI / u.curveStepCount, v = Math.min(y / 2, (g - d) / 2), M = N(v, p, l, c, f, d, g, 1, u);
		if (!u.disableMultiStroke) {
			var k = N(v, p, l, c, f, d, g, 1.5, u);
			M.push.apply(M, k);
		}
		return i && (h ? M.push.apply(M, r(r([], V(p, l, p + c * Math.cos(d), l + f * Math.sin(d), u), !1), V(p, l, p + c * Math.cos(g), l + f * Math.sin(g), u), !1)) : M.push({
			op: "lineTo",
			data: [p, l]
		}, {
			op: "lineTo",
			data: [p + c * Math.cos(d), l + f * Math.sin(d)]
		})), {
			type: "path",
			ops: M
		};
	}
	function W(t, e) {
		for (var n = [], r = [0, 0], a = [0, 0], s = 0, o = x(P(w(t))); s < o.length; s++) {
			var i = o[s], h = i.key, u = i.data;
			switch (h) {
				case "M":
					a = [u[0], u[1]], r = [u[0], u[1]];
					break;
				case "L":
					n.push.apply(n, V(a[0], a[1], u[0], u[1], e)), a = [u[0], u[1]];
					break;
				case "C":
					var p = u[0], l = u[1], c = u[2], f = u[3], d = u[4], g = u[5];
					n.push.apply(n, B(p, l, c, f, d, g, a, e)), a = [d, g];
					break;
				case "Z": n.push.apply(n, V(a[0], a[1], r[0], r[1], e)), a = [r[0], r[1]];
			}
		}
		return {
			type: "path",
			ops: n
		};
	}
	function E(t, e) {
		for (var n = [], r = 0, a = t; r < a.length; r++) {
			var s = a[r];
			if (s.length) {
				var o = e.maxRandomnessOffset || 0, i = s.length;
				if (i > 2) {
					n.push({
						op: "move",
						data: [s[0][0] + F(o, e), s[0][1] + F(o, e)]
					});
					for (var h = 1; h < i; h++) n.push({
						op: "lineTo",
						data: [s[h][0] + F(o, e), s[h][1] + F(o, e)]
					});
				}
			}
		}
		return {
			type: "fillPath",
			ops: n
		};
	}
	function G(t, e) {
		return function(t, e) {
			var n = t.fillStyle || "hachure";
			if (!g[n]) switch (n) {
				case "zigzag":
					g[n] || (g[n] = new p(e));
					break;
				case "cross-hatch":
					g[n] || (g[n] = new l(e));
					break;
				case "dots":
					g[n] || (g[n] = new c(e));
					break;
				case "dashed":
					g[n] || (g[n] = new f(e));
					break;
				case "zigzag-line":
					g[n] || (g[n] = new d(e));
					break;
				default: g[n = "hachure"] || (g[n] = new h(e));
			}
			return g[n];
		}(e, L).fillPolygons(t, e);
	}
	function R(t) {
		var e = n({}, t);
		return e.randomizer = void 0, t.seed && (e.seed = t.seed + 1), e;
	}
	function j(t) {
		return t.randomizer || (t.randomizer = new y(t.seed || 0)), t.randomizer.next();
	}
	function q(t, e, n, r) {
		return void 0 === r && (r = 1), n.roughness * r * (j(n) * (e - t) + t);
	}
	function F(t, e, n) {
		return void 0 === n && (n = 1), q(-t, t, e, n);
	}
	function V(t, e, n, r, a, s) {
		void 0 === s && (s = !1);
		var o = s ? a.disableMultiStrokeFill : a.disableMultiStroke, i = Z(t, e, n, r, a, !0, !1);
		if (o) return i;
		var h = Z(t, e, n, r, a, !0, !0);
		return i.concat(h);
	}
	function Z(t, e, n, r, a, s, o) {
		var i = Math.pow(t - n, 2) + Math.pow(e - r, 2), h = Math.sqrt(i), u = 1;
		u = h < 200 ? 1 : h > 500 ? .4 : -.0016668 * h + 1.233334;
		var p = a.maxRandomnessOffset || 0;
		p * p * 100 > i && (p = h / 10);
		var l = p / 2, c = .2 + .2 * j(a), f = a.bowing * a.maxRandomnessOffset * (r - e) / 200, d = a.bowing * a.maxRandomnessOffset * (t - n) / 200;
		f = F(f, a, u), d = F(d, a, u);
		var g = [], y = function() {
			return F(l, a, u);
		}, v = function() {
			return F(p, a, u);
		}, M = a.preserveVertices;
		return s && (o ? g.push({
			op: "move",
			data: [t + (M ? 0 : y()), e + (M ? 0 : y())]
		}) : g.push({
			op: "move",
			data: [t + (M ? 0 : F(p, a, u)), e + (M ? 0 : F(p, a, u))]
		})), o ? g.push({
			op: "bcurveTo",
			data: [
				f + t + (n - t) * c + y(),
				d + e + (r - e) * c + y(),
				f + t + 2 * (n - t) * c + y(),
				d + e + 2 * (r - e) * c + y(),
				n + (M ? 0 : y()),
				r + (M ? 0 : y())
			]
		}) : g.push({
			op: "bcurveTo",
			data: [
				f + t + (n - t) * c + v(),
				d + e + (r - e) * c + v(),
				f + t + 2 * (n - t) * c + v(),
				d + e + 2 * (r - e) * c + v(),
				n + (M ? 0 : v()),
				r + (M ? 0 : v())
			]
		}), g;
	}
	function Q(t, e, n) {
		if (!t.length) return [];
		var r = [];
		r.push([t[0][0] + F(e, n), t[0][1] + F(e, n)]), r.push([t[0][0] + F(e, n), t[0][1] + F(e, n)]);
		for (var a = 1; a < t.length; a++) r.push([t[a][0] + F(e, n), t[a][1] + F(e, n)]), a === t.length - 1 && r.push([t[a][0] + F(e, n), t[a][1] + F(e, n)]);
		return H(r, null, n);
	}
	function H(t, e, n) {
		var r = t.length, a = [];
		if (r > 3) {
			var s = [], o = 1 - n.curveTightness;
			a.push({
				op: "move",
				data: [t[1][0], t[1][1]]
			});
			for (var i = 1; i + 2 < r; i++) {
				var h = t[i];
				s[0] = [h[0], h[1]], s[1] = [h[0] + (o * t[i + 1][0] - o * t[i - 1][0]) / 6, h[1] + (o * t[i + 1][1] - o * t[i - 1][1]) / 6], s[2] = [t[i + 1][0] + (o * t[i][0] - o * t[i + 2][0]) / 6, t[i + 1][1] + (o * t[i][1] - o * t[i + 2][1]) / 6], s[3] = [t[i + 1][0], t[i + 1][1]], a.push({
					op: "bcurveTo",
					data: [
						s[1][0],
						s[1][1],
						s[2][0],
						s[2][1],
						s[3][0],
						s[3][1]
					]
				});
			}
			if (e && 2 === e.length) {
				var u = n.maxRandomnessOffset;
				a.push({
					op: "lineTo",
					data: [e[0] + F(u, n), e[1] + F(u, n)]
				});
			}
		} else 3 === r ? (a.push({
			op: "move",
			data: [t[1][0], t[1][1]]
		}), a.push({
			op: "bcurveTo",
			data: [
				t[1][0],
				t[1][1],
				t[2][0],
				t[2][1],
				t[2][0],
				t[2][1]
			]
		})) : 2 === r && a.push.apply(a, Z(t[0][0], t[0][1], t[1][0], t[1][1], n, !0, !0));
		return a;
	}
	function $(t, e, n, r, a, s, o, i) {
		var h = [], u = [];
		if (0 === i.roughness) {
			t /= 4, u.push([e + r * Math.cos(-t), n + a * Math.sin(-t)]);
			for (var p = 0; p <= 2 * Math.PI; p += t) {
				var l = [e + r * Math.cos(p), n + a * Math.sin(p)];
				h.push(l), u.push(l);
			}
			u.push([e + r * Math.cos(0), n + a * Math.sin(0)]), u.push([e + r * Math.cos(t), n + a * Math.sin(t)]);
		} else {
			var c = F(.5, i) - Math.PI / 2;
			u.push([F(s, i) + e + .9 * r * Math.cos(c - t), F(s, i) + n + .9 * a * Math.sin(c - t)]);
			var f = 2 * Math.PI + c - .01;
			for (p = c; p < f; p += t) {
				l = [F(s, i) + e + r * Math.cos(p), F(s, i) + n + a * Math.sin(p)];
				h.push(l), u.push(l);
			}
			u.push([F(s, i) + e + r * Math.cos(c + 2 * Math.PI + .5 * o), F(s, i) + n + a * Math.sin(c + 2 * Math.PI + .5 * o)]), u.push([F(s, i) + e + .98 * r * Math.cos(c + o), F(s, i) + n + .98 * a * Math.sin(c + o)]), u.push([F(s, i) + e + .9 * r * Math.cos(c + .5 * o), F(s, i) + n + .9 * a * Math.sin(c + .5 * o)]);
		}
		return [u, h];
	}
	function N(t, e, n, r, a, s, o, i, h) {
		var u = s + F(.1, h), p = [];
		p.push([F(i, h) + e + .9 * r * Math.cos(u - t), F(i, h) + n + .9 * a * Math.sin(u - t)]);
		for (var l = u; l <= o; l += t) p.push([F(i, h) + e + r * Math.cos(l), F(i, h) + n + a * Math.sin(l)]);
		return p.push([e + r * Math.cos(o), n + a * Math.sin(o)]), p.push([e + r * Math.cos(o), n + a * Math.sin(o)]), H(p, null, h);
	}
	function B(t, e, n, r, a, s, o, i) {
		for (var h = [], u = [i.maxRandomnessOffset || 1, (i.maxRandomnessOffset || 1) + .3], p = [0, 0], l = i.disableMultiStroke ? 1 : 2, c = i.preserveVertices, f = 0; f < l; f++) 0 === f ? h.push({
			op: "move",
			data: [o[0], o[1]]
		}) : h.push({
			op: "move",
			data: [o[0] + (c ? 0 : F(u[0], i)), o[1] + (c ? 0 : F(u[0], i))]
		}), p = c ? [a, s] : [a + F(u[f], i), s + F(u[f], i)], h.push({
			op: "bcurveTo",
			data: [
				t + F(u[f], i),
				e + F(u[f], i),
				n + F(u[f], i),
				r + F(u[f], i),
				p[0],
				p[1]
			]
		});
		return h;
	}
	function J(t) {
		return [...t];
	}
	function K(t, e = 0) {
		const n = t.length;
		if (n < 3) throw new Error("A curve must have at least three points.");
		const r = [];
		if (3 === n) r.push(J(t[0]), J(t[1]), J(t[2]), J(t[2]));
		else {
			const n = [];
			n.push(t[0], t[0]);
			for (let e = 1; e < t.length; e++) n.push(t[e]), e === t.length - 1 && n.push(t[e]);
			const a = [], s = 1 - e;
			r.push(J(n[0]));
			for (let t = 1; t + 2 < n.length; t++) {
				const e = n[t];
				a[0] = [e[0], e[1]], a[1] = [e[0] + (s * n[t + 1][0] - s * n[t - 1][0]) / 6, e[1] + (s * n[t + 1][1] - s * n[t - 1][1]) / 6], a[2] = [n[t + 1][0] + (s * n[t][0] - s * n[t + 2][0]) / 6, n[t + 1][1] + (s * n[t][1] - s * n[t + 2][1]) / 6], a[3] = [n[t + 1][0], n[t + 1][1]], r.push(a[1], a[2], a[3]);
			}
		}
		return r;
	}
	function U(t, e) {
		return Math.pow(t[0] - e[0], 2) + Math.pow(t[1] - e[1], 2);
	}
	function X(t, e, n) {
		const r = U(e, n);
		if (0 === r) return U(t, e);
		let a = ((t[0] - e[0]) * (n[0] - e[0]) + (t[1] - e[1]) * (n[1] - e[1])) / r;
		return a = Math.max(0, Math.min(1, a)), U(t, Y(e, n, a));
	}
	function Y(t, e, n) {
		return [t[0] + (e[0] - t[0]) * n, t[1] + (e[1] - t[1]) * n];
	}
	function tt(t, e, n, r) {
		const a = r || [];
		if (function(t, e) {
			const n = t[e + 0], r = t[e + 1], a = t[e + 2], s = t[e + 3];
			let o = 3 * r[0] - 2 * n[0] - s[0];
			o *= o;
			let i = 3 * r[1] - 2 * n[1] - s[1];
			i *= i;
			let h = 3 * a[0] - 2 * s[0] - n[0];
			h *= h;
			let u = 3 * a[1] - 2 * s[1] - n[1];
			return u *= u, o < h && (o = h), i < u && (i = u), o + i;
		}(t, e) < n) {
			const n = t[e + 0];
			if (a.length) (s = a[a.length - 1], o = n, Math.sqrt(U(s, o))) > 1 && a.push(n);
			else a.push(n);
			a.push(t[e + 3]);
		} else {
			const r = .5, s = t[e + 0], o = t[e + 1], i = t[e + 2], h = t[e + 3], u = Y(s, o, r), p = Y(o, i, r), l = Y(i, h, r), c = Y(u, p, r), f = Y(p, l, r), d = Y(c, f, r);
			tt([
				s,
				u,
				c,
				d
			], 0, n, a), tt([
				d,
				f,
				l,
				h
			], 0, n, a);
		}
		var s, o;
		return a;
	}
	function et(t, e) {
		return nt(t, 0, t.length, e);
	}
	function nt(t, e, n, r, a) {
		const s = a || [], o = t[e], i = t[n - 1];
		let h = 0, u = 1;
		for (let r = e + 1; r < n - 1; ++r) {
			const e = X(t[r], o, i);
			e > h && (h = e, u = r);
		}
		return Math.sqrt(h) > r ? (nt(t, e, u + 1, r, s), nt(t, u, n, r, s)) : (s.length || s.push(o), s.push(i)), s;
	}
	function rt(t, e = .15, n) {
		const r = [], a = (t.length - 1) / 3;
		for (let n = 0; n < a; n++) tt(t, 3 * n, e, r);
		return n && n > 0 ? nt(r, 0, r.length, n) : r;
	}
	var at = "none";
	var st = function() {
		function t(t) {
			this.defaultOptions = {
				maxRandomnessOffset: 2,
				roughness: 1,
				bowing: 1,
				stroke: "#000",
				strokeWidth: 1,
				curveTightness: 0,
				curveFitting: .95,
				curveStepCount: 9,
				fillStyle: "hachure",
				fillWeight: -1,
				hachureAngle: -41,
				hachureGap: -1,
				dashOffset: -1,
				dashGap: -1,
				zigzagOffset: -1,
				seed: 0,
				disableMultiStroke: !1,
				disableMultiStrokeFill: !1,
				preserveVertices: !1,
				fillShapeRoughnessGain: .8
			}, this.config = t || {}, this.config.options && (this.defaultOptions = this._o(this.config.options));
		}
		return t.newSeed = function() {
			return Math.floor(Math.random() * Math.pow(2, 31));
		}, t.prototype._o = function(t) {
			return t ? Object.assign({}, this.defaultOptions, t) : this.defaultOptions;
		}, t.prototype._d = function(t, e, n) {
			return {
				shape: t,
				sets: e || [],
				options: n || this.defaultOptions
			};
		}, t.prototype.line = function(t, e, n, r, a) {
			var s = this._o(a);
			return this._d("line", [T(t, e, n, r, s)], s);
		}, t.prototype.rectangle = function(t, e, n, r, a) {
			var s = this._o(a), o = [], i = D(t, e, n, r, s);
			if (s.fill) {
				var h = [
					[t, e],
					[t + n, e],
					[t + n, e + r],
					[t, e + r]
				];
				"solid" === s.fillStyle ? o.push(E([h], s)) : o.push(G([h], s));
			}
			return s.stroke !== at && o.push(i), this._d("rectangle", o, s);
		}, t.prototype.ellipse = function(t, e, n, r, a) {
			var s = this._o(a), o = [], i = I(n, r, s), h = C(t, e, s, i);
			if (s.fill) if ("solid" === s.fillStyle) {
				var u = C(t, e, s, i).opset;
				u.type = "fillPath", o.push(u);
			} else o.push(G([h.estimatedPoints], s));
			return s.stroke !== at && o.push(h.opset), this._d("ellipse", o, s);
		}, t.prototype.circle = function(t, e, n, r) {
			var a = this.ellipse(t, e, n, n, r);
			return a.shape = "circle", a;
		}, t.prototype.linearPath = function(t, e) {
			var n = this._o(e);
			return this._d("linearPath", [_(t, !1, n)], n);
		}, t.prototype.arc = function(t, e, r, a, s, o, i, h) {
			void 0 === i && (i = !1);
			var u = this._o(h), p = [], l = z(t, e, r, a, s, o, i, !0, u);
			if (i && u.fill) if ("solid" === u.fillStyle) {
				var c = n({}, u);
				c.disableMultiStroke = !0;
				var f = z(t, e, r, a, s, o, !0, !1, c);
				f.type = "fillPath", p.push(f);
			} else p.push(function(t, e, n, r, a, s, o) {
				var i = t, h = e, u = Math.abs(n / 2), p = Math.abs(r / 2);
				u += F(.01 * u, o), p += F(.01 * p, o);
				for (var l = a, c = s; l < 0;) l += 2 * Math.PI, c += 2 * Math.PI;
				c - l > 2 * Math.PI && (l = 0, c = 2 * Math.PI);
				for (var f = (c - l) / o.curveStepCount, d = [], g = l; g <= c; g += f) d.push([i + u * Math.cos(g), h + p * Math.sin(g)]);
				return d.push([i + u * Math.cos(c), h + p * Math.sin(c)]), d.push([i, h]), G([d], o);
			}(t, e, r, a, s, o, u));
			return u.stroke !== at && p.push(l), this._d("arc", p, u);
		}, t.prototype.curve = function(t, e) {
			var r = this._o(e), a = [], s = A(t, r);
			if (r.fill && r.fill !== at) if ("solid" === r.fillStyle) {
				var o = A(t, n(n({}, r), {
					disableMultiStroke: !0,
					roughness: r.roughness ? r.roughness + r.fillShapeRoughnessGain : 0
				}));
				a.push({
					type: "fillPath",
					ops: this._mergedShape(o.ops)
				});
			} else {
				var i = [], h = t;
				if (h.length) for (var u = 0, p = "number" == typeof h[0][0] ? [h] : h; u < p.length; u++) {
					var l = p[u];
					l.length < 3 ? i.push.apply(i, l) : 3 === l.length ? i.push.apply(i, rt(K([
						l[0],
						l[0],
						l[1],
						l[2]
					]), 10, (1 + r.roughness) / 2)) : i.push.apply(i, rt(K(l), 10, (1 + r.roughness) / 2));
				}
				i.length && a.push(G([i], r));
			}
			return r.stroke !== at && a.push(s), this._d("curve", a, r);
		}, t.prototype.polygon = function(t, e) {
			var n = this._o(e), r = [], a = _(t, !0, n);
			return n.fill && ("solid" === n.fillStyle ? r.push(E([t], n)) : r.push(G([t], n))), n.stroke !== at && r.push(a), this._d("polygon", r, n);
		}, t.prototype.path = function(t, e) {
			var r = this._o(e), a = [];
			if (!t) return this._d("path", a, r);
			t = (t || "").replace(/\n/g, " ").replace(/(-\s)/g, "-").replace("/(ss)/g", " ");
			var s = r.fill && "transparent" !== r.fill && r.fill !== at, o = r.stroke !== at, i = !!(r.simplification && r.simplification < 1), h = function(t, e, n) {
				const r = x(P(w(t))), a = [];
				let s = [], o = [0, 0], i = [];
				const h = () => {
					i.length >= 4 && s.push(...rt(i, e)), i = [];
				}, u = () => {
					h(), s.length && (a.push(s), s = []);
				};
				for (const { key: t, data: e } of r) switch (t) {
					case "M":
						u(), o = [e[0], e[1]], s.push(o);
						break;
					case "L":
						h(), s.push([e[0], e[1]]);
						break;
					case "C":
						if (!i.length) {
							const t = s.length ? s[s.length - 1] : o;
							i.push([t[0], t[1]]);
						}
						i.push([e[0], e[1]]), i.push([e[2], e[3]]), i.push([e[4], e[5]]);
						break;
					case "Z": h(), s.push([o[0], o[1]]);
				}
				if (u(), !n) return a;
				const p = [];
				for (const t of a) {
					const e = et(t, n);
					e.length && p.push(e);
				}
				return p;
			}(t, 1, i ? 4 - 4 * (r.simplification || 1) : (1 + r.roughness) / 2), u = W(t, r);
			if (s) if ("solid" === r.fillStyle) if (1 === h.length) {
				var p = W(t, n(n({}, r), {
					disableMultiStroke: !0,
					roughness: r.roughness ? r.roughness + r.fillShapeRoughnessGain : 0
				}));
				a.push({
					type: "fillPath",
					ops: this._mergedShape(p.ops)
				});
			} else a.push(E(h, r));
			else a.push(G(h, r));
			return o && (i ? h.forEach((function(t) {
				a.push(_(t, !1, r));
			})) : a.push(u)), this._d("path", a, r);
		}, t.prototype.opsToPath = function(t, e) {
			for (var n = "", r = 0, a = t.ops; r < a.length; r++) {
				var s = a[r], o = "number" == typeof e && e >= 0 ? s.data.map((function(t) {
					return +t.toFixed(e);
				})) : s.data;
				switch (s.op) {
					case "move":
						n += "M".concat(o[0], " ").concat(o[1], " ");
						break;
					case "bcurveTo":
						n += "C".concat(o[0], " ").concat(o[1], ", ").concat(o[2], " ").concat(o[3], ", ").concat(o[4], " ").concat(o[5], " ");
						break;
					case "lineTo": n += "L".concat(o[0], " ").concat(o[1], " ");
				}
			}
			return n.trim();
		}, t.prototype.toPaths = function(t) {
			for (var e = t.sets || [], n = t.options || this.defaultOptions, r = [], a = 0, s = e; a < s.length; a++) {
				var o = s[a], i = null;
				switch (o.type) {
					case "path":
						i = {
							d: this.opsToPath(o),
							stroke: n.stroke,
							strokeWidth: n.strokeWidth,
							fill: at
						};
						break;
					case "fillPath":
						i = {
							d: this.opsToPath(o),
							stroke: at,
							strokeWidth: 0,
							fill: n.fill || at
						};
						break;
					case "fillSketch": i = this.fillSketch(o, n);
				}
				i && r.push(i);
			}
			return r;
		}, t.prototype.fillSketch = function(t, e) {
			var n = e.fillWeight;
			return n < 0 && (n = e.strokeWidth / 2), {
				d: this.opsToPath(t),
				stroke: e.fill || at,
				strokeWidth: n,
				fill: at
			};
		}, t.prototype._mergedShape = function(t) {
			return t.filter((function(t, e) {
				return 0 === e || "move" !== t.op;
			}));
		}, t;
	}();
	var ot = function() {
		function t(t, e) {
			this.canvas = t, this.ctx = this.canvas.getContext("2d"), this.gen = new st(e);
		}
		return t.prototype.draw = function(t) {
			for (var e = t.sets || [], n = t.options || this.getDefaultOptions(), r = this.ctx, a = t.options.fixedDecimalPlaceDigits, s = 0, o = e; s < o.length; s++) {
				var i = o[s];
				switch (i.type) {
					case "path":
						r.save(), r.strokeStyle = "none" === n.stroke ? "transparent" : n.stroke, r.lineWidth = n.strokeWidth, n.strokeLineDash && r.setLineDash(n.strokeLineDash), n.strokeLineDashOffset && (r.lineDashOffset = n.strokeLineDashOffset), this._drawToContext(r, i, a), r.restore();
						break;
					case "fillPath":
						r.save(), r.fillStyle = n.fill || "";
						var h = "curve" === t.shape || "polygon" === t.shape || "path" === t.shape ? "evenodd" : "nonzero";
						this._drawToContext(r, i, a, h), r.restore();
						break;
					case "fillSketch": this.fillSketch(r, i, n);
				}
			}
		}, t.prototype.fillSketch = function(t, e, n) {
			var r = n.fillWeight;
			r < 0 && (r = n.strokeWidth / 2), t.save(), n.fillLineDash && t.setLineDash(n.fillLineDash), n.fillLineDashOffset && (t.lineDashOffset = n.fillLineDashOffset), t.strokeStyle = n.fill || "", t.lineWidth = r, this._drawToContext(t, e, n.fixedDecimalPlaceDigits), t.restore();
		}, t.prototype._drawToContext = function(t, e, n, r) {
			void 0 === r && (r = "nonzero"), t.beginPath();
			for (var a = 0, s = e.ops; a < s.length; a++) {
				var o = s[a], i = "number" == typeof n && n >= 0 ? o.data.map((function(t) {
					return +t.toFixed(n);
				})) : o.data;
				switch (o.op) {
					case "move":
						t.moveTo(i[0], i[1]);
						break;
					case "bcurveTo":
						t.bezierCurveTo(i[0], i[1], i[2], i[3], i[4], i[5]);
						break;
					case "lineTo": t.lineTo(i[0], i[1]);
				}
			}
			"fillPath" === e.type ? t.fill(r) : t.stroke();
		}, Object.defineProperty(t.prototype, "generator", {
			get: function() {
				return this.gen;
			},
			enumerable: !1,
			configurable: !0
		}), t.prototype.getDefaultOptions = function() {
			return this.gen.defaultOptions;
		}, t.prototype.line = function(t, e, n, r, a) {
			var s = this.gen.line(t, e, n, r, a);
			return this.draw(s), s;
		}, t.prototype.rectangle = function(t, e, n, r, a) {
			var s = this.gen.rectangle(t, e, n, r, a);
			return this.draw(s), s;
		}, t.prototype.ellipse = function(t, e, n, r, a) {
			var s = this.gen.ellipse(t, e, n, r, a);
			return this.draw(s), s;
		}, t.prototype.circle = function(t, e, n, r) {
			var a = this.gen.circle(t, e, n, r);
			return this.draw(a), a;
		}, t.prototype.linearPath = function(t, e) {
			var n = this.gen.linearPath(t, e);
			return this.draw(n), n;
		}, t.prototype.polygon = function(t, e) {
			var n = this.gen.polygon(t, e);
			return this.draw(n), n;
		}, t.prototype.arc = function(t, e, n, r, a, s, o, i) {
			void 0 === o && (o = !1);
			var h = this.gen.arc(t, e, n, r, a, s, o, i);
			return this.draw(h), h;
		}, t.prototype.curve = function(t, e) {
			var n = this.gen.curve(t, e);
			return this.draw(n), n;
		}, t.prototype.path = function(t, e) {
			var n = this.gen.path(t, e);
			return this.draw(n), n;
		}, t;
	}();
	var it = "http://www.w3.org/2000/svg";
	var ht = function() {
		function t(t, e) {
			this.svg = t, this.gen = new st(e);
		}
		return t.prototype.draw = function(t) {
			for (var e = t.sets || [], n = t.options || this.getDefaultOptions(), r = this.svg.ownerDocument || window.document, a = r.createElementNS(it, "g"), s = t.options.fixedDecimalPlaceDigits, o = 0, i = e; o < i.length; o++) {
				var h = i[o], u = null;
				switch (h.type) {
					case "path":
						(u = r.createElementNS(it, "path")).setAttribute("d", this.opsToPath(h, s)), u.setAttribute("stroke", n.stroke), u.setAttribute("stroke-width", n.strokeWidth + ""), u.setAttribute("fill", "none"), n.strokeLineDash && u.setAttribute("stroke-dasharray", n.strokeLineDash.join(" ").trim()), n.strokeLineDashOffset && u.setAttribute("stroke-dashoffset", "".concat(n.strokeLineDashOffset));
						break;
					case "fillPath":
						(u = r.createElementNS(it, "path")).setAttribute("d", this.opsToPath(h, s)), u.setAttribute("stroke", "none"), u.setAttribute("stroke-width", "0"), u.setAttribute("fill", n.fill || ""), "curve" !== t.shape && "polygon" !== t.shape || u.setAttribute("fill-rule", "evenodd");
						break;
					case "fillSketch": u = this.fillSketch(r, h, n);
				}
				u && a.appendChild(u);
			}
			return a;
		}, t.prototype.fillSketch = function(t, e, n) {
			var r = n.fillWeight;
			r < 0 && (r = n.strokeWidth / 2);
			var a = t.createElementNS(it, "path");
			return a.setAttribute("d", this.opsToPath(e, n.fixedDecimalPlaceDigits)), a.setAttribute("stroke", n.fill || ""), a.setAttribute("stroke-width", r + ""), a.setAttribute("fill", "none"), n.fillLineDash && a.setAttribute("stroke-dasharray", n.fillLineDash.join(" ").trim()), n.fillLineDashOffset && a.setAttribute("stroke-dashoffset", "".concat(n.fillLineDashOffset)), a;
		}, Object.defineProperty(t.prototype, "generator", {
			get: function() {
				return this.gen;
			},
			enumerable: !1,
			configurable: !0
		}), t.prototype.getDefaultOptions = function() {
			return this.gen.defaultOptions;
		}, t.prototype.opsToPath = function(t, e) {
			return this.gen.opsToPath(t, e);
		}, t.prototype.line = function(t, e, n, r, a) {
			var s = this.gen.line(t, e, n, r, a);
			return this.draw(s);
		}, t.prototype.rectangle = function(t, e, n, r, a) {
			var s = this.gen.rectangle(t, e, n, r, a);
			return this.draw(s);
		}, t.prototype.ellipse = function(t, e, n, r, a) {
			var s = this.gen.ellipse(t, e, n, r, a);
			return this.draw(s);
		}, t.prototype.circle = function(t, e, n, r) {
			var a = this.gen.circle(t, e, n, r);
			return this.draw(a);
		}, t.prototype.linearPath = function(t, e) {
			var n = this.gen.linearPath(t, e);
			return this.draw(n);
		}, t.prototype.polygon = function(t, e) {
			var n = this.gen.polygon(t, e);
			return this.draw(n);
		}, t.prototype.arc = function(t, e, n, r, a, s, o, i) {
			void 0 === o && (o = !1);
			var h = this.gen.arc(t, e, n, r, a, s, o, i);
			return this.draw(h);
		}, t.prototype.curve = function(t, e) {
			var n = this.gen.curve(t, e);
			return this.draw(n);
		}, t.prototype.path = function(t, e) {
			var n = this.gen.path(t, e);
			return this.draw(n);
		}, t;
	}();
	module.exports = {
		canvas: function(t, e) {
			return new ot(t, e);
		},
		svg: function(t, e) {
			return new ht(t, e);
		},
		generator: function(t) {
			return new st(t);
		},
		newSeed: function() {
			return st.newSeed();
		}
	};
})))(), 1);
/**
* The hand-drawn look: the same outlines, redrawn with a wobble by Rough.js,
* the library Excalidraw draws with. Each shape's wobble is seeded by its id,
* so a diagram looks the same on every render, in the app and in SVG.
*/
const STYLE = Object.freeze({
	CLEAN: "clean",
	SKETCH: "sketch"
});
/** Handwritten, but easy to read; the fallbacks are for an SVG opened elsewhere. */
const SKETCH_FONT = "'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive";
const generator = import_rough_cjs.default.generator();
/** @type {Map<string, string>} */
const cache = /* @__PURE__ */ new Map();
const CACHE_LIMIT = 2e3;
/**
* @param {import('./types.js').FlowDocument | null | undefined} document
* @returns {boolean}
*/
const isSketch = (document) => document?.style === STYLE.SKETCH;
/**
* A stable seed from any string, since Rough.js wants a positive integer.
* @param {string} text
* @returns {number}
*/
function seedFor(text) {
	let hash = 2166136261;
	for (const char of String(text)) {
		hash ^= char.codePointAt(0) ?? 0;
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 2147483646 || 1;
}
/**
* Path data redrawn by hand: a stroke only, to lay over the clean shape's fill.
*
* @param {string} d the clean path
* @param {string} key seeds the wobble; the shape's or edge's id
* @returns {string}
*/
function sketchPath(d, key) {
	if (!d) return "";
	const id = `${key}\u0000${d}`;
	const known = cache.get(id);
	if (known !== void 0) return known;
	const drawn = generator.toPaths(generator.path(d, {
		seed: seedFor(key),
		roughness: 1.1,
		bowing: 1,
		preserveVertices: true
	})).map((path) => path.d).join(" ").replace(/-?\d+\.\d+/g, (number) => String(Math.round(Number(number) * 10) / 10));
	if (cache.size >= CACHE_LIMIT) cache.clear();
	cache.set(id, drawn);
	return drawn;
}
//#endregion
//#region node_modules/perfect-freehand/dist/esm/index.mjs
const { PI: e } = Math, t = e + 1e-4, n = .5, r = [1, 1];
function i(e, t, n, r = (e) => e) {
	return e * r(.5 - t * (.5 - n));
}
const { min: a } = Math;
function o(e, t, n) {
	let r = a(1, t / n);
	return a(1, e + (a(1, 1 - r) - e) * (r * .275));
}
function s(e) {
	return [-e[0], -e[1]];
}
function c(e, t) {
	return [e[0] + t[0], e[1] + t[1]];
}
function l(e, t, n) {
	return e[0] = t[0] + n[0], e[1] = t[1] + n[1], e;
}
function u(e, t) {
	return [e[0] - t[0], e[1] - t[1]];
}
function d(e, t, n) {
	return e[0] = t[0] - n[0], e[1] = t[1] - n[1], e;
}
function f(e, t) {
	return [e[0] * t, e[1] * t];
}
function p(e, t, n) {
	return e[0] = t[0] * n, e[1] = t[1] * n, e;
}
function m(e, t) {
	return [e[0] / t, e[1] / t];
}
function h(e) {
	return [e[1], -e[0]];
}
function g(e, t) {
	let n = t[0];
	return e[0] = t[1], e[1] = -n, e;
}
function ee(e, t) {
	return e[0] * t[0] + e[1] * t[1];
}
function _(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
function v(e) {
	return Math.hypot(e[0], e[1]);
}
function y(e, t) {
	let n = e[0] - t[0], r = e[1] - t[1];
	return n * n + r * r;
}
function b(e) {
	return m(e, v(e));
}
function x(e, t) {
	return Math.hypot(e[1] - t[1], e[0] - t[0]);
}
function S(e, t, n) {
	let r = Math.sin(n), i = Math.cos(n), a = e[0] - t[0], o = e[1] - t[1], s = a * i - o * r, c = a * r + o * i;
	return [s + t[0], c + t[1]];
}
function C(e, t, n, r) {
	let i = Math.sin(r), a = Math.cos(r), o = t[0] - n[0], s = t[1] - n[1], c = o * a - s * i, l = o * i + s * a;
	return e[0] = c + n[0], e[1] = l + n[1], e;
}
function w(e, t, n) {
	return c(e, f(u(t, e), n));
}
function te(e, t, n, r) {
	let i = n[0] - t[0], a = n[1] - t[1];
	return e[0] = t[0] + i * r, e[1] = t[1] + a * r, e;
}
function T(e, t, n) {
	return c(e, f(t, n));
}
const E = [0, 0];
const D = [0, 0];
const O = [0, 0];
function k(e, n) {
	let r = T(e, b(h(u(e, c(e, [1, 1])))), -n), i = [], a = 1 / 13;
	for (let n = a; n <= 1; n += a) i.push(S(r, e, t * 2 * n));
	return i;
}
function A(e, n, r) {
	let i = [], a = 1 / r;
	for (let r = a; r <= 1; r += a) i.push(S(n, e, t * r));
	return i;
}
function j(e, t, n) {
	let r = u(t, n), i = f(r, .5), a = f(r, .51);
	return [
		u(e, i),
		u(e, a),
		c(e, a),
		c(e, i)
	];
}
function M(e, n, r, i) {
	let a = [], o = T(e, n, r), s = 1 / i;
	for (let n = s; n < 1; n += s) a.push(S(o, e, t * 3 * n));
	return a;
}
function ne(e, t, n) {
	return [
		c(e, f(t, n)),
		c(e, f(t, n * .99)),
		u(e, f(t, n * .99)),
		u(e, f(t, n))
	];
}
function N(e, t, n) {
	return e === !1 || e === void 0 ? 0 : e === !0 ? Math.max(t, n) : e;
}
function re(e, t, n) {
	return e.slice(0, 10).reduce((e, r) => {
		let i = r.pressure;
		return t && (i = o(e, r.distance, n)), (e + i) / 2;
	}, e[0].pressure);
}
function P(e, n = {}) {
	let { size: r = 16, smoothing: a = .5, thinning: f = .5, simulatePressure: m = !0, easing: _ = (e) => e, start: v = {}, end: b = {}, last: x = !1 } = n, { cap: S = !0, easing: w = (e) => e * (2 - e) } = v, { cap: T = !0, easing: P = (e) => --e * e * e + 1 } = b;
	if (e.length === 0 || r <= 0) return [];
	let F = e[e.length - 1].runningLength, I = N(v.taper, r, F), L = N(b.taper, r, F), R = (r * a) ** 2, z = [], B = [], V = re(e, m, r), H = i(r, f, e[e.length - 1].pressure, _), U, W = e[0].vector, G = e[0].point, K = G, q = G, J = K, Y = !1;
	for (let n = 0; n < e.length; n++) {
		let { pressure: a } = e[n], { point: s, vector: h, distance: v, runningLength: b } = e[n], x = n === e.length - 1;
		if (!x && F - b < 3) continue;
		f ? (m && (a = o(V, v, r)), H = i(r, f, a, _)) : H = r / 2, U === void 0 && (U = H);
		let S = b < I ? w(b / I) : 1, T = F - b < L ? P((F - b) / L) : 1;
		H = Math.max(.01, H * Math.min(S, T));
		let k = (x ? e[n] : e[n + 1]).vector, A = x ? 1 : ee(h, k), j = ee(h, W) < 0 && !Y, M = A !== null && A < 0;
		if (j || M) {
			g(E, W), p(E, E, H);
			for (let e = 0; e <= 1; e += .07692307692307693) d(D, s, E), C(D, D, s, t * e), q = [D[0], D[1]], z.push(q), l(O, s, E), C(O, O, s, t * -e), J = [O[0], O[1]], B.push(J);
			G = q, K = J, M && (Y = !0);
			continue;
		}
		if (Y = !1, x) {
			g(E, h), p(E, E, H), z.push(u(s, E)), B.push(c(s, E));
			continue;
		}
		te(E, k, h, A), g(E, E), p(E, E, H), d(D, s, E), q = [D[0], D[1]], (n <= 1 || y(G, q) > R) && (z.push(q), G = q), l(O, s, E), J = [O[0], O[1]], (n <= 1 || y(K, J) > R) && (B.push(J), K = J), V = a, W = h;
	}
	let X = [e[0].point[0], e[0].point[1]], Z = e.length > 1 ? [e[e.length - 1].point[0], e[e.length - 1].point[1]] : c(e[0].point, [1, 1]), Q = [], $ = [];
	if (e.length === 1) {
		if (!(I || L) || x) return k(X, U || H);
	} else {
		I || L && e.length === 1 || (S ? Q.push(...A(X, B[0], 13)) : Q.push(...j(X, z[0], B[0])));
		let t = h(s(e[e.length - 1].vector));
		L || I && e.length === 1 ? $.push(Z) : T ? $.push(...M(Z, t, H, 29)) : $.push(...ne(Z, t, H));
	}
	return z.concat($, B.reverse(), Q);
}
const F = [0, 0];
function I(e) {
	return e != null && e >= 0;
}
function L(e, t = {}) {
	let { streamline: i = .5, size: a = 16, last: o = !1 } = t;
	if (e.length === 0) return [];
	let s = .15 + (1 - i) * .85, l = Array.isArray(e[0]) ? e : e.map(({ x: e, y: t, pressure: r = n }) => [
		e,
		t,
		r
	]);
	if (l.length === 2) {
		let e = l[1];
		l = l.slice(0, -1);
		for (let t = 1; t < 5; t++) l.push(w(l[0], e, t / 4));
	}
	l.length === 1 && (l = [...l, [...c(l[0], r), ...l[0].slice(2)]]);
	let u = [{
		point: [l[0][0], l[0][1]],
		pressure: I(l[0][2]) ? l[0][2] : .25,
		vector: [...r],
		distance: 0,
		runningLength: 0
	}], f = !1, p = 0, m = u[0], h = l.length - 1;
	for (let e = 1; e < l.length; e++) {
		let t = o && e === h ? [l[e][0], l[e][1]] : w(m.point, l[e], s);
		if (_(m.point, t)) continue;
		let r = x(t, m.point);
		if (p += r, e < h && !f) {
			if (p < a) continue;
			f = !0;
		}
		d(F, m.point, t), m = {
			point: t,
			pressure: I(l[e][2]) ? l[e][2] : n,
			vector: b(F),
			distance: r,
			runningLength: p
		}, u.push(m);
	}
	return u[0].vector = u[1]?.vector || [0, 0], u;
}
function R(e, t = {}) {
	return P(L(e, t), t);
}
//#endregion
//#region src/domain/ink.js
/**
* @param {string | undefined} points
* @param {number} width
* @param {number} height
* @returns {{ x: number, y: number, p?: number }[]}
*/
function scale(points, width, height) {
	return String(points ?? "").trim().split(/\s+/).filter(Boolean).map((triple) => triple.split(",").map(Number)).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)).map(([x, y, p]) => ({
		x: tenth(x / 100 * width),
		y: tenth(y / 100 * height),
		...Number.isFinite(p) ? { p } : {}
	}));
}
/**
* A stroke drawn with a stylus, as the outline of a line that swells and thins
* with the pressure, to be filled. Empty for a stroke without pressure, which
* inkPath draws instead.
*
* @param {string | undefined} points
* @param {number} width
* @param {number} height
* @returns {string}
*/
function inkOutline(points, width, height) {
	const at = scale(points, width, height);
	if (at.length < 2 || !at.every((point) => point.p !== void 0)) return "";
	const outline = R(at.map(({ x, y, p }) => [
		x,
		y,
		p ?? .5
	]), {
		size: 5,
		thinning: .6,
		smoothing: .5,
		streamline: .3,
		simulatePressure: false
	});
	if (outline.length < 3) return "";
	const [first, ...rest] = outline;
	return `M${tenth(first[0])},${tenth(first[1])} ${rest.map(([x, y]) => `L${tenth(x)},${tenth(y)}`).join(" ")} Z`;
}
/**
* Path data for a stroke in a `width` by `height` box, smoothed through the
* midpoints so a few points still read as a hand-drawn curve.
*
* @param {string | undefined} points
* @param {number} width
* @param {number} height
* @returns {string}
*/
function inkPath(points, width, height) {
	const at = scale(points, width, height);
	if (at.length < 2) return "";
	if (at.length === 2) return `M${at[0].x},${at[0].y} L${at[1].x},${at[1].y}`;
	const parts = [`M${at[0].x},${at[0].y}`];
	for (let index = 1; index < at.length - 1; index += 1) {
		const mid = {
			x: tenth((at[index].x + at[index + 1].x) / 2),
			y: tenth((at[index].y + at[index + 1].y) / 2)
		};
		parts.push(`Q${at[index].x},${at[index].y} ${mid.x},${mid.y}`);
	}
	const last = at[at.length - 1];
	parts.push(`L${last.x},${last.y}`);
	return parts.join(" ");
}
/** @param {number} value */
const tenth = (value) => Math.round(value * 10) / 10;
/** An arrowhead's barbs: how long, and how far off the line. */
const HEAD_LENGTH = 14;
const HEAD_ANGLE = Math.PI / 7;
/**
* Path data for a stroke's arrowheads, open V's at its end, or at both ends,
* pointing the way the stroke runs there. Empty for a stroke with none.
*
* @param {string | undefined} points
* @param {number} width
* @param {number} height
* @param {string | undefined} arrow 'end' or 'both'
* @returns {string}
*/
function inkHeads(points, width, height, arrow) {
	if (arrow !== "end" && arrow !== "both") return "";
	const at = scale(points, width, height);
	if (at.length < 2) return "";
	const heads = [head(at[at.length - 2], at[at.length - 1])];
	if (arrow === "both") heads.push(head(at[1], at[0]));
	return heads.join(" ");
}
/**
* @param {{ x: number, y: number }} from
* @param {{ x: number, y: number }} tip
*/
function head(from, tip) {
	const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
	const barb = (side) => ({
		x: tenth(tip.x - HEAD_LENGTH * Math.cos(angle + side * HEAD_ANGLE)),
		y: tenth(tip.y - HEAD_LENGTH * Math.sin(angle + side * HEAD_ANGLE))
	});
	const [left, right] = [barb(1), barb(-1)];
	return `M${left.x},${left.y} L${tip.x},${tip.y} L${right.x},${right.y}`;
}
//#endregion
//#region src/domain/renderSvg.js
/** @param {'light' | 'dark'} theme */
const paintsFor = (theme) => Object.fromEntries(COLOR_NAMES.map((name) => [name, paintOf(name, theme)]));
/**
* The app's colour tokens, copied from `style.css` so the renderer runs where
* there is no stylesheet: the command line, CI, a docs build. Keep the two in
* step when a token changes.
*/
const SVG_THEMES = Object.freeze({
	light: {
		changes: {
			added: "#16a34a",
			removed: "#dc2626",
			changed: "#d97706"
		},
		canvas: "#ffffff",
		surface: "#ffffff",
		ink: "#14181f",
		muted: "#64748b",
		line: "#e3e7ee",
		edge: "#f97362",
		accents: {
			trigger: "#e11d48",
			hours: "#ea580c",
			message: "#059669",
			comment: "#0284c7",
			branch: "#4f46e5",
			unknown: "#94a3b8"
		},
		paints: paintsFor("light")
	},
	dark: {
		changes: {
			added: "#4ade80",
			removed: "#f87171",
			changed: "#fbbf24"
		},
		canvas: "#0d1117",
		surface: "#161b22",
		ink: "#e6edf3",
		muted: "#9aa7b6",
		line: "#2a323d",
		edge: "#fb8f7e",
		accents: {
			trigger: "#fb7185",
			hours: "#fb923c",
			message: "#34d399",
			comment: "#38bdf8",
			branch: "#a5b4fc",
			unknown: "#94a3b8"
		},
		paints: paintsFor("dark")
	}
});
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const TITLE_SIZE = 14;
const TEXT_SIZE = 12;
/** Average glyph width as a share of font size: close enough to fit text without a browser. */
const GLYPH = .56;
/**
* A diagram as a standalone SVG document, the same shapes and layout as the
* canvas, with no browser. Nodes without a position are laid out as the app
* lays them out.
*
* @param {import('./types.js').FlowDocument} document
* @param {{ theme?: 'light' | 'dark', padding?: number, highlight?: Map<string, 'added' | 'removed' | 'changed'>, sketchFont?: string, credit?: boolean }} [options]
*   `highlight` marks nodes and edges by id, for a diff; `sketchFont` is the handwriting
*   font as a data URL, embedded in a sketch so it looks the same wherever it opens;
*   `credit` adds a small "Made with isketch" in the bottom right corner, linked
* @returns {string}
*/
function renderSvg(document, { theme = "light", padding = 32, highlight = /* @__PURE__ */ new Map(), sketchFont = "", credit = false } = {}) {
	const colours = SVG_THEMES[theme] ?? SVG_THEMES.light;
	const nodes = document.nodes.map(normaliseNode);
	const ids = new Set(nodes.map((node) => node.id));
	const edges = buildEdges(document.edges, ids);
	const laidOut = layoutTree(nodes, edges);
	const at = new Map(nodes.map((node) => [node.id, node.position ?? laidOut.get(node.id) ?? {
		x: 0,
		y: 0
	}]));
	const boxes = nodes.map((node) => ({
		...at.get(node.id) ?? {
			x: 0,
			y: 0
		},
		...sizeOf(node)
	}));
	const left = (boxes.length ? Math.min(...boxes.map((box) => box.x)) : 0) - padding;
	const top = (boxes.length ? Math.min(...boxes.map((box) => box.y)) : 0) - padding;
	const width = (boxes.length ? Math.max(...boxes.map((box) => box.x + box.width)) : 0) - left + padding;
	const height = (boxes.length ? Math.max(...boxes.map((box) => box.y + box.height)) : 0) - top + padding;
	const sizes = new Map(nodes.map((node) => [node.id, sizeOf(node)]));
	const sketch = isSketch(document);
	return `${[
		`<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="${round(left)} ${round(top)} ${round(width)} ${round(height)}" font-family="${escapeXml(sketch ? SKETCH_FONT : FONT)}">`,
		`<title>${escapeXml(document.title ?? "")}</title>`,
		sketch ? sketchStyle(sketchFont) : "",
		`<defs>${[["arrow", colours.edge], ...(highlight.size ? Object.entries(colours.changes) : []).map(([change, colour]) => [`arrow-${change}`, colour])].map(([id, fill]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${id === "arrow" ? 7 : 4.2}" markerHeight="${id === "arrow" ? 7 : 4.2}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${fill}"/></marker>`).join("")}</defs>`,
		`<rect x="${round(left)}" y="${round(top)}" width="${round(width)}" height="${round(height)}" fill="${colours.canvas}"/>`,
		...nodes.filter((node) => node.type === SHAPE.FRAME).map((node) => renderFrame(node, at.get(node.id), colours, highlight.get(node.id))),
		...edges.map((edge) => renderEdge(edge, {
			...at.get(edge.source),
			...sizes.get(edge.source)
		}, {
			...at.get(edge.target),
			...sizes.get(edge.target)
		}, colours, highlight.get(edge.id), sketch, document.lines)),
		...nodes.filter((node) => node.type !== SHAPE.FRAME).map((node) => renderNode(node, at.get(node.id), colours, highlight.get(node.id), sketch)),
		credit ? `<a href="https://isketch.online"><text x="${round(left + width - 10)}" y="${round(top + height - 10)}" font-size="11" fill="${colours.muted}" text-anchor="end">Made with isketch</text></a>` : "",
		"</svg>"
	].filter(Boolean).join("\n")}\n`;
}
/**
* A frame: a light region with its name at the top left, behind what it holds.
* @param {import('./types.js').FlowNode} node
* @param {{ x: number, y: number }} position
* @param {typeof SVG_THEMES.light} colours
* @param {'added' | 'removed' | 'changed'} [change]
*/
function renderFrame(node, position, colours, change) {
	const { width, height } = sizeOf(node);
	const own = colorOf(node);
	const paint = own ? colours.paints[own] : null;
	const stroke = change ? colours.changes[change] : paint?.stroke ?? colours.muted;
	return [
		`<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ""}>`,
		`<path d="${shapePath(SHAPE.FRAME, width, height, 1)}" fill="${paint?.fill ?? colours.line}" fill-opacity="${paint ? .45 : .35}" stroke="${stroke}" stroke-width="${change ? 3 : 1.5}" stroke-dasharray="8 5"/>`,
		`<text x="14" y="24" font-size="${TITLE_SIZE}" font-weight="600" fill="${colours.ink}">${escapeXml(wrap(node.name ?? "", width - 28, TITLE_SIZE, 1)[0] ?? "")}</text>`,
		"</g>"
	].join("\n");
}
/**
* A pen stroke, scaled to its box, in the ink colour or its change's.
* @param {import('./types.js').FlowNode} node
* @param {{ x: number, y: number }} position
* @param {typeof SVG_THEMES.light} colours
* @param {'added' | 'removed' | 'changed'} [change]
*/
function renderInk(node, position, colours, change) {
	const { width, height } = sizeOf(node);
	const own = colorOf(node);
	const colour = change ? colours.changes[change] : own ? colours.paints[own].stroke : colours.ink;
	const g = `<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ""}>`;
	const outline = inkOutline(node.data?.points, width, height);
	if (outline) return `${g}<path d="${outline}" fill="${colour}"/></g>`;
	const line = inkPath(node.data?.points, width, height);
	if (!line) return "";
	const heads = inkHeads(node.data?.points, width, height, node.data?.arrow);
	const d = heads ? `${line} ${heads}` : line;
	return `<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ""}><path d="${d}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
}
/**
* Handwriting runs small and has one weight, so a sketch's text goes a size up
* rather than bold. The sizes are keyed on the clean ones, so both looks share
* one layout.
* @param {string} font a data URL, or empty to rely on the fallbacks
*/
function sketchStyle(font) {
	return `<style>${font ? `@font-face{font-family:'Patrick Hand';src:url(${font}) format('woff2')}` : ""}text{font-weight:400}text[font-size="16"]{font-size:20px}text[font-size="${TITLE_SIZE}"]{font-size:17px}text[font-size="${TEXT_SIZE}"]{font-size:14px}text[font-size="11"]{font-size:13px}</style>`;
}
/**
* Along the same route the canvas draws: out of the side facing the other shape.
* @param {import('./types.js').VueFlowEdge} edge
* @param {{ x?: number, y?: number, width?: number, height?: number }} from
* @param {{ x?: number, y?: number, width?: number, height?: number }} to
* @param {typeof SVG_THEMES.light} colours
* @param {'added' | 'removed' | 'changed'} [change]
* @param {boolean} [sketch] drawn by hand
* @param {string} [lines] step, curved or straight
*/
function renderEdge(edge, from, to, colours, change, sketch = false, lines = LINE.STEP) {
	const box = (b) => ({
		x: b.x ?? 0,
		y: b.y ?? 0,
		width: b.width ?? 0,
		height: b.height ?? 0
	});
	const route = routeEdge(box(from), box(to), lines);
	const { dashed = false, both = false } = edge.data ?? {};
	const stroke = change ? colours.changes[change] : colours.edge;
	const dash = change === "removed" || dashed ? " stroke-dasharray=\"6 4\"" : "";
	const style = change ? ` stroke-width="2.5"${dash}${change === "removed" ? " opacity=\"0.75\"" : ""}` : ` stroke-width="1.5"${dash}`;
	const head = `url(#${change ? `arrow-${change}` : "arrow"})`;
	const line = `<path d="${sketch ? sketchPath(route.d, edge.id) : route.d}" fill="none" stroke="${stroke}"${style}${both ? ` marker-start="${head}"` : ""} marker-end="${head}"${change ? ` data-change="${change}"` : ""}/>`;
	if (!edge.label) return line;
	const labelWidth = edge.label.length * TEXT_SIZE * GLYPH + 16;
	const { x, y } = route.label;
	return [
		line,
		`<rect x="${round(x - labelWidth / 2)}" y="${round(y - 10)}" width="${round(labelWidth)}" height="20" rx="10" fill="${colours.surface}" stroke="${colours.line}"/>`,
		`<text x="${round(x)}" y="${round(y)}" font-size="11" fill="${colours.muted}" text-anchor="middle" dominant-baseline="central">${escapeXml(edge.label)}</text>`
	].join("\n");
}
/**
* @param {import('./types.js').FlowNode} node
* @param {{ x: number, y: number }} position
* @param {typeof SVG_THEMES.light} colours
* @param {'added' | 'removed' | 'changed'} [change]
* @param {boolean} [sketch] drawn by hand: the clean shape fills, a wobbly one strokes
*/
function renderNode(node, position, colours, change, sketch = false) {
	if (node.type === SHAPE.INK) return renderInk(node, position, colours, change);
	const meta = metaFor(node.type);
	const accent = colours.accents[meta.accent] ?? colours.accents.unknown;
	const size = sizeOf(node);
	const outline = shapePath(node.type, size.width, size.height, 1.5) || (change ? shapePath(SHAPE.PROCESS, size.width, size.height, 1.5) : "");
	const own = colorOf(node);
	const paint = own ? colours.paints[own] : null;
	const fill = paint?.fill ?? colours.surface;
	const stroke = change ? colours.changes[change] : paint?.stroke ?? accent;
	const style = change ? ` stroke-width="3"${change === "removed" ? " stroke-dasharray=\"7 5\"" : ""}` : " stroke-width=\"1.5\"";
	const description = meta.summary(node);
	const body = node.type === SHAPE.TABLE ? tableText(node.name, description, colours, size) : centredText(node, description, colours, size);
	return [
		`<g transform="translate(${round(position.x)},${round(position.y)})"${change === "removed" ? " opacity=\"0.6\"" : ""}${change ? ` data-change="${change}"` : ""}>`,
		outline && sketch ? [`<path d="${outline}" fill="${fill}" stroke="none"/>`, `<path d="${sketchPath(outline, node.id)}" fill="none" stroke="${stroke}"${style} stroke-linecap="round"/>`].join("\n") : "",
		outline && !sketch ? `<path d="${outline}" fill="${fill}" stroke="${stroke}"${style} stroke-linejoin="round"/>` : "",
		body,
		"</g>"
	].filter(Boolean).join("\n");
}
/**
* @param {import('./types.js').FlowNode} node
* @param {string} description
* @param {typeof SVG_THEMES.light} colours
* @param {{ width: number, height: number }} size
*/
function centredText(node, description, colours, size) {
	const inset = textInset(node.type, size.width, size.height);
	const room = size.width - 2 * (inset.x || 12);
	const titleSize = node.type === SHAPE.TEXT ? 16 : TITLE_SIZE;
	const titles = wrap(node.name, room, titleSize, 2);
	const lines = description ? wrap(description, room, TEXT_SIZE, node.type === SHAPE.DECISION ? 1 : 2) : [];
	const blockHeight = titles.length * titleSize * 1.25 + (lines.length ? 4 + lines.length * TEXT_SIZE * 1.3 : 0);
	let y = size.height / 2 - blockHeight / 2;
	const cx = size.width / 2;
	const out = titles.map((line) => {
		y += titleSize * 1.25;
		return `<text x="${cx}" y="${round(y - 4)}" font-size="${titleSize}" font-weight="600" fill="${colours.ink}" text-anchor="middle">${escapeXml(line)}</text>`;
	});
	y += 4;
	lines.forEach((line) => {
		y += TEXT_SIZE * 1.3;
		out.push(`<text x="${cx}" y="${round(y - 3)}" font-size="${TEXT_SIZE}" fill="${colours.muted}" text-anchor="middle">${escapeXml(line)}</text>`);
	});
	return out.join("\n");
}
/**
* @param {string} name
* @param {string} description
* @param {typeof SVG_THEMES.light} colours
* @param {{ width: number, height: number }} size
*/
function tableText(name, description, colours, size) {
	const room = size.width - 24;
	const out = [`<text x="12" y="21" font-size="${TITLE_SIZE}" font-weight="600" fill="${colours.ink}">${escapeXml(wrap(name, room, TITLE_SIZE, 1)[0] ?? "")}</text>`];
	wrap(description, room, TEXT_SIZE, 3).forEach((line, index) => out.push(`<text x="12" y="${52 + index * 16}" font-size="${TEXT_SIZE}" fill="${colours.muted}">${escapeXml(line)}</text>`));
	return out.join("\n");
}
/**
* Words into at most `max` lines that fit `width`, the last ending in an
* ellipsis when something was cut.
*
* @param {string} text
* @param {number} width
* @param {number} size
* @param {number} max
* @returns {string[]}
*/
function wrap(text, width, size, max) {
	const fits = Math.max(4, Math.floor(width / (size * GLYPH)));
	const words = String(text ?? "").split(/\s+/).filter(Boolean);
	/** @type {string[]} */
	const lines = [];
	let current = "";
	for (const word of words) {
		const next = current ? `${current} ${word}` : word;
		if (next.length <= fits) {
			current = next;
			continue;
		}
		if (current) lines.push(current);
		current = word.length > fits ? `${word.slice(0, fits - 1)}…` : word;
	}
	if (current) lines.push(current);
	if (lines.length <= max) return lines;
	const kept = lines.slice(0, max);
	const last = kept[max - 1];
	kept[max - 1] = `${last.length >= fits ? last.slice(0, fits - 1) : last}…`;
	return kept;
}
/** @param {string} text */
const escapeXml = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
/** @param {number} value */
const round = (value) => Math.round(value * 10) / 10;
//#endregion
//#region src/mcp/server.js
/**
* A Model Context Protocol server for a folder of `.flow` files, so a coding
* agent can list, read, write, draw and compare diagrams itself. It speaks
* JSON-RPC one message at a time; the transport lives in `stdio.js`, and the
* file system is handed in, so this tests without either.
*
* @typedef {{
*   readFile: (path: string) => Promise<string>,
*   writeFile: (path: string, text: string) => Promise<void>,
*   listFiles: () => Promise<string[]>,
*   resolve: (path: string) => string | null,
*   sketchFont?: () => Promise<string>,
* }} Workspace  paths are relative to the folder; `resolve` refuses any outside it;
*   `sketchFont` is the handwriting font to embed in a sketch
*
*/
const INSTRUCTIONS = `Diagrams in this folder are .flow files, sketched by a person in isketch.
Read one as a brief before building from it, and refer to shapes by their ids. When the code
changes what a diagram shows, update the diagram with write_diagram so the two stay true.
Format: \`id = shape "Name" -- description\`, \`a -> b : label\` (\`-->\` dashed, \`<->\` both ways),
positions under \`@layout\`.
Notes (\`note: ...\` for the diagram, \`id note: ...\` for a shape) are the person's instructions:
follow them, and add one when you leave something for them to decide.
Shapes: ${SHAPE_OPTIONS.map((option) => option.value).join(", ")}.
Screen, button, input, card, list and image sketch an interface.`;
const PATH = {
	type: "string",
	description: "Path of a .flow file, relative to the folder"
};
/** Each tool: what an agent sees, and what it does. */
const TOOLS = Object.freeze([
	{
		name: "list_diagrams",
		description: "List every .flow diagram in the folder, with its title and size.",
		inputSchema: {
			type: "object",
			properties: {}
		},
		run: listDiagrams
	},
	{
		name: "read_diagram",
		description: "Read a diagram. \"brief\" (the default) explains each shape and connection in Markdown and ends with the source; \"flow\" is the .flow text alone, to edit and write back.",
		inputSchema: {
			type: "object",
			properties: {
				path: PATH,
				format: {
					type: "string",
					enum: ["brief", "flow"]
				}
			},
			required: ["path"]
		},
		run: readDiagram
	},
	{
		name: "write_diagram",
		description: "Create or replace a diagram with .flow text. Nothing is written if the text has errors; they come back with line numbers. Keep the @layout block of an existing diagram so the person's layout survives; shapes without a position are placed automatically.",
		inputSchema: {
			type: "object",
			properties: {
				path: PATH,
				text: {
					type: "string",
					description: "The whole diagram"
				}
			},
			required: ["path", "text"]
		},
		run: writeDiagram
	},
	{
		name: "render_diagram",
		description: "Draw a diagram as SVG, returned as text or written next to it.",
		inputSchema: {
			type: "object",
			properties: {
				path: PATH,
				out: {
					type: "string",
					description: "Optional .svg path to write, relative to the folder"
				},
				theme: {
					type: "string",
					enum: ["light", "dark"]
				}
			},
			required: ["path"]
		},
		run: renderDiagram
	},
	{
		name: "diff_diagrams",
		description: "List what changed between a diagram file and other .flow text, such as a proposed edit or an older version: shapes and connections added, removed and changed.",
		inputSchema: {
			type: "object",
			properties: {
				path: PATH,
				text: {
					type: "string",
					description: "The other version, as .flow text"
				}
			},
			required: ["path", "text"]
		},
		run: diffDiagrams
	}
]);
/**
* @param {Workspace} workspace
* @returns {(message: import('./protocol.js').Message) => Promise<object | null>}
*/
function createServer(workspace) {
	return createProtocol({
		tools: TOOLS,
		instructions: INSTRUCTIONS,
		context: workspace
	});
}
/**
* A `.flow` path inside the folder, or a ToolError saying why not.
* @param {Workspace} workspace
* @param {unknown} path
* @param {string} [extension]
*/
function checkedPath(workspace, path, extension = FLOW_EXTENSION) {
	if (typeof path !== "string" || !path.trim()) throw new ToolError("A path is required.");
	if (!path.endsWith(extension)) throw new ToolError(`${path} is not a ${extension} file.`);
	if (!workspace.resolve(path)) throw new ToolError(`${path} is outside the diagrams folder.`);
	return path;
}
/**
* @param {Workspace} workspace
* @param {string} path
*/
async function load(workspace, path) {
	let text;
	try {
		text = await workspace.readFile(path);
	} catch {
		throw new ToolError(`${path} does not exist. list_diagrams shows the ones that do.`);
	}
	return parsed(text, path);
}
/** @param {string} text @param {string} label */
function parsed(text, label) {
	const { document, errors } = parseFlow(text);
	if (errors.length || !document) throw new ToolError([`${label} has errors:`, ...errors.map((error) => `line ${error.line}: ${error.message}`)].join("\n"));
	return document;
}
/** @param {Workspace} workspace */
async function listDiagrams(workspace) {
	const files = (await workspace.listFiles()).filter((file) => file.endsWith(FLOW_EXTENSION));
	if (!files.length) return "No .flow diagrams in this folder yet. write_diagram creates one.";
	return (await Promise.all(files.sort().map(async (file) => {
		const { document, errors } = parseFlow(await workspace.readFile(file));
		if (errors.length || !document) return `- ${file}: has ${errors.length} error(s)`;
		return `- ${file}: "${document.title}", ${document.nodes.length} shapes, ${document.edges.length} connections`;
	}))).join("\n");
}
/**
* @param {Workspace} workspace
* @param {Record<string, unknown>} args
*/
async function readDiagram(workspace, { path, format = "brief" }) {
	const document = await load(workspace, checkedPath(workspace, path));
	return format === "flow" ? serialiseFlow(document) : toBrief(document);
}
/**
* @param {Workspace} workspace
* @param {Record<string, unknown>} args
*/
async function writeDiagram(workspace, { path, text }) {
	const file = checkedPath(workspace, path);
	if (typeof text !== "string") throw new ToolError("text is required.");
	const document = parsed(text, "The text");
	let before = null;
	try {
		before = parseFlow(await workspace.readFile(file)).document;
	} catch {}
	await workspace.writeFile(file, serialiseFlow(document));
	if (!before) return `Created ${file}: ${document.nodes.length} shapes, ${document.edges.length} connections.`;
	const changes = diffDocuments(before, document);
	return isUnchanged(changes) ? `${file} is unchanged.` : [`Updated ${file}:`, ...describeDiff(before, document, changes)].join("\n");
}
/**
* @param {Workspace} workspace
* @param {Record<string, unknown>} args
*/
async function renderDiagram(workspace, { path, out, theme }) {
	const file = checkedPath(workspace, path);
	const document = await load(workspace, file);
	const svg = renderSvg(document, {
		theme: theme === "dark" ? "dark" : "light",
		sketchFont: isSketch(document) && workspace.sketchFont ? await workspace.sketchFont() : ""
	});
	if (out === void 0) return svg;
	const target = checkedPath(workspace, out, ".svg");
	await workspace.writeFile(target, svg);
	return `Rendered ${file} to ${target}.`;
}
/**
* @param {Workspace} workspace
* @param {Record<string, unknown>} args
*/
async function diffDiagrams(workspace, { path, text }) {
	const file = checkedPath(workspace, path);
	if (typeof text !== "string") throw new ToolError("text is required.");
	const before = await load(workspace, file);
	const after = parsed(text, "The text");
	const changes = diffDocuments(before, after);
	return isUnchanged(changes) ? "No changes." : describeDiff(before, after, changes).join("\n");
}
//#endregion
//#region bin/sketchFont.mjs
const FILE = "patrick-hand-latin-400-normal.woff2";
let loaded;
/**
* Where the font may be: beside this file, as the bundled Claude Code plugin
* ships it, or in the installed package.
*/
function candidates() {
	const found = [fileURLToPath(new URL(`./${FILE}`, import.meta.url))];
	try {
		found.push(createRequire(import.meta.url).resolve(`@fontsource/patrick-hand/files/${FILE}`));
	} catch {}
	return found;
}
function sketchFont() {
	loaded ??= (async () => {
		for (const path of candidates()) try {
			return `data:font/woff2;base64,${(await readFile(path)).toString("base64")}`;
		} catch {}
		return "";
	})();
	return loaded;
}
//#endregion
//#region bin/mcp.mjs
/** Folders no diagram lives in, skipped so a listing stays quick. */
const SKIPPED = /* @__PURE__ */ new Set([
	"node_modules",
	".git",
	"dist",
	"coverage"
]);
/** @param {string} folder */
function serve(folder) {
	const root = resolve(folder);
	const inside = (path) => {
		const full = resolve(root, path);
		return full === root || full.startsWith(root + sep) ? full : null;
	};
	const handle = createServer({
		resolve: inside,
		sketchFont,
		readFile: (path) => readFile(inside(path), "utf8"),
		writeFile: async (path, text) => {
			const full = inside(path);
			await mkdir(dirname(full), { recursive: true });
			await writeFile(full, text);
		},
		listFiles: async () => {
			return (await readdir(root, {
				recursive: true,
				withFileTypes: true
			})).filter((entry) => entry.isFile()).map((entry) => relative(root, resolve(entry.parentPath, entry.name))).filter((path) => !path.split(sep).some((part) => SKIPPED.has(part))).map((path) => path.split(sep).join("/"));
		}
	});
	const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
	createInterface({
		input: process.stdin,
		crlfDelay: Infinity
	}).on("line", async (line) => {
		if (!line.trim()) return;
		let message;
		try {
			message = JSON.parse(line);
		} catch {
			send({
				jsonrpc: "2.0",
				id: null,
				error: {
					code: -32700,
					message: "Parse error"
				}
			});
			return;
		}
		const response = await handle(message);
		if (response) send(response);
	});
	process.stderr.write(`isketch MCP server: diagrams in ${root}\n`);
}
//#endregion
//#region bin/mcp-plugin.mjs
serve(process.argv[2] ?? ".");
//#endregion
export {};
