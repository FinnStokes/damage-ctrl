import * as _A from "fp-ts/lib/Array.js";
import * as _R from "../Record.js";
import { pipe } from "fp-ts/lib/function.js";
import { networks, NetworkType, Board, NodeKey } from "../network.js"
import "./GameBoard.css"

type Position = {
    x: number,
    y: number,
    angle: number,
}

type NetworkLayouts = {
    [Type in NetworkType]: Record<NodeKey<Type>, Position>;
};

const networkLayouts: NetworkLayouts = {
    'mesh': pipe(
        [
            {x: -2, y: -1, angle: 3 * Math.PI / 2},
            {x: 0, y: -1, angle: 3 * Math.PI / 2},
            {x: 2, y: -1, angle: 3 * Math.PI / 2},
            {x: -3, y: 0, angle: Math.PI},
            {x: -1, y: 0, angle: 3 * Math.PI / 2},
            {x: 1, y: 0, angle: 3 * Math.PI / 2},
            {x: 3, y: 0, angle: 0},
            {x: -2, y: 1, angle: Math.PI / 2},
            {x: 0, y: 1, angle: Math.PI / 2},
            {x: 2, y: 1, angle: Math.PI / 2},
        ],
        _R.map((pos: Position) => ({x: 1/2 + pos.x/8, y: 1/2 + pos.y/4, angle: pos.angle})),
    ),
};

export const GameBoard = <T extends NetworkType>({board}: {board: Board<T>}) => (
    <div className={ `board ${board.layout}` }>
        {
            pipe(
                networkLayouts[board.layout],
                _R.toArray,
                _A.map(([idx, pos]) => (
                    <div className="node" style={ { left: `${pos.x*100}%`, top: `${pos.y*100}%` } }></div>
                )),
            )
        }
        {
            pipe(
                networks[board.layout].links,
                _A.map(([from, to]) => {
                    const layout = networkLayouts[board.layout];
                    const fromX = layout[from].x;
                    const fromY = layout[from].y;
                    const toX = layout[to].x;
                    const toY = layout[to].y;
                    const length = Math.sqrt((toX - fromX)**2 + ((toY - fromY) / 2)**2);
                    const angle = Math.atan2((toY - fromY) / 2, toX - fromX);
                    const style = {
                        top: `${fromY*100}%`,
                        left: `${fromX*100}%`,
                        width: `${length*100}%`,
                        transform: `translateY(-50%) rotate(${angle}rad)`,
                    };
                    return (
                        <div className="link" style={style}></div>
                    );
                }),
            )
        }
        {
            pipe(
                networks[board.layout].nodes,
                _R.toArray,
                _A.map(([idx, node]) => {
                    if (!node.openPort) {
                        return "";
                    }
                    const layout = networkLayouts[board.layout];
                    const fromX = layout[idx].x;
                    const fromY = layout[idx].y;
                    const angle = layout[idx].angle;
                    const style = {
                        top: `${fromY*100}%`,
                        left: `${fromX*100}%`,
                        transform: `translateY(-50%) rotate(${angle}rad)`,
                    };
                    return (
                        <div className="port" style={style}></div>
                    );
                }),
            )
        }
    </div>
);