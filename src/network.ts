export type Unit = {
    attack: number,
    defense: number,
    cost: number,
}

export type Board = {
    layout: Network,
    units: Unit[],
}

export type Network = {
    nodes: Node[],
    links: Link[],
}

export type Node = {
    neighbors: Node[],
    openPort: boolean,
    position: [number, number],
}

export type NodeSpecifier = {
    [A in keyof Node as Exclude<A, "neighbors">]: Node[A]
}

export type Link = [number, number];

const newNetwork = (nodes: NodeSpecifier[], links: Link[]): Network => {
    const processedNodes = nodes.map((node: NodeSpecifier): Node => ({
        ...node,
        neighbors: [],
    }));
    links.forEach(([i, j]) => {
        processedNodes[i].neighbors.push(processedNodes[j]);
        processedNodes[j].neighbors.push(processedNodes[i]);
    })
    return {
        nodes: processedNodes,
        links,
    }
}

export const mesh_network: Network = newNetwork(
    [
        { openPort: true,  position: [-1  , -1] }, // 0
        { openPort: true,  position: [ 0  , -1] }, // 1
        { openPort: true,  position: [ 1  , -1] }, // 2
        { openPort: true,  position: [-1.5,  0] }, // 3
        { openPort: false, position: [-0.5,  0] }, // 4
        { openPort: false, position: [ 0.5,  0] }, // 5
        { openPort: true,  position: [ 1.5,  0] }, // 6
        { openPort: true,  position: [-1  ,  1] }, // 7
        { openPort: true,  position: [ 0  ,  1] }, // 8
        { openPort: true,  position: [ 1  ,  1] }, // 9
    ],
    [
        [0, 1],
        [1, 2],
        [0, 3],
        [0, 4],
        [1, 4],
        [1, 5],
        [2, 5],
        [2, 6],
        [3, 4],
        [4, 5],
        [5, 6],
        [3, 7],
        [4, 7],
        [4, 8],
        [5, 8],
        [5, 9],
        [6, 9],
        [7, 8],
        [8, 9],
    ]
)