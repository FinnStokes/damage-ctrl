import * as t from "io-ts";

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
}

export type NodeSpecifier = Omit<Node, "neighbors">;

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

export const networks = {
    "mesh": newNetwork(
        [
            { openPort: true },  // 0
            { openPort: true },  // 1
            { openPort: true },  // 2
            { openPort: true },  // 3
            { openPort: false }, // 4
            { openPort: false }, // 5
            { openPort: true },  // 6
            { openPort: true },  // 7
            { openPort: true },  // 8
            { openPort: true },  // 9
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
    ),
};

export const NetworkTypeCodec = t.keyof(networks);

export type NetworkType = t.TypeOf<typeof NetworkTypeCodec>;
