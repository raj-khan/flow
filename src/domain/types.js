/**
 * @typedef {import('./constants.js').Shape} Shape
 *
 * @typedef {Object} FlowNodeData
 * @property {string} [description] what the shape is
 * @property {string} [notes] what whoever builds it must do, such as "paginate"
 * @property {string} [color] a ColorName from colors.js; absent for the kind's own look
 * @property {'end' | 'both'} [arrow] a pen stroke's arrowhead, at its end or at both
 * @property {string} [points] a pen stroke's points, 0 to 100 across its box: "x,y x,y"
 * @property {string} [origin] the importer that made it, so a re-import can tell its own from yours
 *
 * @typedef {Object} FlowNode
 * @property {string} id
 * @property {string} type a Shape; anything else renders with the fallback
 * @property {string} name
 * @property {FlowNodeData} data
 * @property {{ x: number, y: number } | null} [position] set once dragged or created
 * @property {{ width: number, height: number } | null} [size] set once resized
 *
 * @typedef {Object} FlowEdge
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {string} [label]
 * @property {boolean} [dashed] drawn dashed, for something optional or asynchronous
 * @property {boolean} [both] an arrow at each end
 * @property {string} [origin] the importer that made it, so a re-import can tell its own from yours
 *
 * @typedef {Object} FlowDocument
 * @property {number} version
 * @property {string} title
 * @property {string} [notes] instructions for the whole diagram, such as the stack to use
 * @property {'sketch'} [style] drawn by hand; absent for the clean look
 * @property {string} [lines] how connections run: 'curved' or 'straight'; absent for steps
 * @property {Record<string, any>[]} nodes stored as saved; `normaliseNode` makes them FlowNodes
 * @property {FlowEdge[]} edges
 *
 * @typedef {Object} VueFlowNode
 * @property {string} id
 * @property {string} type
 * @property {{ x: number, y: number }} position
 * @property {number} width
 * @property {number} height
 * @property {{ node: FlowNode }} data
 *
 * @typedef {{ id: string, source: string, target: string, label?: string, data?: { dashed?: boolean, both?: boolean } }} VueFlowEdge
 */
export {}
