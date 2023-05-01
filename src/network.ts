import * as _O from "fp-ts/lib/Option.js";
import * as _R from "./Record.js";
import { pipe } from "fp-ts/lib/function.js";
import * as t from "io-ts";

export type Unit = {
    attack: number,
    defense: number,
    cost: number,
}

export type NodeKey<T extends NetworkType> = keyof typeof networks[T]['nodes'];

export type Board<T extends NetworkType> = {
    layout: T,
    units: Record<NodeKey<T>, _O.Option<Unit>>,
}

export const emptyBoard = <T extends NetworkType>(layout: T) => (
    {
        layout,
        units: pipe(
            networks[layout].nodes,
            _R.map(() => (_O.none as _O.Option<Unit>))
        )
    } as Board<T>
);

export type Network<Key extends number> = {
    nodes: Record<Key, Node<Key>>,
    links: Link<Key>[],
}

export type Node<Key extends number> = {
    neighbors: Key[],
    openPort: boolean,
}

export type NodeSpecifier = Omit<Node<number>, "neighbors">;

export type Link<Key extends number> = [Key, Key];

const newNetwork = <Key extends number>(nodes: Record<Key, NodeSpecifier>, links: Link<Key>[]): Network<Key> => {
    const processedNodes = pipe(
        nodes,
        _R.map((node: NodeSpecifier): Node<Key> => ({
            ...node,
            neighbors: [],
        })),
    );
    links.forEach(([i, j]) => {
        processedNodes[i].neighbors.push(j);
        processedNodes[j].neighbors.push(i);
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
